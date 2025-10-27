// src/pages/CobrancasAvarias.jsx
// (Corrigido erro de sintaxe no tbody)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa"; 
import CobrancaDetalheModal from "../components/CobrancaDetalheModal"; 

// Componente CardResumo
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg p-4 shadow text-center`}>
      <h3 className="text-gray-600 text-sm">{titulo}</h3>
      <p className="text-2xl font-bold text-gray-800">{valor}</p>
    </div>
  );
}

export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]); 
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    total: 0,
    pendentes: 0,
    cobradas: 0,
    canceladas: 0,
  });

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
  
  // Função para carregar o Resumo
  const carregarResumo = async () => {
     const { data, error } = await supabase
      .from("avarias")
      .select("status_cobranca") 
      .eq("status", "Aprovado");

     if (!error && data) {
        setResumo({
          total: data.length,
          pendentes: data.filter((c) => c.status_cobranca === "Pendente").length,
          cobradas: data.filter((c) => c.status_cobranca === "Cobrada").length,
          canceladas: data.filter((c) => c.status_cobranca === "Cancelada").length,
        });
     }
  }

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
      handleCloseModal(); 
      carregarCobrancas(); 
    } else {
      alert("❌ Erro ao atualizar status da cobrança.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-700">
        Central de Cobranças de Avarias
      </h1>

      {/* Filtros */}
      <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center border rounded-md px-2 flex-1">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar (motorista, prefixo, tipo...)"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 outline-none py-1"
          />
        </div>
        <select
          className="border rounded-md p-2"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os Status</option>
          <option value="Pendente">Pendentes</option>
          <option value="Cobrada">Cobradas</option>
          <option value="Cancelada">Canceladas</option>
        </select>
        <button
          onClick={() => { setFiltro(""); setStatusFiltro(""); }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        > Limpar </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <CardResumo titulo="Total Aprovado" valor={resumo.total} cor="bg-blue-100" />
        <CardResumo titulo="Pendentes Cobrança" valor={resumo.pendentes} cor="bg-yellow-100" />
        <CardResumo titulo="Cobradas" valor={resumo.cobradas} cor="bg-green-100" />
        <CardResumo titulo="Canceladas" valor={resumo.canceladas} cor="bg-red-100" />
      </div>

      {/* Tabela */}
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
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          {/* --- TBODY CORRIGIDO --- */}
          <tbody>
            {(() => {
              if (loading) {
                return <tr><td colSpan="7" className="text-center p-6">Carregando...</td></tr>;
              }
              if (cobrancas.length === 0) {
                return <tr><td colSpan="7" className="text-center p-6 text-gray-500">Nenhuma cobrança encontrada.</td></tr>;
              }
              return cobrancas.map((c) => (
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
                  <td className="p-3">
                     <button
                        onClick={() => handleVerDetalhes(c)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        title="Ver Detalhes e Ações"
                      >
                        <FaEye />
                        Detalhes
                      </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
          {/* --- FIM TBODY CORRIGIDO --- */}
        </table>
      </div>

       {/* Renderiza o Modal */}
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
