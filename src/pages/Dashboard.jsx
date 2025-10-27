// src/pages/Dashboard.jsx
// (Código revisado para o alinhamento dos cards e a lógica de Atrasadas)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Componente CardResumo (igual)
function CardResumo({ titulo, valor, cor, subValor = null, subValor2 = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subValor !== null && (
          <p className="text-sm font-medium mt-1 text-gray-700">{subValor}</p>
      )}
      {subValor2 !== null && (
          <p className className="text-xs font-medium text-gray-600">{subValor2}</p>
      )}
    </div>
  );
}


export default function Dashboard() {
  const [resumo, setResumo] = useState({ 
    tratativasTotal: 0, tratativasPendentes: 0, tratativasConcluidas: 0,
    tratativasAtrasadas: 0, 
    avariasAprovadas: 0, avariasAprovadasValor: 0, 
    cobrancasRealizadas: 0, cobrancasRealizadasValor: 0,
    canceladasCount: 0, canceladasValor: 0,
  });
  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);
  
  const [dataFiltro, setDataFiltro] = useState({
      dataInicio: '',
      dataFim: '',
  });


  useEffect(() => {
    const timeoutId = setTimeout(carregarTudo, 0); 
    return () => clearTimeout(timeoutId);
  }, [dataFiltro]); 


  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
  });
  
  const applyDateFilters = (query) => {
      if (dataFiltro.dataInicio) {
          query = query.gte("created_at", dataFiltro.dataInicio);
      }
      if (dataFiltro.dataFim) {
          const dataFimAjustada = new Date(dataFiltro.dataFim);
          dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
          query = query.lt("created_at", dataFimAjustada.toISOString()); 
      }
      return query;
  }

  // === Resumo geral (Contagens) ===
  const carregarResumo = async () => {
    try {
        // 1. Contagem Total de Tratativas (USANDO COUNT:EXACT)
        let totalTratQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        totalTratQuery = applyDateFilters(totalTratQuery);
        const { count: tratativasTotalCount } = await totalTratQuery;
        
        // 2. Contagem Tratativas Pendentes (Exata)
        let pendentesQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        pendentesQuery = applyDateFilters(pendentesQuery);
        pendentesQuery = pendentesQuery.ilike("status", "%pendente%"); 
        const { count: tratativasPendentesCount } = await pendentesQuery;

        // 3. Contagem Tratativas Concluídas (Exata)
        let concluidasQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        concluidasQuery = applyDateFilters(concluidasQuery);
        concluidasQuery = concluidasQuery.or("status.ilike.%conclu%, status.ilike.%resolvid%"); 
        const { count: tratativasConcluidasCount } = await concluidasQuery;

        // 4. Contagem Tratativas Atrasadas (Exata) - PENDENTES E COM MAIS DE 10 DIAS
        const date10DaysAgo = new Date();
        date10DaysAgo.setDate(date10DaysAgo.getDate() - 10);
        let atrasadasQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        atrasadasQuery = applyDateFilters(atrasadasQuery); 
        atrasadasQuery = atrasadasQuery
            .ilike("status", "%pendente%") // Deve estar pendente
            .lt("created_at", date10DaysAgo.toISOString()); // Criado há mais de 10 dias
        const { count: tratativasAtrasadasCount } = await atrasadasQuery;

        // 5. Busca Avarias (para contagens e valores)
        let avsQuery = supabase.from("avarias").select("status, status_cobranca, valor_total_orcamento, valor_cobrado, created_at").limit(100000); 
        avsQuery = applyDateFilters(avsQuery);
        const { data: avsData } = await avsQuery;

        const avarias = avsData || [];

        // Cálculos de Avarias/Cobranças
        const avariasAprovadasList = avarias.filter(a => a.status === 'Aprovado');
        const cobrancasRealizadasList = avarias.filter(a => a.status_cobranca === 'Cobrada');
        const canceladasList = avarias.filter(a => a.status_cobranca === 'Cancelada');

        const avariasAprovadasValor = avariasAprovadasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);
        const cobrancasRealizadasValor = cobrancasRealizadasList.reduce((sum, a) => sum + (Number(a.valor_cobrado) || 0), 0);
        const canceladasValor = canceladasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);


        setResumo({
          tratativasTotal: tratativasTotalCount || 0,
          tratativasPendentes: tratativasPendentesCount || 0,
          tratativasConcluidas: tratativasConcluidasCount || 0,
          tratativasAtrasadas: tratativasAtrasadasCount || 0,
          
          avariasAprovadas: avariasAprovadasList.length,
          avariasAprovadasValor: avariasAprovadasValor,
          
          cobrancasRealizadas: cobrancasRealizadasList.length,
          cobrancasRealizadasValor: cobrancasRealizadasValor,

          canceladasCount: canceladasList.length,
          canceladasValor: canceladasValor,
        });

    } catch (e) {
        console.error("Erro fatal ao carregar resumo:", e);
    }
  };


  // === Evolução 30 dias (Igual) ===
  const carregarEvolucao = async () => { /* ... */ };

  // === Motoristas com mais tratativas (Igual) ===
  const carregarTopMotoristas = async () => { /* ... */ };
  
  const carregarTudo = () => {
      carregarResumo();
      carregarEvolucao();
      carregarTopMotoristas();
  }


  return (
    <div className="p-6">
        
      {/* --- FILTROS DE DATA (Igual) --- */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center justify-start text-gray-700">
          <h2 className="text-lg font-semibold">Filtro de Período</h2>
          
          <div className="flex flex-col">
              <label htmlFor="dataInicio" className="text-sm font-medium">Data Início</label>
              <input
                  type="date"
                  id="dataInicio"
                  value={dataFiltro.dataInicio}
                  onChange={(e) => setDataFiltro({ ...dataFiltro, dataInicio: e.target.value })}
                  className="border rounded-md px-3 py-2 text-gray-700"
              />
          </div>

          <div className="flex flex-col">
              <label htmlFor="dataFim" className="text-sm font-medium">Data Fim</label>
              <input
                  type="date"
                  id="dataFim"
                  value={dataFiltro.dataFim}
                  onChange={(e) => setDataFiltro({ ...dataFiltro, dataFim: e.target.value })}
                  className="border rounded-md px-3 py-2 text-gray-700"
              />
          </div>

          <button
              onClick={() => setDataFiltro({ dataInicio: '', dataFim: '' })}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2 mt-4"
          >
              Limpar Filtro
          </button>
      </div>
        
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Painel de Gestão Integrada
      </h1>

      {/* === CARDS DE RESUMO: LINHA 1 (TRATATIVAS) === */}
      {/* --- MODIFICADO: Grid 4 Colunas para alinhar --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Total Tratativas" valor={resumo.tratativasTotal} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Tratativas Pendentes" valor={resumo.tratativasPendentes} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Tratativas Concluídas" valor={resumo.tratativasConcluidas} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Tratativas Atrasadas" valor={resumo.tratativasAtrasadas} cor="bg-red-200 text-red-700" /> 
      </div>

      {/* === CARDS DE RESUMO: LINHA 2 (AVARIAS) === */}
      {/* MODIFICADO: Grid 4 Colunas com 1 espaço vazio para alinhar com a linha acima */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo 
          titulo="Avarias Aprovadas" valor={resumo.avariasAprovadas} 
          subValor={formatCurrency(resumo.avariasAprovadasValor)} subValor2="Valor Orçado"
          cor="bg-orange-100 text-orange-700" 
        />
        <CardResumo 
          titulo="Cobranças Realizadas" valor={resumo.cobrancasRealizadas} 
          subValor={formatCurrency(resumo.cobrancasRealizadasValor)} subValor2="Valor Cobrado"
          cor="bg-lime-100 text-lime-700" 
        />
        <CardResumo 
          titulo="Cobranças Canceladas" valor={resumo.canceladasCount} 
          subValor={formatCurrency(resumo.canceladasValor)} subValor2="Valor Orçado Cancelado"
          cor="bg-red-100 text-red-700" 
        />
        {/* ESPAÇO VAZIO PARA ALINHAR À DIREITA */}
        <div className="hidden md:block"></div> 
      </div>

      {/* === CONTEÚDO ALINHADO (2 COLUNAS) (Igual) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUNA 1: GRÁFICO */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-700">
            Evolução dos últimos 30 dias
          </h2>
          <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%"> 
                <LineChart data={evolucao}>
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tratativas" stroke="#2563eb" name="Tratativas" />
                  <Line type="monotone" dataKey="avariasAprovadas" stroke="#f97316" name="Avarias Aprovadas" />
                  <Line type="monotone" dataKey="cobrancasRealizadas" stroke="#16a34a" name="Cobranças Realizadas" />
                </LineChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA 2: TOP MOTORISTAS */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-700">
            Motoristas com mais tratativas
          </h2>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-3">Motorista</th>
                <th className="p-3 text-center">Qtd Tratativas</th>
                <th className="p-3 text-right">Valor Avarias</th>
              </tr>
            </thead>
            <tbody>
              {topMotoristas.length > 0 ? (
                topMotoristas.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3">{m.nome}</td>
                    <td className="p-3 text-center font-semibold">{m.qtd}</td>
                    <td className="p-3 text-right font-semibold text-red-600">
                        {formatCurrency(m.valorAvs)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-3 text-center text-gray-500">
                    Nenhum dado disponível.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
