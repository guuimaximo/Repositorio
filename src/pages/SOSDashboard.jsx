import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import * as XLSX from "xlsx";
import { FaDownload, FaSyncAlt } from "react-icons/fa";

// Tipos que você quer no gráfico (ordem do stack)
const TIPOS = ["TROCA", "SOS", "RA", "RECOLHEU", "AVARIA", "IMPROCEDENTE", "SEGUIU VIAGEM"];

// Cores simples (pode ajustar depois)
const COLORS = {
  TROCA: "#16a34a",
  SOS: "#ef4444",
  RA: "#f59e0b",
  RECOLHEU: "#2563eb",
  AVARIA: "#06b6d4",
  IMPROCEDENTE: "#6b7280",
  "SEGUIU VIAGEM": "#22c55e",
  OUTROS: "#9ca3af",
};

function todayYMD_SP() {
  // Retorna YYYY-MM-DD em America/Sao_Paulo, sem depender de timezone do servidor
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
  // ym = "YYYY-MM"
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
  if (!o) return "OUTROS";
  if (TIPOS.includes(o)) return o;

  // Mapeamentos comuns (caso venha variação)
  if (o.includes("RECOLH")) return "RECOLHEU";
  if (o.includes("IMPRO")) return "IMPROCEDENTE";
  if (o.includes("TROC")) return "TROCA";
  if (o === "S.O.S") return "SOS";

  return "OUTROS";
}

export default function SOSDashboard() {
  const [mesRef, setMesRef] = useState(() => {
    const ymd = todayYMD_SP();
    return ymd.slice(0, 7); // YYYY-MM
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [series, setSeries] = useState([]); // gráfico
  const [cards, setCards] = useState({ totalMes: 0, porTipo: {} });
  const [doDia, setDoDia] = useState([]); // tabela do dia
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
      // 1) Buscar dados do mês (somente colunas necessárias)
      const { data: mesData, error: mesErr } = await supabase
        .from("sos_acionamentos")
        .select("id, data_sos, ocorrencia")
        .gte("data_sos", mesIni)
        .lte("data_sos", mesFim);

      if (mesErr) throw mesErr;

      // 2) Buscar intervenções do dia (tabela)
      const { data: diaData, error: diaErr } = await supabase
        .from("sos_acionamentos")
        .select(
          "id, numero_sos, data_sos, hora_sos, veiculo, motorista_nome, linha, local_ocorrencia, ocorrencia, sr_numero, problema_encontrado, status"
        )
        .eq("data_sos", hoje)
        .order("hora_sos", { ascending: true });

      if (diaErr) throw diaErr;

      // ------------------------
      // Monta gráfico empilhado
      // ------------------------
      const byDay = new Map(); // day -> { day, TROCA:0, SOS:0, ... }

      (mesData || []).forEach((r) => {
        const day = r.data_sos; // YYYY-MM-DD (DATE)
        if (!day) return;

        if (!byDay.has(day)) {
          const base = { day };
          TIPOS.forEach((t) => (base[t] = 0));
          base.OUTROS = 0;
          byDay.set(day, base);
        }

        const tipo = normalizeTipo(r.ocorrencia);
        byDay.get(day)[tipo] = (byDay.get(day)[tipo] || 0) + 1;
      });

      // Ordena dias
      const chart = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

      // ------------------------
      // Cards
      // ------------------------
      const porTipo = {};
      TIPOS.forEach((t) => (porTipo[t] = 0));
      porTipo.OUTROS = 0;

      (mesData || []).forEach((r) => {
        const tipo = normalizeTipo(r.ocorrencia);
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
    // debounce para evitar vários reloads em sequência
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDashboard();
    }, 600);
  }

  function setupRealtime() {
    // limpa canal anterior
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
        () => {
          scheduleReload();
        }
      )
      .subscribe();
  }

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ao trocar mês
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

    // Aba 1: do dia
    const wsDia = XLSX.utils.json_to_sheet(doDia || []);
    XLSX.utils.book_append_sheet(wb, wsDia, "Intervencoes_do_dia");

    // Aba 2: série do gráfico
    const wsSerie = XLSX.utils.json_to_sheet(series || []);
    XLSX.utils.book_append_sheet(wb, wsSerie, "Grafico_por_dia");

    // Aba 3: resumo cards
    const resumo = [
      { chave: "Mes", valor: mesRef },
      { chave: "Total_intervencoes_mes", valor: cards.totalMes || 0 },
      ...Object.entries(cards.porTipo || {}).map(([k, v]) => ({ chave: k, valor: v })),
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `Intervencoes_${mesRef}_${stamp}.xlsx`);
  }

  const tipoCards = useMemo(() => {
    const porTipo = cards.porTipo || {};
    const list = [...TIPOS, "OUTROS"].map((t) => ({ tipo: t, valor: porTipo[t] || 0 }));
    return list;
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

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs text-gray-500">Intervenções (mês)</p>
          <p className="text-2xl font-bold text-gray-800">{cards.totalMes || 0}</p>
        </div>

        {tipoCards.slice(0, 5).map((c) => (
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
              {TIPOS.map((t) => (
                <Bar key={t} dataKey={t} stackId="a" fill={COLORS[t]} />
              ))}
              <Bar dataKey="OUTROS" stackId="a" fill={COLORS.OUTROS} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
                    <td className="py-3 px-4">{normalizeTipo(r.ocorrencia)}</td>
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
