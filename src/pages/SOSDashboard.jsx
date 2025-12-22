import { useEffect, useMemo, useRef, useState } from "react";
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
  LineChart,
  Line,
  LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import { FaDownload, FaSyncAlt } from "react-icons/fa";

// ✅ Tipos do gráfico (RA virou RECOLHEU)
const TIPOS_GRAFICO = ["TROCA", "SOS", "RECOLHEU", "AVARIA", "IMPROCEDENTE"];

// Tipos que podem aparecer na tabela (inclui SEGUIU VIAGEM se vier do banco)
const TIPOS_TABELA = ["TROCA", "SOS", "RECOLHEU", "AVARIA", "IMPROCEDENTE", "SEGUIU VIAGEM"];

const COLORS = {
  TROCA: "#16a34a",
  SOS: "#ef4444",
  RECOLHEU: "#2563eb",
  AVARIA: "#06b6d4",
  IMPROCEDENTE: "#6b7280",
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
  if (!o) return ""; // vazio

  // ✅ RA = RECOLHEU
  if (o === "RA" || o === "R.A" || o === "R.A.") return "RECOLHEU";

  if (TIPOS_TABELA.includes(o)) return o;

  // mapeamentos comuns
  if (o.includes("RECOLH")) return "RECOLHEU";
  if (o.includes("IMPRO")) return "IMPROCEDENTE";
  if (o.includes("TROC")) return "TROCA";
  if (o === "S.O.S") return "SOS";

  // mantém texto para tabela, mas no gráfico só entram os TIPOS_GRAFICO
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

function ymdToYear(ymd) {
  if (!ymd) return "";
  return String(ymd).slice(0, 4);
}

function yearRangeFromYear(y) {
  if (!y) return { start: "", end: "" };
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

// ✅ Buscar TODOS os registros do período (para Excel)
async function fetchAllPeriodo({ dataInicio, dataFim }) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    let q = supabase
      .from("sos_acionamentos")
      .select("*")
      .gte("data_sos", dataInicio)
      .lte("data_sos", dataFim)
      .order("data_sos", { ascending: true })
      .order("hora_sos", { ascending: true });

    const { data, error } = await q.range(from, from + PAGE - 1);

    if (error) throw error;

    const rows = data || [];
    all = all.concat(rows);

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

export default function SOSDashboard() {
  const [mesRef, setMesRef] = useState(() => todayYMD_SP().slice(0, 7)); // YYYY-MM

  const { start: defaultIni, end: defaultFim } = useMemo(() => monthRange(mesRef), [mesRef]);
  const [dataInicio, setDataInicio] = useState(defaultIni);
  const [dataFim, setDataFim] = useState(defaultFim);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [series, setSeries] = useState([]);
  const [cards, setCards] = useState({ totalPeriodo: 0, porTipo: {} });
  const [doDia, setDoDia] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [realtimeOn, setRealtimeOn] = useState(true);

  // ✅ ETAPA 3: KM + MKBF
  const [kmPeriodo, setKmPeriodo] = useState(0);
  const [ocorrenciasValidasPeriodo, setOcorrenciasValidasPeriodo] = useState(0);
  const [mkbfPeriodo, setMkbfPeriodo] = useState(0);

  // ✅ MKBF do ano (gráfico de linhas)
  const [mkbfAnoSerie, setMkbfAnoSerie] = useState([]);
  const [kmAnoTotal, setKmAnoTotal] = useState(0);
  const [ocorrAnoTotal, setOcorrAnoTotal] = useState(0);
  const [mkbfAno, setMkbfAno] = useState(0);

  // ✅ Resumo do dia por tipo (cards à direita)
  const [diaPorTipo, setDiaPorTipo] = useState(() => {
    const base = {};
    TIPOS_GRAFICO.forEach((t) => (base[t] = 0));
    return base;
  });

  // ✅ Modo Exibição (TV)
  const [modoExibicao, setModoExibicao] = useState(false);

  const debounceRef = useRef(null);
  const channelRef = useRef(null);

  const hoje = useMemo(() => todayYMD_SP(), []);

  useEffect(() => {
    const { start, end } = monthRange(mesRef);
    setDataInicio(start);
    setDataFim(end);
  }, [mesRef]);

  async function fetchDashboard() {
    if (!dataInicio || !dataFim) return;

    setLoading(true);
    setErro("");

    try {
      // PERÍODO: só o necessário para gráfico + cards
      const { data: periodoData, error: periodoErr } = await supabase
        .from("sos_acionamentos")
        .select("id, data_sos, ocorrencia")
        .gte("data_sos", dataInicio)
        .lte("data_sos", dataFim);

      if (periodoErr) throw periodoErr;

      // ✅ ETAPA 3: KM do período (tabela km_rodado_diario)
      const { data: kmData, error: kmErr } = await supabase
        .from("km_rodado_diario")
        .select("km_total, data")
        .gte("data", dataInicio)
        .lte("data", dataFim);

      if (kmErr) throw kmErr;

      const kmSum = (kmData || []).reduce((acc, r) => acc + (Number(r.km_total) || 0), 0);

      // ✅ ETAPA 3: ocorrências válidas para MKBF (exceto SEGUIU VIAGEM e vazio)
      const ocorrValidas = (periodoData || []).reduce((acc, r) => {
        return acc + (isOcorrenciaValidaParaMKBF(r.ocorrencia) ? 1 : 0);
      }, 0);

      const mkbf = ocorrValidas > 0 ? kmSum / ocorrValidas : 0;

      setKmPeriodo(kmSum);
      setOcorrenciasValidasPeriodo(ocorrValidas);
      setMkbfPeriodo(mkbf);

      // DIA: tabela completa
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select(
          "id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, local_ocorrencia, ocorrencia, status"
        )
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // ✅ resumo do dia (TIPOS_GRAFICO)
      const diaResumo = {};
      TIPOS_GRAFICO.forEach((t) => (diaResumo[t] = 0));
      (diaData || []).forEach((r) => {
        const tipo = normalizeTipo(r.ocorrencia);
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;
        diaResumo[tipo] = (diaResumo[tipo] || 0) + 1;
      });
      setDiaPorTipo(diaResumo);

      // ------------------------
      // Gráfico: apenas TIPOS_GRAFICO, sem vazio
      // ------------------------
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

      // ------------------------
      // Cards: alinhado ao gráfico
      // ------------------------
      const porTipo = {};
      TIPOS_GRAFICO.forEach((t) => (porTipo[t] = 0));

      (periodoData || []).forEach((r) => {
        const tipo = normalizeTipo(r.ocorrencia);
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      });

      const totalPeriodo = Object.values(porTipo).reduce((acc, v) => acc + (v || 0), 0);

      setSeries(chart);
      setCards({ totalPeriodo, porTipo });
      setDoDia(diaData || []);
      setLastUpdate(new Date());

      // =========================
      // MKBF do ANO (Linhas)
      // =========================
      const year = ymdToYear(dataInicio) || ymdToYear(hoje);
      const { start: anoIni, end: anoFim } = yearRangeFromYear(year);

      const { data: kmAnoData, error: kmAnoErr } = await supabase
        .from("km_rodado_diario")
        .select("data, km_total")
        .gte("data", anoIni)
        .lte("data", anoFim);

      if (kmAnoErr) throw kmAnoErr;

      const { data: ocorrAnoData, error: ocorrAnoErr } = await supabase
        .from("sos_acionamentos")
        .select("data_sos, ocorrencia")
        .gte("data_sos", anoIni)
        .lte("data_sos", anoFim);

      if (ocorrAnoErr) throw ocorrAnoErr;

      // agrega por mês
      const kmPorMes = new Map(); // "01".."12" -> km
      const ocorrPorMes = new Map(); // "01".."12" -> ocorr validas

      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        kmPorMes.set(mm, 0);
        ocorrPorMes.set(mm, 0);
      }

      (kmAnoData || []).forEach((r) => {
        const d = String(r.data || "");
        const mm = d.slice(5, 7);
        if (!mm) return;
        kmPorMes.set(mm, (kmPorMes.get(mm) || 0) + (Number(r.km_total) || 0));
      });

      (ocorrAnoData || []).forEach((r) => {
        const d = String(r.data_sos || "");
        const mm = d.slice(5, 7);
        if (!mm) return;
        if (!isOcorrenciaValidaParaMKBF(r.ocorrencia)) return;
        ocorrPorMes.set(mm, (ocorrPorMes.get(mm) || 0) + 1);
      });

      const serieAno = [];
      let kmTotalAno = 0;
      let ocorrTotalAno = 0;

      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        const kmM = kmPorMes.get(mm) || 0;
        const ocM = ocorrPorMes.get(mm) || 0;
        const mkbfM = ocM > 0 ? kmM / ocM : 0;

        kmTotalAno += kmM;
        ocorrTotalAno += ocM;

        serieAno.push({
          mes: `${mm}/${year}`,
          mkbf: mkbfM,
          km: kmM,
          ocorrencias: ocM,
        });
      }

      setKmAnoTotal(kmTotalAno);
      setOcorrAnoTotal(ocorrTotalAno);
      setMkbfAno(ocorrTotalAno > 0 ? kmTotalAno / ocorrTotalAno : 0);
      setMkbfAnoSerie(serieAno);
    } catch (e) {
      setErro(e?.message || "Erro ao carregar dashboard.");
      setSeries([]);
      setCards({ totalPeriodo: 0, porTipo: {} });
      setDoDia([]);

      setKmPeriodo(0);
      setOcorrenciasValidasPeriodo(0);
      setMkbfPeriodo(0);

      setMkbfAnoSerie([]);
      setKmAnoTotal(0);
      setOcorrAnoTotal(0);
      setMkbfAno(0);

      const base = {};
      TIPOS_GRAFICO.forEach((t) => (base[t] = 0));
      setDiaPorTipo(base);
    } finally {
      setLoading(false);
    }
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim]);

  useEffect(() => {
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOn]);

  async function exportExcelPeriodo() {
    if (!dataInicio || !dataFim) {
      alert("Selecione um período (Data início e Data fim).");
      return;
    }

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
        ...Object.entries(cards.porTipo || {}).map(([k, v]) => ({ chave: k, valor: v })),
        { chave: "KM_rodado_periodo", valor: Number(kmPeriodo || 0) },
        { chave: "Ocorrencias_validas_MKBF", valor: Number(ocorrenciasValidasPeriodo || 0) },
        { chave: "MKBF_periodo", valor: Number(mkbfPeriodo || 0) },
        { chave: "KM_rodado_ano", valor: Number(kmAnoTotal || 0) },
        { chave: "Ocorrencias_validas_ano", valor: Number(ocorrAnoTotal || 0) },
        { chave: "MKBF_ano", valor: Number(mkbfAno || 0) },
      ];
      const wsResumo = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `Intervencoes_${dataInicio}_a_${dataFim}_${stamp}.xlsx`);
    } catch (e) {
      setErro(e?.message || "Erro ao gerar Excel do período.");
    } finally {
      setLoading(false);
    }
  }

  const tipoCardsPeriodo = useMemo(() => {
    const porTipo = cards.porTipo || {};
    return TIPOS_GRAFICO.map((t) => ({ tipo: t, valor: porTipo[t] || 0 }));
  }, [cards]);

  // classes para modo TV
  const shellClass = modoExibicao
    ? "w-screen h-screen overflow-hidden p-2"
    : "max-w-7xl mx-auto p-6";

  const chartHeightMain = modoExibicao ? 260 : 320;
  const chartHeightAno = modoExibicao ? 220 : 260;

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className={modoExibicao ? "text-xl font-bold text-gray-800" : "text-2xl font-bold text-gray-800"}>
          Dashboard - Intervenções
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white shadow rounded-lg p-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mês (atalho)</label>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rt"
                type="checkbox"
                checked={realtimeOn}
                onChange={(e) => setRealtimeOn(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="rt" className="text-sm text-gray-700">
                Tempo real
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="tv"
                type="checkbox"
                checked={modoExibicao}
                onChange={(e) => setModoExibicao(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="tv" className="text-sm text-gray-700">
                Modo Exibição
              </label>
            </div>
          </div>

          <button
            onClick={fetchDashboard}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Carregando..." : "Recarregar"}
          </button>

          <button
            onClick={exportExcelPeriodo}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            <FaDownload />
            Baixar Excel
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {erro}
        </div>
      )}

      {/* LAYOUT: esquerda KPI + MKBF ano | direita resumo do dia (cards empilhados) */}
      <div className={modoExibicao ? "grid grid-cols-2 gap-2 mb-2" : "grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3"}>
        {/* ESQUERDA */}
        <div className="space-y-3">
          {/* KPI topo (KM + MKBF período + MKBF ano) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white shadow rounded-lg p-3">
              <p className="text-xs text-gray-500">KM rodado (período)</p>
              <p className="text-xl font-bold text-gray-800">
                {Number(kmPeriodo || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white shadow rounded-lg p-3">
              <p className="text-xs text-gray-500">MKBF (período)</p>
              <p className="text-xl font-bold text-gray-800">
                {Number(mkbfPeriodo || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Ocorrências: <strong>{ocorrenciasValidasPeriodo || 0}</strong>
              </p>
            </div>

            <div className="bg-white shadow rounded-lg p-3">
              <p className="text-xs text-gray-500">MKBF (ano)</p>
              <p className="text-xl font-bold text-gray-800">
                {Number(mkbfAno || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                KM: <strong>{Number(kmAnoTotal || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong> | Ocorr:{" "}
                <strong>{ocorrAnoTotal || 0}</strong>
              </p>
            </div>
          </div>

          {/* MKBF do ano (linhas) */}
          <div className="bg-white shadow rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800">MKBF do ano (por mês)</h2>
              <span className="text-xs text-gray-500">{ymdToYear(dataInicio) || ymdToYear(hoje)}</span>
            </div>
            <div style={{ width: "100%", height: chartHeightAno }}>
              <ResponsiveContainer>
                <LineChart data={mkbfAnoSerie}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mkbf" name="MKBF" dot={false} stroke="#111827" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DIREITA: Intervenções do dia (cards verticais com cores) */}
        <div className="bg-white shadow rounded-lg p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-gray-800">Resumo do dia</h2>
              <p className="text-xs text-gray-500">Hoje: {hoje}</p>
            </div>
            <div className="text-xs text-gray-500">
              {lastUpdate ? lastUpdate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {TIPOS_GRAFICO.map((t) => (
              <div
                key={t}
                className="rounded-lg p-3 text-white flex items-center justify-between"
                style={{ backgroundColor: COLORS[t] }}
              >
                <span className="font-semibold">{t}</span>
                <span className="text-2xl font-bold">{diaPorTipo?.[t] || 0}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 bg-gray-50 border rounded-lg p-2 text-sm text-gray-700 flex items-center justify-between">
            <span className="font-semibold">Total (hoje)</span>
            <span className="font-bold">{doDia.length}</span>
          </div>

          {/* Cards do período (empilhados) */}
          <div className="mt-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Intervenções (período)</h3>
            <div className="space-y-2">
              <div className="bg-white border rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Total (período)</span>
                <span className="text-xl font-bold text-gray-800">{cards.totalPeriodo || 0}</span>
              </div>

              {tipoCardsPeriodo.map((c) => (
                <div
                  key={c.tipo}
                  className="rounded-lg p-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: COLORS[c.tipo] }}
                >
                  <span className="font-semibold">{c.tipo}</span>
                  <span className="text-xl font-bold">{c.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intervenções por dia (embaixo) com quantidade em cada barra */}
      <div className="bg-white shadow rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Intervenções por dia (período)</h2>
          <span className="text-xs text-gray-500">
            Período: {dataInicio} até {dataFim}
          </span>
        </div>

        <div style={{ width: "100%", height: chartHeightMain }}>
          <ResponsiveContainer>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {TIPOS_GRAFICO.map((t) => (
                <Bar key={t} dataKey={t} stackId="a" fill={COLORS[t]}>
                  <LabelList dataKey={t} position="center" formatter={(v) => (v > 0 ? v : "")} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!loading && series.length === 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Nenhum registro válido para o gráfico neste período.
          </div>
        )}
      </div>

      {/* Intervenções do dia (embaixo) */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-gray-800">Intervenções do dia</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Nº SOS</th>
                <th className="py-3 px-4 text-left">Hora</th>
                <th className="py-3 px-4 text-left">Prefixo</th>
                <th className="py-3 px-4 text-left">Motorista</th>
                <th className="py-3 px-4 text-left">Linha</th>
                <th className="py-3 px-4 text-left">Local</th>
                <th className="py-3 px-4 text-left">Ocorrência</th>
                <th className="py-3 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-600">
                    Carregando...
                  </td>
                </tr>
              ) : doDia.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-600">
                    Nenhuma intervenção encontrada para hoje.
                  </td>
                </tr>
              ) : (
                doDia.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">{r.numero_sos ?? "—"}</td>
                    <td className="py-3 px-4">{r.hora_sos ? String(r.hora_sos).slice(0, 5) : "—"}</td>
                    <td className="py-3 px-4">{r.veiculo ?? "—"}</td>
                    <td className="py-3 px-4">{r.motorista_nome ?? "—"}</td>
                    <td className="py-3 px-4">{r.linha ?? "—"}</td>
                    <td className="py-3 px-4">{r.local_ocorrencia ?? "—"}</td>
                    <td className="py-3 px-4">{labelOcorrenciaTabela(r.ocorrencia)}</td>
                    <td className="py-3 px-4">{r.status ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t text-xs text-gray-500">
          Total hoje: <strong>{doDia.length}</strong>
        </div>
      </div>
    </div>
  );
}
