// src/components/CobrancaDetalheModal.jsx
// (Garante exibição de todos os dados salvos, mesmo após finalizado)

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
  const [motivoCancelamento, setMotivoCancelamento] = useState(''); // Estado para o motivo
  const [needsMotoristaSelection, setNeedsMotoristaSelection] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState({ chapa: '', nome: '' });
  const [debitoMotorista, setDebitoMotorista] = useState(null);
  const [loadingDebito, setLoadingDebito] = useState(false);


  // Carrega dados e inicializa campos
  useEffect(() => {
    async function carregarDados() {
      if (!avaria) return;
      setLoadingItens(true);
      // Sempre inicializa com os valores da 'avaria' recebida
      setValorCobrado(avaria.valor_cobrado ? String(avaria.valor_cobrado) : '');
      setObservacaoOperacao(avaria.observacao_operacao || '');
      setNumParcelas(avaria.numero_parcelas || 1);
      setMotivoCancelamento(avaria.motivo_cancelamento_cobranca || '');

      // Lógica Motorista (condicional)
      if (!avaria.motoristaId && avaria.status_cobranca === 'Pendente') { // Só permite selecionar se Pendente
        setNeedsMotoristaSelection(true);
        setSelectedMotorista({ chapa: '', nome: '' });
      } else {
        setNeedsMotoristaSelection(false);
        if (avaria.motoristaId){
            const parts = String(avaria.motoristaId).split(' - ');
            setSelectedMotorista({ chapa: parts[0] || '', nome: parts[1] || avaria.motoristaId });
        } else {
             setSelectedMotorista({ chapa: '', nome: '' });
        }
      }

      // Busca itens orçamento
      console.log(`Buscando itens para avaria_id: ${avaria.id}`);
      const { data, error } = await supabase
        .from('cobrancas_avarias')
        .select('id, descricao, qtd, "valorUnitario", tipo')
        .eq('avaria_id', avaria.id);

      if (error) {
        console.error('Erro ao buscar itens do orçamento:', error);
        setItensOrcamento([]);
      } else {
        console.log("Itens do orçamento recebidos:", data);
        setItensOrcamento(data || []);
      }
      setLoadingItens(false);
    }
    carregarDados();
  }, [avaria]); // Dependência apenas de 'avaria'

   // Carrega débito do motorista (sem alteração)
   useEffect(() => { /* ... (lógica débito) ... */ }, [avaria, selectedMotorista, needsMotoristaSelection]);

  if (!avaria) return null;

  // --- Funções Auxiliares (sem alteração) ---
  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );
  const handlePrint = () => { window.print(); };

  // --- Função Principal de Salvamento (sem alteração na lógica interna) ---
  const handleSalvarStatus = (novoStatus) => {
      // ... (toda a lógica de validação e montagem do updateData igual) ...
      let valorFinalCobrado = null;
      let motoristaIdFinal = avaria.motoristaId;
      if (needsMotoristaSelection) { /* ... */ }

      if (novoStatus === 'Cobrada') { /* ... (validações) ... */ }
      else if (novoStatus === 'Cancelada') {
          if (!motivoCancelamento.trim()) { alert('Motivo obrigatório.'); return; }
      }

      const updateData = { /* ... (monta objeto igual) ... */ };
      if (!window.confirm(`Confirma marcar como ${novoStatus.toLowerCase()}?`)) return;
      onAtualizarStatus(avaria.id, novoStatus, updateData);
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 print:bg-transparent print:p-0 print:items-start print:justify-start">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
              <div><label className="text-sm...">Prefixo</label><p className="text-lg...">{avaria.prefixo}</p></div>
              <div><label className="text-sm...">Motorista</label><p className="text-lg...">{avaria.motoristaId || 'N/A'}</p></div>
              <div><label className="text-sm...">Data da Avaria</label><p className="text-lg...">{new Date(avaria.dataAvaria).toLocaleString('pt-BR')}</p></div>
              <div><label className="text-sm...">Tipo Ocorrência</label><p className="text-lg...">{avaria.tipoOcorrencia}</p></div>
              <div className="md:col-span-2"><label className="text-sm...">Descrição</label><p className="text-gray-800 bg-gray-50...">{avaria.descricao || 'Sem descrição.'}</p></div>
          </div>
          {/* Seção 2: Orçamento */}
          <div>
            <h3 className="text-xl font-semibold ...">Detalhamento do Orçamento</h3>
            {loadingItens ? (<p>Carregando...</p>) : (
              <div className="space-y-3">
                {/* Tabela Peças */}
                <div>
                  <h4 className="font-semibold ...">Peças</h4>
                  <table className="min-w-full border text-sm">
                    <thead>...</thead>
                    <tbody>
                      {pecas.length > 0 ? pecas.map(item => (
                        <tr key={item.id}>
                          <td className="border p-2">{item.descricao || 'N/A'}</td>
                          <td className="border p-2 text-right">{item.qtd || 0}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhuma peça</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Tabela Serviços */}
                <div>
                  <h4 className="font-semibold ...">Mão de Obra / Serviços</h4>
                   <table className="min-w-full border text-sm">
                    <thead>...</thead>
                    <tbody>
                      {servicos.length > 0 ? servicos.map(item => (
                         <tr key={item.id}>
                          <td className="border p-2">{item.descricao || 'N/A'}</td>
                          <td className="border p-2 text-right">{item.qtd || 0}</td>
                          <td className="border p-2 text-right">{formatCurrency(item.valorUnitario)}</td>
                          <td className="border p-2 text-right font-medium">{formatCurrency((item.qtd || 0) * (item.valorUnitario || 0))}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="border p-2 text-center text-gray-500">Nenhum serviço</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* Total Orçado */}
                <div className="text-right text-xl font-bold mt-2 pt-2 border-t">
                  Valor Total Orçado: {formatCurrency(avaria.valor_total_orcamento)}
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Detalhes da Operação */}
          <div className="border-t pt-4 mt-4 no-print space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Detalhes da Operação de Cobrança</h3>
            {/* Seleção Motorista (Condicional E Desabilitado se não pendente) */}
            {needsMotoristaSelection && (
                 <div className="p-3 bg-yellow-50 ...">
                    <h4 className="text-sm ..."> <FaUserEdit /> Atribuir Motorista Responsável</h4>
                    {/* O componente CampoMotorista não tem prop 'disabled', mas o aviso informa */}
                    <CampoMotorista value={selectedMotorista} onChange={setSelectedMotorista} label="" />
                    <p className="text-xs text-yellow-700 mt-1">
                        {avaria.status_cobranca === 'Pendente' ?
                         "A avaria não pode ser marcada como 'Cobrada' sem um motorista." :
                         "Seleção de motorista não disponível após finalização."}
                    </p>
                 </div>
            )}
            {/* Débito Acumulado */}
            {(avaria.motoristaId || selectedMotorista.chapa) && ( <div> ... </div> )}
            {/* Observação Operação (Exibe sempre, edita se pendente) */}
            <div>
              <label htmlFor="observacaoOperacao" className="...">Observações da Operação</label>
              <textarea id="observacaoOperacao" name="observacaoOperacao" rows="3" className="..."
                value={observacaoOperacao} onChange={(e) => setObservacaoOperacao(e.target.value)}
                readOnly={avaria.status_cobranca !== 'Pendente'} // Usa readOnly para mostrar o valor
                placeholder={avaria.status_cobranca !== 'Pendente' && !observacaoOperacao ? 'Nenhuma observação registrada.' : 'Detalhes sobre a negociação...'}
              ></textarea>
            </div>
            {/* Motivo Cancelamento (Exibe sempre, edita se pendente) */}
            <div>
              <label htmlFor="motivoCancelamento" className="...">
                 Motivo do Cancelamento
                 {avaria.status_cobranca === 'Pendente' && <span className="text-red-500"> (Obrigatório se cancelar)</span>}
              </label>
              <textarea
                id="motivoCancelamento" name="motivoCancelamento" rows="3"
                className={`w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!motivoCancelamento.trim() && avaria.status_cobranca === 'Pendente' ? 'border-yellow-400' : 'border-gray-300'}`}
                value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)}
                readOnly={avaria.status_cobranca !== 'Pendente'} // Usa readOnly
                placeholder={avaria.status_cobranca !== 'Pendente' && !motivoCancelamento ? 'Não cancelado ou sem motivo registrado.' : 'Descreva o motivo...'}
              ></textarea>
            </div>
            {/* Parcelas e Valor Cobrado (Exibe sempre, edita se pendente) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div> {/* Parcelas */}
                  <label htmlFor="numParcelas" className="...">Nº de Parcelas</label>
                  <input type="number" id="numParcelas" name="numParcelas" min="1" step="1" className="..."
                    value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)}
                    readOnly={avaria.status_cobranca !== 'Pendente'} // Usa readOnly
                  />
               </div>
               <div> {/* Valor Cobrado */}
                  <label htmlFor="valorCobrado" className="...">Valor Efetivamente Cobrado (R$)</label>
                  <input type="text" id="valorCobrado" name="valorCobrado" className="..."
                     placeholder={avaria.status_cobranca !== 'Pendente' ? '-' : 'Ex: 210,00'}
                     value={valorCobrado} onChange={(e) => setValorCobrado(e.target.value)}
                     readOnly={avaria.status_cobranca !== 'Pendente'} // Usa readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor Orçado Original: {formatCurrency(avaria.valor_total_orcamento)}
                  </p>
               </div>
            </div>
          </div>

          {/* Seção Evidências */}
          <div className="no-print"> ... </div>
          {/* Seção Assinatura */}
          <div className="hidden print:block ..."> ... </div>
        </div>

        {/* Rodapé Modal (Botões Condicionais) */}
        <div className="flex justify-between items-center ..."> ... </div>
      </div>
    </div>
  );
}
