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
  FaFilter,
  FaBroom,
  FaTimes,
} from "react-icons/fa";

const API_BASE = "https://agentediesel.onrender.com";
const BUCKET = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 80;

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
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
      title={typeof children === "string" ? children : undefined}
    >
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Fechar"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_25px_90px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{title}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                <FaTimes />
                Fechar
              </button>
            </div>
            <div className="p-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ====== Execução ======
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // ====== Histórico ======
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  // ====== Seleção / URLs ======
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  // ====== Modal PDF ======
  const [pdfOpen, setPdfOpen] = useState(false);

  // ====== UI ======
  const [showFilters, setShowFilters] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showCount, setShowCount] = useState(12);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  // ✅ validação sem timezone (YYYY-MM-DD compara correto)
  function validarPeriodo() {
    if (!periodoInicio || !periodoFim) return true;
    return String(periodoInicio) <= String(periodoFim);
  }

  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo = ini && fim ? `${ini} → ${fim}` : ini || fim ? ini || fim : "Sem período";
    return `Agente Gerencial — ${periodo}`;
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
      setShowCount(12);
    } catch (e) {
      if (!mountedRef.current) return;
      setHistoricoErro(String(e?.message || e));
      setItems([]);
    } finally {
      if (mountedRef.current) setHistoricoLoading(false);
    }
  }

  async function abrirRelatorio(it, { openPdf = false } = {}) {
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

      // mantém propriedades (html/png continuam gerando URL), mas não polui a página
      let htmlPath = arquivoPath;
      if (!/\.html$/i.test(htmlPath)) htmlPath = `${folder}/Relatorio_Gerencial.html`;
      const pngPath = `${folder}/cluster_evolution_unificado.png`;

      const [pdfRes, htmlRes, pngRes] = await Promise.all([
        makeUrlFromPath(pdfPath, 3600),
        makeUrlFromPath(htmlPath, 3600),
        makeUrlFromPath(pngPath, 3600),
      ]);

      if (!mountedRef.current) return;

      const newUrls = {
        pdf: pdfRes.url,
        pdf_path_used: pdfRes.path,
        pdf_mode: pdfRes.mode,
        html: htmlRes?.url || null,
        html_path_used: htmlRes?.path || null,
        html_mode: htmlRes?.mode || null,
        png: pngRes?.url || null,
        folder,
      };

      setUrls(newUrls);
      if (openPdf && newUrls?.pdf) setPdfOpen(true);
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

      // Mantém propriedades do payload, porém sem filtros extras
      const payload = {
        tipo: TIPO_RELATORIO,
        periodo_inicio: periodoInicio ? String(periodoInicio) : null,
        periodo_fim: periodoFim ? String(periodoFim) : null,
        motorista: null,
        linha: null,
        veiculo: null,
        cluster: null,
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

        if (!error && row) await abrirRelatorio(row, { openPdf: true });
      }
    } catch (e) {
      setErro(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

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

  const visibleItems = useMemo(() => filteredItems.slice(0, showCount), [filteredItems, showCount]);

  const clearFilters = () => {
    setPeriodoInicio(fmtDateInput(primeiroDiaMes));
    setPeriodoFim(fmtDateInput(hoje));
  };

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    const ini = selected?.periodo_inicio ? String(selected.periodo_inicio) : "—";
    const fim = selected?.periodo_fim ? String(selected.periodo_fim) : "—";
    return { ini, fim };
  }, [selected]);

  const canOpenPdf = !!urls?.pdf;

  return (
    <div className="min-h-[calc(100vh-140px)]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_10%_10%,rgba(56,189,248,0.12),transparent_50%),radial-gradient(900px_circle_at_90%_20%,rgba(217,70,239,0.10),transparent_55%)]" />
          <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
        </div>

        {/* Header */}
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FaBolt className="text-cyan-200" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-white">Agente Diesel</h2>
                <p className="text-sm text-white/60">Clean: datas + histórico + PDF em modal.</p>
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

          {/* Botões topo */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border border-cyan-400/30 bg-cyan-400/15 text-white"
                title="Ativo"
              >
                AGENTE GERENCIAL
              </button>

              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                title="Ainda não existe"
              >
                AGENTE ACOMPANHAMENTO (em breve)
              </button>
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              type="button"
            >
              <FaFilter />
              {showFilters ? "Ocultar datas" : "Mostrar datas"}
            </button>

            <button
              onClick={gerar}
              disabled={loading}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                "border border-cyan-400/20",
                loading ? "bg-white/10 text-white/60 cursor-not-allowed" : "bg-white/5 text-white hover:bg-white/10"
              )}
              title="Executa a geração do relatório na API"
            >
              <FaPlay />
              {loading ? "Gerando..." : "Gerar análise"}
            </button>
          </div>
        </div>

        {/* Datas */}
        {showFilters && (
          <div className="relative mt-5">
            <Card className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FaFilter className="text-white/70" />
                    <p className="text-sm font-semibold text-white">Período</p>
                  </div>
                  <p className="mt-1 text-xs text-white/60">Somente datas (YYYY-MM-DD).</p>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  <FaBroom />
                  Limpar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>

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
            </Card>
          </div>
        )}

        {/* Visualização (sem iframe na página) */}
        <div className="relative mt-5">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="text-white/80" />
                  <div className="text-sm font-semibold text-white">Visualização</div>
                </div>

                {!selected ? (
                  <div className="mt-1 text-xs text-white/60">
                    Selecione um item no histórico para habilitar o PDF.
                  </div>
                ) : (
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    <div className="truncate">
                      <span className="text-white/80 font-semibold">Relatório:</span>{" "}
                      <span className="text-white/70">{labelRelatorio(selected)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="text-white/80 font-semibold">Gerado:</span>{" "}
                        <span className="text-white/70">{fmtBR(selected.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-white/80 font-semibold">Status:</span>{" "}
                        <span className="text-white/70">{String(selected.status || "")}</span>
                      </div>
                      {selectedMeta ? (
                        <div>
                          <span className="text-white/80 font-semibold">Período:</span>{" "}
                          <span className="text-white/70">
                            {selectedMeta.ini} → {selectedMeta.fim}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {urls?.pdf_path_used ? (
                      <div className="text-[11px] text-white/45 break-all">
                        <span className="font-semibold text-white/60">PDF path:</span>{" "}
                        {urls.pdf_path_used} ({urls.pdf_mode})
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (canOpenPdf) setPdfOpen(true);
                  }}
                  disabled={!canOpenPdf || urlsLoading}
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
                    !canOpenPdf || urlsLoading
                      ? "border-white/10 bg-white/5 text-white/50 cursor-not-allowed"
                      : "border-cyan-400/20 bg-white/5 text-white hover:bg-white/10"
                  )}
                  title={!canOpenPdf ? "Selecione um relatório com PDF" : "Abrir PDF"}
                >
                  <FaFilePdf />
                  PDF
                </button>

                {urls?.pdf ? (
                  <a
                    href={urls.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                    title="Abrir PDF em nova aba"
                  >
                    Abrir em nova aba
                  </a>
                ) : null}

                <button
                  type="button"
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
            </div>

            {urlsLoading && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <div className="flex items-center gap-2 font-semibold">
                  <FaSyncAlt className="animate-spin" />
                  Carregando URLs...
                </div>
              </div>
            )}

            {urlsErro && (
              <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTimesCircle />
                  Falha ao preparar PDF
                </div>
                <div className="mt-1 text-xs text-rose-100/80 break-all">{urlsErro}</div>
              </div>
            )}
          </Card>
        </div>

        {/* Histórico compacto */}
        <div className="relative mt-5">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <FaDatabase className="text-white/80" />
                <h3 className="text-sm font-semibold text-white">Histórico</h3>
                <span className="text-xs text-white/50">({filteredItems.length} item(ns))</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar (status, período, arquivo, path...)"
                    className="w-full sm:w-[360px] rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>
                {!!searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                  >
                    limpar
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

            <div className="mt-3 space-y-2">
              {!visibleItems.length ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                  Nenhum relatório encontrado.
                </div>
              ) : (
                visibleItems.map((it) => {
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

                  const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "—";
                  const fim = it?.periodo_fim ? String(it.periodo_fim) : "—";

                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => abrirRelatorio(it)}
                      className={clsx(
                        "w-full text-left rounded-2xl border p-3 transition flex items-start justify-between gap-3",
                        isSel
                          ? "border-cyan-400/30 bg-cyan-400/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                      title="Selecionar relatório"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill tone={tone} icon={icon}>
                            {String(it.status || "—")}
                          </Pill>
                          <div className="truncate text-sm font-semibold text-white">
                            {ini} → {fim}
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

                        {it?.erro_msg && it.status === "ERRO" ? (
                          <div className="mt-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-100 break-all">
                            <span className="font-semibold">Erro:</span> {it.erro_msg}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {isSel && (
                          <span className="text-[11px] text-cyan-200/90 border border-cyan-400/20 bg-cyan-400/10 rounded-full px-2 py-1">
                            selecionado
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {filteredItems.length > showCount && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCount((c) => Math.min(filteredItems.length, c + 12))}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Ver mais
                </button>
              </div>
            )}

            {erro && (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <FaExclamationTriangle />
                  Erro ao gerar
                </div>
                <div className="mt-1 text-xs text-rose-100/80 break-all">{erro}</div>
              </div>
            )}
          </Card>
        </div>

        {!!resp && (resp?.stderr || resp?.stdout || resp?.stdout_tail) && (
          <div className="relative mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-xs font-semibold text-white/70">STDERR</div>
              <pre className="mt-2 text-xs bg-black/30 border border-white/10 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-white/80">
{resp?.stderr || "(vazio)"}
              </pre>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-semibold text-white/70">STDOUT</div>
              <pre className="mt-2 text-xs bg-black/30 border border-white/10 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-white/80">
{resp?.stdout || resp?.stdout_tail || "(vazio)"}
              </pre>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL PDF */}
      <Modal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title={
          selectedMeta
            ? `Agente Gerencial — ${selectedMeta.ini} → ${selectedMeta.fim}`
            : "Agente Gerencial — PDF"
        }
      >
        {!canOpenPdf ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
            Nenhum PDF disponível para exibir.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                Viewer seguro (Signed URL)
              </div>
              {urls?.pdf && (
                <a
                  href={urls.pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                  title="Abrir PDF em nova aba"
                >
                  <FaFilePdf />
                  Abrir
                </a>
              )}
            </div>

            <div style={{ height: 760 }} className="bg-black/20">
              <iframe
                title="RelatorioPDF"
                src={urls.pdf}
                className="w-full h-full"
                style={{ background: "transparent" }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
