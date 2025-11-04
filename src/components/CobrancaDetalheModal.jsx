// src/components/CobrancaDetalheModal.jsx
// Versão 100% limpa, com impressão "verde", correção de logos e sintaxe

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes } from 'react-icons/fa';
import CampoMotorista from './CampoMotorista';

// Helper para converter string (BRL ou US) para número
const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(num) ? null : num;
};

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
      setIsEditing(false);

      setValorCobrado(
        avaria.valor_cobrado !== undefined && avaria.valor_cobrado !== null
          ? String(avaria.valor_cobrado).replace('.', ',')
          : ''
      );
      setObservacaoOperacao(avaria.observacao_operacao || '');
      setNumParcelas(avaria.numero_parcelas || 1);
      setMotivoCancelamento(avaria.motivo_cancelamento_cobranca || '');

      if (avaria.motoristaId) {
        setNeedsMotoristaSelection(false);
        const parts = String(avaria.motoristaId).split(' - ');
        setSelectedMotorista({ chapa: parts[0] || '', nome: parts[1] || parts[0] || '' });
      } else {
        setNeedsMotoristaSelection(avaria.status_cobranca === 'Pendente');
        setSelectedMotorista({ chapa: '', nome: '' });
      }

      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('id, descricao, qtd, "valorUnitario", tipo')
        .eq('avaria_id', avaria.id);

      if (!error && Array.isArray(data)) setItensOrcamento(data);
      setLoadingItens(false);
    }
    carregarDados();
  }, [avaria]);

  if (!avaria) return null;

  const pecas = itensOrcamento.filter((i) => i.tipo === 'Peca');
  const servicos = itensOrcamento.filter((i) => i.tipo === 'Servico');

  const formatCurrency = (v) =>
    v === null || v === undefined || v === ''
      ? '-'
      : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- FUNÇÃO DE IMPRESSÃO ATUALIZADA ---
  const handlePrint = () => {
    const baseUrl = window.location.origin;
    let printContents = document.getElementById('printable-area').innerHTML;

    // Corrige caminhos relativos de imagens para absolutos
    printContents = printContents.replace(/src="(\/[^\"]+)"/g, (_match, path) => `src="${baseUrl}${path}"`);

    // Coleta estilos atuais
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Cobrança - ${avaria.prefixo || ''}</title>
          ${styles}
          <style>
            @page { margin: 16mm; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-4xl mx-auto bg-white p-12 shadow-lg rounded-lg">
            ${printContents}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  // --- FIM DA FUNÇÃO DE IMPRESSÃO ---

  const handleSalvarStatus = (novoStatus) => {
    if (novoStatus === 'Cancelada' && !motivoCancelamento.trim()) {
      alert('⚠️ Motivo obrigatório para cancelamento.');
      return;
    }

    if (novoStatus === 'Cobrada' && needsMotoristaSelection && !selectedMotorista.chapa) {
      alert('⚠️ Selecione um motorista para marcar como "Cobrada".');
      return;
    }

    const valorNumerico = parseCurrency(valorCobrado);
    if (novoStatus === 'Cobrada' && valorNumerico === null) {
      alert('⚠️ O Valor Cobrado é inválido.');
      return;
    }

    const updateData = {
      status_cobranca: novoStatus,
      valor_cobrado: valorNumerico,
      numero_parcelas: Number(numParcelas) || 1,
      observacao_operacao: observacaoOperacao,
      motivo_cancelamento_cobranca: novoStatus === 'Cancelada' ? motivoCancelamento : null,
      data_cobranca: new Date(),
    };

    if (needsMotoristaSelection && selectedMotorista.chapa) {
      updateData.motoristaId = `${selectedMotorista.chapa} - ${selectedMotorista.nome}`;
    }

    if (!window.confirm(`Confirma marcar como ${novoStatus.toLowerCase()}?`)) return;

    onAtualizarStatus(avaria.id, novoStatus, updateData);

    if (isEditing) setIsEditing(false);
  };

  const somenteLeitura = !(isEditing || avaria.status_cobranca === 'Pendente');
  const dataAvariaFmt = new Date(
    avaria.dataAvaria || avaria.data_avaria || avaria.data || Date.now()
  ).toLocaleDateString('pt-BR');

  return (
    <>
      {/* === Modal Principal === */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Cabeçalho */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-2xl font-bold text-gray-800">🧾 Detalhes da Cobrança</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Fechar">
              <FaTimes size={20} />
            </button>
          </div>

          {/* Corpo */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Identificação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block">Prefixo</label>
                <p className="font-medium text-gray-900">{avaria.prefixo}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block">Motorista</label>
                {needsMotoristaSelection ? (
                  <CampoMotorista
                    onSelect={(motorista) => setSelectedMotorista(motorista)}
                    initialValue={selectedMotorista}
                  />
                ) : (
                  <p className="font-medium text-gray-900">{selectedMotorista.nome || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block">Data Avaria</label>
                <p className="font-medium text-gray-900">{dataAvariaFmt}</p>
              </div>
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
                        <th className="p-2 border text-left">Descrição</th>
                        <th className="p-2 border text-center">Qtd</th>
                        <th className="p-2 border text-right">Valor Unitário</th>
                        <th className="p-2 border text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...pecas, ...servicos].map((item) => (
                        <tr key={item.id} className="border-b">
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
                readOnly={somenteLeitura}
                className="w-full border rounded-md p-2 mb-3"
              />

              <label className="block text-sm font-medium">Motivo do Cancelamento</label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                readOnly={somenteLeitura}
                className="w-full border rounded-md p-2 mb-3"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(Number(e.target.value))}
                    readOnly={somenteLeitura}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Valor Cobrado (R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 1.234,56"
                   value={valorCobrado}
                    onChange={(e) => setValorCobrado(e.target.value)}
                    readOnly={somenteLeitura}
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

{/* ====================================================================
    LAYOUT DE IMPRESSÃO — BÁSICO (1 página)
==================================================================== */}
<div id="printable-area" className="hidden font-sans text-[11px] leading-tight text-gray-900">
  <style>{`
    @page { margin: 12mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .compact th, .compact td { padding: 4px 6px; }
    .nobreak { break-inside: avoid; page-break-inside: avoid; }
    h1, h2 { margin: 0; padding: 0; }
  `}</style>

  {/* Cabeçalho simples */}
  <header className="mb-2">
    <h1 className="text-center text-[14px] font-extrabold">RELATÓRIO DE COBRANÇA DE AVARIA</h1>
  </header>

  {/* Identificação */}
  <section className="mb-2">
    <div className="grid grid-cols-3 gap-2">
      <div><span className="text-gray-600">Prefixo:</span> <strong>{avaria.prefixo}</strong></div>
      <div>
        <span className="text-gray-600">Motorista:</span>{' '}
        <strong>{selectedMotorista?.nome ? `${selectedMotorista.chapa} - ${selectedMotorista.nome}` : 'N/A'}</strong>
      </div>
      <div>
        <span className="text-gray-600">Data da Avaria:</span>{' '}
        <strong>{new Date(avaria.dataAvaria || avaria.data_avaria || avaria.data || Date.now()).toLocaleDateString('pt-BR')}</strong>
      </div>
      <div className="col-span-3">
        <span className="text-gray-600">Descrição:</span>{' '}
        <strong>{avaria.descricao || 'Não informada'}</strong>
      </div>
    </div>
  </section>

  {/* Tabela de Peças */}
  <section className="mb-2 nobreak">
    <h2 className="text-[12px] font-bold mb-1">Peças</h2>
    <table className="w-full border border-gray-300 border-collapse compact">
      <thead>
        <tr className="bg-gray-100">
          <th className="border text-left">Descrição</th>
          <th className="border text-center">Qtd</th>
          <th className="border text-right">V. Unit.</th>
          <th className="border text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {pecas.length === 0 ? (
          <tr><td className="border p-2 text-center" colSpan={4}>Sem peças</td></tr>
        ) : (
          pecas.map((item) => (
            <tr key={`p-${item.id}`}>
              <td className="border">{item.descricao}</td>
              <td className="border text-center">{item.qtd}</td>
              <td className="border text-right">{formatCurrency(item.valorUnitario)}</td>
              <td className="border text-right">
                {formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </section>

  {/* Tabela de Serviços */}
  <section className="mb-2 nobreak">
    <h2 className="text-[12px] font-bold mb-1">Serviços</h2>
    <table className="w-full border border-gray-300 border-collapse compact">
      <thead>
        <tr className="bg-gray-100">
          <th className="border text-left">Descrição</th>
          <th className="border text-center">Qtd</th>
          <th className="border text-right">V. Unit.</th>
          <th className="border text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {servicos.length === 0 ? (
          <tr><td className="border p-2 text-center" colSpan={4}>Sem serviços</td></tr>
        ) : (
          servicos.map((item) => (
            <tr key={`s-${item.id}`}>
              <td className="border">{item.descricao}</td>
              <td className="border text-center">{item.qtd}</td>
              <td className="border text-right">{formatCurrency(item.valorUnitario)}</td>
              <td className="border text-right">
                {formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </section>

  {/* Totais (compacto) */}
  <section className="mb-2 nobreak">
    <div className="w-full flex justify-end">
      <div className="w-[260px]">
        <div className="flex justify-between border-b py-1">
          <span className="text-gray-600">Subtotal Peças</span>
          <span className="font-medium">
            {formatCurrency(pecas.reduce((acc, it) => acc + (it.qtd || 0) * (it.valorUnitario || 0), 0))}
          </span>
        </div>
        <div className="flex justify-between border-b py-1">
          <span className="text-gray-600">Subtotal Serviços</span>
          <span className="font-medium">
            {formatCurrency(servicos.reduce((acc, it) => acc + (it.qtd || 0) * (it.valorUnitario || 0), 0))}
          </span>
        </div>
        <div className="flex justify-between border-b py-1">
          <span className="text-gray-600">Valor Total Orçado</span>
          <span className="font-medium">{formatCurrency(avaria.valor_total_orcamento)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold">Valor Cobrado</span>
          <span className="font-extrabold">
            {formatCurrency(parseCurrency(valorCobrado) ?? 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Parcelas</span>
          <span className="font-medium">{numParcelas || 1}</span>
        </div>
      </div>
    </div>
  </section>

  {/* Observações (curto) */}
  <section className="mb-3 nobreak">
    <span className="text-gray-600">Observações:</span>
    <div className="border rounded p-2 min-h-[40px]">
      <div className="whitespace-pre-line">
        {(observacaoOperacao || '').trim()}
      </div>
    </div>
  </section>

  {/* Assinaturas — 3 linhas */}
  <section className="mt-4 nobreak">
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <div className="h-12" />
        <div className="border-t pt-1">
          <p className="text-[11px] font-medium">Gerente de Manutenção</p>
        </div>
      </div>
      <div className="text-center">
        <div className="h-12" />
        <div className="border-t pt-1">
          <p className="text-[11px] font-medium">Responsável pela Cobrança</p>
        </div>
      </div>
      <div className="text-center">
        <div className="h-12" />
        <div className="border-t pt-1">
          <p className="text-[11px] font-medium">Motorista</p>
        </div>
      </div>
    </div>
  </section>
</div>


    </>
  );
}
