// src/components/CobrancaDetalheModal.jsx
// Versão completa com impressão "verde", edição de Motorista/Data e exibição de Evidências

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaEdit, FaSave } from 'react-icons/fa';
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
  const [urlsEvidencias, setUrlsEvidencias] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState('');
  const [observacaoOperacao, setObservacaoOperacao] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [needsMotoristaSelection, setNeedsMotoristaSelection] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [dataAvaria, setDataAvaria] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      if (!avaria) return;
      setLoadingItens(true);
      setIsEditing(false);
      setIsEditingInfo(false);

      setValorCobrado(
        avaria.valor_cobrado !== undefined && avaria.valor_cobrado !== null
          ? String(avaria.valor_cobrado).replace('.', ',')
          : ''
      );
      setObservacaoOperacao(avaria.observacao_operacao || '');
      setNumParcelas(avaria.numero_parcelas || 1);
      setMotivoCancelamento(avaria.motivo_cancelamento_cobranca || '');

      // Motorista
      if (avaria.motoristaId) {
        setNeedsMotoristaSelection(false);
        const parts = String(avaria.motoristaId).split(' - ');
        setSelectedMotorista({ chapa: parts[0] || '', nome: parts[1] || parts[0] || '' });
      } else {
        setNeedsMotoristaSelection(true);
        setSelectedMotorista({ chapa: '', nome: '' });
      }

      // Data da avaria
      setDataAvaria(avaria.dataAvaria || avaria.data_avaria || new Date().toISOString());

      // Evidências
      if (avaria.urls_evidencias) {
        let urls = [];
        if (Array.isArray(avaria.urls_evidencias)) urls = avaria.urls_evidencias;
        else if (typeof avaria.urls_evidencias === 'string')
          urls = avaria.urls_evidencias.split(',').map((u) => u.trim());
        setUrlsEvidencias((urls || []).filter(Boolean));
      }

      // Itens do orçamento
      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('id, descricao, qtd, valorUnitario, tipo')
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

  // --- IMPRESSÃO ---
  const handlePrint = () => {
    const baseUrl = window.location.origin;
    let printContents = document.getElementById('printable-area').innerHTML;
    printContents = printContents.replace(/src="(\/[^\"]+)"/g, (_m, path) => `src="${baseUrl}${path}"`);
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

  // --- SALVAR EDIÇÃO DE MOTORISTA/DATA ---
  const handleSalvarInfo = async () => {
    if (!selectedMotorista.chapa) {
      alert('⚠️ Selecione o motorista antes de salvar.');
      return;
    }
    const { error } = await supabase
      .from('avarias')
      .update({
        motoristaId: `${selectedMotorista.chapa} - ${selectedMotorista.nome}`,
        dataAvaria,
      })
      .eq('id', avaria.id);
    if (error) alert('Erro ao salvar motorista/data: ' + error.message);
    else {
      alert('✅ Motorista/Data atualizados!');
      setIsEditingInfo(false);
      onAtualizarStatus();
    }
  };

  // --- SALVAR STATUS ---
  const handleSalvarStatus = (novoStatus) => {
    const valorNumerico = parseCurrency(valorCobrado);
    const updateData = {
      status_cobranca: novoStatus,
      valor_cobrado: valorNumerico,
      numero_parcelas: Number(numParcelas) || 1,
      observacao_operacao: observacaoOperacao,
      motivo_cancelamento_cobranca: novoStatus === 'Cancelada' ? motivoCancelamento : null,
      data_cobranca: new Date(),
    };
    if (selectedMotorista.chapa)
      updateData.motoristaId = `${selectedMotorista.chapa} - ${selectedMotorista.nome}`;
    if (!window.confirm(`Confirma marcar como ${novoStatus.toLowerCase()}?`)) return;
    onAtualizarStatus(avaria.id, novoStatus, updateData);
    if (isEditing) setIsEditing(false);
  };

  const somenteLeitura = !(isEditing || avaria.status_cobranca === 'Pendente') && !isEditingInfo;
  const dataAvariaFmt = new Date(dataAvaria).toLocaleDateString('pt-BR');

  return (
    <>
      {/* === Modal === */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
        <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
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
                {isEditingInfo ? (
                  <CampoMotorista
                    onSelect={(motorista) => setSelectedMotorista(motorista)}
                    initialValue={selectedMotorista}
                  />
                ) : (
                  <p className="font-medium text-gray-900">{selectedMotorista.nome || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block">Data da Avaria</label>
                {isEditingInfo ? (
                  <input
                    type="date"
                    value={dataAvaria.slice(0, 10)}
                    onChange={(e) => setDataAvaria(e.target.value)}
                    className="border rounded p-1 w-full"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{dataAvariaFmt}</p>
                )}
              </div>
            </div>

            {/* Botão editar motorista/data */}
            {!isEditingInfo ? (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
              >
                <FaEdit /> Editar Motorista / Data
              </button>
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSalvarInfo}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
                >
                  <FaSave /> Salvar
                </button>
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Evidências */}
            <div>
              <h3 className="text-xl font-semibold mt-6 mb-2">📸 Evidências da Avaria</h3>
              {urlsEvidencias.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {urlsEvidencias.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border rounded-lg overflow-hidden hover:opacity-80"
                    >
                      {url.match(/\.(mp4|mov|webm)$/i) ? (
                        <video controls src={url} className="w-full h-32 object-cover" />
                      ) : (
                        <img src={url} alt={`Evidência ${i + 1}`} className="w-full h-32 object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma evidência anexada.</p>
              )}
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

      {/* === LAYOUT DE IMPRESSÃO (verde) === */}
      <div id="printable-area" className="hidden font-sans text-[11px] leading-tight text-gray-900">
        <style>{`
          @page { margin: 12mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .compact th, .compact td { padding: 4px 6px; }
          .nobreak { break-inside: avoid; page-break-inside: avoid; }
          h1, h2 { margin: 0; padding: 0; }
        `}</style>

        {/* Cabeçalho */}
        <header className="mb-2">
          <h1 className="text-center text-[14px] font-extrabold">
            ORÇAMENTO PARA COBRANÇA DE AVARIA
          </h1>
        </header>

        {/* Identificação */}
        <section className="mb-2">
          <div className="grid grid-cols-3 gap-2">
            <div><span className="text-gray-600">Prefixo:</span> <strong>{avaria.prefixo}</strong></div>
            <div><span className="text-gray-600">Motorista:</span> <strong>{selectedMotorista?.nome || 'N/A'}</strong></div>
            <div><span className="text-gray-600">Data Avaria:</span> <strong>{dataAvariaFmt}</strong></div>
            <div className="col-span-3"><span className="text-gray-600">Descrição:</span> <strong>{avaria.descricao || 'Não informada'}</strong></div>
          </div>
        </section>

        {/* Tabelas e Totais */}
        <section className="mb-2 nobreak">
          <h2 className="text-[12px] font-bold mb-1">Peças</h2>
          <table className="w-full border border-gray-300 border-collapse compact">
            <thead><tr className="bg-gray-100"><th>Descrição</th><th>Qtd</th><th>V. Unit.</th><th>Total</th></tr></thead>
            <tbody>
              {pecas.length === 0 ? <tr><td colSpan="4" className="border p-2 text-center">Sem peças</td></tr> :
                pecas.map((i) => (
                  <tr key={i.id}><td className="border">{i.descricao}</td><td className="border text-center">{i.qtd}</td><td className="border text-right">{formatCurrency(i.valorUnitario)}</td><td className="border text-right">{formatCurrency(i.qtd * i.valorUnitario)}</td></tr>
                ))}
            </tbody>
          </table>
        </section>

        <section className="mb-2 nobreak">
          <h2 className="text-[12px] font-bold mb-1">Serviços</h2>
          <table className="w-full border border-gray-300 border-collapse compact">
            <thead><tr className="bg-gray-100"><th>Descrição</th><th>Qtd</th><th>V. Unit.</th><th>Total</th></tr></thead>
            <tbody>
              {servicos.length === 0 ? <tr><td colSpan="4" className="border p-2 text-center">Sem serviços</td></tr> :
                servicos.map((i) => (
                  <tr key={i.id}><td className="border">{i.descricao}</td><td className="border text-center">{i.qtd}</td><td className="border text-right">{formatCurrency(i.valorUnitario)}</td><td className="border text-right">{formatCurrency(i.qtd * i.valorUnitario)}</td></tr>
                ))}
            </tbody>
          </table>
        </section>

        {/* Totais */}
        <section className="mb-2 nobreak">
          <div className="w-full flex justify-end">
            <div className="w-[260px]">
              <div className="flex justify-between border-b py-1"><span>Subtotal Peças</span><span>{formatCurrency(pecas.reduce((a, i) => a + i.qtd * i.valorUnitario, 0))}</span></div>
              <div className="flex justify-between border-b py-1"><span>Subtotal Serviços</span><span>{formatCurrency(servicos.reduce((a, i) => a + i.qtd * i.valorUnitario, 0))}</span></div>
              <div className="flex justify-between border-b py-1"><span>Valor Total</span><span>{formatCurrency(avaria.valor_total_orcamento)}</span></div>
              <div className="flex justify-between py-1 font-bold"><span>Valor Cobrado</span><span>{formatCurrency(parseCurrency(valorCobrado) ?? 0)}</span></div>
              <div className="flex justify-between py-1"><span>Parcelas</span><span>{numParcelas}</span></div>
            </div>
          </div>
        </section>

        {/* Observações */}
        <section className="mb-3 nobreak">
          <span>Observações:</span>
          <div className="border rounded p-2 min-h-[40px]">{observacaoOperacao}</div>
        </section>

        {/* Assinaturas */}
        <section className="mt-4 nobreak">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="h-12" /><div className="border-t pt-1">Gerente de Manutenção</div></div>
            <div><div className="h-12" /><div className="border-t pt-1">Responsável pela Cobrança</div></div>
            <div><div className="h-12" /><div className="border-t pt-1">{selectedMotorista?.nome || 'Motorista'}</div></div>
          </div>
        </section>
      </div>
    </>
  );
}
