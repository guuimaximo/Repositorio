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
  // ✅ versão mais clara
  const toneCls = {
    neutral: "border-slate-200 bg-white/80 text-slate-700",
    blue: "border-cyan-200 bg-cyan-50 text-cyan-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-800",
    purple: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
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
  // ✅ versão mais clara
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_12px_40px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  // ✅ header sticky + scroll interno + garante que o botão Fechar nunca “suma”
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Fechar"
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-6xl">
          <div
            className={clsx(
              "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-xl",
              "shadow-[0_25px_90px_rgba(0,0,0,0.25)] overflow-hidden"
            )}
            style={{ maxHeight: "calc(100vh - 24px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/70 bg-white/90">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{title}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <FaTimes />
                Fechar
              </button>
            </div>

            <div
              className="p-4 overflow-auto"
              style={{ maxHeight: "calc(100vh - 24px - 52px)" }}
            >
              {children}
            </div>
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

      // mantém propriedades (html/png continuam existindo), mas não polui a página
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
    if (loading) return <FaBolt className="text-amber-600" />;
    if (erro) return <FaTimesCircle className="text-rose-600" />;
    if (resp?.ok === true) return <FaCheckCircle className="text-emerald-600" />;
    return <FaCloud className="text-cyan-600" />;
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
      {/* ✅ Fundo mais claro */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_10%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(217,70,239,0.14),transparent_60%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(15,23,42,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.10)_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        {/* Header */}
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <FaBolt className="text-cyan-700" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Agente Diesel
                </h2>
                <p className="text-sm text-slate-600">Clean: datas + histórico + PDF em modal.</p>
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
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border border-cyan-200 bg-cyan-50 text-cyan-800"
                title="Ativo"
              >
                AGENTE GERENCIAL
              </button>

              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                title="Ainda não existe"
              >
                AGENTE ACOMPANHAMENTO (em breve)
              </button>
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              type="button"
            >
              <FaFilter />
              {showFilters ? "Ocultar datas" : "Mostrar datas"}
            </button>

            <button
              onClick={gerar}
              disabled={loading}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
                loading
                  ? "border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                    <FaFilter className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-800">Período</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Somente datas (YYYY-MM-DD).</p>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <FaBroom />
                  Limpar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Data início</label>
                  <input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Data fim</label>
                  <input
                    type="date"
                    value={periodoFim}
                    onChange={(e) => setPeriodoFim(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
              </div>

              {!validarPeriodo() && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <FaExclamationTriangle />
                    Período inválido
                  </div>
                  <div className="mt-1 text-xs text-rose-600">
                    A data de início deve ser menor ou igual à data fim.
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Visualização */}
        <div className="relative mt-5">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="text-slate-600" />
                  <div className="text-sm font-semibold text-slate-800">Visualização</div>
                </div>

                {!selected ? (
                  <div className="mt-1 text-xs text-slate-500">
                    Selecione um item no histórico para habilitar o PDF.
                  </div>
                ) : (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="truncate">
                      <span className="text-slate-800 font-semibold">Relatório:</span>{" "}
                      <span className="text-slate-700">{labelRelatorio(selected)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="text-slate-800 font-semibold">Gerado:</span>{" "}
                        <span className="text-slate-700">{fmtBR(selected.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-800 font-semibold">Status:</span>{" "}
                        <span className="text-slate-700">{String(selected.status || "")}</span>
                      </div>
                      {selectedMeta ? (
                        <div>
                          <span className="text-slate-800 font-semibold">Período:</span>{" "}
                          <span className="text-slate-700">
                            {selectedMeta.ini} → {selectedMeta.fim}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {urls?.pdf_path_used ? (
                      <div className="text-[11px] text-slate-500 break-all">
                        <span className="font-semibold text-slate-700">PDF path:</span>{" "}
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
                      ? "border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
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
                    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition",
                    historicoLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50"
                  )}
                  title="Recarregar histórico"
                >
                  <FaSyncAlt className={historicoLoading ? "animate-spin" : ""} />
                  {historicoLoading ? "Atualizando..." : "Atualizar"}
                </button>
              </div>
            </div>

            {urlsLoading && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaSyncAlt className="animate-spin" />
                  Carregando URLs...
                </div>
              </div>
            )}

            {urlsErro && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTimesCircle />
                  Falha ao preparar PDF
                </div>
                <div className="mt-1 text-xs text-rose-600 break-all">{urlsErro}</div>
              </div>
            )}
          </Card>
        </div>

        {/* Histórico */}
        <div className="relative mt-5">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <FaDatabase className="text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-800">Histórico</h3>
                <span className="text-xs text-slate-500">({filteredItems.length} item(ns))</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar (status, período, arquivo, path...)"
                    className="w-full sm:w-[360px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
                {!!searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    limpar
                  </button>
                )}
              </div>
            </div>

            {historicoErro && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTimesCircle />
                  Erro ao carregar histórico
                </div>
                <div className="mt-1 text-xs text-rose-600 break-all">{historicoErro}</div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {!visibleItems.length ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
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
                          ? "border-cyan-200 bg-cyan-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                      title="Selecionar relatório"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill tone={tone} icon={icon}>
                            {String(it.status || "—")}
                          </Pill>
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {ini} → {fim}
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          {fmtBR(it.created_at)}
                          {it?.arquivo_nome ? (
                            <>
                              {" "}
                              • <span className="text-slate-700">{it.arquivo_nome}</span>
                            </>
                          ) : null}
                        </div>

                        {it?.erro_msg && it.status === "ERRO" ? (
                          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 break-all">
                            <span className="font-semibold">Erro:</span> {it.erro_msg}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {isSel && (
                          <span className="text-[11px] text-cyan-800 border border-cyan-200 bg-cyan-50 rounded-full px-2 py-1">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Ver mais
                </button>
              </div>
            )}

            {erro && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaExclamationTriangle />
                  Erro ao gerar
                </div>
                <div className="mt-1 text-xs text-rose-600 break-all">{erro}</div>
              </div>
            )}
          </Card>
        </div>

        {!!resp && (resp?.stderr || resp?.stdout || resp?.stdout_tail) && (
          <div className="relative mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-xs font-semibold text-slate-700">STDERR</div>
              <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-slate-800">
{resp?.stderr || "(vazio)"}
              </pre>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-semibold text-slate-700">STDOUT</div>
              <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-56 overflow-auto whitespace-pre-wrap text-slate-800">
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
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            Nenhum PDF disponível para exibir.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Viewer seguro (Signed URL)
              </div>
              {urls?.pdf && (
                <a
                  href={urls.pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  title="Abrir PDF em nova aba"
                >
                  <FaFilePdf />
                  Abrir
                </a>
              )}
            </div>

            {/* ✅ altura responsiva (evita estourar tela) */}
            <div className="bg-slate-50/70" style={{ height: "calc(100vh - 24px - 52px - 140px)" }}>
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
