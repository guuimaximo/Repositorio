import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch } from "react-icons/fa";
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

/**
 * AvariasResumo
 * - Cards por origem (Interno/Externo)
 * - Gráfico por mês (Orçado x Cobrado)
 * - Filtros por período (data da avaria), origem e status cobrança
 */

function CardResumo({ titulo, valor, subValor, cor = "bg-gray-100" }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5`}>
      <div className="text-sm font-medium text-gray-600">{titulo}</div>
      <div className="text-3xl font-bold mt-2 text-gray-900">{valor}</div>
      {subValor !== undefined && subValor !== null && (
        <div className="text-xs font-medium mt-1 text-gray-700">{subValor}</div>
      )}
    </div>
  );
}

const formatCurrency = (value) =>
  value === null || value === undefined
    ? "-"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function monthKeyFromDate(dateRaw) {
  if (!dateRaw) return null;
  const d = new Date(dateRaw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

function prettyMonth(ym) {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
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

export default function AvariasResumo() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState(""); // "" | "Interno" | "Externo"
  const [statusFiltro, setStatusFiltro] = useState(""); // "" | "Pendente" | "Cobrada" | "Cancelada"

  // Helpers de campo (mantém fallback)
  const pickDataAvariaRaw = (c) => c.dataAvaria || c.data_avaria || c.created_at || null;
  const pickOrigem = (c) => c.origem || c.origem_cobranca || null;
  const pickStatusCobranca = (c) => c.status_cobranca || "Pendente";

  async function carregarDados() {
    setLoading(true);

    let query = supabase
      .from("avarias")
      .select(
        [
          "id",
          "created_at",
          "prefixo",
          "motoristaId",
          "tipoOcorrencia",
          "numero_da_avaria",
          "status",
          "status_cobranca",
          "valor_total_orcamento",
          "valor_cobrado",
          "dataAvaria",
          "data_avaria",
          "data_cobranca",
          "origem",
          "origem_cobranca",
          "aprovado_em",
        ].join(",")
      )
      .eq("status", "Aprovado");

    // Texto
    if (filtroTexto) {
      query = query.or(
        `prefixo.ilike.%${filtroTexto}%,motoristaId.ilike.%${filtroTexto}%,tipoOcorrencia.ilike.%${filtroTexto}%,numero_da_avaria.ilike.%${filtroTexto}%`
      );
    }

    // Origem
    if (origemFiltro) {
      query = query.eq("origem", origemFiltro);
    }

    // Status cobrança
    if (statusFiltro) {
      query = query.eq("status_cobranca", statusFiltro);
    }

    // Período por data da avaria (padrão atual: dataAvaria)
    if (dataInicio) query = query.gte("dataAvaria", dataInicio);
    if (dataFim) query = query.lte("dataAvaria", `${dataFim}T23:59:59`);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar AvariasResumo:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTexto, dataInicio, dataFim, origemFiltro, statusFiltro]);

  // Normaliza origem (para cards ficarem consistentes)
  const normalized = useMemo(() => {
    return (rows || []).map((r) => {
      const origem = pickOrigem(r) || "Sem origem";
      const statusCobranca = pickStatusCobranca(r);
      const dataAvariaRaw = pickDataAvariaRaw(r);
      const mes = monthKeyFromDate(dataAvariaRaw);
      return {
        ...r,
        origem_norm: origem,
        status_cobranca_norm: statusCobranca,
        mes_ref: mes,
      };
    });
  }, [rows]);

  // KPIs por origem
  const resumoPorOrigem = useMemo(() => {
    const base = {
      total: 0,
      pendentes: 0,
      cobradas: 0,
      canceladas: 0,
      orcado: 0,
      cobrado: 0,
    };

    const acc = {
      Interno: { ...base },
      Externo: { ...base },
      "Sem origem": { ...base },
      Todos: { ...base },
    };

    for (const r of normalized) {
      const origem = r.origem_norm;
      const st = r.status_cobranca_norm;

      const orcado = Number(r.valor_total_orcamento) || 0;
      const cobrado = Number(r.valor_cobrado) || 0;

      // Todos
      acc.Todos.total += 1;
      acc.Todos.orcado += orcado;
      acc.Todos.cobrado += cobrado;
      if (st === "Cobrada") acc.Todos.cobradas += 1;
      else if (st === "Cancelada") acc.Todos.canceladas += 1;
      else acc.Todos.pendentes += 1;

      // Origem específica
      if (!acc[origem]) acc[origem] = { ...base };
      acc[origem].total += 1;
      acc[origem].orcado += orcado;
      acc[origem].cobrado += cobrado;
      if (st === "Cobrada") acc[origem].cobradas += 1;
      else if (st === "Cancelada") acc[origem].canceladas += 1;
      else acc[origem].pendentes += 1;
    }

    return acc;
  }, [normalized]);

  // Gráfico por mês (Interno x Externo + Total)
  const chartData = useMemo(() => {
    const map = new Map(); // ym -> aggregator

    const ensure = (ym) => {
      if (!map.has(ym)) {
        map.set(ym, {
          mes: ym,
          label: prettyMonth(ym),
          orcado_total: 0,
          cobrado_total: 0,
          qtd_total: 0,
          orcado_interno: 0,
          cobrado_interno: 0,
          qtd_interno: 0,
          orcado_externo: 0,
          cobrado_externo: 0,
          qtd_externo: 0,
        });
      }
      return map.get(ym);
    };

    for (const r of normalized) {
      if (!r.mes_ref) continue;
      const agg = ensure(r.mes_ref);

      const orcado = Number(r.valor_total_orcamento) || 0;
      const cobrado = Number(r.valor_cobrado) || 0;

      agg.orcado_total += orcado;
      agg.cobrado_total += cobrado;
      agg.qtd_total += 1;

      if (r.origem_norm === "Interno") {
        agg.orcado_interno += orcado;
        agg.cobrado_interno += cobrado;
        agg.qtd_interno += 1;
      } else if (r.origem_norm === "Externo") {
        agg.orcado_externo += orcado;
        agg.cobrado_externo += cobrado;
        agg.qtd_externo += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => (a.mes > b.mes ? 1 : -1));
  }, [normalized]);

  const renderBlocoOrigem = (titulo, key, corHeader) => {
    const r = resumoPorOrigem[key] || {
      total: 0,
      pendentes: 0,
      cobradas: 0,
      canceladas: 0,
      orcado: 0,
      cobrado: 0,
    };

    return (
      <div className="bg-white rounded-lg shadow p-5">
        <div className={`text-sm font-semibold ${corHeader}`}>{titulo}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <CardResumo
            titulo="Avarias (Qtde)"
            valor={r.total}
            subValor={`Pendentes: ${r.pendentes} | Cobradas: ${r.cobradas} | Canceladas: ${r.canceladas}`}
            cor="bg-gray-50"
          />
          <CardResumo
            titulo="Valor Orçado"
            valor={formatCurrency(r.orcado)}
            subValor="Soma do orçamento aprovado"
            cor="bg-blue-50"
          />
          <CardResumo
            titulo="Valor Cobrado"
            valor={formatCurrency(r.cobrado)}
            subValor="Soma do valor efetivamente cobrado"
            cor="bg-green-50"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Resumo de Avarias (Interno x Externo)</h1>
          <p className="text-sm text-gray-500">
            Base: avarias com status <strong>Aprovado</strong>.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center border rounded-md px-2 flex-1 min-w-[220px]">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar (motorista, prefixo, tipo, nº avaria...)"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="flex-1 outline-none py-1"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
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
        </div>

        <select className="border rounded-md p-2" value={origemFiltro} onChange={(e) => setOrigemFiltro(e.target.value)}>
          <option value="">Todas as Origens</option>
          <option value="Interno">Interno</option>
          <option value="Externo">Externo</option>
        </select>

        <select className="border rounded-md p-2" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="Pendente">Pendentes</option>
          <option value="Cobrada">Cobradas</option>
          <option value="Cancelada">Canceladas</option>
        </select>

        <button
          onClick={() => {
            setFiltroTexto("");
            setDataInicio("");
            setDataFim("");
            setOrigemFiltro("");
            setStatusFiltro("");
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        >
          Limpar
        </button>
      </div>

      {/* Cards por Origem */}
      <div className="space-y-5 mb-6">
        {renderBlocoOrigem("Geral (Todas as Origens)", "Todos", "text-gray-700")}
        {renderBlocoOrigem("Interno", "Interno", "text-blue-700")}
        {renderBlocoOrigem("Externo", "Externo", "text-purple-700")}
      </div>

      {/* Gráfico por mês */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Evolução Mensal (R$)</h2>
            <p className="text-xs text-gray-500">Orçado x Cobrado por mês (data da avaria como referência).</p>
          </div>

          {loading ? (
            <span className="text-sm text-gray-500">Carregando...</span>
          ) : (
            <span className="text-sm text-gray-600">
              Meses: <strong>{chartData.length}</strong> | Registros: <strong>{rows.length}</strong>
            </span>
          )}
        </div>

        <div className="h-[360px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (String(name).includes("qtd")) return [value, name];
                  return [formatCurrency(value), name];
                }}
              />
              <Legend />
              <Bar dataKey="orcado_total" name="Orçado (Total)" />
              <Bar dataKey="cobrado_total" name="Cobrado (Total)" />
              <Bar dataKey="orcado_interno" name="Orçado (Interno)" />
              <Bar dataKey="cobrado_interno" name="Cobrado (Interno)" />
              <Bar dataKey="orcado_externo" name="Orçado (Externo)" />
              <Bar dataKey="cobrado_externo" name="Cobrado (Externo)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
