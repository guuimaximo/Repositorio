// src/pages/TratativasRH.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

const ACOES_RH = new Set(["Advertência", "Suspensão"]);

function brDateTime(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR");
}
function brDate(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}
function fileNameFromUrl(u) {
  try {
    const raw = String(u || "");
    const noHash = raw.split("#")[0];
    const noQuery = noHash.split("?")[0];
    const last = noQuery.split("/").filter(Boolean).pop() || "arquivo";
    return decodeURIComponent(last);
  } catch {
    return "arquivo";
  }
}
function isImageUrl(u) {
  const s = String(u || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(s);
}
function isPdf(u) {
  const s = String(u || "").toLowerCase();
  return s.includes(".pdf") || /\.(pdf)(\?|#|$)/.test(s);
}

export default function TratativasRH() {
  const nav = useNavigate();
  const { user } = useContext(AuthContext);

  // filtros
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("PENDENTE"); // PENDENTE | LANCADO | TODOS
  const [acaoFiltro, setAcaoFiltro] = useState("TODOS"); // TODOS | Advertência | Suspensão

  // dados
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // modal / edição RH
  const [aberto, setAberto] = useState(false);
  const [selecionada, setSelecionada] = useState(null);

  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);
  const [pasteTarget, setPasteTarget] = useState(null); // "evid" | null

  const pasteRef = useRef(null);

  // ============ paste global (print) ============
  function makeFileFromClipboardImage(blobFile) {
    const type = blobFile?.type || "image/png";
    const ext = type === "image/jpeg" ? "jpg" : "png";
    const name = `print_transnet_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    return new File([blobFile], name, { type, lastModified: Date.now() });
  }
  function tryGetClipboardImageFile(e) {
    const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
    const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
    if (!imgItem) return null;
    const f = imgItem.getAsFile();
    if (!f) return null;
    return makeFileFromClipboardImage(f);
  }

  useEffect(() => {
    function onGlobalPaste(e) {
      if (pasteTarget !== "evid") return;
      const file = tryGetClipboardImageFile(e);
      if (!file) return;
      e.preventDefault();
      setEvidFile(file);
    }
    window.addEventListener("paste", onGlobalPaste);
    return () => window.removeEventListener("paste", onGlobalPaste);
  }, [pasteTarget]);

  // ============ storage upload (RH) ============
  const sanitizeName = (name) =>
    String(name || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

  async function uploadToTratativasBucket(file, prefixFolder) {
    const safeName = sanitizeName(file?.name);
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
    const path = `${prefixFolder}/${unique}`;

    const up = await supabase.storage.from("tratativas").upload(path, file, {
      upsert: false,
      contentType: file?.type || undefined,
    });
    if (up.error) throw up.error;

    const { data: pub } = supabase.storage.from("tratativas").getPublicUrl(path);
    return pub?.publicUrl || null;
  }

  // ============ carregar listagem ============
  async function load() {
    setLoading(true);
    try {
      // 1) pegar detalhes que são do RH (Advertência/Suspensão)
      //    e trazer também a tratativa relacionada (join via FK no select)
      const { data, error } = await supabase
        .from("tratativas_detalhes")
        .select(
          `
          id,
          created_at,
          tratativa_id,
          acao_aplicada,
          observacoes,
          imagem_tratativa,
          anexo_tratativa,
          tratado_por_login,
          tratado_por_nome,
          tratativas:tratativa_id (
            id,
            created_at,
            status,
            motorista_nome,
            motorista_chapa,
            tipo_ocorrencia,
            prioridade,
            setor_origem,
            linha,
            descricao,
            data_ocorrido,
            hora_ocorrido,
            imagem_url,
            evidencias_urls,
            criado_por_login,
            criado_por_nome
          )
        `
        )
        .in("acao_aplicada", Array.from(ACOES_RH))
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const detalhes = (data || []).filter((d) => d?.tratativas?.id);

      // 2) buscar tabela RH para saber o que já foi lançado
      const tratativaIds = Array.from(new Set(detalhes.map((d) => d.tratativa_id))).filter(Boolean);

      let rhMap = new Map();
      if (tratativaIds.length > 0) {
        const { data: rh, error: erh } = await supabase
          .from("tratativas_rh")
          .select("id, tratativa_id, status, lancado_transnet, evidencia_transnet_url, observacao_rh, updated_at")
          .in("tratativa_id", tratativaIds);
        if (erh) throw erh;

        (rh || []).forEach((r) => rhMap.set(r.tratativa_id, r));
      }

      // 3) montar rows consolidadas
      const merged = detalhes.map((d) => {
        const t = d.tratativas;
        const rh = rhMap.get(d.tratativa_id) || null;

        // evidências originais da solicitação
        const evidSol =
          Array.isArray(t?.evidencias_urls) && t.evidencias_urls.length > 0
            ? t.evidencias_urls
            : t?.imagem_url
            ? [t.imagem_url]
            : [];

        return {
          detalhe_id: d.id,
          detalhe_created_at: d.created_at,
          tratativa_id: d.tratativa_id,
          acao_aplicada: d.acao_aplicada,
          observacoes_tratador: d.observacoes,
          evidencia_conclusao_url: d.imagem_tratativa || null,
          anexo_tratador_url: d.anexo_tratativa || null,

          t_status: t?.status || null,
          motorista_nome: t?.motorista_nome || "",
          motorista_chapa: t?.motorista_chapa || "",
          tipo_ocorrencia: t?.tipo_ocorrencia || "",
          prioridade: t?.prioridade || "",
          setor_origem: t?.setor_origem || "",
          linha: t?.linha || "",
          descricao: t?.descricao || "",
          data_ocorrido: t?.data_ocorrido || null,
          hora_ocorrido: t?.hora_ocorrido || "",

          criado_por: t?.criado_por_nome || t?.criado_por_login || "—",

          evidencias_solicitacao: evidSol,

          rh_id: rh?.id || null,
          rh_status: rh?.status || "PENDENTE",
          rh_lancado: Boolean(rh?.lancado_transnet),
          rh_evid_url: rh?.evidencia_transnet_url || null,
          rh_obs: rh?.observacao_rh || "",
          rh_updated_at: rh?.updated_at || null,
        };
      });

      setRows(merged);
    } catch (e) {
      alert(`Erro ao carregar RH: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ filtros ============
  const filtered = useMemo(() => {
    const q = String(busca || "").trim().toLowerCase();

    return rows.filter((r) => {
      // filtro status
      if (status === "PENDENTE") {
        if (r.rh_lancado) return false;
      } else if (status === "LANCADO") {
        if (!r.rh_lancado) return false;
      }

      // filtro ação
      if (acaoFiltro !== "TODOS" && r.acao_aplicada !== acaoFiltro) return false;

      // busca
      if (!q) return true;
      const blob = [
        r.motorista_nome,
        r.motorista_chapa,
        r.tipo_ocorrencia,
        r.prioridade,
        r.setor_origem,
        r.linha,
        r.descricao,
        r.acao_aplicada,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [rows, busca, status, acaoFiltro]);

  const counts = useMemo(() => {
    let pend = 0;
    let lanc = 0;
    let adv = 0;
    let susp = 0;

    rows.forEach((r) => {
      if (r.rh_lancado) lanc += 1;
      else pend += 1;

      if (r.acao_aplicada === "Advertência") adv += 1;
      if (r.acao_aplicada === "Suspensão") susp += 1;
    });

    return { pend, lanc, adv, susp, total: rows.length };
  }, [rows]);

  // ============ abrir modal RH ============
  function openRH(r) {
    setSelecionada(r);
    setObsRH(r.rh_obs || "");
    setEvidFile(null);
    setPasteTarget(null);
    setAberto(true);
  }

  function closeRH() {
    setAberto(false);
    setSelecionada(null);
    setObsRH("");
    setEvidFile(null);
    setPasteTarget(null);
  }

  // ============ salvar lançamento RH ============
  async function salvarLancamentoRH() {
    if (!selecionada) return;
    if (!obsRH?.trim()) {
      alert("Informe uma observação do RH (ex.: 'Lançado no Transnet').");
      return;
    }
    if (!evidFile) {
      alert("Cole ou selecione a evidência (print/documento) do Transnet.");
      return;
    }

    setLoading(true);
    try {
      // auditoria
      const loginSessao = user?.login || user?.email || null;
      const idSessao = user?.id || user?.auth_user_id || null;
      let nomeSessao = user?.nome || user?.nome_completo || null;

      if (!nomeSessao && loginSessao) {
        const { data: u } = await supabase
          .from("usuarios_aprovadores")
          .select("nome, sobrenome, nome_completo")
          .eq("login", loginSessao)
          .maybeSingle();
        nomeSessao =
          u?.nome_completo ||
          [u?.nome, u?.sobrenome].filter(Boolean).join(" ") ||
          u?.nome ||
          loginSessao ||
          null;
      }

      const evidUrl = await uploadToTratativasBucket(
        evidFile,
        `${selecionada.tratativa_id}/rh_transnet`
      );

      // upsert na tratativas_rh por tratativa_id
      // (precisa ter UNIQUE(tratativa_id) no banco p/ onConflict funcionar)
      const up = await supabase
        .from("tratativas_rh")
        .upsert(
          {
            tratativa_id: selecionada.tratativa_id,
            status: "LANCADO",
            lancado_transnet: true,
            observacao_rh: obsRH.trim(),
            evidencia_transnet_url: evidUrl,

            // auditoria opcional (se existir no seu schema)
            tratado_por_login: loginSessao,
            tratado_por_nome: nomeSessao,
            tratado_por_id: idSessao,
          },
          { onConflict: "tratativa_id" }
        );

      if (up.error) throw up.error;

      alert("RH: lançamento registrado com sucesso!");
      closeRH();
      await load();
    } catch (e) {
      alert(`Erro ao salvar RH: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // UI helpers
  const FilePicker = ({ id, accept, onPick, selectedFile }) => (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Escolher arquivo
      </label>
      <div className="text-xs text-gray-500 truncate">
        {selectedFile?.name ? selectedFile.name : "Nenhum arquivo selecionado"}
      </div>
    </div>
  );

  const PasteBox = ({ active, file, onClear }) => {
    return (
      <div
        ref={pasteRef}
        role="button"
        tabIndex={0}
        onClick={() => setPasteTarget("evid")}
        onFocus={() => setPasteTarget("evid")}
        onBlur={() => setPasteTarget(null)}
        className={[
          "rounded-md border p-3 bg-gray-50 cursor-pointer select-none",
          active ? "border-blue-500 ring-2 ring-blue-200" : "border-dashed",
        ].join(" ")}
        title="Clique e cole o Print"
      >
        <div className="text-sm font-medium text-gray-700">Clique e cole o Print</div>

        {file ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-600 truncate">{file.name}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="mt-1 text-xs text-gray-500">
            {active ? "Pronto para colar (Ctrl+V)" : "Clique para ativar"}
          </div>
        )}
      </div>
    );
  };

  const renderThumbOrLink = (url) => {
    if (!url) return <span className="text-gray-400">—</span>;
    const img = isImageUrl(url) && !isPdf(url);
    return img ? (
      <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir">
        <img
          src={url}
          alt={fileNameFromUrl(url)}
          className="h-12 w-12 rounded border object-cover hover:opacity-90"
          loading="lazy"
        />
      </a>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline text-xs"
        title="Abrir"
      >
        {fileNameFromUrl(url)}
      </a>
    );
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold">TratativasRH</h1>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Card titulo="Pendentes RH" valor={counts.pend} />
        <Card titulo="Lançadas" valor={counts.lanc} />
        <Card titulo="Advertências" valor={counts.adv} />
        <Card titulo="Suspensões" valor={counts.susp} />
        <Card titulo="Total" valor={counts.total} />
      </div>

      {/* filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar (motorista, chapa, ocorrência, linha...)"
            className="w-full rounded-md border px-3 py-2"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="PENDENTE">Pendentes</option>
            <option value="LANCADO">Lançadas</option>
            <option value="TODOS">Todos</option>
          </select>

          <select
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="TODOS">Todas (RH)</option>
            <option value="Advertência">Advertência</option>
            <option value="Suspensão">Suspensão</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            {loading ? "Carregando..." : `${filtered.length} registros`}
          </div>
        </div>
      </div>

      {/* tabela */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th>Data</Th>
                <Th>Motorista</Th>
                <Th>Chapa</Th>
                <Th>Ação</Th>
                <Th>Ocorrência</Th>
                <Th>Linha</Th>
                <Th>Status RH</Th>
                <Th>Evidência</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.tratativa_id}-${r.detalhe_id}`} className="border-t">
                  <Td>{brDateTime(r.detalhe_created_at)}</Td>
                  <Td className="font-medium">{r.motorista_nome || "—"}</Td>
                  <Td>{r.motorista_chapa || "—"}</Td>
                  <Td>
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                        r.acao_aplicada === "Suspensão"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-800",
                      ].join(" ")}
                    >
                      {r.acao_aplicada}
                    </span>
                  </Td>
                  <Td className="max-w-[260px] truncate" title={r.tipo_ocorrencia || ""}>
                    {r.tipo_ocorrencia || "—"}
                  </Td>
                  <Td>{r.linha || "—"}</Td>
                  <Td>
                    {r.rh_lancado ? (
                      <span className="text-emerald-700 font-semibold">Lançado</span>
                    ) : (
                      <span className="text-orange-700 font-semibold">Pendente</span>
                    )}
                  </Td>
                  <Td>{renderThumbOrLink(r.rh_evid_url || r.evidencia_conclusao_url)}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openRH(r)}
                      className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                    >
                      Abrir
                    </button>
                  </Td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Nenhuma tratativa RH encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal RH */}
      {aberto && selecionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">TratativasRH</div>
                <div className="text-xs text-gray-500">
                  {selecionada.acao_aplicada} • {selecionada.motorista_nome} ({selecionada.motorista_chapa})
                </div>
              </div>
              <button
                onClick={closeRH}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info titulo="Ocorrência" valor={selecionada.tipo_ocorrencia || "—"} />
                <Info titulo="Data Ocorrido" valor={brDate(selecionada.data_ocorrido)} />
                <Info titulo="Linha" valor={selecionada.linha || "—"} />
                <Info titulo="Prioridade" valor={selecionada.prioridade || "—"} />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Observações do tratador</div>
                <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {selecionada.observacoes_tratador || "—"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Evidência do tratador</div>
                  {selecionada.evidencia_conclusao_url ? (
                    <div>{renderThumbOrLink(selecionada.evidencia_conclusao_url)}</div>
                  ) : (
                    <div className="text-sm text-gray-400">—</div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Anexo do tratador</div>
                  {selecionada.anexo_tratador_url ? (
                    <div>{renderThumbOrLink(selecionada.anexo_tratador_url)}</div>
                  ) : (
                    <div className="text-sm text-gray-400">—</div>
                  )}
                </div>
              </div>

              <hr />

              <div>
                <div className="text-sm font-semibold mb-2">Lançamento RH (Transnet)</div>

                <label className="block text-sm text-gray-600 mb-1">Observação RH</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ex.: Lançado no Transnet (print anexado)."
                  value={obsRH}
                  onChange={(e) => setObsRH(e.target.value)}
                />

                <div className="mt-3 space-y-2">
                  <FilePicker
                    id="rh_evid_file"
                    accept="image/*,application/pdf"
                    selectedFile={evidFile}
                    onPick={setEvidFile}
                  />

                  <PasteBox
                    active={pasteTarget === "evid"}
                    file={evidFile}
                    onClear={() => setEvidFile(null)}
                  />

                  {selecionada.rh_evid_url && (
                    <div className="text-xs text-gray-600">
                      Evidência RH atual:{" "}
                      <a
                        className="text-blue-600 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={selecionada.rh_evid_url}
                      >
                        {fileNameFromUrl(selecionada.rh_evid_url)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeRH}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={salvarLancamentoRH}
                disabled={loading}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Marcar como Lançado no Transnet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function Card({ titulo, valor }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="text-sm text-gray-600">{titulo}</div>
      <div className="text-2xl font-bold">{valor}</div>
    </div>
  );
}
function Th({ children }) {
  return <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
function Info({ titulo, valor }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className="text-sm font-medium break-words">{valor}</div>
    </div>
  );
}
