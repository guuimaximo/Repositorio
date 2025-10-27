// src/components/CobrancaDetalheModal.jsx
// (Adicionado Motivo de Cancelamento obrigatório)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan, FaUserEdit, FaSpinner } from 'react-icons/fa';
import CampoMotorista from './CampoMotorista';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  // Estados do Modal
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState('');
  const [observacaoOperacao, setObservacaoOperacao] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [needsMotoristaSelection, setNeedsMotoristaSelection] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [debitoMotorista, setDebitoMotorista] = useState(null);
  const [loadingDebito, setLoadingDebito] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState(''); // Estado para o motivo

  // Carrega dados e inicializa campos
  useEffect(() => {
    async function carregarDados() {
      if (!avaria) return;
      setLoadingItens(true);
      setValorCobrado(avaria.valor_cobrado ? String(avaria.valor_cobrado) : '');
      setObservacaoOperacao(avaria.observacao_operacao || '');
      setNumParcelas(avaria.numero_parcelas || 1);
      setMotivoCancelamento(avaria.motivo_cancelamento_cobranca || ''); // Inicializa motivo

      // Lógica Motorista
      if (!avaria.motoristaId) {
        setNeedsMotoristaSelection(true);
        setSelectedMotorista({ chapa: '', nome: '' });
      } else {
        setNeedsMotoristaSelection(false);
        const parts = String(avaria.motoristaId).split(' - ');
        setSelectedMotorista({ chapa: parts[0] || '', nome: parts[1] || avaria.motoristaId });
      }

      // Busca itens orçamento
      const { data, error } = await supabase.from('cobrancas_avarias').select('*').eq('avaria_id', avaria.id);
      if (error) console.error('Erro itens:', error); else setItensOrcamento(data || []);
      setLoadingItens(false);
    }
    carregarDados();
  }, [avaria]);

  // Carrega débito do motorista
  useEffect(() => {
    const motoristaIdAtual = needsMotoristaSelection ?
                             (selectedMotorista.chapa ? `${selectedMotorista.chapa} - ${selectedMotorista.nome}` : null)
                             : avaria.motoristaId;

    async function carregarDebito() {
      if (!motoristaIdAtual) { setDebitoMotorista(null); return; }
      setLoadingDebito(true);
      setDebitoMotorista(null);

      const { data, error } = await supabase
        .from('avarias')
        .select('valor_cobrado')
        .eq('"motoristaId"', motoristaIdAtual)
        .eq('status_cobranca', 'Cobrada')
        .neq('id', avaria.id);

      if (error) console.error("Erro débito:", error);
      else {
        const totalDebito = (data || []).reduce((sum, item) => sum + (item.valor_cobrado || 0), 0);
        setDebitoMotorista(totalDebito);
      }
      setLoadingDebito(false);
    }
    carregarDebito();
  }, [avaria, selectedMotorista, needsMotoristaSelection]);

  if (!avaria) return null;

  // --- Funções Auxiliares ---
  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );
  const handlePrint = () => { window.print(); };

  // --- Função Principal de Salvamento (com Validação de Motivo) ---
  const handleSalvarStatus = (novoStatus) => {
    let valorFinalCobrado = null;
    let motoristaIdFinal = avaria.motoristaId;
    if (needsMotoristaSelection) {
      if (selectedMotorista.chapa || selectedMotorista.nome) {
         motoristaIdFinal = [selectedMotorista.chapa, selectedMotorista.nome].filter(Boolean).join(' - ');
      } else {
         motoristaIdFinal = null;
      }
    }

    // Validações
    if (novoStatus === 'Cobrada') {
        if (!motoristaIdFinal) { alert('Erro: Selecione um motorista.'); return; }
        const valorNumerico = parseFloat(String(valorCobrado).replace(',', '.'));
        if (isNaN(valorNumerico) || valorNumerico < 0) { alert('Valor cobrado inválido.'); return; }
        valorFinalCobrado = valorNumerico;
        const parcelasInt = parseInt(numParcelas, 10);
        if (isNaN(parcelasInt) || parcelasInt <= 0) { alert('Número de parcelas inválido.'); return; }
    }
    // --- VALIDAÇÃO DO MOTIVO (OBRIGATÓRIO PARA CANCELAR) ---
    else if (novoStatus === 'Cancelada') {
        if (!motivoCancelamento.trim()) {
            alert('Erro: É obrigatório informar o motivo do cancelamento.');
            // Tenta focar no campo de motivo para facilitar
            document.getElementById('motivoCancelamento')?.focus();
            return;
        }
    }
    // --- FIM VALIDAÇÃO MOTIVO ---

    // Monta o objeto de dados
    const updateData = {
        status_cobranca: novoStatus,
        observacao_operacao: observacaoOperacao.trim() || null,
        numero_parcelas: novoStatus === 'Cobrada' ? parseInt(numParcelas, 10) : null,
        valor_cobrado: valorFinalCobrado,
        "motoristaId": motoristaIdFinal,
        motivo_cancelamento_cobranca: novoStatus === 'Cancelada' ? motivoCancelamento.trim() : null // Salva motivo se cancelando
    };

    // Confirmação
    if (!window.confirm(`Confirma marcar esta cobrança como ${novoStatus.toLowerCase()}?`)) return;

    onAtualizarStatus(avaria.id, novoStatus, updateData); // Chama a função do pai
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
          <div className="border-t pt-4 mt-4 no-print space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Detalhes da Operação de Cobrança</h3>
            {/* Seleção Motorista (Condicional) */}
            {needsMotoristaSelection && ( <div className="p-3 bg-yellow-50 ..."> ... </div> )}
            {/* Débito Acumulado */}
            {(avaria.motoristaId || selectedMotorista.chapa) && ( <div> ... </div> )}
            {/* Observação Operação */}
            <div>
              <label htmlFor="observacaoOperacao" className="...">Observações da Operação (Opcional)</label>
              <textarea id="observacaoOperacao" name="observacaoOperacao" rows="3" className="..."
                value={observacaoOperacao} onChange={(e) => setObservacaoOperacao(e.target.value)}
                disabled={avaria.status_cobranca !== 'Pendente'}
              ></textarea>
            </div>
            {/* --- CAMPO MOTIVO CANCELAMENTO --- */}
            <div>
              <label htmlFor="motivoCancelamento" className="block text-sm font-medium text-gray-700 mb-1">
                Motivo do Cancelamento <span className="text-red-500">(Obrigatório se cancelar)</span>
              </label>
              <textarea
                id="motivoCancelamento"
                name="motivoCancelamento"
                rows="3"
                className={`w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!motivoCancelamento.trim() && avaria.status_cobranca === 'Pendente' ? 'border-yellow-400' : 'border-gray-300'}`} // Destaca se vazio
                placeholder="Descreva o motivo pelo qual esta cobrança está sendo cancelada..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                disabled={avaria.status_cobranca !== 'Pendente'}
              ></textarea>
            </div>
            {/* --- FIM CAMPO MOTIVO --- */}
            {/* Parcelas e Valor Cobrado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> ... </div>
          </div>

          {/* Seção Evidências */}
          <div className="no-print"> ... </div>
          {/* Seção Assinatura */}
          <div className="hidden print:block ..."> ... </div>
        </div>

        {/* Rodapé Modal */}
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
             ) : ( /* Mostra status */ )}
          </div>
        </div>
      </div>
    </div>
  );
}
