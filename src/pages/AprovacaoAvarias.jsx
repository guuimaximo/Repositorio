// src/pages/AprovacaoAvarias.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaCheckCircle, FaTimesCircle, FaEye, FaTimes } from 'react-icons/fa';

// --- Componente Modal ---
// (Colocado no mesmo arquivo para simplicidade)
function DetalheAvariaModal({ avaria, onClose, onAtualizarStatus }) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Busca os itens do orçamento (peças/serviços) quando o modal abre
  useEffect(() => {
    async function carregarItens() {
      if (!avaria) return;
      setLoadingItens(true);
      
      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('*')
        .eq('avaria_id', avaria.id); // Busca itens ligados a esta avaria
      
      if (error) {
        console.error('Erro ao buscar itens do orçamento:', error);
      } else {
        setItensOrcamento(data || []);
      }
      setLoadingItens(false);
    }
    carregarItens();
  }, [avaria]);

  if (!avaria) return null;

  // Separa peças e serviços
  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');

  // Helper para formatar moeda
  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  return (
    // Overlay (fundo escuro)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      {/* Conteúdo do Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Detalhes da Avaria</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Corpo do Modal (com scroll) */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* Seção 1: Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prefixo</label>
              <p className="text-lg text-gray-800">{avaria.prefixo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Motorista</label>
              {/* (O nome da coluna com aspas é necessário aqui) */}
              <p className="text-lg text-gray-800">{avaria.motoristaId || 'N/A'}</p> 
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data da Avaria</label>
              {/* (O nome da coluna com aspas é necessário aqui) */}
              <p className="text-lg text-gray-800">
                {new Date(avaria.dataAvaria).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tipo de Ocorrência</label>
              {/* (O nome da coluna com aspas é necessário aqui) */}
              <p className="text-lg text-gray-800">{avaria.tipoOcorrencia}</p>
            </div>
          </div>

          {/* Seção 2: Descrição */}
          <div>
            <label className="text-sm font-medium text-gray-500">Descrição do Relato</label>
            <p className="text-gray-800 bg-gray-50 p-3 rounded border">{avaria.descricao || 'Sem descrição.'}</p>
          </div>

          {/* Seção 3: Orçamento */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Orçamento</h3>
            {loadingItens ? (<p>Carregando orçamento...</p>) : (
              <div className="space-y-3">
                {/* Peças */}
                <div>
                  <h4 className="font-semibold text-gray-700">Peças</h4>
                  {pecas.length > 0 ? pecas.map(item => (
                    <div key={item.id} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded">
                      <span>{item.descricao}</span>
                      <span>{item.qtd} un. x {formatCurrency(item.valorUnitario)}</span>
                      <span className="font-medium text-right">{formatCurrency(item.qtd * item.valorUnitario)}</span>
                    </div>
                  )) : <p className="text-gray-500 text-sm">Nenhuma peça lançada.</p>}
                </div>
                {/* Serviços */}
                <div>
                  <h4 className="font-semibold text-gray-700">Mão de Obra / Serviços</h4>
                  {servicos.length > 0 ? servicos.map(item => (
                    <div key={item.id} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded">
                      <span>{item.descricao}</span>
                      <span>{item.qtd} h/un. x {formatCurrency(item.valorUnitario)}</span>
                      <span className="font-medium text-right">{formatCurrency(item.qtd * item.valorUnitario)}</span>
                    </div>
                  )) : <p className="text-gray-500 text-sm">Nenhum serviço lançado.</p>}
                </div>
                {/* Total */}
                <div className="text-right text-xl font-bold mt-2 pt-2 border-t">
                  Total: {formatCurrency(avaria.valor_total_orcamento)}
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Evidências (Fotos e Vídeos) */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Evidências</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(avaria.urls_evidencias || []).map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noopener noreferrer" 
                   className="border rounded-lg overflow-hidden hover:opacity-80">
                  {/* Tenta detectar se é vídeo ou imagem pela extensão */}
                  {url.match(/\.(mp4|mov|webm)$/i) ? (
                    <video controls src={url} className="w-full h-32 object-cover" />
                  ) : (
                    <img src={url} alt={`Evidência ${index + 1}`} className="w-full h-32 object-cover" />
                  )}
                </a>
              ))}
              {avaria.urls_evidencias?.length === 0 && (
                <p className="text-gray-500 text-sm">Nenhuma evidência anexada.</p>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal (Ações) */}
        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t">
          <button
            onClick={() => onAtualizarStatus(avaria.id, 'Reprovado')}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            <FaTimesCircle />
            Reprovar
          </button>
          <button
            onClick={() => onAtualizarStatus(avaria.id, 'Aprovado')}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            <FaCheckCircle />
            Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}


// --- Página Principal de Aprovação ---
export default function AprovacaoAvarias() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  // Função para carregar as avarias pendentes
  async function carregarAvariasPendentes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Pendente de Aprovação')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar avarias pendentes:', error);
      alert('Falha ao buscar avarias: 'D' + error.message);
    } else {
      setAvarias(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarAvariasPendentes();
  }, []);

  // Função para abrir o modal
  const handleVerDetalhes = (avaria) => {
    setSelectedAvaria(avaria);
    setModalOpen(true);
  };

  // Função para fechar o modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAvaria(null);
  };

  // Função para atualizar o status (chamada DE DENTRO do modal)
  const handleAtualizarStatus = async (id, novoStatus) => {
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
      handleCloseModal(); // Fecha o modal
      carregarAvariasPendentes(); // Recarrega a lista
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Aprovação de Avarias</h1>
      <p className="mb-4 text-gray-600">
        Revise os lançamentos pendentes e aprove ou reprove.
      </p>

      {/* Lista / Tabela de Avarias Pendentes */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
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
              <tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-4 text-gray-600">Nenhuma avaria pendente de aprovação.</td></tr>
            ) : (
              avarias.map(avaria => (
                <tr key={avaria.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(avaria.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 px-3">{avaria.prefixo || '-'}</td>
                  {/* (O nome da coluna com aspas é necessário aqui) */}
                  <td className="py-2 px-3">{avaria.tipoOcorrencia || '-'}</td>
                  <td className="py-2 px-3 font-medium">
                    {/* (O nome da coluna com aspas é necessário aqui) */}
                    {(avaria.valor_total_orcamento || 0).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL'
                    })}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleVerDetalhes(avaria)}
                      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                      title="Ver Detalhes"
                    >
                      <FaEye />
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Renderiza o Modal */}
      {modalOpen && (
        <DetalheAvariaModal 
          avaria={selectedAvaria}
          onClose={handleCloseModal}
          onAtualizarStatus={handleAtualizarStatus}
        />
      )}
    </div>
  );
}
