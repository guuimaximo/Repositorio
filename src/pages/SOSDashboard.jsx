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

// ✅ Tipos que vão pro gráfico (SEM "SEGUIU VIAGEM" e SEM "OUTROS")
const TIPOS_GRAFICO = ["TROCA", "SOS", "RA", "RECOLHEU", "AVARIA", "IMPROCEDENTE"];

// Tipos que podem aparecer na tabela (inclui SEGUIU VIAGEM se vier do banco)
const TIPOS_TABELA = ["TROCA", "SOS", "RA", "RECOLHEU", "AVARIA", "IMPROCEDENTE", "SEGUIU VIAGEM"];

const COLORS = {
  TROCA: "#16a34a",
  SOS: "#ef4444",
  RA: "#f59e0b",
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

function normalizeTipo(oc) {
  const o = String(oc || "").toUpperCase().trim();
  if (!o) return ""; // ✅ vazio = sem ocorrência

  if (TIPOS_TABELA.includes(o)) return o;

  // mapeamentos comuns
  if (o.includes("RECOLH")) return "RECOLHEU";
  if (o.includes("IMPRO")) return "IMPROCEDENTE";
  if (o.includes("TROC")) return "TROCA";
  if (o === "S.O.S") return "SOS";

  // não quero OUTROS no gráfico; na tabela pode mostrar o texto normalizado
  return o;
}

function labelOcorrenciaTabela(oc) {
  const n = normalizeTipo(oc);
  return n ? n : "FECHAR ETIQUETA"; // ✅ regra pedida
}

export default function SOSDashboard() {
  const [mesRef, setMesRef] = useState(() => todayYMD_SP().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [series, setSeries] = useState([]);
  const [cards, setCards] = useState({ totalMes: 0, porTipo: {} });
  const [doDia, setDoDia] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [realtimeOn, setRealtimeOn] = useState(true);

  const debounceRef = useRef(null);
  const channelRef = useRef(null);

  const hoje = useMemo(() => todayYMD_SP(), []);
  const { start: mesIni, end: mesFim } = useMemo(() => monthRange(mesRef), [mesRef]);

  async function fetchDashboard() {
    setLoading(true);
    setErro("");

    try {
      // MÊS: só o que precisa para o gráfico + cards
      const { data: mesData, error: mesErr } = await supabase
        .from("sos_acionamentos")
        .select("id, data_sos, ocorrencia")
        .gte("data_sos", mesIni)
        .lte("data_sos", mesFim);

      if (mesErr) throw mesErr;

      // DIA: tabela completa (mostra tudo)
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select("id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, local_ocorrencia, ocorrencia, status")
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // ------------------------
      // Gráfico: apenas TIPOS_GRAFICO, sem "SEGUIU VIAGEM" e sem vazios
      // + remove dias zerados
      // ------------------------
      const byDay = new Map();

      (mesData || []).forEach((r) => {
        const day = r.data_sos; // DATE: YYYY-MM-DD
        if (!day) return;

        const tipo = normalizeTipo(r.ocorrencia);

        // ✅ ignora vazio e ignora tipos fora do gráfico
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;

        if (!byDay.has(day)) {
          const base = { day };
          TIPOS_GRAFICO.forEach((t) => (base[t] = 0));
          byDay.set(day, base);
        }

        byDay.get(day)[tipo] = (byDay.get(day)[tipo] || 0) + 1;
      });

      // Ordena e remove dia sem nada (por segurança)
      const chart = Array.from(byDay.values())
        .filter((row) => TIPOS_GRAFICO.some((t) => (row[t] || 0) > 0))
        .sort((a, b) => a.day.localeCompare(b.day));

      // ------------------------
      // Cards: também sem SEGUIU VIAGEM e sem vazios (mantém alinhado ao gráfico)
      // ------------------------
      const porTipo = {};
      TIPOS_GRAFICO.forEach((t) => (porTipo[t] = 0));

      (mesData || []).forEach((r) => {
        const tipo = normalizeTipo(r.ocorrencia);
        if (!tipo || !TIPOS_GRAFICO.includes(tipo)) return;
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      });

      const totalMes = Object.values(porTipo).reduce((acc, v) => acc + (v || 0), 0);

      setSeries(chart);
      setCards({ totalMes, porTipo });
      setDoDia(diaData || []);
      setLastUpdate(new Date());
    } catch (e) {
      setErro(e?.message || "Erro ao carregar dashboard.");
      setSeries([]);
      setCards({ totalMes: 0, porTipo: {} });
      setDoDia([]);
    } finally {
      setLoading(false);
    }
  }

  function scheduleReload() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDashboard();
    }, 600);
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
  }, [mesRef]);

  useEffect(() => {
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOn]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // Aba 1: intervenções do dia (tudo)
    const wsDia = XLSX.utils.json_to_sheet((doDia || []).map((r) => ({
      ...r,
      ocorrencia_exibida: labelOcorrenciaTabela(r.ocorrencia),
    })));
    XLSX.utils.book_append_sheet(wb, wsDia, "Intervencoes_do_dia");

    // Aba 2: gráfico
    const wsSerie = XLSX.utils.json_to_sheet(series || []);
    XLSX.utils.book_append_sheet(wb, wsSerie, "Grafico_por_dia");

    // Aba 3: resumo
    const resumo = [
      { chave: "Mes", valor: mesRef },
      { chave: "Total_mes", valor: cards.totalMes || 0 },
      ...Object.entries(cards.porTipo || {}).map(([k, v]) => ({ chave: k, valor: v })),
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `Intervencoes_${mesRef}_${stamp}.xlsx`);
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
          <div className="bg-white shadow rounded-lg p-3 flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mês</label>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </div>

            <div className="flex items-center gap-2 mt-5">
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
            onClick={exportExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            <FaDownload />
            Baixar Excel
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {erro}
        </div>
      )}

      <div className="text-sm text-gray-600 mb-4">
        <div><strong>Hoje:</strong> {hoje}</div>
        <div><strong>Período do mês:</strong> {mesIni} até {mesFim}</div>
        <div>
          <strong>Última atualização:</strong>{" "}
          {lastUpdate ? lastUpdate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
        </div>
      </div>

      {/* Cards (somente tipos do gráfico) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs text-gray-500">Intervenções (mês)</p>
          <p className="text-2xl font-bold text-gray-800">{cards.totalMes || 0}</p>
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
          <h2 className="font-semibold text-gray-800">Intervenções por dia (mês) - por tipo</h2>
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
            Nenhum registro válido para o gráfico neste mês (somente TROCA/SOS/RA/RECOLHEU/AVARIA/IMPROCEDENTE entram no gráfico).
          </div>
        )}
      </div>

      {/* Tabela do dia */}
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
                    <td className="py-3 px-4">{r.hora_sos ?? "—"}</td>
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
