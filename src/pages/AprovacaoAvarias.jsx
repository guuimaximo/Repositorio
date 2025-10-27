// src/pages/AprovacaoAvarias.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaCheckCircle, FaTimesCircle, FaEye } from 'react-icons/fa'; // Ícones

export default function AprovacaoAvarias() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para carregar as avarias pendentes
  async function carregarAvariasPendentes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Pendente de Aprovação') // O filtro principal
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar avarias pendentes:', error);
      alert('Falha ao buscar avarias: ' + error.message);
    } else {
      setAvarias(data || []);
    }
    setLoading(false);
  }

  // Carrega os dados na primeira vez que a tela abre
  useEffect(() => {
    carregarAvariasPendentes();
  }, []);

  // Função para atualizar o status (Aprovar/Reprovar)
  const handleAtualizarStatus = async (id, novoStatus) => {
    // Confirmação
    if (!window.confirm(`Deseja realmente ${novoStatus.toLowerCase()} esta avaria?`)) {
      return;
    }

    const { error } = await supabase
      .from('avarias')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) {
      alert('Falha ao atualizar status: ' + error.message);
    } else {
      alert(`Avaria ${novoStatus.toLowerCase()} com sucesso!`);
      // Recarrega a lista para remover o item aprovado/reprovado
      carregarAvariasPendentes();
    }
  };
  
  // TODO: Criar uma função para navegar para uma tela de detalhes
  // const verDetalhes = (id) => {
  //   navigate(`/avaria-detalhe/${id}`); 
  // };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Aprovação de Avarias</h1>
      <p className="mb-4 text-gray-600">
        Revise os lançamentos pendentes e aprove ou reprove.
      </p>

      {/* Lista / Tabela de Avarias Pendentes */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          {/* Cabeçalho com estilo do CentralTratativas */}
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Lançamento</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor Total</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  Carregando...
                </td>
              </tr>
            ) : avarias.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-600">
                  Nenhuma avaria pendente de aprovação.
                </td>
              </tr>
            ) : (
              avarias.map(avaria => (
                <tr key={avaria.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(avaria.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 px-3">{avaria.prefixo || '-'}</td>
                  <td className="py-2 px-3">{avaria.tipoOcorrencia || '-'}</td>
                  <td className="py-2 px-3 font-medium">
                    {/* (O nome da coluna com aspas é necessário aqui) */}
                    {(avaria.valor_total_orcamento || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="py-2 px-3 flex items-center gap-2">
                    <button
                      onClick={() => handleAtualizarStatus(avaria.id, 'Aprovado')}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
                      title="Aprovar"
                    >
                      <FaCheckCircle />
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleAtualizarStatus(avaria.id, 'Reprovado')}
                      className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm"
                      title="Reprovar"
                    >
                      <FaTimesCircle />
                      Reprovar
                    </button>
                    {/* TODO: Botão de Detalhes */}
                    {/* <button
                      onClick={() => verDetalhes(avaria.id)}
                      className="bg-gray-300 text-gray-700 p-2 rounded-md hover:bg-gray-400"
                      title="Ver Detalhes"
                    >
                      <FaEye />
                    </button> */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
