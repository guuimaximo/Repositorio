// src/components/CobrancaDetalheModal.jsx
// Versão atualizada com edição liberada para cobranças já "Cobradas"

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes } from 'react-icons/fa';
import CampoMotorista from './CampoMotorista';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState('');
  const [observacaoOperacao, setObservacaoOperacao] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [needsMotoristaSelection, setNeedsMotoristaSelection] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [isEditing, setIsEditing] = useState(false); // Novo estado de edição liberada

  useEffect(() => {
    async function carregarDados() {
      if (!avaria) return;
      setLoadingItens(true);

      setValorCobrado(avaria.valor_cobrado ? String(avaria.valor_cobrado) : '');
      setObservacaoOperacao(avaria.observacao_operacao || '');
      setNumParcelas(avaria.numero_parcelas || 1);
      setMotivoCancelamento(avaria.motivo_cancelamento_cobranca || '');

      if (!avaria.motoristaId && avaria.status_cobranca === 'Pendente') {
        setNeedsMotoristaSelection(true);
        setSelectedMotorista({ chapa: '', nome: '' });
      } else {
        setNeedsMotoristaSelection(false);
        if (avaria.motoristaId) {
          const parts = String(avaria.motoristaId).split(' - ');
          setSelectedMotorista({ chapa: parts[0] || '', nome: parts[1] || avaria.motoristaId });
        } else {
          setSelectedMotorista({ chapa: '', nome: '' });
        }
      }

      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('id, descricao, qtd, "valorUnitario", tipo')
        .eq('avaria_id', avaria.id);

      if (!error) setItensOrcamento(data || []);
      setLoadingItens(false);
    }
    carregarDados();
  }, [avaria]);

  if (!avaria) return null;

  const pecas = itensOrcamento.filter((i) => i.tipo === 'Peca');
  const servicos = itensOrcamento.filter((i) => i.tipo === 'Servico');
  const formatCurrency = (v) =>
    v === null || v === undefined ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const handlePrint = () => window.print();

  const handleSalvarStatus = (novoStatus) => {
    if (novoStatus === 'Cancelada' && !motivoCancelamento.trim()) {
      alert('⚠️ Motivo obrigatório para cancelamento.');
      return;
    }

    const updateData = {
      status_cobranca: novoStatus,
      valor_cobrado: valorCobrado || null,
      numero_parcelas: numParcelas || 1,
      observacao_operacao: observacaoOperacao,
      motivo_cancelamento_cobranca: motivoCancelamento,
      data_cobranca: new Date(),
    };

    if (!window.confirm(`Confirma marcar como ${novoStatus.toLowerCase()}?`)) return;
    onAtualizarStatus(avaria.id, novoStatus, updateData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Detalhes da Cobrança</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
            <div><label>Prefixo</label><p>{avaria.prefixo}</p></div>
            <div><label>Motorista</label><p>{avaria.motoristaId || 'N/A'}</p></div>
            <div><label>Data Avaria</label><p>{new Date(avaria.dataAvaria).toLocaleDateString()}</p></div>
          </div>

          {/* Itens */}
          <div>
            <h3 className="text-xl font-semibold">🔧 Detalhamento do Orçamento</h3>
            {loadingItens ? (
              <p>Carregando...</p>
            ) : (
              <>
                <table className="min-w-full border text-sm mt-3">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Descrição</th>
                      <th className="p-2 border">Qtd</th>
                      <th className="p-2 border">Valor Unitário</th>
                      <th className="p-2 border">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pecas, ...servicos].map((item) => (
                      <tr key={item.id}>
                        <td className="border p-2">{item.descricao}</td>
                        <td className="border p-2 text-right">{item.qtd}</td>
                        <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                        <td className="border p-2 text-right font-medium">
                          {formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-xl font-bold mt-3">
                  Valor Total: {formatCurrency(avaria.valor_total_orcamento)}
                </div>
              </>
            )}
          </div>

          {/* Operação */}
          <div className="border-t pt-4">
            <h3 className="text-xl font-semibold mb-2">🧮 Detalhes da Operação</h3>

            <label className="block text-sm font-medium">Observações</label>
            <textarea
              value={observacaoOperacao}
              onChange={(e) => setObservacaoOperacao(e.target.value)}
              readOnly={!isEditing && avaria.status_cobranca !== 'Pendente'}
              className="w-full border rounded-md p-2 mb-3"
            ></textarea>

            <label className="block text-sm font-medium">Motivo do Cancelamento</label>
            <textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              readOnly={!isEditing && avaria.status_cobranca !== 'Pendente'}
              className="w-full border rounded-md p-2 mb-3"
            ></textarea>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Nº de Parcelas</label>
                <input
                  type="number"
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(e.target.value)}
                  readOnly={!isEditing && avaria.status_cobranca !== 'Pendente'}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label>Valor Cobrado (R$)</label>
                <input
                  type="text"
                  value={valorCobrado}
                  onChange={(e) => setValorCobrado(e.target.value)}
                  readOnly={!isEditing && avaria.status_cobranca !== 'Pendente'}
                  className="w-full border rounded-md p-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <button
            onClick={handlePrint}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            🖨️ Imprimir
          </button>

          <div className="flex gap-3">
            {avaria.status_cobranca === 'Pendente' && (
              <>
                <button
                  onClick={() => handleSalvarStatus('Cobrada')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  💰 Marcar como Cobrada
                </button>
                <button
                  onClick={() => handleSalvarStatus('Cancelada')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  ❌ Cancelar Cobrança
                </button>
              </>
            )}

            {avaria.status_cobranca === 'Cobrada' && !isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  alert('✏️ Edição liberada. Faça os ajustes e salve novamente como "Cobrada".');
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                ✏️ Editar Cobrança
              </button>
            )}

            {isEditing && (
              <button
                onClick={() => handleSalvarStatus('Cobrada')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                💾 Salvar Alterações
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              🚪 Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
