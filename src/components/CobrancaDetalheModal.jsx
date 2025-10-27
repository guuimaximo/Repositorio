// src/components/CobrancaDetalheModal.jsx
// (Adicionado campo 'Valor Cobrado' e lógica de salvamento)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaTimes, FaPrint, FaCheck, FaBan } from 'react-icons/fa';

export default function CobrancaDetalheModal({ avaria, onClose, onAtualizarStatus }) {
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [valorCobrado, setValorCobrado] = useState(''); // Estado para o novo campo

  // Carrega itens e inicializa valorCobrado (se já existir)
  useEffect(() => {
    async function carregarDados() {
      if (!avaria) return;
      setLoadingItens(true);
      // Inicializa o campo com o valor existente ou vazio
      setValorCobrado(avaria.valor_cobrado ? String(avaria.valor_cobrado) : ''); 

      // Busca itens
      const { data, error } = await supabase
        .from('cobrancas_avarias').select('*').eq('avaria_id', avaria.id);
      
      if (error) console.error('Erro ao buscar itens:', error);
      else setItensOrcamento(data || []);
      setLoadingItens(false);
    }
    carregarDados();
  }, [avaria]);

  if (!avaria) return null;

  const pecas = itensOrcamento.filter(item => item.tipo === 'Peca');
  const servicos = itensOrcamento.filter(item => item.tipo === 'Servico');
  const formatCurrency = (value) => (value || 0).toLocaleString(/* ... */);
  const handlePrint = () => { window.print(); };

  // --- FUNÇÃO MODIFICADA ---
  // Agora recebe o novo status E o valor cobrado (se aplicável)
  const handleSalvarStatus = (novoStatus) => {
    let valorFinal = null;
    // Se marcando como 'Cobrada', valida e pega o valor do input
    if (novoStatus === 'Cobrada') {
        const valorNumerico = parseFloat(valorCobrado.replace(',', '.')); // Aceita vírgula ou ponto
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            alert('Por favor, insira um valor cobrado válido (número positivo).');
            return;
        }
        valorFinal = valorNumerico;
    }
    // Chama a função passada pelo pai (CobrancasAvarias.jsx)
    onAtualizarStatus(avaria.id, novoStatus, valorFinal); 
  }
  // --- FIM MODIFICAÇÃO ---


  return (
    <div className="fixed inset-0 z-50 ..."> {/* Overlay */}
      <div className="bg-white rounded-lg ... printable-area ..."> {/* Conteúdo */}
        {/* ... (Cabeçalho Modal) ... */}
        {/* ... (Cabeçalho Impressão) ... */}

        <div className="p-6 space-y-6 overflow-y-auto print:overflow-visible">
          {/* ... (Seção 1: Identificação) ... */}
          {/* ... (Seção 2: Orçamento - Tabelas Peças/Serviços) ... */}
          {/* ... (Total Orçamento Original) ... */}

          {/* --- NOVA SEÇÃO: VALOR COBRADO (Não imprime) --- */}
          <div className="border-t pt-4 mt-4 no-print">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Registro de Cobrança</h3>
             <label htmlFor="valorCobrado" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Efetivamente Cobrado (R$)
             </label>
             <input
                type="text" // Usamos text para facilitar digitação com vírgula/ponto
                id="valorCobrado"
                name="valorCobrado"
                className="w-full md:w-1/3 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ex: 650,00"
                value={valorCobrado}
                onChange={(e) => setValorCobrado(e.target.value)}
                // Desabilita se já foi cobrado ou cancelado
                disabled={avaria.status_cobranca === 'Cobrada' || avaria.status_cobranca === 'Cancelada'} 
             />
             {/* Mostra o valor original para comparação */}
             <p className="text-sm text-gray-500 mt-1">
                Valor Orçado Original: {formatCurrency(avaria.valor_total_orcamento)}
             </p>
          </div>
          {/* --- FIM NOVA SEÇÃO --- */}


          {/* ... (Seção Evidências - não imprime) ... */}
          {/* ... (Seção Assinatura - só imprime) ... */}
        </div>

        {/* --- RODAPÉ MODIFICADO (Ações) --- */}
        <div className="flex justify-between items-center gap-3 p-4 bg-gray-50 border-t no-print">
          <div>
            <button onClick={handlePrint} className="..."> <FaPrint /> Imprimir Orçamento </button>
          </div>
          <div className="flex gap-3">
             {/* Mostra botões apenas se status for 'Pendente' */}
             {avaria.status_cobranca === 'Pendente' && (
                <>
                    <button onClick={() => handleSalvarStatus('Cancelada')} className="..."> <FaBan /> Cancelar Cobrança </button>
                    <button onClick={() => handleSalvarStatus('Cobrada')} className="..."> <FaCheck /> Marcar como Cobrada </button>
                </>
             )}
              {/* Mostra status se não for pendente */}
             {avaria.status_cobranca !== 'Pendente' && (
                 <span className={`px-3 py-1 rounded text-sm font-medium ${
                     avaria.status_cobranca === 'Cobrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                 }`}>
                     Status: {avaria.status_cobranca}
                 </span>
             )}
          </div>
        </div>
        {/* --- FIM RODAPÉ MODIFICADO --- */}

      </div>
    </div>
  );
}
