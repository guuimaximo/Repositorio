// src/pages/CobrancasAvarias.jsx
// (Atualizado com botões dinâmicos: 💰 Cobrar / ✏️ Editar / 👁️ Detalhes)

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch } from "react-icons/fa";
import CobrancaDetalheModal from "../components/CobrancaDetalheModal";

function CardResumo({ titulo, valor, cor, subValor = null }) {
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
  const [resumo, setResumo] = useState({
    total: 0,
    pendentes: 0,
    cobradas: 0,
    canceladas: 0,
    canceladasTotalValue: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  const formatCurrency = (value) =>
    value === null || value === undefined
      ? "-"
      : Number(value).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  const carregarCobrancas = async () => {
    let query = supabase
      .from("avarias")
      .select("*")
      .eq("status", "Aprovado")
      .order("created_at", { ascending: false });

    if (statusFiltro) query = query.eq("status_cobranca", statusFiltro);
    if (filtro)
      query = query.or(
        `prefixo.ilike.%${filtro}%,motoristaId.ilike.%${filtro}%,tipoOcorrencia.ilike.%${filtro}%`
      );

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao carregar lista de cobranças:", error);
      setCobrancas([]);
    } else {
      setCobrancas(data || []);
    }
  };

  const carregarResumo = async () => {
    const { data, error } = await supabase
      .from("avarias")
      .select("status_cobranca, valor_total_orcamento")
      .eq("status", "Aprovado");

    if (error) {
      console.error("Erro ao carregar resumo:", error);
      setResumo({
        total: 0,
        pendentes: 0,
        cobradas: 0,
        canceladas: 0,
        canceladasTotalValue: 0,
      });
    } else {
      const canceladas = data.filter((c) => c.status_cobranca === "Cancelada");
      setResumo({
        total: data.length,
        pendentes: data.filter((c) => c.status_cobranca === "Pendente").length,
        cobradas: data.filter((c) => c.status_cobranca === "Cobrada").length,
        canceladas: canceladas.length,
        canceladasTotalValue: canceladas.reduce(
          (sum, a) => sum + (a.valor_total_orcamento || 0),
          0
        ),
      });
    }
  };

  const carregarTudo = async () => {
    setLoading(true);
    await Promise.all([carregarResumo(), carregarCobrancas()]);
    setLoading(false);
  };

  useEffect(() => {
    carregarTudo();
  }, [filtro, statusFiltro]);

  const handleVerDetalhes = (avaria) => {
    setSelectedAvaria(avaria);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAvaria(null);
  };

  const handleAtualizarStatusCobranca = async (
    avariaId,
    novoStatus,
    updateData
  ) => {
    const { error } = await supabase
      .from("avarias")
      .update(updateData)
      .eq("id", avariaId);
    if (!error) {
      alert(`✅ Cobrança marcada como ${novoStatus}`);
      handleCloseModal();
      carregarTudo();
    } else {
      alert(`❌ Erro ao atualizar status: ${error.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
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
          onClick={() => {
            setFiltro("");
            setStatusFiltro("");
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        >
          Limpar
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo
          titulo="Total Aprovado"
          valor={resumo.total}
          cor="bg-blue-100 text-blue-700"
        />
        <CardResumo
          titulo="Pendentes Cobrança"
          valor={resumo.pendentes}
          cor="bg-yellow-100 text-yellow-700"
        />
        <CardResumo
          titulo="Cobradas"
          valor={resumo.cobradas}
          cor="bg-green-100 text-green-700"
        />
        <CardResumo
          titulo="Canceladas"
          valor={resumo.canceladas}
          subValor={formatCurrency(resumo.canceladasTotalValue)}
          cor="bg-red-100 text-red-700"
        />
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
              <th className="p-3">Valor Orçado</th>
              <th className="p-3">Valor Cobrado</th>
              <th className="p-3">Status Cobrança</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="8"
                  className="text-center p-6 text-gray-500"
                >
                  Carregando...
                </td>
              </tr>
            ) : cobrancas.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  className="text-center p-6 text-gray-500"
                >
                  Nenhuma cobrança encontrada.
                </td>
              </tr>
            ) : (
              cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-700">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-gray-700">{c.motoristaId || "-"}</td>
                  <td className="p-3 text-gray-700">{c.prefixo || "-"}</td>
                  <td className="p-3 text-gray-700">
                    {c.tipoOcorrencia || "-"}
                  </td>
                  <td className="p-3 text-gray-700">
                    {formatCurrency(c.valor_total_orcamento)}
                  </td>
                  <td className="p-3 text-gray-900 font-medium">
                    {formatCurrency(c.valor_cobrado)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        c.status_cobranca === "Cobrada"
                          ? "bg-green-100 text-green-800"
                          : c.status_cobranca === "Cancelada"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {c.status_cobranca || "Pendente"}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.status_cobranca === "Pendente" ? (
                      <button
                        onClick={() => handleVerDetalhes(c)}
                        className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm"
                      >
                        💰 Cobrar
                      </button>
                    ) : c.status_cobranca === "Cobrada" ? (
                      <button
                        onClick={() => handleVerDetalhes(c)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                      >
                        ✏️ Editar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerDetalhes(c)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                      >
                        👁️ Detalhes
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
