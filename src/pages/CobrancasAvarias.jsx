// src/pages/CobrancasAvarias.jsx
// (Atualizado para passar nova função ao modal e mostrar valor_cobrado)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa"; 
import CobrancaDetalheModal from "../components/CobrancaDetalheModal"; 

function CardResumo({ titulo, valor, cor }) { /* ...código... */ }

export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]); 
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ /* ... */ });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // === Buscar cobranças (Avarias Aprovadas) ===
  const carregarCobrancas = async () => { /* ... (código igual) ... */ };
  const carregarResumo = async () => { /* ... (código igual) ... */ };

  useEffect(() => { carregarCobrancas(); }, [filtro, statusFiltro]);

  const handleVerDetalhes = (avaria) => { /* ... (código igual) ... */ };
  const handleCloseModal = () => { /* ... (código igual) ... */ };

  // --- FUNÇÃO MODIFICADA ---
  // Recebe o valorCobrado (pode ser null se for 'Cancelada')
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus, valorCobradoFinal) => {
     if (!window.confirm(`Confirma marcar esta cobrança como ${novoStatus.toLowerCase()}?`)) return;
    
     // Prepara o objeto de atualização
     const updateData = { status_cobranca: novoStatus };
     if (novoStatus === 'Cobrada') {
         updateData.valor_cobrado = valorCobradoFinal; // Adiciona o valor cobrado
     } else if (novoStatus === 'Cancelada') {
         updateData.valor_cobrado = null; // Garante que canceladas não tenham valor cobrado
     }

     const { error } = await supabase
      .from("avarias") 
      .update(updateData) // Usa o objeto preparado
      .eq("id", avariaId);

    if (!error) {
      alert(`✅ Cobrança marcada como ${novoStatus}`);
      handleCloseModal(); 
      carregarCobrancas(); 
    } else {
      alert(`❌ Erro ao atualizar status: ${error.message}`);
    }
  };
  // --- FIM MODIFICAÇÃO ---


  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold ..."> Central de Cobranças ... </h1>
      {/* Filtros */}
      {/* ... */}
      {/* Cards resumo */}
      {/* ... */}

      {/* Tabela (MODIFICADA) */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-3">Data Aprovação</th>
              <th className="p-3">Motorista</th>
              <th className="p-3">Prefixo</th>
              <th className="p-3">Tipo Avaria</th>
              <th className="p-3">Valor Orçado</th> {/* Mudou o label */}
              <th className="p-3">Valor Cobrado</th> {/* Nova Coluna */}
              <th className="p-3">Status Cobrança</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (loading) { /* ... */ }
              if (cobrancas.length === 0) { /* ... */ }
              return cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{c.motoristaId || "-"}</td>
                  <td className="p-3">{c.prefixo || "-"}</td>
                  <td className="p-3">{c.tipoOcorrencia || "-"}</td>
                  {/* Valor Orçado Original */}
                  <td className="p-3">{formatCurrency(c.valor_total_orcamento)}</td>
                  {/* Valor Cobrado Final */}
                  <td className="p-3 font-medium"> 
                    {c.valor_cobrado !== null ? formatCurrency(c.valor_cobrado) : '-'} 
                  </td> 
                  <td className="p-3"> {/* Status Cobrança */}
                    <span className={`px-2 py-1 ...`}> {c.status_cobranca} </span>
                  </td>
                  <td className="p-3"> {/* Botão Detalhes */}
                     <button onClick={() => handleVerDetalhes(c)} className="..."> <FaEye /> Detalhes </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

       {/* Renderiza o Modal (passa a função atualizada) */}
      {modalOpen && (
        <CobrancaDetalheModal 
          avaria={selectedAvaria}
          onClose={handleCloseModal}
          onAtualizarStatus={handleAtualizarStatusCobranca} 
        />
      )}
    </div>
  );
}
