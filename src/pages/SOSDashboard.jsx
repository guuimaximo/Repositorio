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

// ✅ Tipos do gráfico (RA virou RECOLHEU)
const TIPOS_GRAFICO = ["RECOLHEU", "SOS", "AVARIA", "TROCA", "IMPROCEDENTE"];

// Tipos que podem aparecer na tabela (inclui SEGUIU VIAGEM se vier do banco)
const TIPOS_TABELA = [
  "TROCA",
  "SOS",
  "RECOLHEU",
  "AVARIA",
  "IMPROCEDENTE",
  "SEGUIU VIAGEM",
];

const COLORS = {
  RECOLHEU: "#2563eb",
  SOS: "#7c3aed",
  AVARIA: "#93c5fd",
  TROCA: "#60a5fa",
  IMPROCEDENTE: "#e5e7eb",
};

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

// ✅ Normaliza ocorrência + RA vira RECOLHEU
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

// ✅ MKBF: ocorrência válida = tudo exceto vazio e SEGUIU VIAGEM
function isOcorrenciaValidaParaMKBF(oc) {
  const tipo = normalizeTipo(oc);
  if (!tipo) return false;
  if (tipo === "SEGUIU VIAGEM") return false;
  return true;
}

// ✅ Buscar TODOS os registros do período (para Excel)
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

// ===== Fullscreen helpers (mais compatível) =====
async function enterFullscreen(el) {
  try {
    if (document.fullscreenElement) return;

    const target = el || document.documentElement;

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

  const [mesRef, setMesRef] = useState(() => todayYMD_SP().slice(0, 7)); // YYYY-MM
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

  // ✅ KM + MKBF (período)
  const [kmPeriodo, setKmPeriodo] = useState(0);
  const [ocorrenciasValidasPeriodo, setOcorrenciasValidasPeriodo] = useState(0);
  const [mkbfPeriodo, setMkbfPeriodo] = useState(0);

  // ✅ Modo Exibição (TV)
  const [modoExibicao, setModoExibicao] = useState(false);

  // (opcional) tempo real
  const [realtimeOn, setRealtimeOn] = useState(false);
  const debounceRef = useRef(null);
  const channelRef = useRef(null);

  const hoje = useMemo(() => todayYMD_SP(), []);
  const acumuladoDia = useMemo(() => (doDia || []).length, [doDia]);

  // Atualiza datas ao trocar mês
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

      // ✅ DO DIA (tabela inferior)
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select(
          "id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, reclamacao_motorista, ocorrencia, status"
        )
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // ✅ Série por dia (empilhado)
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

  // ✅ fullscreen após render (evita “cair”)
  useEffect(() => {
    const el = fsRef.current;
    if (modoExibicao) {
      const t = setTimeout(() => enterFullscreen(el), 50);
      return () => clearTimeout(t);
    }
    exitFullscreen();
  }, [modoExibicao]);

  // ✅ sincroniza estado com ESC
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && modoExibicao) {
        setModoExibicao(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [modoExibicao]);

  function toggleModoExibicao() {
    setModoExibicao((v) => !v);
  }

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

  const shell = modoExibicao
    ? "h-screen w-screen bg-[#0b0f14] text-white overflow-hidden"
    : "min-h-screen bg-[#0b0f14] text-white p-3 overflow-y-scroll";

  const panel =
    "border border-white/20 rounded-2xl bg-black/20 backdrop-blur-sm";
  const smallText = "text-xs text-white/70";
  const titleText = "text-sm font-semibold text-white/85";

  // ✅ layout do modo exibição: 1 tela, SEM sidebar (igual seu pedido)
  // Top bar + (gráfico) + (tabela do dia)
  const ExibicaoLayout = (
    <div
      className="h-screen w-screen p-2 grid grid-rows-[auto_1fr_1fr] gap-2"
      style={{ minHeight: 0 }}
    >
      {/* TOP */}
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
            onClick={toggleModoExibicao}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-semibold"
            type="button"
          >
            Sair do modo
          </button>
        </div>
      </div>

      {/* CHART */}
      <div className={`${panel} min-h-0 overflow-hidden p-3`}>
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

        <div style={{ width: "100%", height: "calc(100% - 34px)", marginTop: 6 }}>
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
      </div>

      {/* TABELA */}
      <div className={`${panel} min-h-0 overflow-hidden`}>
        <div className="px-3 py-2 border-b border-white/15 flex items-center justify-between">
          <div className={titleText}>Intervenções do dia</div>
          <div className={smallText}>
            Total hoje:{" "}
            <span className="font-semibold text-white">{doDia.length}</span>
          </div>
        </div>

        <div className="min-h-0 overflow-auto" style={{ height: "calc(100% - 42px)" }}>
          <table className="min-w-full text-sm">
            <thead
              className="sticky top-0"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <tr className="text-white/80">
                <th className="py-2 px-3 text-left">ETIQUETA</th>
                <th className="py-2 px-3 text-left">DATA</th>
                <th className="py-2 px-3 text-left">HORA</th>
                <th className="py-2 px-3 text-left">RECLAMAÇÃO</th>
                <th className="py-2 px-3 text-left">TIPO OCORRÊNCIA</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-white/70">
                    Carregando...
                  </td>
                </tr>
              ) : doDia.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-white/70">
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
                    <td className="py-2 px-3">{r.data_sos ?? "—"}</td>
                    <td className="py-2 px-3">
                      {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "—"}
                    </td>
                    <td className="py-2 px-3">{r.reclamacao_motorista ?? "—"}</td>
                    <td className="py-2 px-3">{labelOcorrenciaTabela(r.ocorrencia)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ✅ layout normal: com sidebar + gráfico + tabela (igual seu print)
  const NormalLayout = (
    <div
      className="max-w-[1400px] mx-auto p-2 grid grid-rows-[auto_1fr_1fr] gap-3"
      style={{ minHeight: 0 }}
    >
      {/* TOP BAR */}
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

      {/* MID: sidebar + chart */}
      <div className="grid grid-cols-12 gap-3 min-h-0" style={{ minHeight: 0 }}>
        {/* SIDEBAR */}
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

        {/* CHART */}
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

            {/* ✅ altura fixa no modo normal = não “cai” */}
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

      {/* BOTTOM: tabela */}
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
                  <th className="py-2 px-3 text-left">DATA</th>
                  <th className="py-2 px-3 text-left">HORA</th>
                  <th className="py-2 px-3 text-left">RECLAMAÇÃO</th>
                  <th className="py-2 px-3 text-left">TIPO OCORRÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-white/70">
                      Carregando...
                    </td>
                  </tr>
                ) : doDia.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-white/70">
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
                      <td className="py-2 px-3">{r.data_sos ?? "—"}</td>
                      <td className="py-2 px-3">
                        {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "—"}
                      </td>
                      <td className="py-2 px-3">{r.reclamacao_motorista ?? "—"}</td>
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
