// src/components/CobrancaDetalheModal.jsx
// (Corrigido erro de sintaxe no rodapé: linha 212)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan, FaUserEdit, FaSpinner } from 'react-icons/fa';
import CampoMotorista from './CampoMotorista';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  // ... (Estados: itensOrcamento, loadingItens, valorCobrado, observacaoOperacao, numParcelas, etc. - sem alteração) ...
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState('');
  const [observacaoOperacao, setObservacaoOperacao] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [needsMotoristaSelection, setNeedsMotoristaSelection] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [debitoMotorista, setDebitoMotorista] = useState(null);
  const [loadingDebito, setLoadingDebito] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Carrega dados (sem alteração)
  useEffect(() => {
    // ... (código igual) ...
  }, [avaria]);

   // Carrega débito (sem alteração)
   useEffect(() => {
    // ... (código igual) ...
   }, [avaria, selectedMotorista, needsMotoristaSelection]);

  if (!avaria) return null;

  // --- Funções Auxiliares (sem alteração) ---
  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
      Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );
  const handlePrint = () => { window.print(); };

  // --- Função Principal de Salvamento (sem alteração) ---
  const handleSalvarStatus = (novoStatus) => {
    // ... (código igual com validações) ...
    let valorFinalCobrado = null;
    let motoristaIdFinal = avaria.motoristaId;
    if (needsMotoristaSelection) { /* ... */ }

    if (novoStatus === 'Cobrada') { /* ... */ }
    else if (novoStatus === 'Cancelada') {
        if (!motivoCancelamento.trim()) { alert('Motivo obrigatório.'); return; }
    }

    const updateData = { /* ... */ };
    if (!window.confirm(`Confirma ${novoStatus.toLowerCase()}?`)) return;
    onAtualizarStatus(avaria.id, novoStatus, updateData);
  }

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:bg-transparent print:p-0 print:items-start print:justify-start">
      {/* Conteúdo Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col printable-area print:shadow-none print:max-h-full">
        {/* Cabeçalho Modal */}
        <div className="flex justify-between items-center p-4 border-b no-print">
           <h2 className="text-2xl font-bold text-gray-800">Detalhes da Cobrança de Avaria</h2>
           <button onClick={onClose} className="text-gray-500 hover:text-gray-800"> <FaTimes size={20} /> </button>
        </div>
        {/* Cabeçalho Impressão */}
        <div className="hidden print:block p-6 border-b text-center"> ... </div>

        {/* Corpo Modal */}
        <div className="p-6 space-y-6 overflow-y-auto print:overflow-visible">
          {/* Seção 1: Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4"> ... </div>
          {/* Seção 2: Orçamento */}
          <div> ... </div>
          {/* Seção 3: Detalhes da Operação (com Motivo Cancelamento) */}
          <div className="border-t pt-4 mt-4 no-print space-y-4"> ... </div>
          {/* Seção Evidências */}
          <div className="no-print"> ... </div>
          {/* Seção Assinatura */}
          <div className="hidden print:block ..."> ... </div>
        </div>

        {/* --- RODAPÉ CORRIGIDO --- */}
        <div className="flex justify-between items-center gap-3 p-4 bg-gray-50 border-t no-print">
          <div> <button onClick={handlePrint} className="..."> <FaPrint /> Imprimir </button> </div>
          <div className="flex gap-3">
             {avaria.status_cobranca === 'Pendente' ? (
                <>
                    <button onClick={() => handleSalvarStatus('Cancelada')} className="..."> <FaBan /> Cancelar Cobrança </button>
                    <button
                       onClick={() => handleSalvarStatus('Cobrada')}
                       disabled={needsMotoristaSelection && !selectedMotorista.chapa && !selectedMotorista.nome}
                       className="..."
                       title={needsMotoristaSelection && !selectedMotorista.chapa && !selectedMotorista.nome ? "Selecione um motorista para cobrar" : ""}
                    > <FaCheck /> Marcar como Cobrada </button>
                </>
             ) : (
                // --- CORREÇÃO AQUI ---
                // Renderiza o span com o status se não for 'Pendente'
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                     avaria.status_cobranca === 'Cobrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                 }`}>
                     Status: {avaria.status_cobranca}
                 </span>
                // --- FIM CORREÇÃO ---
             )}
          </div>
        </div>
        {/* --- FIM RODAPÉ --- */}
      </div>
    </div>
  );
}
