// src/pages/Dashboard.jsx
// (Correção Final: Tratativas Pendentes e Soma Valor Cobrado)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Componente CardResumo (igual)
function CardResumo({ titulo, valor, cor, subValor = null, subValor2 = null }) { /* ... */ }


export default function Dashboard() {
  const [resumo, setResumo] = useState({ 
    tratativasTotal: 0, tratativasPendentes: 0, tratativasConcluidas: 0,
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
    carregarTudo(); 
  }, [dataFiltro]); 


  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
  });
  
  const applyDateFilters = (query) => { /* ... (código igual) ... */ return query; }

  // === Resumo geral (REVISADO) ===
  const carregarResumo = async () => {
    try {
        // 1. Contagem Total de Tratativas (USANDO COUNT:EXACT)
        let totalTratQuery = supabase.from("tratativas").select("id", { count: "exact", head: true });
        totalTratQuery = applyDateFilters(totalTratQuery);
        const { count: tratativasTotalCount } = await totalTratQuery;
        
        // 2. Busca Tratativas (para contagens por status) - ALTO LIMITE
        let tratQuery = supabase.from("tratativas").select("status, created_at").limit(100000); 
        tratQuery = applyDateFilters(tratQuery);
        const { data: tratData } = await tratQuery;

        // 3. Busca Avarias (para contagens e valores) - ALTO LIMITE
        let avsQuery = supabase.from("avarias").select("status, status_cobranca, valor_total_orcamento, valor_cobrado, created_at").limit(100000); 
        avsQuery = applyDateFilters(avsQuery);
        const { data: avsData } = await avsQuery;

        const tratativas = tratData || [];
        const avarias = avsData || [];

        // --- CORREÇÃO TRATATIVAS PENDENTES ---
        // Certifica-se de que a comparação é case-insensitive e o array é o correto
        const tratativasPendentes = tratativas.filter(t => t.status?.toLowerCase().includes('pendente')).length;
        const tratativasConcluidas = tratativas.filter(t => t.status?.toLowerCase().includes('concluí') || t.status?.toLowerCase().includes('resolvido')).length; 
        // --- FIM CORREÇÃO ---

        // Cálculos de Avarias/Cobranças
        const avariasAprovadasList = avarias.filter(a => a.status === 'Aprovado');
        const cobrancasRealizadasList = avarias.filter(a => a.status_cobranca === 'Cobrada');
        const canceladasList = avarias.filter(a => a.status_cobranca === 'Cancelada');

        const avariasAprovadasValor = avariasAprovadasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);
        
        // --- CORREÇÃO SOMA VALOR COBRADO: Usando Number() e acesso direto ao valor para evitar problemas de tipagem ---
        const cobrancasRealizadasValor = cobrancasRealizadasList.reduce((sum, a) => sum + (Number(a.valor_cobrado) || 0), 0);
        // --- FIM CORREÇÃO ---
        
        const canceladasValor = canceladasList.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);


        setResumo({
          tratativasTotal: tratativasTotalCount || 0,
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
  const carregarEvolucao = async () => { /* ... (código igual) ... */ };

  // === Motoristas com mais tratativas (Igual) ===
  const carregarTopMotoristas = async () => { /* ... (código igual) ... */ };
  
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
          {/* ... (código dos filtros de data) ... */}
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
        {/* ... (código do gráfico igual) ... */}

        {/* COLUNA 2: TOP MOTORISTAS */}
        {/* ... (código do top motoristas igual) ... */}
        
      </div>
    </div>
  );
}
