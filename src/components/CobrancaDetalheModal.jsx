// src/components/CobrancaDetalheModal.jsx
// Versão: Tratativa + edição de Motorista/Data/Observações antes da cobrança + Nº Avaria
// OBS: Certifique-se de criar o bucket "tratativas-avarias" no Supabase Storage (público).

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

export default function CobrancaDetalheModal({
  avaria,
  onClose,
  onAtualizarStatus,
  canDelete,   // NOVO
  onExcluir,   // NOVO
}) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [urlsEvidencias, setUrlsEvidencias] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState('');
  const [observacaoOperacao, setObservacaoOperacao] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [dataAvaria, setDataAvaria] = useState('');
  const [isEditing, setIsEditing] = useState(false); // edição da cobrança (quando já Cobrada)
  const [tratativaTexto, setTratativaTexto] = useState('');
  const [salvandoInfo, setSalvandoInfo] = useState(false); // loading do salvar informações

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

      // Motorista vindo da avaria (fallback)
      if (avaria.motoristaId) {
        const parts = String(avaria.motoristaId).split(' - ');
        setSelectedMotorista({
          chapa: parts[0] || '',
          nome: parts[1] || parts[0] || '',
        });
      } else {
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
      } else {
        setUrlsEvidencias([]);
      }

      // Tratativa (pode ter vindo como array ou string)
      if (avaria.urls_tratativa) {
        if (Array.isArray(avaria.urls_tratativa)) {
          setTratativaTexto(avaria.urls_tratativa.join('\n'));
        } else if (typeof avaria.urls_tratativa === 'string') {
          setTratativaTexto(
            avaria.urls_tratativa
              .split(/\n|,/)
              .map((u) => u.trim())
              .filter(Boolean)
              .join('\n')
          );
        }
      } else {
        setTratativaTexto('');
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

  const motoristaAtual = () => {
    if (selectedMotorista && selectedMotorista.chapa) return selectedMotorista;
    if (avaria.motoristaId) {
      const parts = String(avaria.motoristaId).split(' - ');
      return { chapa: parts[0] || '', nome: parts[1] || parts[0] || '' };
    }
    return { chapa: '', nome: '' };
  };

  const podeEditarBasico = avaria.status_cobranca === 'Pendente';
  const somenteLeituraOperacao = avaria.status_cobranca !== 'Pendente' && !isEditing;
  const dataAvariaFmt = new Date(dataAvaria).toLocaleDateString('pt-BR');

  // --- UPLOAD DE ARQUIVOS DE TRATATIVA (imagens / PDFs etc) ---
  const handleUploadTratativaFiles = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const bucketName = 'tratativas-avarias'; // bucket novo no Supabase
    const novosLinks = [];

    for (const file of files) {
      try {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
        const path = `avaria-${avaria.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(path, file);

        if (uploadError) {
          console.error(uploadError);
          alert(`Erro ao enviar arquivo de tratativa: ${uploadError.message}`);
          continue;
        }

        const { data: publicData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(path);

        const publicUrl = publicData?.publicUrl;
        if (publicUrl) {
          novosLinks.push(publicUrl);
        }
      } catch (err) {
        console.error(err);
        alert('Erro inesperado ao enviar arquivo de tratativa.');
      }
    }

    if (novosLinks.length > 0) {
      setTratativaTexto((prev) => {
        const base = prev && prev.trim().length > 0 ? prev.trim() + '\n' : '';
        return base + novosLinks.join('\n');
      });
    }

    // Reseta o input para poder subir o mesmo arquivo novamente se precisar
    event.target.value = '';
  };

  // --- SALVAR INFORMAÇÕES BÁSICAS (antes da cobrança) ---
  const handleSalvarInfo = async () => {
    const m = motoristaAtual();

    if (!m.chapa) {
      alert('⚠️ Selecione o motorista antes de salvar.');
      return;
    }

    const updateData = {
      motoristaId: `${m.chapa} - ${m.nome}`,
      dataAvaria,
      observacao_operacao: observacaoOperacao,
    };

    try {
      setSalvandoInfo(true);

      if (onAtualizarStatus) {
        // Usa o mesmo fluxo do pai, mantendo o status atual (normalmente "Pendente")
        await onAtualizarStatus(
          avaria.id,
          avaria.status_cobranca || 'Pendente',
          updateData
        );
      } else {
        // Fallback: salva direto no Supabase se não tiver callback do pai
        const { error } = await supabase
          .from('avarias')
          .update(updateData)
          .eq('id', avaria.id);

        if (error) throw error;
      }

      alert('✅ Informações básicas salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar informações: ' + err.message);
    } finally {
      setSalvandoInfo(false);
    }
  };

  // --- SALVAR STATUS ---
  const handleSalvarStatus = (novoStatus) => {
    const valorNumerico = parseCurrency(valorCobrado);

    const urlsTratativaArray = tratativaTexto
      .split(/\n|,/)
      .map((u) => u.trim())
      .filter(Boolean);

    const m = motoristaAtual();

    const updateData = {
      status_cobranca: novoStatus,
      valor_cobrado: valorNumerico,
      numero_parcelas: Number(numParcelas) || 1,
      observacao_operacao: observacaoOperacao,
      motivo_cancelamento_cobranca: novoStatus === 'Cancelada' ? motivoCancelamento : null,
      data_cobranca: new Date(),
      urls_tratativa: urlsTratativaArray.length > 0 ? urlsTratativaArray : null,
      // NOVO: garantir que data da avaria também seja atualizada na edição da cobrança
      dataAvaria,
    };

    if (m.chapa) {
      updateData.motoristaId = `${m.chapa} - ${m.nome}`;
    }

    if (!window.confirm(`Confirma marcar como ${novoStatus.toLowerCase()}?`)) return;

    onAtualizarStatus(avaria.id, novoStatus, updateData);
    if (isEditing) setIsEditing(false);
  };

  // --- IMPRESSÃO ---
  const handlePrint = () => {
    const baseUrl = window.location.origin;
    let printContents = document.getElementById('printable-area').innerHTML;
    printContents = printContents.replace(
      /src="(\/[^\"]+)"/g,
      (_m, path) => `src="${baseUrl}${path}"`
    );
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
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

  // Lista de URLs de tratativa (para exibir thumbnails)
  const tratativaUrls = tratativaTexto
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block">Prefixo</label>
                <p className="font-medium text-gray-900">{avaria.prefixo}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block">Nº Avaria</label>
                <p className="font-medium text-gray-900">
                  {avaria.numero_da_avaria || '-'}
                </p>
              </div>
              <div className="md:col-span-2">
                <CampoMotorista
                  label="Motorista"
                  value={selectedMotorista}
                  onChange={setSelectedMotorista}
                  // NOVO: permitir edição também quando isEditing === true (cobrança já cobrada)
                  disabled={!(podeEditarBasico || isEditing)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block">Data da Avaria</label>
                <input
                  type="date"
                  value={dataAvaria.slice(0, 10)}
                  onChange={(e) => setDataAvaria(e.target.value)}
                  className="border rounded p-1 w-full disabled:bg-gray-100"
                  // NOVO: permitir edição também quando isEditing === true
                  disabled={!(podeEditarBasico || isEditing)}
                />
              </div>
            </div>

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

            {/* Operação + Tratativa */}
            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-2">🧮 Detalhes da Operação</h3>
              <label className="block text-sm font-medium">Observações</label>
              <textarea
                value={observacaoOperacao}
                onChange={(e) => setObservacaoOperacao(e.target.value)}
                readOnly={somenteLeituraOperacao}
                className="w-full border rounded-md p-2 mb-3"
              />
              <label className="block text-sm font-medium">Motivo do Cancelamento</label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                readOnly={somenteLeituraOperacao}
                className="w-full border rounded-md p-2 mb-3"
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(Number(e.target.value))}
                    readOnly={somenteLeituraOperacao}
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
                    readOnly={somenteLeituraOperacao}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-1">📎 Tratativa (links / anexos)</h3>
                <p className="text-xs text-gray-500 mb-1">
                  Faça upload dos arquivos da tratativa (imagens, PDFs, etc).  
                  Eles serão salvos no bucket <strong>tratativas-avarias</strong> e listados abaixo.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,video/*"
                  onChange={handleUploadTratativaFiles}
                  disabled={somenteLeituraOperacao}
                  className="mb-3 block text-sm"
                />
                <p className="text-xs text-gray-500 mb-1">
                  Você também pode colar manualmente links (Drive, etc.).  
                  Use uma linha para cada link.
                </p>
                <textarea
                  value={tratativaTexto}
                  onChange={(e) => setTratativaTexto(e.target.value)}
                  readOnly={somenteLeituraOperacao}
                  className="w-full border rounded-md p-2 h-24"
                  placeholder="https://drive.google.com/...\nhttps://minha-tratativa.com/..."
                />

                {tratativaUrls.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold mb-1">Anexos da tratativa</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {tratativaUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border rounded-lg overflow-hidden hover:opacity-80"
                        >
                          {url.match(/\.(mp4|mov|webm)$/i) ? (
                            <video controls src={url} className="w-full h-24 object-cover" />
                          ) : url.match(/\.(jpe?g|png|gif|webp|bmp)$/i) ? (
                            <img
                              src={url}
                              alt={`Tratativa ${i + 1}`}
                              className="w-full h-24 object-cover"
                            />
                          ) : url.match(/\.pdf$/i) ? (
                            <div className="w-full h-24 flex flex-col items-center justify-center text-xs p-2">
                              <span className="text-2xl">📄</span>
                              <span className="mt-1">PDF</span>
                            </div>
                          ) : (
                            <div className="w-full h-24 flex flex-col items-center justify-center text-xs p-2">
                              <span className="text-2xl">📎</span>
                              <span className="mt-1">Arquivo</span>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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

            <div className="flex gap-3 flex-wrap justify-end">
              {podeEditarBasico && (
                <button
                  onClick={handleSalvarInfo}
                  disabled={salvandoInfo}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 text-white ${
                    salvandoInfo
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {salvandoInfo ? '⏳ Salvando...' : '💾 Salvar Informações'}
                </button>
              )}

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
                    alert('✏️ Edição liberada. Faça os ajustes (motorista, data, valores) e salve novamente como "Cobrada".');
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

              {/* ===========================
                  NOVO: Botão Excluir Avaria
                  =========================== */}
              {canDelete && typeof onExcluir === 'function' && (
                <button
                  onClick={onExcluir}
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md flex items-center gap-2"
                  title="Excluir avaria (apenas Administrador)"
                >
                  🗑️ Excluir Avaria
                </button>
              )}
              {/* =========================== */}

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
            <div><span className="text-gray-600">Nº Avaria:</span> <strong>{avaria.numero_da_avaria || '-'}</strong></div>
            <div><span className="text-gray-600">Motorista:</span> <strong>{motoristaAtual().nome || 'N/A'}</strong></div>
            <div><span className="text-gray-600">Data Avaria:</span> <strong>{dataAvariaFmt}</strong></div>
            <div className="col-span-3">
              <span className="text-gray-600">Descrição:</span>{' '}
              <strong>{avaria.descricao || 'Não informada'}</strong>
            </div>
          </div>
        </section>

        {/* Peças */}
        <section className="mb-2 nobreak">
          <h2 className="text-[12px] font-bold mb-1">Peças</h2>
          <table className="w-full border border-gray-300 border-collapse compact">
            <thead>
              <tr className="bg-gray-100">
                <th>Descrição</th><th>Qtd</th><th>V. Unit.</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {pecas.length === 0 ? (
                <tr><td colSpan="4" className="border p-2 text-center">Sem peças</td></tr>
              ) : (
                pecas.map((i) => (
                  <tr key={i.id}>
                    <td className="border">{i.descricao}</td>
                    <td className="border text-center">{i.qtd}</td>
                    <td className="border text-right">{formatCurrency(i.valorUnitario)}</td>
                    <td className="border text-right">{formatCurrency(i.qtd * i.valorUnitario)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Serviços */}
        <section className="mb-2 nobreak">
          <h2 className="text-[12px] font-bold mb-1">Serviços</h2>
          <table className="w-full border border-gray-300 border-collapse compact">
            <thead>
              <tr className="bg-gray-100">
                <th>Descrição</th><th>Qtd</th><th>V. Unit.</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {servicos.length === 0 ? (
                <tr><td colSpan="4" className="border p-2 text-center">Sem serviços</td></tr>
              ) : (
                servicos.map((i) => (
                  <tr key={i.id}>
                    <td className="border">{i.descricao}</td>
                    <td className="border text-center">{i.qtd}</td>
                    <td className="border text-right">{formatCurrency(i.valorUnitario)}</td>
                    <td className="border text-right">{formatCurrency(i.qtd * i.valorUnitario)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Totais */}
        <section className="mb-2 nobreak">
          <div className="w-full flex justify-end">
            <div className="w-[260px]">
              <div className="flex justify-between border-b py-1">
                <span>Subtotal Peças</span>
                <span>{formatCurrency(pecas.reduce((a, i) => a + i.qtd * i.valorUnitario, 0))}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span>Subtotal Serviços</span>
                <span>{formatCurrency(servicos.reduce((a, i) => a + i.qtd * i.valorUnitario, 0))}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span>Valor Total</span>
                <span>{formatCurrency(avaria.valor_total_orcamento)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span>Valor Cobrado</span>
                <span>{formatCurrency(parseCurrency(valorCobrado) ?? 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Parcelas</span>
                <span>{numParcelas}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Observações */}
        <section className="mb-2 nobreak">
          <span>Observações:</span>
          <div className="border rounded p-2 min-h-[40px]">{observacaoOperacao}</div>
        </section>

        {/* Tratativa */}
        <section className="mb-3 nobreak">
          <span>Tratativa (links/anexos):</span>
          <div className="border rounded p-2 min-h-[40px]">
            {tratativaUrls.length
              ? tratativaUrls.map((linha, idx) => <div key={idx}>{linha}</div>)
              : '—'}
          </div>
        </section>

        {/* Assinaturas */}
        <section className="mt-4 nobreak">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="h-12" />
              <div className="border-t pt-1">Gerente de Manutenção</div>
            </div>
            <div>
              <div className="h-12" />
              <div className="border-t pt-1">Responsável pela Cobrança</div>
            </div>
            <div>
              <div className="h-12" />
              <div className="border-t pt-1">{motoristaAtual().nome || 'Motorista'}</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
