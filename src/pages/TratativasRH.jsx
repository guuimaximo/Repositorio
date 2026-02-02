// src/pages/TratativasRH.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

const ACOES_RH = new Set(["Advertência", "Suspensão"]);

/* =========================
   Utils
========================= */
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

/* =========================
   UI (igual Central)
========================= */
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
    </div>
  );
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

/* =========================
   Consolidação RH
   Regra: agrupa por (chapa + ação + evidência_base)
   evidência_base = evidencia_conclusao_url || anexo_tratador_url
========================= */
function buildKey({ motorista_chapa, acao_aplicada, evidencia_base }) {
  return `${String(motorista_chapa || "").trim()}|${String(acao_aplicada || "").trim()}|${String(
    evidencia_base || ""
  ).trim()}`;
}

/* =========================
   Upload
========================= */
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

/* =========================
   Paste (robusto)
========================= */
function makeFileFromClipboardImage(blobFile) {
  const type = blobFile?.type || "image/png";
  const ext = type === "image/jpeg" ? "jpg" : "png";
  const name = `print_transnet_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
  return new File([blobFile], name, { type, lastModified: Date.now() });
}
function extractPasteFile(e) {
  // 1) tenta items
  const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
  const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
  if (imgItem) {
    const f = imgItem.getAsFile();
    if (f) return makeFileFromClipboardImage(f);
  }

  // 2) tenta files
  const files = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
  const imgFile = files.find((f) => String(f.type || "").startsWith("image/"));
  if (imgFile) return makeFileFromClipboardImage(imgFile);

  return null;
}

export default function TratativasRH() {
  useContext(AuthContext);

  // filtros
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(""); // "" | PENDENTE | CONCLUIDA
  const [acaoFiltro, setAcaoFiltro] = useState(""); // "" | Advertência | Suspensão

  // dados consolidados (1 linha por lançamento)
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]); // linhas da tabela

  // modal
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(null);

  // campos RH
  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);

  const pasteBoxRef = useRef(null);

  /* =========================
     Render evidências
  ========================= */
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
      >
        {fileNameFromUrl(url)}
      </a>
    );
  };

  /* =========================
     Load (consolidado)
  ========================= */
  async function load() {
    setLoading(true);
    try {
      // 1) pega detalhes que viram RH + dados da tratativa
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
        .limit(5000);

      if (error) throw error;

      const detalhes = (data || []).filter((d) => d?.tratativas?.id);

      // 2) consolida por chave (chapa+acao+evidencia_base)
      const map = new Map();

      for (const d of detalhes) {
        const t = d.tratativas;

        const evidencia_base = d.imagem_tratativa || d.anexo_tratativa || "";
        const key = buildKey({
          motorista_chapa: t?.motorista_chapa,
          acao_aplicada: d.acao_aplicada,
          evidencia_base,
        });

        if (!map.has(key)) {
          map.set(key, {
            key,
            motorista_nome: t?.motorista_nome || "",
            motorista_chapa: t?.motorista_chapa || "",
            acao_aplicada: d.acao_aplicada,
            evidencia_base,

            // dados para exibir
            last_created_at: d.created_at,
            tratado_por_nome: d.tratado_por_nome || d.tratado_por_login || "—",

            // itens consolidados
            itens: [],
          });
        }

        const g = map.get(key);
        g.itens.push({
          detalhe_id: d.id,
          detalhe_created_at: d.created_at,
          tratativa_id: d.tratativa_id,
          tipo_ocorrencia: t?.tipo_ocorrencia || "",
          linha: t?.linha || "",
          prioridade: t?.prioridade || "",
          data_ocorrido: t?.data_ocorrido || null,
          hora_ocorrido: t?.hora_ocorrido || "",
          descricao: t?.descricao || "",
          setor_origem: t?.setor_origem || "",

          observacoes_tratador: d.observacoes || "",
          evidencia_conclusao_url: d.imagem_tratativa || null,
          anexo_tratador_url: d.anexo_tratativa || null,
        });

        // atualiza “última data”
        if (new Date(d.created_at).getTime() > new Date(g.last_created_at).getTime()) {
          g.last_created_at = d.created_at;
        }
      }

      const grouped = Array.from(map.values()).sort(
        (a, b) => new Date(b.last_created_at).getTime() - new Date(a.last_created_at).getTime()
      );

      // 3) busca status de lançamento consolidado no RH
      const keys = grouped.map((g) => g.key);
      const lancMap = new Map();

      if (keys.length > 0) {
        // chunk pra não estourar URL
        const chunkSize = 200;
        for (let i = 0; i < keys.length; i += chunkSize) {
          const slice = keys.slice(i, i + chunkSize);
          const { data: rh, error: erh } = await supabase
            .from("tratativas_rh_lancamentos")
            .select(
              "id, chave_consolidacao, status_rh, lancado_transnet, lancado_em, observacao_rh, evidencia_transnet_url"
            )
            .in("chave_consolidacao", slice);

          if (erh) throw erh;
          (rh || []).forEach((r) => lancMap.set(r.chave_consolidacao, r));
        }
      }

      // 4) merge
      const merged = grouped.map((g) => {
        const rh = lancMap.get(g.key) || null;
        const rhLancado =
          Boolean(rh?.lancado_transnet) || String(rh?.status_rh || "").toUpperCase().includes("CONCL");

        return {
          ...g,
          rh_id: rh?.id || null,
          rh_lancado: rhLancado,
          rh_status: rh?.status_rh || (rhLancado ? "CONCLUIDA" : "PENDENTE"),
          rh_obs: rh?.observacao_rh || "",
          rh_evid_url: rh?.evidencia_transnet_url || null,
          rh_lancado_em: rh?.lancado_em || null,
        };
      });

      setGroups(merged);
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

  /* =========================
     Filtros (sobre groups)
  ========================= */
  const filtered = useMemo(() => {
    const q = norm(busca);

    return groups.filter((g) => {
      if (status && status === "PENDENTE" && g.rh_lancado) return false;
      if (status && status === "CONCLUIDA" && !g.rh_lancado) return false;

      if (acaoFiltro && g.acao_aplicada !== acaoFiltro) return false;

      if (!q) return true;

      const blob = norm(
        [
          g.motorista_nome,
          g.motorista_chapa,
          g.acao_aplicada,
          // inclui ocorrências consolidadas
          ...g.itens.map((i) => `${i.tipo_ocorrencia} ${i.linha} ${i.descricao}`),
        ]
          .filter(Boolean)
          .join(" ")
      );

      return blob.includes(q);
    });
  }, [groups, busca, status, acaoFiltro]);

  const counts = useMemo(() => {
    let total = groups.length;
    let pend = 0;
    let concl = 0;
    let adv = 0;
    let susp = 0;

    groups.forEach((g) => {
      if (g.rh_lancado) concl += 1;
      else pend += 1;

      if (g.acao_aplicada === "Advertência") adv += 1;
      if (g.acao_aplicada === "Suspensão") susp += 1;
    });

    return { total, pend, concl, adv, susp };
  }, [groups]);

  function limparFiltros() {
    setBusca("");
    setStatus("");
    setAcaoFiltro("");
  }

  /* =========================
     Modal open/close
  ========================= */
  function openModal(g) {
    setSel(g);
    setObsRH(g.rh_obs || "");
    setEvidFile(null);
    setAberto(true);

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

  const modoConsulta = Boolean(sel?.rh_lancado);

  /* =========================
     Paste global (garante funcionar)
     - enquanto modal aberto e modo lançamento
  ========================= */
  useEffect(() => {
    if (!aberto || modoConsulta) return;

    function handler(e) {
      const f = extractPasteFile(e);
      if (!f) return;

      // só captura se o modal está aberto (e o usuário pretende colar)
      // evita colar no resto da tela
      e.preventDefault();
      setEvidFile(f);
    }

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [aberto, modoConsulta]);

  /* =========================
     Fechar Medida (1 lançamento consolidado)
  ========================= */
  async function fecharMedidaRH() {
    if (!sel) return;

    if (sel.rh_lancado) {
      alert("Este lançamento RH já está concluído.");
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
      const evidUrl = await uploadToTratativasBucket(evidFile, `rh_consolidado/${sanitizeName(sel.motorista_chapa)}`);

      // 1) upsert do lançamento consolidado (1 registro)
      const upLanc = await supabase
        .from("tratativas_rh_lancamentos")
        .upsert(
          {
            chave_consolidacao: sel.key,
            motorista_chapa: sel.motorista_chapa,
            motorista_nome: sel.motorista_nome,
            acao_aplicada: sel.acao_aplicada,

            status_rh: "CONCLUIDA",
            lancado_transnet: true,
            lancado_em: new Date().toISOString(),

            observacao_rh: obsRH.trim(),
            evidencia_transnet_url: evidUrl,
          },
          { onConflict: "chave_consolidacao" }
        )
        .select("id")
        .single();

      if (upLanc.error) throw upLanc.error;
      const lancamentoId = upLanc.data?.id;
      if (!lancamentoId) throw new Error("Não foi possível obter o ID do lançamento consolidado.");

      // 2) vincula todas as tratativas ao lançamento
      const itensPayload = (sel.itens || []).map((i) => ({
        lancamento_id: lancamentoId,
        tratativa_id: i.tratativa_id,
        detalhe_id: i.detalhe_id,
      }));

      if (itensPayload.length > 0) {
        const upItens = await supabase
          .from("tratativas_rh_lancamentos_itens")
          .upsert(itensPayload, { onConflict: "lancamento_id,tratativa_id" });

        if (upItens.error) throw upItens.error;
      }

      alert(`RH: lançado no Transnet com sucesso. (${sel.itens.length} tratativas consolidadas)`);
      closeModal();
      await load();
    } catch (e) {
      alert(`Erro ao fechar medida: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Components
  ========================= */
  function Th({ children }) {
    return <th className="py-2 px-3 text-left whitespace-nowrap">{children}</th>;
  }
  function Td({ children, className = "" }) {
    return <td className={`py-2 px-3 ${className}`}>{children}</td>;
  }

  function PasteBox({ file, onClear, disabled }) {
    return (
      <div
        ref={pasteBoxRef}
        tabIndex={disabled ? -1 : 0}
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
  }

  function FilePicker({ id, accept, onPick, selectedFile }) {
    return (
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
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Tratativas RH</h1>

      {/* 🔍 Filtros (igual Central) */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar (motorista, chapa, ocorrência, linha...)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border rounded-md px-3 py-2"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONCLUIDA">Concluída</option>
          </select>

          <select
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todas as Ações</option>
            <option value="Advertência">Advertência</option>
            <option value="Suspensão">Suspensão</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            {loading ? "Carregando..." : `${filtered.length} registros`}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={limparFiltros}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Limpar
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* 🧾 Cards (coloridos igual Central) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <CardResumo titulo="Total" valor={counts.total} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes" valor={counts.pend} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Concluídas" valor={counts.concl} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Advertências" valor={counts.adv} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Suspensões" valor={counts.susp} cor="bg-red-100 text-red-700" />
      </div>

      {/* 📋 Tabela (cabeçalho azul igual Central) */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <Th>Data</Th>
              <Th>Motorista</Th>
              <Th>Chapa</Th>
              <Th>Ação</Th>
              <Th>Tratativas</Th>
              <Th>Status RH</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  Nenhuma tratativa RH encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.key} className="border-t hover:bg-gray-50">
                  <Td className="text-gray-600">{brDateTime(g.last_created_at)}</Td>
                  <Td className="text-gray-700 font-medium">{g.motorista_nome || "—"}</Td>
                  <Td className="text-gray-700">{g.motorista_chapa || "—"}</Td>
                  <Td>
                    <BadgeAcao acao={g.acao_aplicada} />
                  </Td>
                  <Td className="text-gray-700">
                    <span className="font-semibold">{g.itens.length}</span>{" "}
                    <span className="text-gray-500">consolidada(s)</span>
                  </Td>
                  <Td className="text-gray-700">
                    {g.rh_lancado ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Concluída
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openModal(g)}
                      className={[
                        "px-3 py-1 rounded-md text-sm text-white",
                        g.rh_lancado ? "bg-gray-500 hover:bg-gray-600" : "bg-emerald-600 hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {g.rh_lancado ? "Consultar" : "Lançar"}
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {aberto && sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  {modoConsulta ? "Consultar (RH)" : "Lançar no Transnet (RH)"}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">{sel.acao_aplicada}</span> •{" "}
                  {sel.motorista_nome} ({sel.motorista_chapa}) •{" "}
                  <b>{sel.itens.length}</b> tratativa(s) consolidada(s)
                </div>
              </div>
              <button
                onClick={closeModal}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Lista consolidada */}
              <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="py-2 px-3 text-left">Data</th>
                      <th className="py-2 px-3 text-left">Ocorrência</th>
                      <th className="py-2 px-3 text-left">Linha</th>
                      <th className="py-2 px-3 text-left">Prioridade</th>
                      <th className="py-2 px-3 text-left">Setor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sel.itens.map((i) => (
                      <tr key={i.detalhe_id} className="border-t">
                        <td className="py-2 px-3 text-gray-700">{brDateTime(i.detalhe_created_at)}</td>
                        <td className="py-2 px-3 text-gray-700">{i.tipo_ocorrencia || "—"}</td>
                        <td className="py-2 px-3 text-gray-700">{i.linha || "—"}</td>
                        <td className="py-2 px-3 text-gray-700">{i.prioridade || "—"}</td>
                        <td className="py-2 px-3 text-gray-700">{i.setor_origem || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Evidência/Anexo do tratador (pega do primeiro item) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Evidência (Tratador)</div>
                  {renderThumbOrLink(sel.itens?.[0]?.evidencia_conclusao_url)}
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Anexo (Tratador)</div>
                  {renderThumbOrLink(sel.itens?.[0]?.anexo_tratador_url)}
                </div>
              </div>

              <hr />

              <div>
                <div className="text-sm font-semibold mb-2">RH (Transnet)</div>

                {modoConsulta ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Status RH</div>
                        <div className="text-sm font-medium">Concluída</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Lançado em</div>
                        <div className="text-sm font-medium">
                          {sel.rh_lancado_em ? brDateTime(sel.rh_lancado_em) : "—"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Observação RH</div>
                      <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                        {sel.rh_obs || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Evidência RH (Transnet)</div>
                      {sel.rh_evid_url ? renderThumbOrLink(sel.rh_evid_url) : <div className="text-sm text-gray-400">—</div>}
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
                        <PasteBox file={evidFile} onClear={() => setEvidFile(null)} disabled={false} />
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Dica: com o modal aberto, você pode colar com <b>Ctrl+V</b> (mesmo sem clicar) — e também pode clicar na caixa para focar.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Cancelar
              </button>

              {!modoConsulta && (
                <button
                  onClick={fecharMedidaRH}
                  disabled={loading}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
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
