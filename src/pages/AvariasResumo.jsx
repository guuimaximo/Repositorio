// src/pages/AvariasResumo.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function moneyBRL(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeLower(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizeOrigem(row) {
  const raw = row?.origem || row?.origem_cobranca || "";
  const s = safeLower(raw);
  if (!s) return ""; // sem origem
  if (s === "interno" || s === "interna") return "Interno";
  if (s === "externo" || s === "externa") return "Externo";
  return String(raw);
}

function normalizeStatusCobranca(row) {
  const s = safeLower(row?.status_cobranca);
  if (!s) return "Pendente";
  if (s === "cobrada") return "Cobrada";
  if (s === "cancelada") return "Cancelada";
  return row.status_cobranca;
}

function toMonthKeyFromDataAvaria(dateRaw) {
  if (!dateRaw) return null;
  const d = new Date(dateRaw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ym) {
  const [y, m] = String(ym || "").split("-");
  if (!y || !m) return ym;
  const map = {
    "01": "jan",
    "02": "fev",
    "03": "mar",
    "04": "abr",
    "05": "mai",
    "06": "jun",
    "07": "jul",
    "08": "ago",
    "09": "set",
    "10": "out",
    "11": "nov",
    "12": "dez",
  };
  return `${map[m] || m}/${String(y).slice(2)}`;
}

function KPI({ title, value, sub, tone = "bg-white" }) {
  return (
    <div className={`${tone} rounded-xl shadow-sm border p-5`}>
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

export default function AvariasResumo() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  // filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState(""); // "", "Interno", "Externo"

  // =========
  // Carregar base (igual Cobranças) e usando dataAvaria
  // =========
  const carregar = async () => {
    setLoading(true);
    setErrMsg("");

    let query = supabase
      .from("avarias")
      .select(
        "id, status, status_cobranca, valor_total_orcamento, valor_cobrado, origem, origem_cobranca, dataAvaria, created_at"
      )
      .eq("status", "Aprovado")
      .order("created_at", { ascending: false });

    // filtros por dataAvaria no BACKEND (direto e correto)
    if (dataInicio) query = query.gte("dataAvaria", dataInicio);
    if (dataFim) query = query.lte("dataAvaria", `${dataFim}T23:59:59`);

    // filtro por origem (mesma ideia do Cobranças)
    if (origemFiltro) {
      query = query.or(
        `origem.ilike.${origemFiltro},origem_cobranca.ilike.${origemFiltro}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("AvariasResumo: erro ao carregar:", error);
      setRows([]);
      setErrMsg(error.message || "Erro ao carregar dados.");
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  };

  // carrega na primeira vez
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarrega quando filtros mudarem (como Cobranças)
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, origemFiltro]);

  // =========
  // KPIs
  // =========
  const kpis = useMemo(() => {
    const base = rows;

    const interno = base.filter((r) => normalizeOrigem(r) === "Interno");
    const externo = base.filter((r) => normalizeOrigem(r) === "Externo");
    const semOrigem = base.filter((r) => !normalizeOrigem(r));

    const sumOrcado = (arr) =>
      arr.reduce((s, r) => s + Number(r.valor_total_orcamento || 0), 0);
    const sumCobrado = (arr) =>
      arr.reduce((s, r) => s + Number(r.valor_cobrado || 0), 0);

    const pendentes = base.filter((r) => normalizeStatusCobranca(r) === "Pendente");
    const cobradas = base.filter((r) => normalizeStatusCobranca(r) === "Cobrada");
    const canceladas = base.filter((r) => normalizeStatusCobranca(r) === "Cancelada");

    return {
      totalQtde: base.length,
      totalOrcado: sumOrcado(base),
      totalCobrado: sumCobrado(base),

      internoQtde: interno.length,
      internoOrcado: sumOrcado(interno),
      internoCobrado: sumCobrado(interno),

      externoQtde: externo.length,
      externoOrcado: sumOrcado(externo),
      externoCobrado: sumCobrado(externo),

      semOrigemQtde: semOrigem.length,
      semOrigemOrcado: sumOrcado(semOrigem),
      semOrigemCobrado: sumCobrado(semOrigem),

      pendQtde: pendentes.length,
      pendOrcado: sumOrcado(pendentes),

      cobQtde: cobradas.length,
      cobCobrado: sumCobrado(cobradas),

      cancQtde: canceladas.length,
      cancOrcado: sumOrcado(canceladas),
    };
  }, [rows]);

  // =========
  // Gráfico por mês (usando SOMENTE dataAvaria)
  // =========
  const chartData = useMemo(() => {
    const map = new Map();

    for (const r of rows) {
      const key = toMonthKeyFromDataAvaria(r.dataAvaria);
      if (!key) continue;

      if (!map.has(key)) map.set(key, { mes: key, qtde: 0, orcado: 0, cobrado: 0 });

      const item = map.get(key);
      item.qtde += 1;
      item.orcado += Number(r.valor_total_orcamento || 0);
      item.cobrado += Number(r.valor_cobrado || 0);
    }

    return Array.from(map.values())
      .sort((a, b) => (a.mes > b.mes ? 1 : -1))
      .map((x) => ({ ...x, mesLabel: monthLabel(x.mes) }));
  }, [rows]);

  const hasData = rows.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-1 mb-5">
        <h1 className="text-2xl font-semibold text-gray-800">Resumo de Avarias</h1>
        <p className="text-sm text-gray-500">
          Base: avarias com status = Aprovado. Data oficial: dataAvaria.
        </p>
      </div>

      {!!errMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          Erro ao carregar: {errMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Origem</label>
          <select
            className="border rounded-md p-2 text-sm"
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="Interno">Interno</option>
            <option value="Externo">Externo</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded-md p-2 text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded-md p-2 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setOrigemFiltro("");
            setDataInicio("");
            setDataFim("");
          }}
          className="bg-gray-100 hover:bg-gray-200 border rounded-md px-4 py-2 text-sm text-gray-700"
        >
          Limpar filtros
        </button>

        <button
          onClick={carregar}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm"
        >
          Recarregar
        </button>

        <div className="ml-auto text-xs text-gray-500">
          {loading ? "Carregando..." : `${rows.length} registro(s) no período`}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          title="Total (Aprovadas)"
          value={loading ? "-" : kpis.totalQtde}
          sub={loading ? "" : `Orçado: ${moneyBRL(kpis.totalOrcado)} | Cobrado: ${moneyBRL(kpis.totalCobrado)}`}
        />
        <KPI
          title="Interno"
          value={loading ? "-" : kpis.internoQtde}
          sub={loading ? "" : `Orçado: ${moneyBRL(kpis.internoOrcado)} | Cobrado: ${moneyBRL(kpis.internoCobrado)}`}
        />
        <KPI
          title="Externo"
          value={loading ? "-" : kpis.externoQtde}
          sub={loading ? "" : `Orçado: ${moneyBRL(kpis.externoOrcado)} | Cobrado: ${moneyBRL(kpis.externoCobrado)}`}
        />
        <KPI
          title="Sem origem"
          value={loading ? "-" : kpis.semOrigemQtde}
          sub={loading ? "" : `Orçado: ${moneyBRL(kpis.semOrigemOrcado)} | Cobrado: ${moneyBRL(kpis.semOrigemCobrado)}`}
          tone="bg-gray-50"
        />
      </div>

      {/* KPIs de cobrança */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          title="Pendentes de cobrança"
          value={loading ? "-" : kpis.pendQtde}
          sub={loading ? "" : `Valor pendente (orçado): ${moneyBRL(kpis.pendOrcado)}`}
          tone="bg-yellow-50"
        />
        <KPI
          title="Cobradas"
          value={loading ? "-" : kpis.cobQtde}
          sub={loading ? "" : `Valor cobrado: ${moneyBRL(kpis.cobCobrado)}`}
          tone="bg-green-50"
        />
        <KPI
          title="Canceladas"
          value={loading ? "-" : kpis.cancQtde}
          sub={loading ? "" : `Valor cancelado (orçado): ${moneyBRL(kpis.cancOrcado)}`}
          tone="bg-red-50"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white border rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Evolução mensal</div>
            <div className="text-xs text-gray-500">Quantidade e valores (orçado x cobrado)</div>
          </div>
        </div>

        {!loading && !hasData ? (
          <div className="text-sm text-gray-500 py-10 text-center">
            Sem dados para exibir com os filtros atuais.
          </div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mesLabel" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "qtde") return [value, "Qtd"];
                    if (name === "orcado") return [moneyBRL(value), "Orçado"];
                    if (name === "cobrado") return [moneyBRL(value), "Cobrado"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="qtde" name="Qtd" />
                <Bar dataKey="orcado" name="Orçado" />
                <Bar dataKey="cobrado" name="Cobrado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
