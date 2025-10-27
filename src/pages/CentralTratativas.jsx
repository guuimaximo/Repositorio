// src/pages/Dashboard.jsx
// (Versão final — com Card de Pendentes Cobrança e nova lógica de Atrasadas usando ilike('%atrasad%'))

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Componente CardResumo
function CardResumo({ titulo, valor, cor, subValor = null, subValor2 = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subValor && <p className="text-sm font-medium mt-1 text-gray-700">{subValor}</p>}
      {subValor2 && <p className="text-xs font-medium text-gray-600">{subValor2}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [resumo, setResumo] = useState({
    tratativasTotal: 0, tratativasPendentes: 0, tratativasConcluidas: 0,
    tratativasAtrasadas: 0,
    avariasAprovadas: 0, avariasAprovadasValor: 0,
    avariasPendentesCobranca: 0, avariasPendentesCobrancaValor: 0,
    cobrancasRealizadas: 0, cobrancasRealizadasValor: 0,
    canceladasCount: 0, canceladasValor: 0,
  });

  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);
  const [dataFiltro, setDataFiltro] = useState({ dataInicio: "", dataFim: "" });

  useEffect(() => {
    const timeoutId = setTimeout(carregarTudo, 0);
    return () => clearTimeout(timeoutId);
  }, [dataFiltro]);

  const formatCurrency = (value) =>
    (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // === Filtro comum para todas as queries ===
  const applyCommonFilters = (query) => {
    if (dataFiltro.dataInicio) query = query.gte("created_at", dataFiltro.dataInicio);
    if (dataFiltro.dataFim) {
      const dataFimAjustada = new Date(dataFiltro.dataFim);
      dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
      query = query.lt("created_at", dataFimAjustada.toISOString());
    }
    return query;
  };

  // === RESUMO GERAL ===
  const carregarResumo = async () => {
    try {
      // Total
      let qTotal = supabase.from("tratativas").select("id", { count: "exact", head: true });
      qTotal = applyCommonFilters(qTotal);
      const { count: total } = await qTotal;

      // Pendentes
      let qPend = supabase.from("tratativas").select("id", { count: "exact", head: true }).ilike("status", "%pendente%");
      qPend = applyCommonFilters(qPend);
      const { count: pend } = await qPend;

      // Concluídas
      let qConc = supabase.from("tratativas").select("id", { count: "exact", head: true })
        .or("status.ilike.%conclu%,status.ilike.%resolvid%");
      qConc = applyCommonFilters(qConc);
      const { count: conc } = await qConc;

      // Atrasadas (AJUSTADO CONFORME SEU PADRÃO)
      let qAtr = supabase.from("tratativas").select("id", { count: "exact", head: true })
        .ilike("status", "%atrasad%");
      qAtr = applyCommonFilters(qAtr);
      const { count: atr } = await qAtr;

      // Avarias
      let avsQuery = supabase
        .from("avarias")
        .select("status, status_cobranca, valor_total_orcamento, valor_cobrado, created_at")
        .limit(100000);
      avsQuery = applyCommonFilters(avsQuery);
      const { data: avsData } = await avsQuery;
      const avarias = avsData || [];

      const avariasAprovadas = avarias.filter((a) => a.status === "Aprovado");
      const avariasPendentesCobranca = avarias.filter((a) => a.status_cobranca === "Pendente");
      const cobrancasRealizadas = avarias.filter((a) => a.status_cobranca === "Cobrada");
      const canceladas = avarias.filter((a) => a.status_cobranca === "Cancelada");

      setResumo({
        tratativasTotal: total || 0,
        tratativasPendentes: pend || 0,
        tratativasConcluidas: conc || 0,
        tratativasAtrasadas: atr || 0,
        avariasAprovadas: avariasAprovadas.length,
        avariasAprovadasValor: avariasAprovadas.reduce((s, a) => s + (a.valor_total_orcamento || 0), 0),
        avariasPendentesCobranca: avariasPendentesCobranca.length,
        avariasPendentesCobrancaValor: avariasPendentesCobranca.reduce((s, a) => s + (a.valor_total_orcamento || 0), 0),
        cobrancasRealizadas: cobrancasRealizadas.length,
        cobrancasRealizadasValor: cobrancasRealizadas.reduce((s, a) => s + (Number(a.valor_cobrado) || 0), 0),
        canceladasCount: canceladas.length,
        canceladasValor: canceladas.reduce((s, a) => s + (a.valor_total_orcamento || 0), 0),
      });
    } catch (e) {
      console.error("Erro ao carregar resumo:", e);
    }
  };

  // === EVOLUÇÃO (mesma lógica anterior) ===
  const carregarEvolucao = async () => { /* ... mesmo código anterior ... */ };

  // === TOP MOTORISTAS (mesmo código anterior) ===
  const carregarTopMotoristas = async () => { /* ... mesmo código anterior ... */ };

  const carregarTudo = () => {
    carregarResumo();
    carregarEvolucao();
    carregarTopMotoristas();
  };

  // === INTERFACE ===
  return (
    <div className="p-6">
      {/* Filtro de Período */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center text-gray-700">
        <h2 className="text-lg font-semibold">Filtro de Período</h2>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Data Início</label>
          <input
            type="date"
            value={dataFiltro.dataInicio}
            onChange={(e) => setDataFiltro({ ...dataFiltro, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2 text-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Data Fim</label>
          <input
            type="date"
            value={dataFiltro.dataFim}
            onChange={(e) => setDataFiltro({ ...dataFiltro, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2 text-gray-700"
          />
        </div>
        <button
          onClick={() => setDataFiltro({ dataInicio: "", dataFim: "" })}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2 mt-4"
        >
          Limpar Filtro
        </button>
      </div>

      <h1 className="text-2xl font-semibold mb-6 text-gray-700">Painel de Gestão Integrada</h1>

      {/* === LINHA 1 (TRATATIVAS) === */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Total Tratativas" valor={resumo.tratativasTotal} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Tratativas Pendentes" valor={resumo.tratativasPendentes} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Tratativas Concluídas" valor={resumo.tratativasConcluidas} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Tratativas Atrasadas" valor={resumo.tratativasAtrasadas} cor="bg-red-200 text-red-700" />
      </div>

      {/* === LINHA 2 (AVARIAS/COBRANÇAS) === */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Avarias Aprovadas" valor={resumo.avariasAprovadas} subValor={formatCurrency(resumo.avariasAprovadasValor)} subValor2="Valor Orçado" cor="bg-orange-100 text-orange-700" />
        <CardResumo titulo="Pendentes Cobrança" valor={resumo.avariasPendentesCobranca} subValor={formatCurrency(resumo.avariasPendentesCobrancaValor)} subValor2="Valor Orçado" cor="bg-purple-100 text-purple-700" />
        <CardResumo titulo="Cobranças Realizadas" valor={resumo.cobrancasRealizadas} subValor={formatCurrency(resumo.cobrancasRealizadasValor)} subValor2="Valor Cobrado" cor="bg-lime-100 text-lime-700" />
        <CardResumo titulo="Cobranças Canceladas" valor={resumo.canceladasCount} subValor={formatCurrency(resumo.canceladasValor)} subValor2="Valor Cancelado" cor="bg-red-100 text-red-700" />
      </div>

      {/* === GRÁFICO + MOTORISTAS (mantido igual) === */}
      {/* ... mesmo conteúdo anterior ... */}
    </div>
  );
}
