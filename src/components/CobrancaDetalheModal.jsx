// src/components/CobrancaDetalheModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan } from 'react-icons/fa';

// Componente Modal para Detalhes da Cobrança
export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
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
        .eq('avaria_id', avaria.id);
      
      if (error) console.error('Erro ao buscar itens do orçamento:', error);
      else setItensOrcamento(data || []);
      setLoadingItens(false);
    }
    carregarItens();
  }, [avaria]);

  if (!avaria) return null;

  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');

  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  const handlePrint = () => {
    window.print(); // Dispara a impressão do navegador
  };

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:bg-transparent print:p-0 print:items-start print:justify-start">
      {/* Conteúdo do Modal */}
      {/* Adicionamos 'printable-area' para controle de impressão */}
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col printable-area print:shadow-none print:max-h-full">
        
        {/* Cabeçalho do Modal (não imprime) */}
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h2 className="text-2xl font-bold text-gray-800">Detalhes da Cobrança de Avaria</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={20} />
          </button>
        </div>

         {/* Cabeçalho para Impressão (só imprime) */}
         <div className="hidden print:block p-6 border-b text-center">
            <h1 className="text-3xl font-bold">Orçamento de Reparo - Avaria</h1>
            <p className="text-sm text-gray-600">Documento gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
         </div>

        {/* Corpo do Modal (com scroll, mas sem scroll na impressão) */}
        <div className="p-6 space-y-6 overflow-y-auto print:overflow-visible">
          
          {/* Seção 1: Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prefixo</label>
              <p className="text-lg text-gray-800">{avaria.prefixo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Motorista</label>
              <p className="text-lg text-gray-800">{avaria.motoristaId || 'N/A'}</p> 
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data da Avaria</label>
              <p className="text-lg text-gray-800">
                {new Date(avaria.dataAvaria).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tipo de Ocorrência</label>
              <p className="text-lg text-gray-800">{avaria.tipoOcorrencia}</p>
            </div>
             <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Descrição do Relato</label>
              <p className="text-gray-800 bg-gray-50 p-2 rounded border text-sm">{avaria.descricao || 'Sem descrição.'}</p>
            </div>
          </div>

          {/* Seção 2: Orçamento */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Detalhamento do Orçamento</h3>
            {loadingItens ? (<p>Carregando orçamento...</p>) : (
              <div className="space-y-3">
                {/* Tabela de Peças */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Peças</h4>
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">Item</th>
                        <th className="border p-2 text-right">Qtd</th>
                        <th className="border p-2 text-right">Vl. Unit.</th>
                        <th className="border p-2 text-right">Vl. Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecas.length > 0 ? pecas.map(item => (
                        <tr key={item.id}>
                          <td className="border p-2">{item.descricao}</td>
                          <td className="border p-2 text-right">{item.qtd}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency(item.qtd * item.valorUnitario)}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhuma peça</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Tabela de Serviços */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 mt-3">Mão de Obra / Serviços</h4>
                   <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">Serviço</th>
                        <th className="border p-2 text-right">Qtd/Horas</th>
                        <th className="border p-2 text-right">Vl. Unit.</th>
                        <th className="border p-2 text-right">Vl. Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicos.length > 0 ? servicos.map(item => (
                         <tr key={item.id}>
                          <td className="border p-2">{item.descricao}</td>
                          <td className="border p-2 text-right">{item.qtd}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency(item.qtd * item.valorUnitario)}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhum serviço</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Total */}
                <div className="text-right text-2xl font-bold mt-4 pt-3 border-t">
                  Valor Total: {formatCurrency(avaria.valor_total_orcamento)}
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Evidências (não imprime) */}
          <div className="no-print">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Evidências</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(avaria.urls_evidencias || []).map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noopener noreferrer" 
                   className="border rounded-lg overflow-hidden hover:opacity-80">
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

          {/* Seção Assinatura (só imprime) */}
          <div className="hidden print:block pt-16 mt-10">
              <div className="w-64 border-t border-black mx-auto text-center text-sm pt-1">
                  Assinatura do Responsável
              </div>
          </div>

        </div>

        {/* Rodapé do Modal (Ações - não imprime) */}
        <div className="flex justify-between items-center gap-3 p-4 bg-gray-50 border-t no-print">
          <div>
            <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
                <FaPrint />
                Imprimir Orçamento
            </button>
          </div>
          <div className="flex gap-3">
            <button
                onClick={() => onAtualizarStatus(avaria.id, 'Cancelada')}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
                <FaBan />
                Cancelar Cobrança
            </button>
            <button
                onClick={() => onAtualizarStatus(avaria.id, 'Cobrada')}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
                <FaCheck />
                Marcar como Cobrada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
