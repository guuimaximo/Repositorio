// src/pages/Dashboard.jsx
// (Contagens corrigidas e card de Canceladas adicionado)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Componente CardResumo (Atualizado para aceitar valor formatado)
function CardResumo({ titulo, valor, cor, subValor = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium">{titulo}</h3>
      <p className="text-3xl font-bold mt-2">{valor}</p>
      {/* Exibe subvalor (Ex: Soma R$) se fornecido */}
      {subValor !== null && (
          <p className="text-xs font-medium mt-1">{subValor}</p>
      )}
    </div>
  );
}


export default function Dashboard() {
  const [resumo, setResumo] = useState({
    tratativas: 0,
    avariasAprovadas: 0, // Nome atualizado
    cobrancasRealizadas: 0, // Nome atualizado
    canceladasCount: 0, // Novo
    canceladasTotalValue: 0, // Novo
  });
  const [evolucao, setEvolucao] = useState([]);
  const [topMotoristas, setTopMotoristas] = useState([]);

  useEffect(() => {
    carregarResumo();
    carregarEvolucao();
    carregarTopMotoristas();
  }, []);

  // === Resumo geral (MODIFICADO) ===
  const carregarResumo = async () => {
    // Busca contagem de tratativas
    const { count: tratativasCount, error: tratativasError } = await supabase
        .from("tratativas")
        .select("id", { count: "exact", head: true }); // head: true é mais eficiente

    // Busca dados das avarias para calcular os outros resumos
    const { data: avariasData, error: avariasError } = await supabase
        .from("avarias")
        .select("status, status_cobranca, valor_total_orcamento"); // Seleciona os campos necessários

    if (tratativasError || avariasError) {
        console.error("Erro ao carregar resumo:", tratativasError || avariasError);
        // Tratar erro (ex: mostrar mensagem na tela)
        return;
    }
    
    // Calcula os totais baseados nos dados das avarias
    const avariasAprovadas = (avariasData || []).filter(a => a.status === 'Aprovado').length;
    const cobrancasRealizadas = (avariasData || []).filter(a => a.status_cobranca === 'Cobrada').length;
    const canceladas = (avariasData || []).filter(a => a.status_cobranca === 'Cancelada');
    const canceladasCount = canceladas.length;
    const canceladasTotalValue = canceladas.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0);

    setResumo({
      tratativas: tratativasCount || 0,
      avariasAprovadas: avariasAprovadas,
      cobrancasRealizadas: cobrancasRealizadas,
      canceladasCount: canceladasCount,
      canceladasTotalValue: canceladasTotalValue,
    });
  };

  // === Evolução 30 dias ===
  // (ATENÇÃO: A lógica atual conta 'created_at' das tabelas.
  // Idealmente, a evolução de 'Avarias' e 'Cobranças' deveria rastrear
  // quando o status mudou para 'Aprovado' ou 'Cobrada', usando 'updated_at'.
  // Mantendo a lógica original por enquanto para simplicidade)
  const carregarEvolucao = async () => { /* ... (código original sem alteração) ... */ };

  // === Motoristas com mais tratativas ===
  // (Sem alteração)
  const carregarTopMotoristas = async () => { /* ... (código original sem alteração) ... */ };

  // Função para formatar moeda
  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Painel de Gestão Integrada
      </h1>

      {/* === Cards principais (ATUALIZADOS) === */}
      {/* Grid agora com 4 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> 
        <CardResumo 
          titulo="Tratativas" 
          valor={resumo.tratativas} 
          cor="bg-blue-100 text-blue-700" 
        />
        <CardResumo 
          titulo="Avarias Aprovadas" // Label atualizado
          valor={resumo.avariasAprovadas} 
          cor="bg-orange-100 text-orange-700" // Cor alterada para diferenciar
        />
        <CardResumo 
          titulo="Cobranças Realizadas" // Label atualizado
          valor={resumo.cobrancasRealizadas} 
          cor="bg-green-100 text-green-700" 
        />
        {/* --- NOVO CARD --- */}
        <CardResumo 
          titulo="Cobranças Canceladas" 
          valor={resumo.canceladasCount} 
          subValor={formatCurrency(resumo.canceladasTotalValue)} // Mostra a soma R$
          cor="bg-red-100 text-red-700" 
        />
        {/* --- FIM NOVO CARD --- */}
      </div>

      {/* === Gráfico de evolução === */}
      {/* (Sem alteração no JSX, mas a legenda pode ficar incorreta se a lógica de 'carregarEvolucao' não for ajustada) */}
      <div className="bg-white shadow rounded-lg p-6 mb-8"> ... </div>

      {/* === Top Motoristas === */}
      {/* (Sem alteração no JSX) */}
      <div className="bg-white shadow rounded-lg p-6"> ... </div>
    </div>
  );
}

// O componente CardResumo foi movido para o topo do arquivo e atualizado
