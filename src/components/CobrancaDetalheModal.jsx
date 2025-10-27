// src/components/CobrancaDetalheModal.jsx
// (Adicionado console.log para depurar itens do orçamento)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan } from 'react-icons/fa';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);

  useEffect(() => {
    async function carregarItens() {
      if (!avaria) return;
      setLoadingItens(true);
      console.log(`Buscando itens para avaria_id: ${avaria.id}`); // Debug 1
      
      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('*') // Garante que busca todas as colunas
        .eq('avaria_id', avaria.id); 
      
      // --- DEBUG ADICIONADO ---
      if (error) {
        console.error('Erro ao buscar itens do orçamento:', error);
        alert(`Erro ao carregar detalhes do orçamento: ${error.message}`)
      } else {
        console.log("Itens do orçamento recebidos:", data); // Debug 2
        setItensOrcamento(data || []);
      }
      // --- FIM DEBUG ---

      setLoadingItens(false);
    }
    carregarItens();
  }, [avaria]);

  if (!avaria) return null;

  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  
  // --- DEBUG ADICIONADO ---
  console.log("Peças filtradas:", pecas);       // Debug 3
  console.log("Serviços filtrados:", servicos); // Debug 4
  // --- FIM DEBUG ---

  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { /* ... */ });
  const handlePrint = () => { window.print(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:bg-transparent print:p-0 print:items-start print:justify-start">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col printable-area print:shadow-none print:max-h-full">
        {/* ... (Cabeçalho do Modal - sem alteração) ... */}
        {/* ... (Cabeçalho para Impressão - sem alteração) ... */}

        <div className="p-6 space-y-6 overflow-y-auto print:overflow-visible">
          {/* ... (Seção 1: Identificação - sem alteração) ... */}

          {/* Seção 2: Orçamento */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Detalhamento do Orçamento</h3>
            {loadingItens ? (<p>Carregando orçamento...</p>) : (
              <div className="space-y-3">
                {/* Tabela de Peças */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Peças</h4>
                  <table className="min-w-full border text-sm">
                    {/* ... (thead - sem alteração) ... */}
                    <tbody>
                      {/* --- VERIFICAÇÃO LÓGICA --- */}
                      {pecas.length > 0 ? pecas.map(item => (
                        <tr key={item.id}>
                          <td className="border p-2">{item.descricao}</td>
                          <td className="border p-2 text-right">{item.qtd}</td>
                          {/* Garante que acessa a coluna camelCase */}
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td> 
                          <td className="border p-2 text-right font-medium">{formatCurrency(item.qtd * item.valorUnitario)}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhuma peça</td></tr>}
                      {/* --- FIM VERIFICAÇÃO --- */}
                    </tbody>
                  </table>
                </div>
                {/* Tabela de Serviços */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 mt-3">Mão de Obra / Serviços</h4>
                   <table className="min-w-full border text-sm">
                    {/* ... (thead - sem alteração) ... */}
                    <tbody>
                      {/* --- VERIFICAÇÃO LÓGICA --- */}
                      {servicos.length > 0 ? servicos.map(item => (
                         <tr key={item.id}>
                          <td className="border p-2">{item.descricao}</td>
                          <td className="border p-2 text-right">{item.qtd}</td>
                          {/* Garante que acessa a coluna camelCase */}
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency(item.qtd * item.valorUnitario)}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhum serviço</td></tr>}
                       {/* --- FIM VERIFICAÇÃO --- */}
                    </tbody>
                  </table>
                </div>
                {/* Total (sem alteração) */}
                {/* ... */}
              </div>
            )}
          </div>

          {/* ... (Seção 3: Evidências - sem alteração) ... */}
          {/* ... (Seção Assinatura - sem alteração) ... */}
        </div>

        {/* ... (Rodapé do Modal - sem alteração por enquanto) ... */}
      </div>
    </div>
  );
}
