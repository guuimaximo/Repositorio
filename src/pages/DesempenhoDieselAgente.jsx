// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import {
  FaBolt,
  FaCloud,
  FaDatabase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSyncAlt,
  FaPlay,
  FaSearch,
  FaFilePdf,
  FaFileCode,
  FaImage,
  FaExternalLinkAlt,
  FaFilter,
  FaBroom,
} from "react-icons/fa";

const API_BASE = "https://agentediesel.onrender.com";
const BUCKET = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 80;

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function GlowCard({ children, className = "" }) {
  return (
    <div
      className={clsx(
        "relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(56,189,248,0.12),transparent_40%),radial-gradient(900px_circle_at_80%_30%,rgba(217,70,239,0.12),transparent_45%)]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Pill({ tone = "neutral", icon = null, children }) {
  const toneCls = {
    neutral: "border-white/10 bg-white/5 text-gray-100",
    blue: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    red: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    yellow: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    purple: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        toneCls
      )}
    >
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function fmtDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtBR(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString("pt-BR");
  } catch {
    return String(dt || "");
  }
}

function normalizePath(p) {
  if (!p) return "";
  return String(p).replace(/^\/+/, "");
}

function getFolderFromPath(p) {
  const parts = normalizePath(p).split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

async function makeUrlFromPath(path, expiresIn = 3600) {
  const clean = normalizePath(path);

  // signed (bucket privado)
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(clean, expiresIn);
  if (!error && data?.signedUrl) return { url: data.signedUrl, mode: "signed", path: clean };

  // fallback public
  const pub = supabase.storage.from(BUCKET).getPublicUrl(clean);
  return { url: pub?.data?.publicUrl, mode: "public", path: clean };
}

function statusToneFrom({ loading, erro, ok }) {
  if (loading) return "yellow";
  if (erro) return "red";
  if (ok) return "green";
  return "neutral";
}
function statusTextFrom({ loading, erro, ok }) {
  if (loading) return "PROCESSANDO";
  if (erro) return "FALHOU";
  if (ok) return "SUCESSO";
  return "PRONTO";
}

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // Histórico
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  // Visualização
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  // UI
  const [showFilters, setShowFilters] = useState(true);
  const [searchText, setSearchText] = useState("");

  // anti erro ao sair da página
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroLinha, setFiltroLinha] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroCluster, setFiltroCluster] = useState("");

  // ✅ validação sem timezone (YYYY-MM-DD compara correto)
  function validarPeriodo() {
    if (!periodoInicio || !periodoFim) return true;
    return String(periodoInicio) <= String(periodoFim);
  }

  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo = ini && fim ? `${ini} → ${fim}` : ini || fim ? ini || fim : "Sem período";
    return `Relatório Diesel — ${periodo}`;
  }

  async function carregarHistorico() {
    setHistoricoLoading(true);
    setHistoricoErro(null);

    try {
      const q = supabase
        .from("relatorios_gerados")
        .select(
          "id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg"
        )
        .eq("tipo", TIPO_RELATORIO)
        .order("created_at", { ascending: false })
        .limit(LIMIT_HISTORICO);

      const { data, error } = await q;
      if (error) throw error;

      if (!mountedRef.current) return;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!mountedRef.current) return;
      setHistoricoErro(String(e?.message || e));
      setItems([]);
    } finally {
      if (mountedRef.current) setHistoricoLoading(false);
    }
  }

  async function abrirRelatorio(it) {
    setSelected(it);
    setUrls(null);
    setUrlsErro(null);
    setUrlsLoading(true);

    try {
      const arquivoPath = normalizePath(it?.arquivo_path || "");
      if (!arquivoPath) throw new Error("arquivo_path vazio no relatorios_gerados");

      const folder = getFolderFromPath(arquivoPath);

      let pdfPath = arquivoPath;
      if (!/\.pdf$/i.test(pdfPath)) pdfPath = `${folder}/Relatorio_Gerencial.pdf`;

      let htmlPath = arquivoPath;
      if (!/\.html$/i.test(htmlPath)) htmlPath = `${folder}/Relatorio_Gerencial.html`;

      const pngPath = `${folder}/cluster_evolution_unificado.png`;

      const [pdfRes, htmlRes, pngRes] = await Promise.all([
        makeUrlFromPath(pdfPath, 3600),
        makeUrlFromPath(htmlPath, 3600),
        makeUrlFromPath(pngPath, 3600),
      ]);

      if (!mountedRef.current) return;

      setUrls({
        pdf: pdfRes.url,
        pdf_path_used: pdfRes.path,
        pdf_mode: pdfRes.mode,
        html: htmlRes?.url || null,
        html_path_used: htmlRes?.path || null,
        html_mode: htmlRes?.mode || null,
        png: pngRes?.url || null,
        folder,
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setUrlsErro(String(e?.message || e));
    } finally {
      if (mountedRef.current) setUrlsLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function gerar() {
    setLoading(true);
    setErro(null);
    setResp(null);

    try {
      if (!validarPeriodo()) throw new Error("Período inválido: Data início maior que Data fim.");

      const payload = {
        tipo: TIPO_RELATORIO,
        periodo_inicio: periodoInicio ? String(periodoInicio) : null,
        periodo_fim: periodoFim ? String(periodoFim) : null,
        motorista: filtroMotorista?.trim() ? filtroMotorista.trim() : null,
        linha: filtroLinha?.trim() ? filtroLinha.trim() : null,
        veiculo: filtroVeiculo?.trim() ? filtroVeiculo.trim() : null,
        cluster: filtroCluster?.trim() ? filtroCluster.trim() : null,
      };

      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        const detail = data?.error || data?.detail || `HTTP ${r.status}`;
        setResp(data);
        throw new Error(detail);
      }

      setResp(data);
      await carregarHistorico();

      if (data?.report_id) {
        const { data: row, error } = await supabase
          .from("relatorios_gerados")
          .select(
            "id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg"
          )
          .eq("id", data.report_id)
          .single();

        if (!error && row) await abrirRelatorio(row);
      }
    } catch (e) {
      setErro(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const canRenderPdf = !!urls?.pdf;

  const statusTone = useMemo(
    () => statusToneFrom({ loading, erro, ok: resp?.ok === true }),
    [loading, erro, resp]
  );
  const statusText = useMemo(
    () => statusTextFrom({ loading, erro, ok: resp?.ok === true }),
    [loading, erro, resp]
  );

  const statusIcon = useMemo(() => {
    if (loading) return <FaBolt className="text-amber-200" />;
    if (erro) return <FaTimesCircle className="text-rose-200" />;
    if (resp?.ok === true) return <FaCheckCircle className="text-emerald-200" />;
    return <FaCloud className="text-cyan-200" />;
  }, [loading, erro, resp]);

  const filteredItems = useMemo(() => {
    const q = (searchText || "").trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const a = String(it?.arquivo_nome || "").toLowerCase();
      const b = String(it?.arquivo_path || "").toLowerCase();
      const c = String(it?.status || "").toLowerCase();
      const d = String(it?.periodo_inicio || "").toLowerCase();
      const e = String(it?.periodo_fim || "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q) || e.includes(q);
    });
  }, [items, searchText]);

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    const ini = selected?.periodo_inicio ? String(selected.periodo_inicio) : "—";
    const fim = selected?.periodo_fim ? String(selected.periodo_fim) : "—";
    return { ini, fim };
  }, [selected]);

  const clearFilters = () => {
    setPeriodoInicio(fmtDateInput(primeiroDiaMes));
    setPeriodoFim(fmtDateInput(hoje));
    setFiltroMotorista("");
    setFiltroLinha("");
    setFiltroVeiculo("");
    setFiltroCluster("");
  };

  return (
    <div className="min-h-[calc(100vh-140px)]">
      {/* Background futurista */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_10%_10%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(900px_circle_at_90%_20%,rgba(217,70,239,0.16),transparent_40%),radial-gradient(900px_circle_at_60%_90%,rgba(34,197,94,0.10),transparent_55%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        </div>

        {/* Header */}
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                <FaBolt className="text-cyan-200" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Agente Diesel <span className="text-cyan-200">AI</span>
                </h2>
                <p className="text-sm text-white/60">
                  Geração (API) e visualização (Supabase Storage) no INOVE.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill tone="blue" icon={<FaCloud />}>
                API: {API_BASE}
              </Pill>
              <Pill tone="purple" icon={<FaDatabase />}>
                Bucket: {BUCKET}
              </Pill>
              <Pill tone={statusTone} icon={statusIcon}>
                {statusText}
              </Pill>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              type="button"
            >
              <FaFilter />
              {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            </button>

            <button
              onClick={gerar}
              disabled={loading}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                "border border-cyan-400/20",
                loading
                  ? "bg-white/10 text-white/60 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-400/20 to-fuchsia-400/20 text-white hover:from-cyan-400/30 hover:to-fuchsia-400/30"
              )}
              title="Executa a geração do relatório na API"
            >
              <FaPlay />
              {loading ? "Gerando..." : "Gerar análise"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="relative mt-5">
            <GlowCard className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FaFilter className="text-white/70" />
                    <p className="text-sm font-semibold text-white">Filtros Operacionais</p>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    Campos em branco não filtram. Datas no formato YYYY-MM-DD.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                  >
                    <FaBroom />
                    Limpar
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-white/60">Data início</label>
                  <input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60">Data fim</label>
                  <input
                    type="date"
                    value={periodoFim}
                    onChange={(e) => setPeriodoFim(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60">Motorista</label>
                  <input
                    value={filtroMotorista}
                    onChange={(e) => setFiltroMotorista(e.target.value)}
                    placeholder="Chapa ou nome"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60">Linha</label>
                  <input
                    value={filtroLinha}
                    onChange={(e) => setFiltroLinha(e.target.value)}
                    placeholder="Ex: 08TR"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60">Veículo</label>
                  <input
                    value={filtroVeiculo}
                    onChange={(e) => setFiltroVeiculo(e.target.value)}
                    placeholder="Prefixo"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60">Cluster</label>
                  <select
                    value={filtroCluster}
                    onChange={(e) => setFiltroCluster(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                  >
                    <option value="">(Todos)</option>
                    <option value="C6">C6</option>
                    <option value="C8">C8</option>
                    <option value="C9">C9</option>
                    <option value="C10">C10</option>
                    <option value="C11">C11</option>
                  </select>
                </div>
              </div>

              {/* Validação de período */}
              {!validarPeriodo() && (
                <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <FaExclamationTriangle />
                    Período inválido
                  </div>
                  <div className="mt-1 text-xs text-rose-100/80">
                    A data de início deve ser menor ou igual à data fim.
                  </div>
                </div>
              )}
            </GlowCard>
          </div>
        )}

        {/* Conteúdo: Viewer + Histórico */}
        <div className="relative mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Viewer */}
          <GlowCard className="p-4 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="text-white/80" />
                  <h3 className="text-sm font-semibold text-white">Visualização do Relatório</h3>
                </div>

                {!selected ? (
                  <p className="mt-1 text-xs text-white/60">
                    Selecione um relatório no histórico para visualizar o PDF no painel.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    <div className="truncate">
                      <span className="text-white/80 font-semibold">Selecionado:</span>{" "}
                      <span className="text-white/70">{labelRelatorio(selected)}</span>
                    </div>
                    <div>
                      <span className="text-white/80 font-semibold">Gerado em:</span>{" "}
                      <span className="text-white/70">{fmtBR(selected.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-white/80 font-semibold">Status:</span>{" "}
                      <span className="text-white/70">{String(selected.status || "")}</span>
                    </div>
                    {urls?.pdf_path_used && (
                      <div className="break-all">
                        <span className="text-white/80 font-semibold">PDF path usado:</span>{" "}
                        <span className="text-white/70">
                          {urls.pdf_path_used} ({urls.pdf_mode})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {urls?.pdf && (
                  <a
                    href={urls.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                    title="Abrir PDF em nova aba"
                  >
                    <FaExternalLinkAlt />
                    Abrir PDF
                  </a>
                )}
                {urls?.html && (
                  <a
                    href={urls.html}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                    title="Abrir HTML do relatório"
                  >
                    <FaFileCode />
                    Abrir HTML
                  </a>
                )}
                {urls?.png && (
                  <a
                    href={urls.png}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                    title="Abrir gráfico (PNG)"
                  >
                    <FaImage />
                    PNG
                  </a>
                )}
              </div>
            </div>

            {/* Status de carregamento/erro */}
            {urlsLoading && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <div className="flex items-center gap-2 font-semibold">
                  <FaSyncAlt className="animate-spin" />
                  Carregando URLs...
                </div>
              </div>
            )}

            {urlsErro && (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTimesCircle />
                  Falha ao abrir
                </div>
                <div className="mt-1 text-xs text-rose-100/80 break-all">{urlsErro}</div>
              </div>
            )}

            {/* IFRAME */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                  Viewer seguro (Signed URL)
                </div>
                <div className="text-xs text-white/50">
                  {selectedMeta ? (
                    <>
                      {selectedMeta.ini} → {selectedMeta.fim}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div style={{ height: 720 }} className="bg-black/20">
                {canRenderPdf ? (
                  <iframe
                    title="RelatorioPDF"
                    src={urls.pdf}
                    className="w-full h-full"
                    style={{ background: "transparent" }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-white/60">
                    Nenhum PDF disponível para exibir.
                  </div>
                )}
              </div>
            </div>
          </GlowCard>

          {/* Histórico */}
          <GlowCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FaDatabase className="text-white/80" />
                <h3 className="text-sm font-semibold text-white">Histórico</h3>
              </div>

              <button
                onClick={carregarHistorico}
                disabled={historicoLoading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition",
                  historicoLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10"
                )}
                title="Recarregar histórico"
              >
                <FaSyncAlt className={historicoLoading ? "animate-spin" : ""} />
                {historicoLoading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>

            {/* Busca */}
            <div className="mt-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar (status, período, arquivo, path...)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                <span>{filteredItems.length} item(ns)</span>
                {!!searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="text-white/70 hover:text-white transition"
                  >
                    limpar busca
                  </button>
                )}
              </div>
            </div>

            {historicoErro && (
              <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTimesCircle />
                  Erro ao carregar histórico
                </div>
                <div className="mt-1 text-xs text-rose-100/80 break-all">{historicoErro}</div>
              </div>
            )}

            {/* Lista */}
            <div className="mt-3 space-y-2">
              {!filteredItems.length ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                  Nenhum relatório encontrado.
                </div>
              ) : (
                filteredItems.map((it) => {
                  const isSel = selected?.id === it.id;

                  const tone =
                    it.status === "CONCLUIDO"
                      ? "green"
                      : it.status === "ERRO"
                      ? "red"
                      : it.status === "PROCESSANDO"
                      ? "yellow"
                      : "neutral";

                  const icon =
                    it.status === "CONCLUIDO" ? (
                      <FaCheckCircle />
                    ) : it.status === "ERRO" ? (
                      <FaTimesCircle />
                    ) : it.status === "PROCESSANDO" ? (
                      <FaBolt />
                    ) : (
                      <FaCloud />
                    );

                  return (
                    <div
                      key={it.id}
                      className={clsx(
                        "rounded-2xl border p-3 transition",
                        isSel
                          ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Pill tone={tone} icon={icon}>
                              {String(it.status || "—")}
                            </Pill>
                            <div className="truncate text-sm font-semibold text-white">
                              {labelRelatorio(it)}
                            </div>
                          </div>

                          <div className="mt-1 text-xs text-white/60">
                            {fmtBR(it.created_at)}
                            {it?.arquivo_nome ? (
                              <>
                                {" "}
                                • <span className="text-white/70">{it.arquivo_nome}</span>
                              </>
                            ) : null}
                          </div>

                          {it?.arquivo_path && (
                            <div className="mt-1 text-[11px] text-white/45 break-all">
                              <span className="font-semibold text-white/60">Path:</span>{" "}
                              {it.arquivo_path}
                            </div>
                          )}

                          {it?.erro_msg && it.status === "ERRO" && (
                            <div className="mt-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-100 break-all">
                              <span className="font-semibold">Erro:</span> {it.erro_msg}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => abrirRelatorio(it)}
                          className={clsx(
                            "shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                            isSel
                              ? "border border-cyan-400/30 bg-cyan-400/20 text-white hover:bg-cyan-400/25"
                              : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          )}
                          title="Abrir relatório"
                        >
                          <FaExternalLinkAlt />
                          Ver
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Erro ao gerar */}
            {erro && (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <FaExclamationTriangle />
                  Erro ao gerar
                </div>
                <div className="mt-1 text-xs text-rose-100/80 break-all">{erro}</div>
              </div>
            )}
          </GlowCard>
        </div>

        {/* Debug (mantido) */}
        {!!resp && (resp?.stderr || resp?.stdout || resp?.stdout_tail) && (
          <div className="relative mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlowCard className="p-4">
              <div className="text-xs font-semibold text-white/70">STDERR</div>
              <pre className="mt-2 text-xs bg-black/30 border border-white/10 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-white/80">
{resp?.stderr || "(vazio)"}
              </pre>
            </GlowCard>

            <GlowCard className="p-4">
              <div className="text-xs font-semibold text-white/70">STDOUT</div>
              <pre className="mt-2 text-xs bg-black/30 border border-white/10 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-white/80">
{resp?.stdout || resp?.stdout_tail || "(vazio)"}
              </pre>
            </GlowCard>
          </div>
        )}
      </div>
    </div>
  );
}
