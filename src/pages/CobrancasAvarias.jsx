// src/pages/CobrancasAvarias.jsx
// (Código revisado com console.log para depuração)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa";
import CobrancaDetalheModal from "../components/CobrancaDetalheModal";

// Componente CardResumo
function CardResumo({ titulo, valor, cor, subValor = null }) { // Adicionado subValor
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subValor !== null && (
          <p className="text-xs font-medium mt-1">{subValor}</p>
      )}
    </div>
  );
}


export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0, canceladasTotalValue: 0 }); // Estado inicial completo
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  // === Buscar lista de cobranças ===
  const carregarCobrancas = async () => {
    let query = supabase
      .from("avarias")
      .select("*")
      .ilike("status", "Aprovado") // Busca aprovadas (case-insensitive)
      .order("created_at", { ascending: false });

    // Aplica filtros adicionais
    if (statusFiltro) query = query.eq("status_cobranca", statusFiltro);
    if (filtro) query = query.or(`prefixo.ilike.%${filtro}%, "motoristaId".ilike.%${filtro}%, "tipoOcorrencia".ilike.%${filtro}%`);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar lista de cobranças:", error);
      // alert("Erro ao carregar lista de cobranças. Verifique o console."); // Opcional: mostrar alerta
      setCobrancas([]); // Define como vazio em caso de erro
      throw error; // Lança o erro para ser pego pelo carregarTudo
    } else {
      console.log("Dados recebidos (CobrancasAvarias - Lista):", data); // <-- DEBUG ESSENCIAL
      setCobrancas(data || []);
    }
  };

  // === Buscar dados para o Resumo ===
  const carregarResumo = async () => {
     const { data, error } = await supabase
      .from("avarias")
      .select("status_cobranca, valor_total_orcamento") // Campos necessários para o resumo
      .ilike("status", "Aprovado"); // Apenas das aprovadas

     if (error) {
        console.error("Erro ao carregar resumo:", error);
        // alert("Erro ao carregar resumo das cobranças. Verifique o console."); // Opcional
        // Mantém o resumo anterior ou zera? Decidi zerar.
        setResumo({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0, canceladasTotalValue: 0 });
        throw error; // Lança o erro
     } else if (data) {
        const canceladas = data.filter((c) => c.status_cobranca === "Cancelada");
        console.log("Dados recebidos (CobrancasAvarias - Resumo):", data); // <-- DEBUG ESSENCIAL
        setResumo({
          total: data.length, // Total aprovado
          pendentes: data.filter((c) => c.status_cobranca === "Pendente").length,
          cobradas: data.filter((c) => c.status_cobranca === "Cobrada").length,
          canceladas: canceladas.length, // Contagem canceladas
          canceladasTotalValue: canceladas.reduce((sum, a) => sum + (a.valor_total_orcamento || 0), 0) // Soma canceladas
        });
     } else {
        // Caso data seja null ou undefined, zera o resumo
         setResumo({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0, canceladasTotalValue: 0 });
     }
  }

  // === Função para carregar tudo (Resumo e Lista) ===
  const carregarTudo = async () => {
      setLoading(true); // Define loading true no início
      try {
          // Roda as duas buscas em paralelo
          await Promise.all([
              carregarResumo(),
              carregarCobrancas()
          ]);
      } catch (err) {
          // Erros específicos já são logados dentro das funções carregar*
          console.error("Erro geral ao carregar dados da Central de Cobranças:", err);
          // Opcional: Mostrar uma mensagem de erro mais genérica ao usuário aqui
          // alert("Não foi possível carregar os dados. Tente novamente.");
      } finally {
          // ESSENCIAL: Garante que loading vire false, mesmo se houver erro
          setLoading(false);
      }
  }

  // Roda carregarTudo na montagem inicial e quando os filtros mudam
  useEffect(() => {
    carregarTudo();
  }, [filtro, statusFiltro]); // Dependências corretas

  // === Funções do Modal ===
  const handleVerDetalhes = (avaria) => { setSelectedAvaria(avaria); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setSelectedAvaria(null); };
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus, updateData) => {
     const { error } = await supabase.from("avarias").update(updateData).eq("id", avariaId);
     if (!error) {
       alert(`✅ Cobrança marcada como ${novoStatus}`);
       handleCloseModal();
       carregarTudo(); // Recarrega tudo (Resumo e Lista)
     } else {
       alert(`❌ Erro ao atualizar status: ${error.message}`);
     }
  };


  return (
    // Container principal
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-700">
        Central de Cobranças de Avarias
      </h1>

      {/* --- Filtros --- */}
      <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-wrap gap-3 items-center">
        {/* Input de Busca */}
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
        {/* Select de Status */}
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
        {/* Botão Limpar */}
        <button
          onClick={() => { setFiltro(""); setStatusFiltro(""); }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        > Limpar </button>
      </div>

      {/* --- Cards resumo --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Total Aprovado" valor={resumo.total} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes Cobrança" valor={resumo.pendentes} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Cobradas" valor={resumo.cobradas} cor="bg-green-100 text-green-700" />
        <CardResumo
            titulo="Canceladas"
            valor={resumo.canceladas}
            subValor={formatCurrency(resumo.canceladasTotalValue)}
            cor="bg-red-100 text-red-700"
        />
      </div>

      {/* --- Tabela --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          {/* Cabeçalho */}
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
          {/* Corpo */}
          <tbody>
            {(() => {
              if (loading) {
                return <tr><td colSpan="8" className="text-center p-6 text-gray-500">Carregando...</td></tr>;
              }
              if (cobrancas.length === 0) {
                return <tr><td colSpan="8" className="text-center p-6 text-gray-500">Nenhuma cobrança encontrada.</td></tr>;
              }
              return cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-700">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-700">{c.motoristaId || "-"}</td>
                  <td className="p-3 text-gray-700">{c.prefixo || "-"}</td>
                  <td className="p-3 text-gray-700">{c.tipoOcorrencia || "-"}</td>
                  <td className="p-3 text-gray-700">{formatCurrency(c.valor_total_orcamento)}</td>
                  <td className="p-3 text-gray-900 font-medium">{formatCurrency(c.valor_cobrado)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        c.status_cobranca === "Cobrada" ? "bg-green-100 text-green-800"
                        : c.status_cobranca === "Cancelada" ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800" }`}
                    > {c.status_cobranca || 'Pendente'} </span> {/* Mostra Pendente se nulo */}
                  </td>
                  <td className="p-3">
                     <button
                        onClick={() => handleVerDetalhes(c)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        title="Ver Detalhes e Ações"
                      > <FaEye /> Detalhes </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

       {/* Renderiza o Modal */}
      {modalOpen && ( <CobrancaDetalheModal avaria={selectedAvaria} onClose={handleCloseModal} onAtualizarStatus={handleAtualizarStatusCobranca} /> )}
    </div>
  );
}
