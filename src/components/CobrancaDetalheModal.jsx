// src/components/CobrancaDetalheModal.jsx
// (Com console.logs e verificação de nomes de coluna)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan, FaUserEdit, FaSpinner } from 'react-icons/fa';
import CampoMotorista from './CampoMotorista';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  // ... (outros estados: valorCobrado, observacaoOperacao, numParcelas, etc.)

  useEffect(() => {
    async function carregarItens() {
      if (!avaria) return;
      setLoadingItens(true);
      console.log(`Buscando itens para avaria_id: ${avaria.id}`); // Debug 1

      const { data, error } = await supabase
        .from('cobrancas_avarias')
        // Seleciona explicitamente as colunas necessárias
        .select('id, descricao, qtd, "valorUnitario", tipo') 
        .eq('avaria_id', avaria.id);

      if (error) {
        console.error('Erro ao buscar itens do orçamento:', error);
        alert(`Erro ao carregar detalhes do orçamento: ${error.message}`)
        setItensOrcamento([]); // Define como vazio em caso de erro
      } else {
        console.log("Itens do orçamento recebidos:", data); // Debug 2
        setItensOrcamento(data || []);
      }
      setLoadingItens(false);
    }
    // ... (outra lógica do useEffect: carregarDados, inicializar campos)
    carregarItens(); // Certifique-se que carregarItens é chamado
  }, [avaria]);

   // ... (useEffect para carregar débito)

  if (!avaria) return null;

  // Filtra usando a coluna 'tipo'
  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  console.log("Peças filtradas:", pecas);       // Debug 3
  console.log("Serviços filtrados:", servicos); // Debug 4

  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );
  const handlePrint = () => { window.print(); };
  const handleSalvarStatus = (novoStatus) => { /* ... (lógica de salvar igual) ... */ };

  return (
    <div className="fixed inset-0 ..."> {/* Overlay */}
      <div className="bg-white rounded-lg ... printable-area ..."> {/* Conteúdo */}
        {/* ... (Cabeçalho Modal) ... */}
        {/* ... (Cabeçalho Impressão) ... */}

        <div className="p-6 space-y-6 overflow-y-auto print:overflow-visible">
          {/* ... (Seção 1: Identificação) ... */}

          {/* Seção 2: Orçamento */}
          <div>
            <h3 className="text-xl font-semibold ...">Detalhamento do Orçamento</h3>
            {loadingItens ? (<p>Carregando orçamento...</p>) : (
              <div className="space-y-3">
                {/* Tabela de Peças */}
                <div>
                  <h4 className="font-semibold ...">Peças</h4>
                  <table className="min-w-full border text-sm">
                    <thead> ... </thead>
                    <tbody>
                      {pecas.length > 0 ? pecas.map(item => (
                        <tr key={item.id}>
                          {/* Verifica se as propriedades existem */}
                          <td className="border p-2">{item.descricao || 'N/A'}</td>
                          <td className="border p-2 text-right">{item.qtd || 0}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhuma peça</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Tabela de Serviços */}
                <div>
                  <h4 className="font-semibold ...">Mão de Obra / Serviços</h4>
                   <table className="min-w-full border text-sm">
                     <thead> ... </thead>
                     <tbody>
                      {servicos.length > 0 ? servicos.map(item => (
                         <tr key={item.id}>
                          {/* Verifica se as propriedades existem */}
                          <td className="border p-2">{item.descricao || 'N/A'}</td>
                          <td className="border p-2 text-right">{item.qtd || 0}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhum serviço</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Total */}
                <div className="text-right text-2xl font-bold ...">
                  Valor Total Orçado: {formatCurrency(avaria.valor_total_orcamento)}
                </div>
              </div>
            )}
          </div>

          {/* ... (Seção 3: Detalhes Operação) ... */}
          {/* ... (Seção 4: Evidências) ... */}
          {/* ... (Seção 5: Assinatura) ... */}
        </div>
        {/* ... (Rodapé Modal) ... */}
      </div>
    </div>
  );
}
