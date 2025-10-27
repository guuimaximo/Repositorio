// src/pages/CobrancasAvarias.jsx
// (Atualizado para receber e salvar todos os novos dados do modal)

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

  const formatCurrency = (value) => (value === null || value === undefined ? '-' : 
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  // === Funções de Carregamento e Modal (sem alteração) ===
  const carregarCobrancas = async () => { /* ... */ };
  const carregarResumo = async () => { /* ... */ };
  useEffect(() => { carregarCobrancas(); }, [filtro, statusFiltro]);
  const handleVerDetalhes = (avaria) => { /* ... */ };
  const handleCloseModal = () => { /* ... */ };

  // --- FUNÇÃO MODIFICADA ---
  // Recebe o objeto updateData completo do modal
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus, updateData) => {
     // A confirmação agora é feita dentro do modal antes de chamar esta função
     // if (!window.confirm(...)) return; 
    
     // Remove a chave 'status_cobranca' do objeto updateData, pois já está implícito
     // (Embora não seja estritamente necessário, é boa prática)
     // delete updateData.status_cobranca; 

     const { error } = await supabase
      .from("avarias") 
      .update(updateData) // Salva todos os dados recebidos (status, obs, parcelas, valor, motoristaId)
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
      <h1 className="..."> Central de Cobranças ... </h1>
      {/* ... (Filtros) ... */}
      {/* ... (Cards resumo) ... */}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-3">Data Aprovação</th>
              <th className="p-3">Motorista</th>
              <th className="p-3">Prefixo</th>
              <th className="p-3">Tipo Avaria</th>
              <th className="p-3">Valor Orçado</th> 
              <th className="p-3">Valor Cobrado</th> 
              <th className="p-3">Status Cobrança</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (loading) { return <tr><td colSpan="8">Carregando...</td></tr>; } 
              if (cobrancas.length === 0) { return <tr><td colSpan="8">Nenhuma cobrança...</td></tr>; } 
              return cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{c.motoristaId || "-"}</td>
                  <td className="p-3">{c.prefixo || "-"}</td>
                  <td className="p-3">{c.tipoOcorrencia || "-"}</td>
                  <td className="p-3">{formatCurrency(c.valor_total_orcamento)}</td> 
                  <td className="p-3 font-medium">{formatCurrency(c.valor_cobrado)}</td> 
                  <td className="p-3"> <span className={`px-2 py-1 ...`}> {c.status_cobranca} </span> </td>
                  <td className="p-3"> <button onClick={() => handleVerDetalhes(c)} className="..."> <FaEye /> Detalhes </button> </td>
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
