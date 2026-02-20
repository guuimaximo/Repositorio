import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import { FaDownload, FaSyncAlt } from "react-icons/fa";

// ✅ CORES VIVAS (alerta) – bem contrastado no fundo escuro
const COLORS = {
  RECOLHEU: "#EF4444", // vermelho vivo
  SOS: "#F59E0B", // amarelo/âmbar vivo
  AVARIA: "#22C55E", // verde vivo
  TROCA: "#3B82F6", // azul vivo
  IMPROCEDENTE: "#E5E7EB", // cinza claro
};

const TIPOS_GRAFICO = ["RECOLHEU", "SOS", "AVARIA", "TROCA", "IMPROCEDENTE"];

const TIPOS_TABELA = [
  "TROCA",
  "SOS",
  "RECOLHEU",
  "AVARIA",
  "IMPROCEDENTE",
  "SEGUIU VIAGEM",
];

function todayYMD_SP() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function monthRange(ym) {
  if (!ym) return { start: "", end: "" };
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return { start: "", end: "" };

  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));

  const toYMD = (d) => {
    const yy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return { start: toYMD(first), end: toYMD(last) };
}

function normalizeTipo(oc) {
  const o = String(oc || "").toUpperCase().trim();
  if (!o) return "";

  if (o === "RA" || o === "R.A" || o === "R.A.") return "RECOLHEU";
  if (TIPOS_TABELA.includes(o)) return o;

  if (o.includes("RECOLH")) return "RECOLHEU";
  if (o.includes("IMPRO")) return "IMPROCEDENTE";
  if (o.includes("TROC")) return "TROCA";
  if (o === "S.O.S") return "SOS";

  return o;
}

function labelOcorrenciaTabela(oc) {
  const n = normalizeTipo(oc);
  return n ? n : "FECHAR ETIQUETA";
}

function isOcorrenciaValidaParaMKBF(oc) {
  const tipo = normalizeTipo(oc);
  if (!tipo) return false;
  if (tipo === "SEGUIU VIAGEM") return false;
  return true;
}

