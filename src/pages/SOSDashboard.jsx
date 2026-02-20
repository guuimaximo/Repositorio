import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { FaDownload, FaSyncAlt } from "react-icons/fa";

// ✅ PALETA DE CORES PADRONIZADA
const COLORS = {
  SOS: "#DC2626", // Vermelho
  RECOLHEU: "#EAB308", // Amarelo
  AVARIA: "#2563EB", // Azul
  TROCA: "#EA580C", // Laranja
  IMPROCEDENTE: "#9333EA", // Roxo
  "SEGUIU VIAGEM": "#16A34A", // Verde
};

const TIPOS_GRAFICO = ["RECOLHEU", "SOS", "AVARIA", "TROCA", "IMPROCEDENTE"];

const TIPOS_TABELA = [
  "SOS",
  "RECOLHEU",
  "AVARIA",
  "TROCA",
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

function normalizeTipo(oc: string) {
  const o = String(oc || "").toUpperCase().trim();
  if (!o) return "";

  if (o === "RA" || o === "R.A" || o === "R.A.") return "RECOLHEU";
  if (o.includes("RECOLH")) return "RECOLHEU";
  if (o.includes("IMPRO")) return "IMPROCEDENTE";
  if (o.includes("TROC")) return "TROCA";
  if (o === "S.O.S") return "SOS";
  if (o.includes("AVARI")) return "AVARIA";
  if (o.includes("SEGUIU")) return "SEGUIU VIAGEM";
  if (TIPOS_TABELA.includes(o)) return o;

  return o;
}

function labelOcorrenciaTabela(oc: string) {
  const n = normalizeTipo(oc);
  return n ? n : "FECHAR ETIQUETA";
}

// Mock data generator
function generateMockData() {
  const today = todayYMD_SP();
  const seriesData: any[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    seriesData.push({
      day: dateStr,
      RECOLHEU: Math.floor(Math.random() * 5) + 1,
      SOS: Math.floor(Math.random() * 4) + 1,
      AVARIA: Math.floor(Math.random() * 3) + 1,
      TROCA: Math.floor(Math.random() * 4) + 1,
      IMPROCEDENTE: Math.floor(Math.random() * 2),
    });
  }

  const doDiaData = [
    {
      id: 1,
      numero_sos: "SOS-001",
      data_sos: today,
      hora_sos: "08:30:45",
      veiculo: "VEI-1234",
      motorista_nome: "João Silva",
      linha: "Linha 101",
      reclamacao_motorista: "Problema com ar condicionado",
      ocorrencia: "TROCA",
      status: "Resolvido",
    },
    {
      id: 2,
      numero_sos: "SOS-002",
      data_sos: today,
      hora_sos: "09:15:30",
      veiculo: "VEI-5678",
      motorista_nome: "Maria Santos",
      linha: "Linha 202",
      reclamacao_motorista: "Pneu furado",
      ocorrencia: "RECOLHEU",
      status: "Resolvido",
    },
    {
      id: 3,
      numero_sos: "SOS-003",
      data_sos: today,
      hora_sos: "10:45:12",
      veiculo: "VEI-9012",
      motorista_nome: "Pedro Costa",
      linha: "Linha 303",
      reclamacao_motorista: "Avaria no motor",
      ocorrencia: "AVARIA",
      status: "Pendente",
    },
    {
      id: 4,
      numero_sos: "SOS-004",
      data_sos: today,
      hora_sos: "11:20:00",
      veiculo: "VEI-3456",
      motorista_nome: "Ana Oliveira",
      linha: "Linha 404",
      reclamacao_motorista: "Batida leve",
      ocorrencia: "SOS",
      status: "Resolvido",
    },
  ];

  return {
    series: seriesData,
    doDia: doDiaData,
    porTipo: {
      RECOLHEU: 12,
      SOS: 8,
      AVARIA: 5,
      TROCA: 10,
      IMPROCEDENTE: 2,
      "SEGUIU VIAGEM": 0,
    },
    kmPeriodo: 2450,
    ocorrenciasValidasPeriodo: 37,
    mkbfPeriodo: 66.22,
  };
}

export default function SOSDashboard() {
  const fsRef = useRef<HTMLDivElement>(null);
  const [modoExibicao, setModoExibicao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mockData, setMockData] = useState(generateMockData());
  const [refreshCount, setRefreshCount] = useState(0);

  const hoje = useMemo(() => todayYMD_SP(), []);
  const acumuladoDia = mockData.doDia.length;

  // ✅ PATCH 1: print + compactação
  const PRINT_CSS = `
    @media print {
      .print-tight { padding: 8px !important; }
      .print-tight .print-gap { gap: 8px !important; }
      .print-tight .print-chart-wrap { height: 220px !important; }
      .print-tight table { font-size: 11px !important; }
      .print-tight th, .print-tight td { padding-top: 6px !important; padding-bottom: 6px !important; }
    }
  `;

  // Auto-refresh em tempo real a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setMockData(generateMockData());
      setRefreshCount((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const shell =
    "w-full h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900 overflow-hidden flex flex-col";
  const panel =
    "rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm";
  const titleText = "text-sm font-semibold text-slate-800 uppercase tracking-wide";
  const smallText = "text-xs text-slate-600";

  async function enterFullscreen(el: HTMLElement | null) {
    try {
      const target = el || document.documentElement;
      if (document.fullscreenElement) return;

      if (target.requestFullscreen) return await target.requestFullscreen();
      if ((target as any).webkitRequestFullscreen)
        return (target as any).webkitRequestFullscreen();
    } catch (e) {
      console.warn("Fullscreen bloqueado:", e);
    }
  }

  async function exitFullscreen() {
    try {
      if (!document.fullscreenElement) return;

      if (document.exitFullscreen) return await document.exitFullscreen();
      if ((document as any).webkitExitFullscreen)
        return (document as any).webkitExitFullscreen();
    } catch (e) {
      console.warn("Exit fullscreen bloqueado:", e);
    }
  }

  const toggleModoExibicao = useCallback(async () => {
    const el = fsRef.current;
    if (!modoExibicao) {
      setModoExibicao(true);
      setTimeout(() => enterFullscreen(el), 50);
    } else {
      await exitFullscreen();
      setModoExibicao(false);
    }
  }, [modoExibicao]);

  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs && modoExibicao) {
        setModoExibicao(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [modoExibicao]);

  // Layout Exibição (Fullscreen)
  const ExibicaoLayout = (
    <div className="w-full h-full flex flex-col gap-3 p-4 overflow-hidden print-gap">
      <div className="flex items-center justify-between shrink-0">
        <div className={titleText}>Dashboard SOS - Modo Exibição</div>
        <button
          onClick={toggleModoExibicao}
          className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-semibold text-white"
          type="button"
        >
          Sair
        </button>
      </div>

      <div
        className="grid grid-cols-12 gap-3 min-h-0"
        style={{ minHeight: 0, height: "30%" }}
      >
        {/* COLUNA ESQUERDA - MÉTRICAS */}
        <div className="col-span-3 min-h-0">
          <div className={`${panel} h-full min-h-0 overflow-hidden p-2`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-slate-700 uppercase">
                OCORRÊNCIA
              </div>
              <div className="text-xs font-semibold text-slate-700 uppercase text-right">
                TOTAL
              </div>
            </div>

            <div className="min-h-0 overflow-auto pr-1 space-y-1">
              <div className="space-y-1">
                {TIPOS_GRAFICO.map((t) => (
                  <div
                    key={t}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="text-xs text-slate-800">{t}</span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: COLORS[t as keyof typeof COLORS] || "#1e293b",
                      }}
                    >
                      {mockData.porTipo[t as keyof typeof mockData.porTipo] || 0}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">
                    OCORRÊNCIAS
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {mockData.ocorrenciasValidasPeriodo}
                  </div>
                </div>

                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">
                    KM TOTAL
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {Number(mockData.kmPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-1.5">
                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">MKBF</div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {Number(mockData.mkbfPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Ocorr:{" "}
                    <span className="font-semibold text-slate-900">
                      {mockData.ocorrenciasValidasPeriodo || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500">
                refresh: {refreshCount}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA CENTRAL - GRÁFICO */}
        <div className="col-span-9 min-h-0">
          <div className={`${panel} w-full h-full flex flex-col min-h-0 overflow-hidden`}>
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs font-semibold text-slate-800 uppercase">
                  Intervenções por dia
                </div>
                <div className="text-xs text-slate-600">
                  Acumulado:{" "}
                  <span className="font-bold text-slate-900">{acumuladoDia}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600">
                {new Date().toLocaleTimeString("pt-BR")}
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockData.series}
                  margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.1)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 8, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={25}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.05)" }}
                    contentStyle={{
                      background: "#f8fafc",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{
                      color: "#1e293b",
                      marginBottom: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={20}
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{
                      fontSize: "10px",
                      color: "#64748b",
                      paddingTop: "2px",
                    }}
                  />
                  {TIPOS_GRAFICO.map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="a"
                      fill={COLORS[t as keyof typeof COLORS]}
                      maxBarSize={60}
                    >
                      <LabelList
                        dataKey={t}
                        position="center"
                        formatter={(v: number) => (v > 0 ? v : "")}
                        fill="#ffffff"
                        fontSize={9}
                        fontWeight="bold"
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA INFERIOR */}
      <div
        className={`${panel} w-full flex flex-col min-h-0 overflow-hidden`}
        style={{ height: "65%" }}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="font-semibold text-slate-800 text-sm">
            Intervenções do dia
          </div>
          <div className="px-2 py-0.5 rounded bg-slate-200 text-xs font-bold text-slate-700">
            Total hoje: {mockData.doDia.length}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="sticky top-0 bg-slate-100 z-10 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">Etiqueta</th>
                <th className="py-3 px-4">Carro</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Reclamação</th>
                <th className="py-3 px-4 text-right">Tipo Ocorrência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockData.doDia.map((r) => (
                <tr
                  key={r.id}
                  className="hover:opacity-80 transition-colors"
                  style={{
                    backgroundColor:
                      r.status !== "Resolvido" ? "#FEF3C7" : "transparent",
                  }}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-800">
                    {r.numero_sos || "-"}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">
                    {r.veiculo || "-"}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {r.data_sos || "-"}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "-"}
                  </td>
                  <td
                    className="py-2.5 px-4 text-slate-800 truncate max-w-[350px]"
                    title={r.reclamacao_motorista}
                  >
                    {r.reclamacao_motorista || "-"}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className="font-bold text-xs uppercase tracking-wide px-2 py-1 rounded border-2"
                      style={{
                        color:
                          COLORS[normalizeTipo(r.ocorrencia) as keyof typeof COLORS] ||
                          "#1e293b",
                        borderColor:
                          COLORS[normalizeTipo(r.ocorrencia) as keyof typeof COLORS] ||
                          "#cbd5e1",
                        backgroundColor:
                          (COLORS[normalizeTipo(r.ocorrencia) as keyof typeof COLORS] ||
                            "#cbd5e1") + "15",
                      }}
                    >
                      {labelOcorrenciaTabela(r.ocorrencia)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Layout Normal
  const NormalLayout = (
    <div
      className="max-w-[1400px] mx-auto p-2 grid grid-rows-[auto_1fr_1fr] gap-3 print-gap"
      style={{ minHeight: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={smallText}>Período: 2024-02-14 - 2024-02-20</div>
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ PATCH 2: botões com estilo coerente no fundo claro */}
          <button
            onClick={() => setLoading(!loading)}
            className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "..." : "Recarregar"}
          </button>

          <button
            onClick={() => alert("Exportar Excel")}
            className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            <FaDownload />
            Excel
          </button>

          <button
            onClick={toggleModoExibicao}
            className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-semibold"
            type="button"
          >
            Modo Exibição
          </button>
        </div>
      </div>

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
                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="text-xs text-slate-800">{t}</span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: COLORS[t as keyof typeof COLORS] || "#1e293b" }}
                    >
                      {mockData.porTipo[t as keyof typeof mockData.porTipo] || 0}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">
                    OCORRÊNCIAS
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {mockData.ocorrenciasValidasPeriodo}
                  </div>
                </div>

                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">KM TOTAL</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {Number(mockData.kmPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-1.5">
                <div className={`${panel} p-2`}>
                  <div className="text-xs text-slate-600 font-semibold">MKBF</div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {Number(mockData.mkbfPeriodo || 0).toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Ocorr:{" "}
                    <span className="font-semibold text-slate-900">
                      {mockData.ocorrenciasValidasPeriodo || 0}
                    </span>
                  </div>
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4" />
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
                  <span className="font-semibold text-slate-900">{acumuladoDia}</span>
                </div>
              </div>
              <div className={smallText}>
                {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </div>
            </div>

            {/* ✅ PATCH 3: altura responsiva + print mais baixo */}
            <div
              className="print-chart-wrap"
              style={{
                width: "100%",
                height: "clamp(240px, 32vh, 380px)",
                marginTop: 6,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.10)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0f172a",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#334155" }}
                  />
                  <Legend verticalAlign="bottom" height={28} />
                  {TIPOS_GRAFICO.map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="a"
                      fill={COLORS[t as keyof typeof COLORS]}
                    >
                      <LabelList
                        dataKey={t}
                        position="center"
                        formatter={(v: number) => (v > 0 ? v : "")}
                        fill="#ffffff"
                        fontSize={12}
                        fontWeight="bold"
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {!loading && mockData.series.length === 0 && (
              <div className="mt-2 text-sm text-slate-600">
                Nenhum registro válido para o gráfico neste período.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0">
        <div className={`${panel} h-full min-h-0 overflow-hidden`}>
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className={titleText}>Intervenções do dia</div>
            <div className={smallText}>
              Total hoje:{" "}
              <span className="font-semibold text-slate-900">{mockData.doDia.length}</span>
            </div>
          </div>

          <div className="min-h-0 overflow-auto" style={{ height: "calc(100% - 42px)" }}>
            <table className="min-w-full text-sm text-slate-700">
              <thead className="sticky top-0 bg-slate-100">
                <tr className="text-slate-600 text-xs uppercase font-semibold">
                  <th className="py-2 px-3 text-left">ETIQUETA</th>
                  <th className="py-2 px-3 text-left">CARRO</th>
                  <th className="py-2 px-3 text-left">DATA</th>
                  <th className="py-2 px-3 text-left">HORA</th>
                  <th className="py-2 px-3 text-left">RECLAMAÇÃO</th>
                  <th className="py-2 px-3 text-left">TIPO OCORRÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {mockData.doDia.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="py-2 px-3">{r.numero_sos ?? "—"}</td>
                    <td className="py-2 px-3">{r.veiculo ?? "—"}</td>
                    <td className="py-2 px-3">{r.data_sos ?? "—"}</td>
                    <td className="py-2 px-3">
                      {r.hora_sos ? String(r.hora_sos).slice(0, 8) : "—"}
                    </td>
                    <td className="py-2 px-3">{r.reclamacao_motorista ?? "—"}</td>
                    <td className="py-2 px-3">{labelOcorrenciaTabela(r.ocorrencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div ref={fsRef} className={`${shell} print-tight`} style={{ minHeight: 0 }}>
        {modoExibicao ? ExibicaoLayout : NormalLayout}
      </div>
    </>
  );
}
