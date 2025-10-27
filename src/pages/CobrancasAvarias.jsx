// src/pages/CobrancasAvarias.jsx
// (Atualizado para usar o CobrancaDetalheModal)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa"; // Adicionado FaEye
import CobrancaDetalheModal from "../components/CobrancaDetalheModal"; // 1. Importar o Modal

// Componente CardResumo (sem alteração)
function CardResumo({ titulo, valor, cor }) { /* ...código... */ }

export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]); 
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ /* ... */ });

  // --- Estados do Modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  // === Buscar cobranças (Avarias Aprovadas) ===
  const carregarCobrancas = async () => {
    setLoading(true);
    let query = supabase.from("avarias").select("*").eq("status", "Aprovado")
      .order("created_at", { ascending: false });

    if (statusFiltro) query = query.eq("status_cobranca", statusFiltro);
    if (filtro) query = query.or(`prefixo.ilike.%${filtro}%, "motoristaId".ilike.%${filtro}%, "tipoOcorrencia".ilike.%${filtro}%`);
    
    const { data, error } = await query;

    if (!error && data) {
      setCobrancas(data); 
      await carregarResumo(); 
    } else {
      console.error("Erro ao carregar cobranças:", error);
      alert("Erro ao carregar cobranças.");
    }
    setLoading(false);
  };
  
  // Função para carregar o Resumo (sem alteração)
  const carregarResumo = async () => { /* ...código... */ }

  useEffect(() => {
    carregarCobrancas();
  }, [filtro, statusFiltro]);

  // === Abrir o Modal de Detalhes ===
  const handleVerDetalhes = (avaria) => {
    setSelectedAvaria(avaria);
    setModalOpen(true);
  };

  // === Fechar o Modal ===
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAvaria(null);
  };

  // === Tratar cobrança (Chamado de DENTRO do Modal) ===
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus) => {
     if (!window.confirm(`Deseja realmente marcar esta cobrança como ${novoStatus.toLowerCase()}?`)) {
      return;
    }
    const { error } = await supabase
      .from("avarias") 
      .update({ status_cobranca: novoStatus })
      .eq("id", avariaId);

    if (!error) {
      alert(`✅ Cobrança marcada como ${novoStatus}`);
      handleCloseModal(); // Fecha o modal
      carregarCobrancas(); // Recarrega a lista
    } else {
      alert("❌ Erro ao atualizar status da cobrança.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-700">
        Central de Cobranças de Avarias
      </h1>

      {/* Filtros (sem alteração) */}
      {/* ... */}

      {/* Cards resumo (sem alteração) */}
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
              <th className="p-3">Valor Total</th>
              <th className="p-3">Status Cobrança</th>
              <th className="p-3">Ações</th> {/* Mudou o conteúdo */}
            </tr>
          </thead>
          <tbody>
            {loading ? ( /* ... */ ) 
            : cobrancas.length === 0 ? ( /* ... */ ) 
            : (
              cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{c.motoristaId || "-"}</td>
                  <td className="p-3">{c.prefixo || "-"}</td>
                  <td className="p-3">{c.tipoOcorrencia || "-"}</td>
                  <td className="p-3">
                    {(c.valor_total_orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                        c.status_cobranca === "Cobrada" ? "bg-green-100 text-green-800"
                        : c.status_cobranca === "Cancelada" ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800" }`}
                    > {c.status_cobranca} </span>
                  </td>
                  {/* --- BOTÃO DE AÇÃO MODIFICADO --- */}
                  <td className="p-3">
                     <button
                        onClick={() => handleVerDetalhes(c)} // Abre o modal
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        title="Ver Detalhes e Ações"
                      >
                        <FaEye />
                        Detalhes
                      </button>
                  </td>
                  {/* --- FIM DA MODIFICAÇÃO --- */}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

       {/* Renderiza o Modal */}
      {modalOpen && (
        <CobrancaDetalheModal 
          avaria={selectedAvaria}
          onClose={handleCloseModal}
          onAtualizarStatus={handleAtualizarStatusCobranca} // Passa a função correta
        />
      )}
    </div>
  );
}
