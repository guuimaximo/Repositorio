// src/pages/CobrancasAvarias.jsx
// (Adicionado try/catch/finally para garantir setLoading(false))

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa";
import CobrancaDetalheModal from "../components/CobrancaDetalheModal";

function CardResumo({ titulo, valor, cor }) { /* ...código... */ }

export default function CobrancasAvarias() {
  const [cobrancas, setCobrancas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [loading, setLoading] = useState(true); // Começa true
  const [resumo, setResumo] = useState({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  const formatCurrency = (value) => (value === null || value === undefined ? '-' :
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  // === Buscar cobranças (Avarias Aprovadas) ===
  const carregarCobrancas = async () => {
    // Não seta loading aqui, pois carregarResumo também o controla
    let query = supabase.from("avarias").select("*").eq("status", "Aprovado")
      .order("created_at", { ascending: false });

    if (statusFiltro) query = query.eq("status_cobranca", statusFiltro);
    if (filtro) query = query.or(`prefixo.ilike.%${filtro}%, "motoristaId".ilike.%${filtro}%, "tipoOcorrencia".ilike.%${filtro}%`);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar lista de cobranças:", error);
      alert("Erro ao carregar lista de cobranças. Verifique o console.");
      setCobrancas([]); // Define como vazio em caso de erro
    } else {
      setCobrancas(data || []);
    }
    // setLoading será chamado no finally do carregarTudo
  };

  // Função para carregar o Resumo
  const carregarResumo = async () => {
    // Não seta loading aqui
     const { data, error } = await supabase
      .from("avarias")
      .select("status_cobranca")
      .eq("status", "Aprovado");

     if (error) {
        console.error("Erro ao carregar resumo:", error);
        alert("Erro ao carregar resumo das cobranças. Verifique o console.");
        // Mantém o resumo anterior ou zera? Decidi zerar.
        setResumo({ total: 0, pendentes: 0, cobradas: 0, canceladas: 0 });
     } else if (data) {
        setResumo({
          total: data.length,
          pendentes: data.filter((c) => c.status_cobranca === "Pendente").length,
          cobradas: data.filter((c) => c.status_cobranca === "Cobrada").length,
          canceladas: data.filter((c) => c.status_cobranca === "Cancelada").length,
        });
     }
     // setLoading será chamado no finally do carregarTudo
  }

  // --- NOVA FUNÇÃO PARA CARREGAR TUDO ---
  const carregarTudo = async () => {
      setLoading(true); // Define loading true no início
      try {
          // Roda as duas buscas em paralelo
          await Promise.all([
              carregarResumo(),
              carregarCobrancas()
          ]);
      } catch (err) {
          // Erros específicos já são tratados dentro das funções
          console.error("Erro geral ao carregar dados do dashboard:", err);
      } finally {
          // ESSENCIAL: Garante que loading vire false
          setLoading(false);
      }
  }
  // --- FIM NOVA FUNÇÃO ---

  // Roda carregarTudo quando os filtros mudam
  useEffect(() => {
    carregarTudo();
  }, [filtro, statusFiltro]); // Dependências corretas

  // === Funções do Modal (sem alteração) ===
  const handleVerDetalhes = (avaria) => { setSelectedAvaria(avaria); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setSelectedAvaria(null); };
  const handleAtualizarStatusCobranca = async (avariaId, novoStatus, updateData) => {
     // ... (lógica igual, já inclui try/catch implícito do await)
     const { error } = await supabase.from("avarias").update(updateData).eq("id", avariaId);
     if (!error) { /* ... (sucesso) ... */ carregarTudo(); } // Recarrega tudo
     else { /* ... (erro) ... */ }
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold ..."> Central de Cobranças ... </h1>
      {/* ... (Filtros) ... */}
      {/* ... (Cards resumo) ... */}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          {/* ... (thead igual) ... */}
          <tbody>
            {(() => {
              if (loading) { // Verifica o estado 'loading'
                return <tr><td colSpan="8" className="text-center p-6">Carregando...</td></tr>;
              }
              if (cobrancas.length === 0) {
                return <tr><td colSpan="8" className="text-center p-6 text-gray-500">Nenhuma cobrança encontrada.</td></tr>;
              }
              return cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  {/* ... (células da tabela iguais) ... */}
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

       {/* Renderiza o Modal */}
      {modalOpen && ( <CobrancaDetalheModal /* ... */ /> )}
    </div>
  );
}
