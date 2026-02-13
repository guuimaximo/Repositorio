// src/pages/DesempenhoDieselAcompanhamento.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FaBolt,
  FaSearch,
  FaFilePdf,
  FaSync,
  FaClock,
  FaHistory,
  FaRoad,
  FaSave,
  FaTimes,
  FaPlay,
  FaClipboardList,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { supabase } from "../supabase";

// ============================================================================
// HELPERS / CONSTANTES
// ============================================================================
const BUCKET_RELATORIOS = "relatorios";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function toDateBR(d) {
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

function toTimeBR(d) {
  try {
    return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function getPublicUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // Se vier como "acompanhamento/<lote>/<arquivo>.pdf" ou "/acompanhamento/..."
  const clean = s.startsWith("/") ? s.slice(1) : s;
  if (!SUPABASE_URL) return clean; // fallback (abre algo ao menos)
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_RELATORIOS}/${clean}`;
}

// Status canônicos do fluxo
const STATUS = {
  AGUARDANDO: "AGUARDANDO INSTRUTOR",
  MONITORANDO: "EM MONITORAMENTO",
  OK: "OK",
  ENCERRADO: "ENCERRADO",
  CANCELADO: "CANCELADO",
};

// Checklist Técnico
const CHECKLIST_ITENS = [
  { id: "faixa_verde", label: "Operação na Faixa Verde (RPM)" },
  { id: "antecipacao", label: "Antecipação de Parada/Trânsito" },
  { id: "troca_marcha", label: "Troca de Marchas no Tempo Correto" },
  { id: "uso_retarder", label: "Uso Correto do Freio Motor/Retarder" },
  { id: "marcha_lenta", label: "Evitou Marcha Lenta Excessiva" },
  { id: "topografia", label: "Aproveitamento de Inércia (Topografia)" },
];

const NIVEIS = {
  1: { label: "Nível 1 (5 dias)", dias: 5, pill: "bg-blue-50 border-blue-200 text-blue-700" },
  2: { label: "Nível 2 (10 dias)", dias: 10, pill: "bg-amber-50 border-amber-200 text-amber-700" },
  3: { label: "Nível 3 (15 dias)", dias: 15, pill: "bg-rose-50 border-rose-200 text-rose-700" },
};

function computeDiaXY(item) {
  // Usa dt_inicio + dias_monitoramento (preferência) ou dt_fim_planejado
  const dias = Number.isFinite(Number(item?.dias_monitoramento)) ? Number(item.dias_monitoramento) : null;
  const dtIni = item?.dt_inicio ? new Date(item.dt_inicio) : null;

  if (dias && dtIni && !Number.isNaN(dtIni.getTime())) {
    const hoje = new Date();
    const diff = Math.floor((hoje - dtIni) / (1000 * 60 * 60 * 24)) + 1; // Dia 1 no mesmo dia
    const dia = Math.max(1, Math.min(dias, diff));
    return { dia, dias, restante: Math.max(0, dias - dia) };
  }

  // fallback com dt_fim_planejado
  const dtFim = item?.dt_fim_planejado ? new Date(item.dt_fim_planejado) : null;
  if (dtFim && !Number.isNaN(dtFim.getTime())) {
    const hoje = new Date();
    const restante = Math.ceil((dtFim - hoje) / (1000 * 60 * 60 * 24));
    return { dia: null, dias: null, restante: Number.isFinite(restante) ? restante : null };
  }

  return { dia: null, dias: null, restante: null };
}

function StatusPill({ status, item }) {
  const s = String(status || "").toUpperCase();

  if (s === STATUS.AGUARDANDO.toUpperCase()) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200">
        <FaClock /> AGUARDANDO
      </span>
    );
  }

  if (s === STATUS.MONITORANDO.toUpperCase()) {
    const prog = computeDiaXY(item);
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
          <FaRoad /> MONITORANDO
        </span>
        {prog?.dia && prog?.dias ? (
          <span className="text-[10px] text-slate-500 font-bold">
            Dia {prog.dia} de {prog.dias}
          </span>
        ) : prog?.restante != null ? (
          <span className="text-[10px] text-slate-500 font-bold">Faltam {prog.restante} dias</span>
        ) : null}
      </div>
    );
  }

  if (s === STATUS.OK.toUpperCase()) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
        <FaCheckCircle /> OK
      </span>
    );
  }

  if (s === STATUS.ENCERRADO.toUpperCase()) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-slate-100 text-slate-700 border-slate-200">
        ENCERRADO
      </span>
    );
  }

  if (s === STATUS.CANCELADO.toUpperCase()) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-rose-50 text-rose-700 border-rose-200">
        CANCELADO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold border bg-slate-50 text-slate-600 border-slate-200">
      {status || "—"}
    </span>
  );
}

// Regra de prioridade alta (ajuste livre)
function isPrioridadeAlta(item) {
  // perda_litros alto OU metadata.prioridade === 'alta'
  const perda = n(item?.perda_litros);
  const metaFlag = String(item?.metadata?.prioridade || "").toLowerCase() === "alta";
  return metaFlag || perda >= 50; // <- threshold padrão (50L). Ajuste aqui.
}

// ============================================================================
// COMPONENTE
// ============================================================================
export default function DesempenhoDieselAcompanhamento() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  const [userSession, setUserSession] = useState(null);

  // Lista
  const [lista, setLista] = useState([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ABERTOS"); // ABERTOS | MONITORANDO | ENCERRADOS | TODOS

  // Modais
  const [modalLancarOpen, setModalLancarOpen] = useState(false);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Histórico
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Form
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    horaInicio: "",
    horaFim: "",
    kmInicio: "",
    kmFim: "",
    mediaTeste: "",
    nivel: 2,
    obs: "",
    checklist: {},
  });

  const limparFeedback = () => {
    setErro(null);
    setOkMsg(null);
  };

  // ---------------------------------------------------------------------------
  // CARREGAR TELA
  // ---------------------------------------------------------------------------
  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      setUserSession(sess?.session || null);

      // Importante: a tela de Gestão deve puxar as ordens prontas (diesel_acompanhamentos)
      const { data, error } = await supabase
        .from("diesel_acompanhamentos")
        .select(
          `
          id,
          created_at,
          updated_at,
          lote_id,
          motorista_chapa,
          motorista_nome,
          foco,
          motivo,
          status,
          perda_litros,
          kml_inicial,
          kml_meta,
          arquivo_pdf_path,
          arquivo_html_path,
          dt_inicio,
          dt_fim_planejado,
          dt_fim_real,
          dias_monitoramento,
          instrutor_login,
          instrutor_nome,
          instrutor_id,
          teste_hora_inicio,
          teste_hora_fim,
          teste_km_inicial,
          teste_km_final,
          teste_kml,
          checklist,
          metadata
        `
        )
        .order("created_at", { ascending: false })
        .limit(800);

      if (error) throw error;
      if (!mountedRef.current) return;
      setLista(data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      setErro(e?.message || String(e));
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarOrdens();
  }, [carregarOrdens]);

  // ---------------------------------------------------------------------------
  // AÇÃO PDF
  // ---------------------------------------------------------------------------
  const abrirPDF = (pathOrUrl) => {
    const url = getPublicUrl(pathOrUrl);
    if (!url) {
      setErro("PDF não disponível para esta ordem.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------------------------
  // MODAL CONSULTAR (Resumo + Histórico)
  // ---------------------------------------------------------------------------
  const handleConsultar = async (item) => {
    limparFeedback();
    setItemSelecionado(item);
    setModalConsultaOpen(true);
    setLoadingHist(true);
    setHistorico([]);

    try {
      const { data, error } = await supabase
        .from("diesel_acompanhamentos")
        .select(
          `
          id,
          created_at,
          foco,
          status,
          dias_monitoramento,
          dt_inicio,
          dt_fim_planejado,
          dt_fim_real,
          teste_kml,
          perda_litros,
          kml_inicial,
          kml_meta,
          instrutor_nome
        `
        )
        .eq("motorista_chapa", item.motorista_chapa)
        .neq("id", item.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!mountedRef.current) return;
      setHistorico(data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      setErro(e?.message || String(e));
    } finally {
      if (!mountedRef.current) return;
      setLoadingHist(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MODAL LANÇAR (Checklist)
  // ---------------------------------------------------------------------------
  const handleLancar = (item) => {
    limparFeedback();
    setItemSelecionado(item);
    setForm({
      horaInicio: "",
      horaFim: "",
      kmInicio: "",
      kmFim: "",
      mediaTeste: "",
      nivel: 2,
      obs: "",
      checklist: {},
    });
    setModalLancarOpen(true);
  };

  const toggleCheck = (id) => {
    setForm((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [id]: !prev.checklist[id] },
    }));
  };

  const validarFormulario = () => {
    // Obrigatórios do seu fluxo: hora inicio/fim + km ini/fim + media
    if (!form.horaInicio) return "Informe a Hora Início.";
    if (!form.horaFim) return "Informe a Hora Fim.";
    if (!String(form.kmInicio).trim()) return "Informe o KM Inicial.";
    if (!String(form.kmFim).trim()) return "Informe o KM Final.";
    if (!String(form.mediaTeste).trim()) return "Informe a Média do Teste (km/l).";

    const kmIni = n(form.kmInicio);
    const kmFim = n(form.kmFim);
    if (kmFim <= kmIni) return "KM Final precisa ser maior que KM Inicial.";

    const media = n(form.mediaTeste);
    if (media <= 0) return "Média do Teste inválida.";

    if (![1, 2, 3].includes(Number(form.nivel))) return "Selecione o nível 1, 2 ou 3.";

    return null;
  };

  const salvarIntervencao = async () => {
    limparFeedback();
    const err = validarFormulario();
    if (err) {
      setErro(err);
      return;
    }

    setSaving(true);

    try {
      const nivel = Number(form.nivel);
      const dias = NIVEIS[nivel].dias;

      // Datas (dt_inicio hoje / dt_fim_planejado = hoje + dias)
      const dtIni = new Date();
      const dtFim = new Date();
      dtFim.setDate(dtFim.getDate() + dias);

      const instrutor_login = userSession?.user?.email || null;
      const instrutor_nome = userSession?.user?.user_metadata?.full_name || null;
      const instrutor_id = userSession?.user?.id || null;

      // update no registro selecionado
      const payload = {
        status: STATUS.MONITORANDO,

        // controle monitoramento
        dias_monitoramento: dias,
        dt_inicio: dtIni.toISOString().slice(0, 10), // date
        dt_fim_planejado: dtFim.toISOString().slice(0, 10), // date
        dt_fim_real: null,

        // auditoria instrutor
        instrutor_login,
        instrutor_nome,
        instrutor_id,

        // prova de conceito (viagem teste)
        teste_hora_inicio: form.horaInicio, // time
        teste_hora_fim: form.horaFim, // time
        teste_km_inicial: n(form.kmInicio),
        teste_km_final: n(form.kmFim),
        teste_kml: n(form.mediaTeste),

        // checklist + observações
        checklist: form.checklist || {},
        metadata: {
          ...(itemSelecionado?.metadata || {}),
          intervencao_obs: String(form.obs || "").trim() || null,
          nivel,
          versao_fluxo: "gestao_ordens_v1",
          iniciado_em: new Date().toISOString(),
        },
      };

      const { error } = await supabase.from("diesel_acompanhamentos").update(payload).eq("id", itemSelecionado.id);
      if (error) throw error;

      if (!mountedRef.current) return;
      setModalLancarOpen(false);
      setOkMsg("Acompanhamento iniciado. Status alterado para EM MONITORAMENTO.");
      await carregarOrdens();
    } catch (e) {
      if (!mountedRef.current) return;
      setErro(e?.message || String(e));
    } finally {
      if (!mountedRef.current) return;
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTROS / LISTA
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    const q = String(busca || "").trim().toLowerCase();

    return (lista || []).filter((item) => {
      const nome = String(item.motorista_nome || "").toLowerCase();
      const chapa = String(item.motorista_chapa || "").toLowerCase();
      const foco = String(item.foco || "").toLowerCase();

      const matchTexto = !q || nome.includes(q) || chapa.includes(q) || foco.includes(q);

      const st = String(item.status || "").toUpperCase();

      if (filtroStatus === "ABERTOS") {
        return matchTexto && st === STATUS.AGUARDANDO.toUpperCase();
      }
      if (filtroStatus === "MONITORANDO") {
        return matchTexto && st === STATUS.MONITORANDO.toUpperCase();
      }
      if (filtroStatus === "ENCERRADOS") {
        return matchTexto && [STATUS.OK, STATUS.ENCERRADO, STATUS.CANCELADO].map((x) => x.toUpperCase()).includes(st);
      }
      return matchTexto;
    });
  }, [lista, busca, filtroStatus]);

  const counters = useMemo(() => {
    const all = lista || [];
    const up = (s) => String(s || "").toUpperCase();
    const agu = all.filter((x) => up(x.status) === STATUS.AGUARDANDO.toUpperCase()).length;
    const mon = all.filter((x) => up(x.status) === STATUS.MONITORANDO.toUpperCase()).length;
    const enc = all.filter((x) => [STATUS.OK, STATUS.ENCERRADO, STATUS.CANCELADO].map((v) => v.toUpperCase()).includes(up(x.status))).length;
    return { total: all.length, agu, mon, enc };
  }, [lista]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-[#f8f9fa] font-sans text-slate-800">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2 text-slate-800">
            <FaBolt className="text-yellow-500" /> Gestão de Ordens de Acompanhamento
          </h1>
          <p className="text-sm text-slate-500">
            Apenas motoristas triados (ordens geradas) — ação prática do instrutor (PDF / Consultar / Lançar).
          </p>
        </div>

        <button
          onClick={carregarOrdens}
          className="px-4 py-2 bg-white border rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2 text-sm font-extrabold"
          title="Atualizar"
        >
          <FaSync className={clsx(loading && "animate-spin")} /> Atualizar
        </button>
      </div>

      {/* FEEDBACK */}
      {(erro || okMsg) && (
        <div
          className={clsx(
            "p-4 rounded-xl border flex items-start gap-3",
            okMsg ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          <div className="mt-0.5">{okMsg ? <FaCheckCircle /> : <FaExclamationTriangle />}</div>
          <div className="flex-1">
            <p className="font-extrabold text-sm">{okMsg ? "Sucesso" : "Atenção"}</p>
            <p className="text-xs mt-1 whitespace-pre-wrap">{okMsg || erro}</p>
          </div>
          <button onClick={limparFeedback} className="text-slate-400 hover:text-slate-700">
            <FaTimes />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold">TOTAL</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{counters.total}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-amber-600 font-bold">AGUARDANDO</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{counters.agu}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-blue-600 font-bold">MONITORANDO</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{counters.mon}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-600 font-bold">ENCERRADOS</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{counters.enc}</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center bg-white p-3 rounded-2xl border shadow-sm">
        <div className="relative w-full md:w-[320px]">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, chapa ou foco..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 p-2 border rounded-xl text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="p-2 border rounded-xl text-sm bg-white outline-none focus:border-blue-500 md:w-[240px]"
        >
          <option value="ABERTOS">🟡 Aguardando instrutor</option>
          <option value="MONITORANDO">🔵 Em monitoramento</option>
          <option value="ENCERRADOS">✅ Encerrados</option>
          <option value="TODOS">Todos</option>
        </select>

        <div className="md:ml-auto text-xs text-slate-500 font-bold">
          Mostrando <span className="text-slate-800">{listaFiltrada.length}</span> registros
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-extrabold border-b text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Data Geração</th>
                <th className="px-6 py-4">Motorista</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Foco</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {listaFiltrada.map((item) => {
                const st = String(item.status || STATUS.AGUARDANDO);
                const stUp = st.toUpperCase();
                const showLancar = stUp === STATUS.AGUARDANDO.toUpperCase(); // só enquanto AGUARDANDO INSTRUTOR
                const prioridadeAlta = isPrioridadeAlta(item);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                      <div className="font-bold">{toDateBR(item.created_at)}</div>
                      <div className="text-[10px] opacity-70">{toTimeBR(item.created_at)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-extrabold text-slate-800 truncate">{item.motorista_nome || "-"}</div>
                            {prioridadeAlta && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                Prioridade Alta
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit">
                              {item.motorista_chapa || "-"}
                            </span>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-600">Motivo:</span>{" "}
                            {item.motivo ||
                              (Number.isFinite(n(item.kml_inicial)) && Number.isFinite(n(item.kml_meta))
                                ? `Média ${n(item.kml_inicial).toFixed(2)} vs Meta ${n(item.kml_meta).toFixed(2)}`
                                : "-")}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] font-extrabold text-rose-700">
                            {n(item.perda_litros) > 0 ? `${n(item.perda_litros).toFixed(0)} L` : "—"}
                          </div>
                          <div className="text-[10px] text-slate-400">Desperdício</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-extrabold border border-slate-200">
                        {item.foco || item.metadata?.foco || "—"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <StatusPill status={st} item={item} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {/* 1) PDF */}
                        <button
                          onClick={() => abrirPDF(item.arquivo_pdf_path)}
                          className="p-2 text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition shadow-sm"
                          title="Abrir Prontuário PDF"
                        >
                          <FaFilePdf />
                        </button>

                        {/* 2) CONSULTAR */}
                        <button
                          onClick={() => handleConsultar(item)}
                          className="p-2 text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition shadow-sm"
                          title="Consultar Histórico"
                        >
                          <FaHistory />
                        </button>

                        {/* 3) LANÇAR (condicional) */}
                        {showLancar && (
                          <button
                            onClick={() => handleLancar(item)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
                            title="Lançar intervenção técnica"
                          >
                            <FaPlay size={10} /> LANÇAR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {loading ? "Carregando..." : "Nenhum registro encontrado para os filtros atuais."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CONSULTA */}
      {modalConsultaOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50 sticky top-0 z-10">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <FaHistory /> Consultar Histórico
                </h3>
                <div className="text-xs text-slate-500 font-bold mt-1">
                  {itemSelecionado.motorista_nome || "-"} • {itemSelecionado.motorista_chapa}
                </div>
              </div>
              <button onClick={() => setModalConsultaOpen(false)} className="text-slate-400 hover:text-rose-600">
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Resumo atual */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-extrabold text-blue-800 text-sm mb-3">Resumo Atual</h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">Foco</div>
                    <div className="font-bold text-slate-800">{itemSelecionado.foco || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">Motivo</div>
                    <div className="font-bold text-slate-800">
                      {itemSelecionado.motivo ||
                        (Number.isFinite(n(itemSelecionado.kml_inicial)) && Number.isFinite(n(itemSelecionado.kml_meta))
                          ? `Média ${n(itemSelecionado.kml_inicial).toFixed(2)} vs Meta ${n(itemSelecionado.kml_meta).toFixed(2)}`
                          : "—")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">KM/L (Baseline)</div>
                    <div className="font-bold text-slate-800">{n(itemSelecionado.kml_inicial).toFixed(2)}</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">Meta</div>
                    <div className="font-bold text-slate-800">{n(itemSelecionado.kml_meta).toFixed(2)}</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">Desperdício</div>
                    <div className="font-bold text-rose-700">{n(itemSelecionado.perda_litros).toFixed(0)} L</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-blue-600 font-extrabold">Status</div>
                    <div className="font-bold text-slate-800">{itemSelecionado.status || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Linha do tempo */}
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm mb-3 border-b pb-2">Linha do Tempo</h4>

                {loadingHist ? (
                  <div className="text-center py-8 text-slate-500">
                    <FaSync className="animate-spin inline mr-2" />
                    Carregando histórico...
                  </div>
                ) : historico.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Nunca foi acompanhado (sem histórico anterior).</div>
                ) : (
                  <div className="space-y-3">
                    {historico.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 border rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 text-sm">
                            {toDateBR(h.created_at)}{" "}
                            <span className="text-xs text-slate-400 font-bold">({toTimeBR(h.created_at)})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            <span className="font-bold">Foco:</span> {h.foco || "—"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            <span className="font-bold">Instrutor:</span> {h.instrutor_nome || "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="mb-1">
                            <StatusPill status={h.status} item={h} />
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            Nível: {h?.metadata?.nivel || "—"} • Teste: {n(h.teste_kml).toFixed(2)} km/l
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setModalConsultaOpen(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LANÇAR */}
      {modalLancarOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50 sticky top-0 z-10">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <FaRoad /> Lançar Intervenção Técnica
                </h3>
                <div className="text-xs text-slate-500 font-bold mt-1">
                  {itemSelecionado.motorista_nome || "-"} • {itemSelecionado.motorista_chapa} • {itemSelecionado.foco || "—"}
                </div>
              </div>
              <button onClick={() => setModalLancarOpen(false)} className="text-slate-400 hover:text-rose-600" disabled={saving}>
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1) Dados da Viagem */}
              <div className="p-4 border rounded-xl bg-slate-50">
                <h4 className="font-extrabold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <FaClock /> Dados da Viagem de Teste (Prova de Conceito)
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-500">Hora Início</label>
                    <input
                      type="time"
                      value={form.horaInicio}
                      onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-500">Hora Fim</label>
                    <input
                      type="time"
                      value={form.horaFim}
                      onChange={(e) => setForm((p) => ({ ...p, horaFim: e.target.value }))}
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-500">KM Inicial</label>
                    <input
                      type="number"
                      value={form.kmInicio}
                      onChange={(e) => setForm((p) => ({ ...p, kmInicio: e.target.value }))}
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-500">KM Final</label>
                    <input
                      type="number"
                      value={form.kmFim}
                      onChange={(e) => setForm((p) => ({ ...p, kmFim: e.target.value }))}
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-extrabold text-blue-700">MÉDIA REALIZADA NO TESTE (KM/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.mediaTeste}
                    onChange={(e) => setForm((p) => ({ ...p, mediaTeste: e.target.value }))}
                    className="w-full p-3 border border-blue-300 rounded-xl text-sm font-extrabold text-blue-900 bg-blue-50"
                    placeholder="Ex: 2.65"
                  />
                  <div className="text-[11px] text-slate-500 font-bold mt-2">
                    Isso comprova que o carro faz média quando pilotado corretamente.
                  </div>
                </div>
              </div>

              {/* 2) Checklist */}
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <FaClipboardList /> Checklist Técnico (o que foi corrigido?)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHECKLIST_ITENS.map((chk) => (
                    <label
                      key={chk.id}
                      className={clsx(
                        "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition",
                        form.checklist[chk.id] ? "bg-emerald-50 border-emerald-300" : "hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!form.checklist[chk.id]}
                        onChange={() => toggleCheck(chk.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700 font-bold">{chk.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="text-xs font-extrabold text-slate-500">Observações do Instrutor</label>
                  <textarea
                    value={form.obs}
                    onChange={(e) => setForm((p) => ({ ...p, obs: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border rounded-xl text-sm"
                    placeholder="Ex: Ajustou antecipação e faixa verde; reforçar retarder nas descidas."
                  />
                </div>
              </div>

              {/* 3) Nível */}
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm mb-3">Definição do Nível (Contrato)</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setForm((p) => ({ ...p, nivel: lvl }))}
                      type="button"
                      className={clsx(
                        "p-4 rounded-2xl border text-left transition",
                        NIVEIS[lvl].pill,
                        form.nivel === lvl ? "ring-2 ring-offset-2 ring-slate-700" : "hover:opacity-90"
                      )}
                    >
                      <div className="font-extrabold">{NIVEIS[lvl].label}</div>
                      <div className="text-xs font-bold opacity-80 mt-1">{NIVEIS[lvl].dias} dias de monitoramento</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={salvarIntervencao}
                disabled={saving}
                className={clsx(
                  "w-full py-3 rounded-2xl shadow-md flex justify-center items-center gap-2 transition font-extrabold",
                  saving ? "bg-slate-300 text-slate-600 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <FaSave /> {saving ? "SALVANDO..." : "SALVAR E INICIAR MONITORAMENTO"}
              </button>

              <div className="text-[11px] text-slate-500 font-bold text-center">
                Ao salvar: status muda para <span className="text-slate-800">EM MONITORAMENTO</span>, o botão LANÇAR some e o sistema registra auditoria do instrutor.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
