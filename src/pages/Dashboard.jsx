// src/pages/Dashboard.jsx
// (Corrigido limite de 1000 em Tratativas e soma do Valor Cobranças Realizadas)

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
          <p className="text-xs font-medium text-gray-600">{subValor2}</p>
      )}
    </div>
  );
}


export default function Dashboard() {
  const [resumo, setResumo] = useState({ 
    tratativasTotal: 0, tratativasPendentes: 0, tratativasConcluidas: 0,
    avariasAprovadas: 0, avariasAprovadasValor: 0, 
    cobrancasRealizadas: 0, cobrancasRealizadasValor: 0,
    canceladasCount: 0, canceladasValor: 0,
  });
  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);
  
  // Estados de Filtro (igual)
  const [dataFiltro, setDataFiltro] = useState({
      dataInicio: '',
      dataFim: '',
  });


  useEffect(() => {
    carregarTudo(); 
  }, [dataFiltro]); 


  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
  });
  
  // Função que aplica os filtros de data à query do Supabase
  const applyDateFilters = (query) => {
      if (dataFiltro.dataInicio) {
          query = query.gte("created_at", dataFiltro.dataInicio);
      }
      if (dataFiltro.dataFim) {
          const dataFimAjustada = new Date(dataFiltro.dataFim);
          dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
          query = query.lt("created_at", dataFimAjustada.toISOString().split('T')[0]);
      }
      return query;
  }

  // === Resumo geral (CORRIGIDO PARA LIMITE E SOMA) ===
  const carregarResumo = async () => {
    try {
        // 1. Contagem Total de Tratativas (USANDO COUNT:EXACT)
        let totalTratQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        totalTratQuery = applyDateFilters(totalTratQuery);
        const { count: tratativasTotalCount } = await totalTratQuery;
        
        // 2. Busca Tratativas (para contagens por status)
        let tratQuery = supabase.from("tratativas").select("status, created_at").limit(100000); // ALTO LIMITE
        tratQuery = applyDateFilters(tratQuery);
        const { data: tratData } = await tratQuery;

        // 3. Busca Avarias (para contagens e valores)
        let avsQuery = supabase.from("avarias").select("status, status_cobranca, valor_total_orcamento, valor_cobrado, created_at").limit(100000); // ALTO LIMITE
        avsQuery = applyDateFilters(avsQuery);
        const { data: avsData } = await avsQuery;

        const tratativas = tratData || [];
        const avarias = avsData || [];

        // Cálculos de Tratativas
        const tratativasPendentes = tratativas.filter(t => t.status?.toLowerCase().includes('pendente')).length;
        const tratativasConcluidas = tratativas.filter(t => t.status?.toLowerCase().includes('concluí')).length; 

        // Cálculos de Avarias/Cobranças
        const avariasAprovadasList = avarias.filter(a => a.status === 'Aprovado');
        const cobrancasRealizadasList = avarias.filter(a => a.status_cobranca === 'Cobrada');
        const canceladasList = avarias.filter(a => a.status_cobranca === 'Cancelada');

        const avariasAprovadasValor = avariasAprovadasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);
        
        // --- CORREÇÃO SOMA VALOR COBRADO ---
        const cobrancasRealizadasValor = cobrancasRealizadasList.reduce((sum, a) => sum + (Number(a.valor_cobrado) || 0), 0);
        // --- FIM CORREÇÃO ---
        
        const canceladasValor = canceladasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);


        setResumo({
          tratativasTotal: tratativasTotalCount || 0, // Contagem exata
          tratativasPendentes: tratativasPendentes,
          tratativasConcluidas: tratativasConcluidas,
          
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
  const carregarEvolucao = async () => {
    let dateFilterStart = dataFiltro.dataInicio;
    
    if (!dateFilterStart) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        dateFilterStart = dataInicio.toISOString();
    }

    // Busca Tratativas
    let tratQuery = supabase.from("tratativas").select("created_at").limit(100000); // ALTO LIMITE
    tratQuery = tratQuery.gte("created_at", dateFilterStart);
    if (dataFiltro.dataFim) { tratQuery = tratQuery.lte("created_at", dataFiltro.dataFim); }
    const { data: tratData } = await tratQuery;
        
    // Busca Avarias APROVADAS
    let avQuery = supabase.from("avarias").select("created_at").ilike("status", "Aprovado").limit(100000); // ALTO LIMITE
    avQuery = avQuery.gte("created_at", dateFilterStart);
    if (dataFiltro.dataFim) { avQuery = avQuery.lte("created_at", dataFiltro.dataFim); }
    const { data: avData } = await avQuery;

    // Busca Cobranças REALIZADAS
    let cobQuery = supabase.from("avarias").select("created_at").ilike("status_cobranca", "Cobrada").limit(100000); // ALTO LIMITE
    cobQuery = cobQuery.gte("created_at", dateFilterStart);
    if (dataFiltro.dataFim) { cobQuery = cobQuery.lte("created_at", dataFiltro.dataFim); }
    const { data: cobData } = await cobQuery;

    const contagem = {};

    const somar = (dados, chave) => {
      dados?.forEach((item) => {
        const dia = new Date(item.created_at).toLocaleDateString("pt-BR");
        contagem[dia] = contagem[dia] || { dia, tratativas: 0, avariasAprovadas: 0, cobrancasRealizadas: 0 };
        contagem[dia][chave]++;
      });
    };

    somar(tratData, "tratativas");
    somar(avData, "avariasAprovadas");
    somar(cobData, "cobrancasRealizadas");

    const resultado = Object.values(contagem).sort(
      (a, b) => new Date(a.dia.split("/").reverse().join("-")) - new Date(b.dia.split("/").reverse().join("-"))
    );

    setEvolucao(resultado);
  };

  // === Motoristas com mais tratativas (Igual) ===
  const carregarTopMotoristas = async () => {
    // 1. Busca Tratativas (para a contagem)
    let tratQuery = supabase.from("tratativas").select("motorista_nome").not("motorista_nome", "is", null).limit(100000); // ALTO LIMITE
    tratQuery = applyDateFilters(tratQuery);
    const { data: tratData } = await tratQuery;

    // 2. Busca Avarias Aprovadas/Cobradas (para o valor acumulado)
    let avQuery = supabase.from("avarias").select('"motoristaId"', "valor_cobrado", "valor_total_orcamento")
                       .or('status_cobranca.eq.Cobrada,status_cobranca.eq.Pendente').limit(100000); // ALTO LIMITE
    avQuery = applyDateFilters(avQuery);
    const { data: avData } = await avQuery;

    if (!tratData || !avData) return;

    const contador = {};
    
    // Contagem de Tratativas
    tratData.forEach((t) => {
      contador[t.motorista_nome] = (contador[t.motorista_nome] || 0) + 1;
    });

    // Combina os dados para a tabela
    const top = Object.entries(contador)
      .map(([nome, qtd]) => {
          // Calcula valor total de avarias para o motorista pelo nome
          const valorAvs = avData
              .filter(av => av.motoristaId?.includes(nome)) // Busca por inclusão de nome
              .reduce((sum, av) => sum + (Number(av.valor_cobrado) || av.valor_total_orcamento || 0), 0); // Correção de soma
          
          return { nome, qtd, valorAvs };
      })
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    setTopMotoristas(top);
  };
  
  const carregarTudo = () => {
      carregarResumo();
      carregarEvolucao();
      carregarTopMotoristas();
  }


  return (
    <div className="p-6">
        
      {/* --- FILTROS DE DATA --- */}
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

      {/* === CARDS DE RESUMO (6 CARDS) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* LINHA 1: TRATATIVAS */}
        <CardResumo titulo="Total Tratativas" valor={resumo.tratativasTotal} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Tratativas Pendentes" valor={resumo.tratativasPendentes} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Tratativas Concluídas" valor={resumo.tratativasConcluidas} cor="bg-green-100 text-green-700" />
        {/* LINHA 2: AVARIAS/COBRANÇAS */}
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
      </div>

      {/* === CONTEÚDO ALINHADO (2 COLUNAS) === */}
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
