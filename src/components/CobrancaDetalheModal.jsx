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
  const [isEditing, setIsEditing] = useState(false);

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
    <>
      {/* === Modal Principal === */}
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

      {/* === Layout de Impressão com Papel Timbrado === */}
      <div
        className="hidden print:block printable-area p-12 font-sans text-sm leading-relaxed relative"
        style={{
          backgroundImage: "url('/assets/logo-csc.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top right",
          backgroundSize: "180px",
          minHeight: "100vh",
        }}
      >
        {/* Cabeçalho e título */}
        <div className="text-center mb-8 mt-8">
          <h1 className="text-2xl font-bold text-gray-800">RELATÓRIO DE COBRANÇA DE AVARIA</h1>
        </div>

        {/* Identificação */}
        <div className="space-y-1 mb-4">
          <p><strong>Prefixo:</strong> {avaria.prefixo}</p>
          <p><strong>Motorista:</strong> {avaria.motoristaId || 'N/A'}</p>
          <p><strong>Data da Avaria:</strong> {new Date(avaria.dataAvaria).toLocaleDateString()}</p>
          <p><strong>Tipo de Ocorrência:</strong> {avaria.tipoOcorrencia || 'Não informado'}</p>
        </div>

        {/* Tabela de Peças e Serviços */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">🔧 Detalhamento do Orçamento</h3>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="text-left p-2 border">Descrição</th>
                <th className="text-right p-2 border">Qtd</th>
                <th className="text-right p-2 border">Valor Unitário</th>
                <th className="text-right p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...pecas, ...servicos].length > 0 ? (
                [...pecas, ...servicos].map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 border">{item.descricao}</td>
                    <td className="p-2 text-right border">{item.qtd}</td>
                    <td className="p-2 text-right border">{formatCurrency(item.valorUnitario)}</td>
                    <td className="p-2 text-right border font-medium">
                      {formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500 p-3">
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="mt-6 text-right">
          <p><strong>Valor Total Orçado:</strong> {formatCurrency(avaria.valor_total_orcamento)}</p>
          <p><strong>Valor Cobrado:</strong> {formatCurrency(avaria.valor_cobrado)}</p>
          <p><strong>Nº de Parcelas:</strong> {avaria.numero_parcelas || 1}</p>
        </div>

        {/* Observações */}
        <div className="mt-6 border-t pt-3">
          <p><strong>Observações:</strong></p>
          <p className="whitespace-pre-line">{observacaoOperacao || 'Sem observações registradas.'}</p>
        </div>

        {/* Assinatura do Gerente (se existir) */}
        {avaria.assinaturaGerente && (
          <div className="mt-10 text-center">
            <p className="font-semibold text-gray-700 mb-1">Assinado digitalmente por:</p>
            <img
              src={avaria.assinaturaGerente}
              alt="Assinatura do Gerente"
              className="h-16 mx-auto"
            />
            <p className="text-gray-600 text-sm mt-1">
              {avaria.nomeGerente} — Gerente de Manutenção
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
          <img
            src="/assets/logo-planalto.jpg"
            alt="Expresso Planalto S/A"
            className="h-8 object-contain"
          />
        </div>

        {/* Texto do rodapé institucional */}
        <div className="fixed bottom-1 left-8 right-8 text-gray-500 text-xs flex justify-between">
          <span>Relatório gerado automaticamente pelo sistema InovaQuatai 🚍</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );
}
