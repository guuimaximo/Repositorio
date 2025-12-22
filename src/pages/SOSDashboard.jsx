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

// ✅ Buscar TODOS os registros do período (para Excel)
// faz paginação com range() para não estourar limite
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

  // ✅ filtros de período (o Excel vai usar isso)
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

  const debounceRef = useRef(null);
  const channelRef = useRef(null);

  const hoje = useMemo(() => todayYMD_SP(), []);

  // ✅ quando muda o mês, atualiza automaticamente o período para o mês escolhido
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

      // DIA: tabela completa (mostra tudo)
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select(
          "id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, local_ocorrencia, ocorrencia, status"
        )
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // ------------------------
      // Gráfico: apenas TIPOS_GRAFICO, sem SEGUIU VIAGEM e sem vazio
      // ------------------------
      const byDay = new Map();

      (periodoData || []).forEach((r) => {
        const day = r.data_sos; // YYYY-MM-DD
        if (!day) return;

        const tipo = normalizeTipo(r.ocorrencia);

        // ✅ ignora vazio e ignora o que não entra no gráfico
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
      // Cards: alinhado ao gráfico (sem SEGUIU VIAGEM e sem vazio)
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

  // ✅ Excel agora baixa TODO o período escolhido
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

      // Aba 1: todos os registros do período
      const wsPeriodo = XLSX.utils.json_to_sheet(
        (rowsPeriodo || []).map((r) => ({
          ...r,
          ocorrencia_exibida: labelOcorrenciaTabela(r.ocorrencia),
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsPeriodo, "Intervencoes_periodo");

      // Aba 2: gráfico (já agregado)
      const wsSerie = XLSX.utils.json_to_sheet(series || []);
      XLSX.utils.book_append_sheet(wb, wsSerie, "Grafico_por_dia");

      // Aba 3: resumo
      const resumo = [
        { chave: "Periodo_inicio", valor: dataInicio },
        { chave: "Periodo_fim", valor: dataFim },
        { chave: "Total_periodo", valor: cards.totalPeriodo || 0 },
        ...Object.entries(cards.porTipo || {}).map(([k, v]) => ({ chave: k, valor: v })),
        { chave: "KM_rodado_periodo", valor: Number(kmPeriodo || 0) },
        { chave: "Ocorrencias_validas_MKBF", valor: Number(ocorrenciasValidasPeriodo || 0) },
        { chave: "MKBF", valor: Number(mkbfPeriodo || 0) },
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

  const tipoCards = useMemo(() => {
    const porTipo = cards.porTipo || {};
    return TIPOS_GRAFICO.map((t) => ({ tipo: t, valor: porTipo[t] || 0 }));
  }, [cards]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard - Intervenções (Tempo Real)</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* ✅ Mês + Período */}
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
            Baixar Excel (Período)
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {erro}
        </div>
      )}

      <div className="text-sm text-gray-600 mb-4">
        <div>
          <strong>Período:</strong> {dataInicio} até {dataFim}
        </div>
        <div>
          <strong>Hoje:</strong> {hoje}
        </div>
        <div>
          <strong>Última atualização:</strong>{" "}
          {lastUpdate ? lastUpdate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs text-gray-500">Intervenções (período)</p>
          <p className="text-2xl font-bold text-gray-800">{cards.totalPeriodo || 0}</p>
        </div>

        {/* ✅ ETAPA 3: KM + MKBF */}
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs text-gray-500">KM rodado (período)</p>
          <p className="text-2xl font-bold text-gray-800">
            {Number(kmPeriodo || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs text-gray-500">MKBF (KM / ocorrência)</p>
          <p className="text-2xl font-bold text-gray-800">
            {Number(mkbfPeriodo || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Ocorrências válidas: <strong>{ocorrenciasValidasPeriodo || 0}</strong>
          </p>
        </div>

        {tipoCards.map((c) => (
          <div key={c.tipo} className="bg-white shadow rounded-lg p-4">
            <p className="text-xs text-gray-500">{c.tipo}</p>
            <p className="text-2xl font-bold text-gray-800">{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Intervenções por dia (período) - por tipo</h2>
          <span className="text-xs text-gray-500">Atualiza automaticamente quando Tempo real está ligado</span>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {TIPOS_GRAFICO.map((t) => (
                <Bar key={t} dataKey={t} stackId="a" fill={COLORS[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!loading && series.length === 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Nenhum registro válido para o gráfico neste período (somente
            TROCA/SOS/RECOLHEU/AVARIA/IMPROCEDENTE entram no gráfico).
          </div>
        )}
      </div>

      {/* Tabela do dia (mantém como visão rápida) */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Intervenções do dia (hoje)</h2>
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
                    {/* ✅ ajuste: mostrar somente 00:00 (HH:MM) */}
                    <td className="py-3 px-4">
                      {r.hora_sos ? String(r.hora_sos).slice(0, 5) : "—"}
                    </td>
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