async function fetchAllPeriodo({ dataInicio, dataFim }) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .gte("data_sos", dataInicio)
      .lte("data_sos", dataFim)
      .order("data_sos", { ascending: true })
      .order("hora_sos", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;

    const rows = data || [];
    all = all.concat(rows);

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

async function enterFullscreen(el) {
  try {
    const target = el || document.documentElement;
    if (document.fullscreenElement) return;

    if (target.requestFullscreen) return await target.requestFullscreen();
    if (target.webkitRequestFullscreen) return target.webkitRequestFullscreen();
  } catch (e) {
    console.warn("Fullscreen bloqueado:", e);
  }
}

async function exitFullscreen() {
  try {
    if (!document.fullscreenElement) return;

    if (document.exitFullscreen) return await document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  } catch (e) {
    console.warn("Exit fullscreen bloqueado:", e);
  }
}

export default function SOSDashboard() {
  const fsRef = useRef(null);

  const [mesRef, setMesRef] = useState(() => todayYMD_SP().slice(0, 7));
  const { start: defaultIni, end: defaultFim } = useMemo(
    () => monthRange(mesRef),
    [mesRef]
  );
  const [dataInicio, setDataInicio] = useState(defaultIni);
  const [dataFim, setDataFim] = useState(defaultFim);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [series, setSeries] = useState([]);
  const [cards, setCards] = useState({ totalPeriodo: 0, porTipo: {} });
  const [doDia, setDoDia] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [kmPeriodo, setKmPeriodo] = useState(0);
  const [ocorrenciasValidasPeriodo, setOcorrenciasValidasPeriodo] = useState(0);
  const [mkbfPeriodo, setMkbfPeriodo] = useState(0);

  const [modoExibicao, setModoExibicao] = useState(false);
  const [realtimeOn, setRealtimeOn] = useState(false);

  const debounceRef = useRef(null);
  const channelRef = useRef(null);
  const modoRef = useRef(false); // Para controlar FS vs State

  const hoje = useMemo(() => todayYMD_SP(), []);
  const acumuladoDia = useMemo(() => (doDia || []).length, [doDia]);

  useEffect(() => {
    const { start, end } = monthRange(mesRef);
    setDataInicio(start);
    setDataFim(end);
  }, [mesRef]);

  const fetchDashboard = useCallback(async () => {
    if (!dataInicio || !dataFim) return;

    setLoading(true);
    setErro("");

    try {
      const { data: periodoData, error: periodoErr } = await supabase
        .from("sos_acionamentos")
        .select("id, data_sos, ocorrencia")
        .gte("data_sos", dataInicio)
        .lte("data_sos", dataFim);

      if (periodoErr) throw periodoErr;

      const { data: kmData, error: kmErr } = await supabase
        .from("km_rodado_diario")
        .select("km_total, data")
        .gte("data", dataInicio)
        .lte("data", dataFim);

      if (kmErr) throw kmErr;

      const kmSum = (kmData || []).reduce(
        (acc, r) => acc + (Number(r.km_total) || 0),
        0
      );

      const ocorrValidas = (periodoData || []).reduce((acc, r) => {
        return acc + (isOcorrenciaValidaParaMKBF(r.ocorrencia) ? 1 : 0);
      }, 0);

      setKmPeriodo(kmSum);
      setOcorrenciasValidasPeriodo(ocorrValidas);
      setMkbfPeriodo(ocorrValidas > 0 ? kmSum / ocorrValidas : 0);

      // DO DIA
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select(
          "id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, reclamacao_motorista, ocorrencia, status"
        )
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // Série por dia
      const byDay = new Map();
      (periodoData || []).forEach((r) => {
        const day = r.data_sos;
        if (!day) return;

        const tipo = normalizeTipo(r.ocorrencia);
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;

        if (!byDay.has(day)) {
          const base = { day };
          TIPOS_GRAFICO.forEach((t) => (base[t] = 0));
          byDay.set(day, base);
        }

        byDay.get(day)[tipo] = (byDay.get(day)[tipo] || 0) + 1;
      });

      const chart = Array.from(byDay.values())
        .filter((row) => TIPOS_GRAFICO.some((t) => (row[t] || 0) > 0))
        .sort((a, b) => a.day.localeCompare(b.day));

      const porTipo = {};
      TIPOS_GRAFICO.forEach((t) => (porTipo[t] = 0));

      (periodoData || []).forEach((r) => {
        const tipo = normalizeTipo(r.ocorrencia);
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      });

      const totalPeriodo = Object.values(porTipo).reduce(
        (acc, v) => acc + (v || 0),
        0
      );

      setSeries(chart);
      setCards({ totalPeriodo, porTipo });
      setDoDia(diaData || []);
      setLastUpdate(new Date());
    } catch (e) {
      setErro(e?.message || "Erro ao carregar dashboard.");
      setSeries([]);
      setCards({ totalPeriodo: 0, porTipo: {} });
      setDoDia([]);
      setKmPeriodo(0);
      setOcorrenciasValidasPeriodo(0);
      setMkbfPeriodo(0);
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, hoje]);

  function scheduleReload() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchDashboard(), 600);
  }

  function setupRealtime() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!realtimeOn) return;

    channelRef.current = supabase
      .channel("realtime-sos_acionamentos-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_acionamentos" },
        () => scheduleReload()
      )
      .subscribe();
  }

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOn]);

  useEffect(() => {
    modoRef.current = modoExibicao;
  }, [modoExibicao]);

  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs && modoRef.current) {
        setModoExibicao(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleModoExibicao = useCallback(async () => {
    const el = fsRef.current;
    if (!modoRef.current) {
      setModoExibicao(true);
      setTimeout(() => enterFullscreen(el), 50);
    } else {
      await exitFullscreen();
      setModoExibicao(false);
    }
  }, []);

  async function exportExcelPeriodo() {
    if (!dataInicio || !dataFim) return;
    setLoading(true);
    setErro("");
    try {
      const rowsPeriodo = await fetchAllPeriodo({ dataInicio, dataFim });
      const wb = XLSX.utils.book_new();

      const wsPeriodo = XLSX.utils.json_to_sheet(
        (rowsPeriodo || []).map((r) => ({
          ...r,
          ocorrencia_exibida: labelOcorrenciaTabela(r.ocorrencia),
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsPeriodo, "Intervencoes_periodo");

      const wsSerie = XLSX.utils.json_to_sheet(series || []);
      XLSX.utils.book_append_sheet(wb, wsSerie, "Grafico_por_dia");

      const resumo = [
        { chave: "Periodo_inicio", valor: dataInicio },
        { chave: "Periodo_fim", valor: dataFim },
        { chave: "Total_periodo", valor: cards.totalPeriodo || 0 },
        ...Object.entries(cards.porTipo || {}).map(([k, v]) => ({
          chave: k,
          valor: v,
        })),
        { chave: "KM_rodado_periodo", valor: Number(kmPeriodo || 0) },
        {
          chave: "Ocorrencias_validas_MKBF",
          valor: Number(ocorrenciasValidasPeriodo || 0),
        },
        { chave: "MKBF_periodo", valor: Number(mkbfPeriodo || 0) },
      ];
      const wsResumo = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `Intervencoes_${dataInicio}_a_${dataFim}_${stamp}.xlsx`);
    } catch (e) {
      setErro(e?.message || "Erro ao gerar Excel do período.");
    } finally {
      setLoading(false);
    }
  }

  const totalKPI = cards.totalPeriodo || 0;

  // Estilos Comuns
  const shell = modoExibicao
    ? "h-screen w-screen bg-[#0b0f14] text-white overflow-hidden"
    : "min-h-screen bg-[#0b0f14] text-white p-3 overflow-y-scroll";

  const panel = "border border-white/10 rounded-xl bg-[#15191e] shadow-sm";
  const smallText = "text-xs text-white/60 font-medium uppercase tracking-wider";
  const titleText = "text-sm font-bold text-white tracking-wide";

  // =================================================================
  // ✅ MODO EXIBIÇÃO: GRID COM SIDEBAR ESQUERDA + GRÁFICO + TABELA
  // =================================================================
  const ExibicaoLayout = (
    <div className="h-full w-full p-4 grid grid-cols-12 gap-4">
      {/* --- COLUNA ESQUERDA (SIDEBAR) --- */}
      <div className="col-span-3 flex flex-col gap-4 h-full min-h-0">
        {/* Lista de Ocorrências (AJUSTADO: cabe mais sem aumentar o campo) */}
        <div className={`${panel} flex-1 flex flex-col min-h-0 p-3`}>
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className={titleText}>OCORRÊNCIA</span>
            <span className={titleText}>TOTAL</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
            {TIPOS_GRAFICO.map((t) => (
              <div
                key={t}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderLeft: `4px solid ${COLORS[t]}`,
                }}
              >
                <span className="text-xs font-semibold text-gray-200 leading-none">
                  {t}
                </span>
                <span className="text-base font-extrabold leading-none">
                  {cards.porTipo?.[t] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs (Total e KM) */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className={`${panel} p-4 flex flex-col justify-center`}>
            <div className={smallText}>TOTAL</div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {totalKPI}
            </div>
          </div>
          <div className={`${panel} p-4 flex flex-col justify-center`}>
            <div className={smallText}>KM TOTAL</div>
            <div className="text-xl font-extrabold text-white mt-1">
              {Number(kmPeriodo || 0).toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        </div>

        {/* MKBF + Checkbox Tempo Real */}
        <div className={`${panel} p-4 shrink-0`}>
          <div className={smallText}>MKBF</div>
          <div className="text-4xl font-extrabold text-white my-2">
            {Number(mkbfPeriodo || 0).toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-gray-400">
            Ocorrências:{" "}
            <span className="text-white font-bold">
              {ocorrenciasValidasPeriodo || 0}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={realtimeOn}
                onChange={(e) => setRealtimeOn(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              Tempo real
            </label>

            <button
              onClick={toggleModoExibicao}
              className="text-xs text-white/30 hover:text-white hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* --- COLUNA DIREITA (CONTEÚDO) --- */}
      <div className="col-span-9 grid grid-rows-[55%_1fr] gap-4 h-full min-h-0">
        {/* GRÁFICO */}
        <div className={`${panel} w-full h-full p-4 flex flex-col min-h-0`}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <span className={titleText}>Intervenções por dia</span>
                {/* Select Discreto para Mês */}
                <select
                  value={mesRef}
                  onChange={(e) => setMesRef(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded px-2 py-0.5 text-xs text-gray-400 outline-none hover:bg-black/50 transition-colors"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const ym = `${d.getFullYear()}-${String(
                      d.getMonth() + 1
                    ).padStart(2, "0")}`;
                    return (
                      <option key={ym} value={ym}>
                        {ym}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className={smallText + " mt-1"}>
                Acumulado do dia ({hoje}):{" "}
                <span className="font-bold text-white">{acumuladoDia}</span>
              </div>
            </div>
            <div className={smallText}>
              {lastUpdate ? lastUpdate.toLocaleTimeString() : ""}
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                  }}
                  labelStyle={{
                    color: "#9ca3af",
                    marginBottom: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }}
                />
                {TIPOS_GRAFICO.map((t) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    stackId="a"
                    fill={COLORS[t]}
                    maxBarSize={60}
                  >
                    <LabelList
                      dataKey={t}
                      position="center"
                      formatter={(v) => (v > 0 ? v : "")}
                      fill={t === "IMPROCEDENTE" ? "#111827" : "#FFFFFF"}
                      fontSize={11}
                      fontWeight="bold"
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELA (AJUSTADO: mesma “moldura/largura visual” do gráfico via p-4) */}
        <div
          className={`${panel} w-full h-full p-4 flex flex-col min-h-0 overflow-hidden`}
        >
          <div className="mb-3 pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="font-semibold text-white text-sm">
              Intervenções do dia
            </div>
            <div className="px-2 py-0.5 rounded bg-white/10 text-xs font-bold text-gray-300">
              Total hoje: {doDia.length}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-gray-300 table-fixed">
              <thead className="sticky top-0 bg-[#1a1f26] z-10 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="py-3 pr-3 w-[90px]">Etiqueta</th>
                  <th className="py-3 pr-3 w-[90px]">Carro</th>
                  <th className="py-3 pr-3 w-[110px]">Data</th>
                  <th className="py-3 pr-3 w-[90px]">Hora</th>
                  <th className="py-3 pr-3">Reclamação</th>
                  <th className="py-3 pl-3 w-[160px] text-right">
                    Tipo Ocorrência
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : doDia.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Nenhuma intervenção hoje.
                    </td>
                  </tr>
                ) : (
                  doDia.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-mono text-white">
                        {r.numero_sos || "-"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-300">
                        {r.veiculo || "-"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400">
                        {r.data_sos || "-"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400">
                        {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "-"}
                      </td>
                      <td
                        className="py-2.5 pr-3 text-white truncate"
                        title={r.reclamacao_motorista}
                      >
                        {r.reclamacao_motorista || "-"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <span
                          className="font-bold text-xs uppercase tracking-wide"
                          style={{
                            color:
                              COLORS[normalizeTipo(r.ocorrencia)] || "#fff",
                          }}
                        >
                          {labelOcorrenciaTabela(r.ocorrencia)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Layout Normal (Mantido conforme solicitado, apenas consumindo cores globais)
  const NormalLayout = (
    <div
      className="max-w-[1400px] mx-auto p-2 grid grid-rows-[auto_1fr_1fr] gap-3"
      style={{ minHeight: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
            className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const ym = `${y}-${m}`;
              return (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              );
            })}
          </select>

          <div className={smallText}>
            {dataInicio} - {dataFim}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="bg-white/10 border border-white/20 hover:bg-white/15 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "..." : "Recarregar"}
          </button>

          <button
            onClick={exportExcelPeriodo}
            className="bg-white/10 border border-white/20 hover:bg-white/15 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            disabled={loading}
          >
            <FaDownload />
            Excel
          </button>

          <button
            onClick={toggleModoExibicao}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-semibold"
            type="button"
          >
            Modo Exibição
          </button>
        </div>
      </div>

      {erro && (
        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3 min-h-0" style={{ minHeight: 0 }}>
        <div className="col-span-4 min-h-0">
          <div className={`${panel} h-full min-h-0 overflow-hidden p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className={titleText}>OCORRÊNCIA</div>
              <div className={`${titleText} text-right`}>TOTAL</div>
            </div>

            <div className="min-h-0 overflow-auto pr-1">
              <div className="space-y-2">
                {TIPOS_GRAFICO.map((t) => (
                  <div
                    key={t}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <span className="text-sm">{t}</span>
                    <span className="text-sm font-bold">
                      {cards.porTipo?.[t] || 0}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`${panel} p-3`}>
                  <div className={smallText}>TOTAL</div>
                  <div className="text-2xl font-extrabold">{totalKPI}</div>
                </div>

                <div className={`${panel} p-3`}>
                  <div className={smallText}>KM TOTAL</div>
                  <div className="text-2xl font-extrabold">
                    {Number(kmPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className={`${panel} p-3`}>
                  <div className={smallText}>MKBF</div>
                  <div className="text-3xl font-extrabold">
                    {Number(mkbfPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className={`${smallText} mt-1`}>
                    Ocorrências:{" "}
                    <span className="font-semibold text-white">
                      {ocorrenciasValidasPeriodo || 0}
                    </span>
                  </div>
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={realtimeOn}
                  onChange={(e) => setRealtimeOn(e.target.checked)}
                  className="h-4 w-4"
                />
                Tempo real
              </label>
            </div>
          </div>
        </div>

        <div className="col-span-8 min-h-0">
          <div className={`${panel} h-full min-h-0 overflow-hidden p-3`}>
            <div className="flex items-start justify-between">
              <div>
                <div className={titleText}>Intervenções por dia</div>
                <div className={smallText}>
                  Acumulado do dia ({hoje}):{" "}
                  <span className="font-semibold text-white">{acumuladoDia}</span>
                </div>
              </div>
              <div className={smallText}>
                {lastUpdate
                  ? lastUpdate.toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })
                  : "—"}
              </div>
            </div>

            <div style={{ width: "100%", height: 380, marginTop: 6 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.12)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.7)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.7)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  />
                  <Tooltip
                    wrapperStyle={{ outline: "none" }}
                    contentStyle={{
                      background: "rgba(10,12,16,0.95)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "white",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                  />
                  <Legend verticalAlign="bottom" height={28} />
                  {TIPOS_GRAFICO.map((t) => (
                    <Bar key={t} dataKey={t} stackId="a" fill={COLORS[t]}>
                      <LabelList
                        dataKey={t}
                        position="center"
                        formatter={(v) => (v > 0 ? v : "")}
                        fill={t === "IMPROCEDENTE" ? "#111827" : "#FFFFFF"}
                        fontSize={12}
                        fontWeight="bold"
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {!loading && series.length === 0 && (
              <div className="mt-2 text-sm text-white/70">
                Nenhum registro válido para o gráfico neste período.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0">
        <div className={`${panel} h-full min-h-0 overflow-hidden`}>
          <div className="px-3 py-2 border-b border-white/15 flex items-center justify-between">
            <div className={titleText}>Intervenções do dia</div>
            <div className={smallText}>
              Total hoje:{" "}
              <span className="font-semibold text-white">{doDia.length}</span>
            </div>
          </div>

          <div
            className="min-h-0 overflow-auto"
            style={{ height: "calc(100% - 42px)" }}
          >
            <table className="min-w-full text-sm">
              <thead
                className="sticky top-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <tr className="text-white/80">
                  <th className="py-2 px-3 text-left">ETIQUETA</th>
                  <th className="py-2 px-3 text-left">CARRO</th>
                  <th className="py-2 px-3 text-left">DATA</th>
                  <th className="py-2 px-3 text-left">HORA</th>
                  <th className="py-2 px-3 text-left">RECLAMAÇÃO</th>
                  <th className="py-2 px-3 text-left">TIPO OCORRÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-white/70">
                      Carregando...
                    </td>
                  </tr>
                ) : doDia.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-white/70">
                      Nenhuma intervenção encontrada para hoje.
                    </td>
                  </tr>
                ) : (
                  doDia.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t"
                      style={{ borderColor: "rgba(255,255,255,0.10)" }}
                    >
                      <td className="py-2 px-3">{r.numero_sos ?? "—"}</td>
                      <td className="py-2 px-3">{r.veiculo ?? "—"}</td>
                      <td className="py-2 px-3">{r.data_sos ?? "—"}</td>
                      <td className="py-2 px-3">
                        {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {r.reclamacao_motorista ?? "—"}
                      </td>
                      <td className="py-2 px-3">
                        {labelOcorrenciaTabela(r.ocorrencia)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={fsRef} className={shell} style={{ minHeight: 0 }}>
      {modoExibicao ? ExibicaoLayout : NormalLayout}
    </div>
  );
}
