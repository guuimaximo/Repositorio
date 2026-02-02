// src/pages/TratativasRH.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
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
function norm(s) {
  return String(s || "").trim().toLowerCase();
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

function BadgeAcao({ acao }) {
  const isSusp = acao === "Suspensão";
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
        isSusp ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800",
      ].join(" ")}
    >
      {acao || "—"}
    </span>
  );
}
function StatusBadge({ lancado }) {
  return lancado ? (
    <span className="text-emerald-700 font-semibold">Concluída</span>
  ) : (
    <span className="text-orange-700 font-semibold">Pendente</span>
  );
}

/* =========================
   UI helpers (layout Central)
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

export default function TratativasRH() {
  const { user } = useContext(AuthContext);

  // filtros (padrão Central)
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("PENDENTE"); // PENDENTE | CONCLUIDA | TODOS
  const [acaoFiltro, setAcaoFiltro] = useState("TODOS"); // TODOS | Advertência | Suspensão

  // dados
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // modal
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(null);

  // lançamento RH
  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);

  // paste (print) — no próprio campo
  const pasteBoxRef = useRef(null);

  // =========================
  // Upload helpers
  // =========================
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

  // =========================
  // PASTE REAL (Ctrl+V) -> File
  // =========================
  function makeFileFromClipboardImage(blobFile) {
    const type = blobFile?.type || "image/png";
    const ext = type === "image/jpeg" ? "jpg" : "png";
    const name = `print_transnet_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    return new File([blobFile], name, { type, lastModified: Date.now() });
  }
  function onPasteEvid(e) {
    const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
    const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const f = imgItem.getAsFile();
    if (!f) return;
    setEvidFile(makeFileFromClipboardImage(f));
  }

  // =========================
  // Carregar listagem (igual Central)
  // =========================
  async function load() {
    setLoading(true);
    try {
      // 1) detalhes do tratador que geram RH (Advertência/Suspensão)
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
            hora_ocorrido
          )
        `
        )
        .in("acao_aplicada", Array.from(ACOES_RH))
        .order("created_at", { ascending: false })
        .limit(1500);

      if (error) throw error;

      const detalhes = (data || []).filter((d) => d?.tratativas?.id);
      const tratativaIds = Array.from(new Set(detalhes.map((d) => d.tratativa_id))).filter(Boolean);

      // 2) status RH (por tratativa_id)
      const rhMap = new Map();
      if (tratativaIds.length > 0) {
        // ⚠️ selecione apenas colunas que existem no seu schema
        const { data: rh, error: erh } = await supabase
          .from("tratativas_rh")
          .select(
            "id, tratativa_id, status_rh, lancado_transnet, evidencia_transnet_url, observacao_rh, lancado_em, tratado_por_login, tratado_por_nome, tratado_por_id, created_at"
          )
          .in("tratativa_id", tratativaIds);

        if (erh) throw erh;
        (rh || []).forEach((r) => rhMap.set(r.tratativa_id, r));
      }

      const merged = detalhes.map((d) => {
        const t = d.tratativas;
        const rh = rhMap.get(d.tratativa_id) || null;

        const rhLancado =
          Boolean(rh?.lancado_transnet) ||
          String(rh?.status_rh || "").toUpperCase().includes("CONCL");

        return {
          detalhe_id: d.id,
          detalhe_created_at: d.created_at,
          tratativa_id: d.tratativa_id,

          acao_aplicada: d.acao_aplicada,
          observacoes_tratador: d.observacoes || "",
          evidencia_conclusao_url: d.imagem_tratativa || null,
          anexo_tratador_url: d.anexo_tratativa || null,
          tratado_por_nome: d.tratado_por_nome || d.tratado_por_login || "—",

          motorista_nome: t?.motorista_nome || "",
          motorista_chapa: t?.motorista_chapa || "",
          tipo_ocorrencia: t?.tipo_ocorrencia || "",
          prioridade: t?.prioridade || "",
          setor_origem: t?.setor_origem || "",
          linha: t?.linha || "",
          descricao: t?.descricao || "",
          data_ocorrido: t?.data_ocorrido || null,
          hora_ocorrido: t?.hora_ocorrido || "",

          // RH
          rh_id: rh?.id || null,
          rh_lancado: rhLancado,
          rh_status: rh?.status_rh || (rhLancado ? "CONCLUIDA" : "PENDENTE"),
          rh_obs: rh?.observacao_rh || "",
          rh_evid_url: rh?.evidencia_transnet_url || null,
          rh_lancado_em: rh?.lancado_em || null,
          rh_tratado_por_nome: rh?.tratado_por_nome || rh?.tratado_por_login || "—",
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

  // =========================
  // Filtros (como Central)
  // =========================
  const filtered = useMemo(() => {
    const q = norm(busca);

    return rows.filter((r) => {
      // status
      if (status === "PENDENTE" && r.rh_lancado) return false;
      if (status === "CONCLUIDA" && !r.rh_lancado) return false;

      // ação
      if (acaoFiltro !== "TODOS" && r.acao_aplicada !== acaoFiltro) return false;

      // busca
      if (!q) return true;
      const blob = norm(
        [
          r.motorista_nome,
          r.motorista_chapa,
          r.acao_aplicada,
          r.tipo_ocorrencia,
          r.prioridade,
          r.setor_origem,
          r.linha,
          r.descricao,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return blob.includes(q);
    });
  }, [rows, busca, status, acaoFiltro]);

  const counts = useMemo(() => {
    let pend = 0;
    let concl = 0;
    let adv = 0;
    let susp = 0;

    rows.forEach((r) => {
      if (r.rh_lancado) concl += 1;
      else pend += 1;

      if (r.acao_aplicada === "Advertência") adv += 1;
      if (r.acao_aplicada === "Suspensão") susp += 1;
    });

    return { pend, concl, adv, susp, total: rows.length };
  }, [rows]);

  // =========================
  // Abrir/fechar modal
  // =========================
  function openModal(r) {
    setSel(r);
    setObsRH(r.rh_obs || "");
    setEvidFile(null);
    setAberto(true);

    // dica: foco no paste box para Ctrl+V funcionar na hora
    setTimeout(() => {
      pasteBoxRef.current?.focus?.();
    }, 150);
  }
  function closeModal() {
    setAberto(false);
    setSel(null);
    setObsRH("");
    setEvidFile(null);
  }

  // =========================
  // Render evidências (thumb se imagem, link se PDF)
  // =========================
  const renderThumbOrLink = (url) => {
    if (!url) return <span className="text-gray-400">—</span>;
    const img = isImageUrl(url) && !isPdf(url);

    return img ? (
      <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir">
        <img
          src={url}
          alt={fileNameFromUrl(url)}
          className="h-14 w-14 rounded border object-cover hover:opacity-90"
          loading="lazy"
        />
      </a>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline text-xs"
        title="Abrir arquivo"
      >
        {fileNameFromUrl(url)}
      </a>
    );
  };

  // =========================
  // Botão “Fechar Medida” (lançar RH)
  // =========================
  async function fecharMedidaRH() {
    if (!sel) return;

    // se já foi lançado, não deixa lançar de novo
    if (sel.rh_lancado) {
      alert("Esta medida já está concluída no RH.");
      return;
    }

    if (!obsRH?.trim()) {
      alert("Informe a observação do RH (ex.: 'Lançado no Transnet').");
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
        `${sel.tratativa_id}/rh_transnet`
      );

      // upsert por tratativa_id (precisa UNIQUE(tratativa_id))
      const up = await supabase
        .from("tratativas_rh")
        .upsert(
          {
            tratativa_id: sel.tratativa_id,
            status_rh: "CONCLUIDA",
            lancado_transnet: true,
            lancado_em: new Date().toISOString(),
            observacao_rh: obsRH.trim(),
            evidencia_transnet_url: evidUrl,

            tratado_por_login: loginSessao,
            tratado_por_nome: nomeSessao,
            tratado_por_id: idSessao,
          },
          { onConflict: "tratativa_id" }
        );

      if (up.error) throw up.error;

      alert("RH: medida fechada com sucesso (Transnet lançado).");
      closeModal();
      await load();
    } catch (e) {
      alert(`Erro ao fechar medida: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // File Picker “bonito”
  // =========================
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

  // =========================
  // PasteBox “clique e cole” (REAL)
  // =========================
  const PasteBox = ({ file, onClear, disabled }) => {
    return (
      <div
        ref={pasteBoxRef}
        tabIndex={disabled ? -1 : 0}
        onPaste={disabled ? undefined : onPasteEvid}
        onClick={() => {
          if (!disabled) pasteBoxRef.current?.focus?.();
        }}
        className={[
          "rounded-md border p-3 bg-gray-50 cursor-pointer select-none outline-none",
          disabled ? "opacity-60 cursor-not-allowed" : "border-dashed hover:bg-gray-100",
        ].join(" ")}
        title="Clique e cole o Print (Ctrl+V)"
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
              disabled={disabled}
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="mt-1 text-xs text-gray-500">
            {disabled ? "—" : "Ctrl+V para colar (print) após clicar aqui"}
          </div>
        )}
      </div>
    );
  };

  const modoConsulta = Boolean(sel?.rh_lancado);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* header (padrão Central) */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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

      {/* cards (padrão Central) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Card titulo="Pendentes RH" valor={counts.pend} />
        <Card titulo="Concluídas RH" valor={counts.concl} />
        <Card titulo="Advertências" valor={counts.adv} />
        <Card titulo="Suspensões" valor={counts.susp} />
        <Card titulo="Total" valor={counts.total} />
      </div>

      {/* filtros (padrão Central) */}
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
            <option value="CONCLUIDA">Concluídas</option>
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

      {/* tabela (padrão Central) */}
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
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.tratativa_id}-${r.detalhe_id}`} className="border-t">
                  <Td>{brDateTime(r.detalhe_created_at)}</Td>
                  <Td className="font-medium">{r.motorista_nome || "—"}</Td>
                  <Td>{r.motorista_chapa || "—"}</Td>
                  <Td>
                    <BadgeAcao acao={r.acao_aplicada} />
                  </Td>
                  <Td className="max-w-[260px] truncate" title={r.tipo_ocorrencia || ""}>
                    {r.tipo_ocorrencia || "—"}
                  </Td>
                  <Td>{r.linha || "—"}</Td>
                  <Td>
                    <StatusBadge lancado={r.rh_lancado} />
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openModal(r)}
                      className={[
                        "rounded-md px-3 py-2 text-xs font-semibold text-white",
                        r.rh_lancado ? "bg-gray-900 hover:bg-black" : "bg-emerald-600 hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {r.rh_lancado ? "Consultar" : "Lançar"}
                    </button>
                  </Td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    Nenhuma tratativa RH encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (LANÇAR / CONSULTAR) */}
      {aberto && sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  {modoConsulta ? "Consultar (RH)" : "Lançar no Transnet (RH)"}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">{sel.acao_aplicada}</span> •{" "}
                  {sel.motorista_nome} ({sel.motorista_chapa})
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* infos base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info titulo="Ocorrência" valor={sel.tipo_ocorrencia || "—"} />
                <Info titulo="Data Ocorrido" valor={brDate(sel.data_ocorrido)} />
                <Info titulo="Linha" valor={sel.linha || "—"} />
                <Info titulo="Prioridade" valor={sel.prioridade || "—"} />
              </div>

              {/* resumo do tratador */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Resumo / Observações (Tratador)</div>
                <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {sel.observacoes_tratador || "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Tratado por: <span className="font-semibold">{sel.tratado_por_nome}</span>
                </div>
              </div>

              {/* evidências do tratador */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Evidência (Tratador)</div>
                  {sel.evidencia_conclusao_url ? (
                    renderThumbOrLink(sel.evidencia_conclusao_url)
                  ) : (
                    <div className="text-sm text-gray-400">—</div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Anexo (Tratador)</div>
                  {sel.anexo_tratador_url ? (
                    renderThumbOrLink(sel.anexo_tratador_url)
                  ) : (
                    <div className="text-sm text-gray-400">—</div>
                  )}
                </div>
              </div>

              <hr />

              {/* RH */}
              <div>
                <div className="text-sm font-semibold mb-2">RH (Transnet)</div>

                {modoConsulta ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Info titulo="Status RH" valor="Concluída" />
                      <Info
                        titulo="Lançado em"
                        valor={sel.rh_lancado_em ? brDateTime(sel.rh_lancado_em) : "—"}
                      />
                      <Info
                        titulo="Lançado por"
                        valor={sel.rh_tratado_por_nome || "—"}
                      />
                      <Info titulo="Ação" valor={sel.acao_aplicada || "—"} />
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Observação RH</div>
                      <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                        {sel.rh_obs || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Evidência RH (Transnet)</div>
                      {sel.rh_evid_url ? (
                        renderThumbOrLink(sel.rh_evid_url)
                      ) : (
                        <div className="text-sm text-gray-400">—</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-600 mb-1">Observação RH</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border px-3 py-2"
                      placeholder="Ex.: Lançado no Transnet (print anexado)."
                      value={obsRH}
                      onChange={(e) => setObsRH(e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Evidência (arquivo)</div>
                        <FilePicker
                          id="rh_evid_file"
                          accept="image/*,application/pdf"
                          selectedFile={evidFile}
                          onPick={setEvidFile}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Evidência (print)</div>
                        <PasteBox
                          file={evidFile}
                          onClear={() => setEvidFile(null)}
                          disabled={false}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Dica: clique no campo “Clique e cole o Print” e use <b>Ctrl+V</b>.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>

              {!modoConsulta && (
                <button
                  onClick={fecharMedidaRH}
                  disabled={loading}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Salvando..." : "Fechar Medida"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
