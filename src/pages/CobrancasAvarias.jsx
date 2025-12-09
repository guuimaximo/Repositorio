// src/pages/CobrancasAvarias.jsx
// Versão revisada: (Valores nos cards + Nº Avaria + ordenação + data de aprovação + delta em dias + filtro de período)

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase";
import { FaSearch } from "react-icons/fa";
import CobrancaDetalheModal from "../components/CobrancaDetalheModal";

/**
 * Componente CardResumo: Exibe contagem e valor total resumido.
 */
function CardResumo({ titulo, valor, cor, subValor = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subValor !== null && (
        <p className="text-sm font-medium mt-1 text-gray-600">{subValor}</p>
      )}
    </div>
  );
}

/**
 * Página principal de listagem e gerenciamento de Cobranças de Avarias.
 */
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
    totalAprovadoValue: 0,
    pendentesTotalValue: 0,
    cobradasTotalValue: 0,
    canceladasTotalValue: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  // Filtro de período (data da avaria)
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // sortConfig: key = campo, direction = 'asc' | 'desc'
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc", // Ordena por data de criação mais recente por padrão
  });

  const formatCurrency = (value) =>
    value === null || value === undefined
      ? "-"
      : Number(value).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  // Função para carregar a lista de cobranças com filtros
  const carregarCobrancas = async () => {
    let query = supabase
      .from("avarias")
      .select("*")
      .eq("status", "Aprovado") // Apenas avarias APROVADAS vão para cobrança
      .order("created_at", { ascending: false });

    if (statusFiltro) {
      query = query.eq("status_cobranca", statusFiltro);
    }

    if (filtro) {
      query = query.or(
        `prefixo.ilike.%${filtro}%,motoristaId.ilike.%${filtro}%,tipoOcorrencia.ilike.%${filtro}%,numero_da_avaria.ilike.%${filtro}%`
      );
    }

    // Filtro de período por data da avaria
    // **Nota: Mantendo "dataAvaria" como no seu código para a query, ajuste se for "data_avaria" no seu DB.**
    if (dataInicio) {
      query = query.gte("dataAvaria", dataInicio);
    }
    if (dataFim) {
      const fimISO = `${dataFim}T23:59:59`;
      query = query.lte("dataAvaria", fimISO);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao carregar lista de cobranças:", error);
      setCobrancas([]);
    } else {
      setCobrancas(data || []);
    }
  };

  // Função para carregar o resumo dos valores nos cards
  const carregarResumo = async () => {
    let query = supabase
      .from("avarias")
      .select("status_cobranca, valor_total_orcamento, dataAvaria")
      .eq("status", "Aprovado");

    // Aplica o mesmo filtro de data para manter os cards alinhados ao período
    if (dataInicio) {
      query = query.gte("dataAvaria", dataInicio);
    }
    if (dataFim) {
      const fimISO = `${dataFim}T23:59:59`;
      query = query.lte("dataAvaria", fimISO);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar resumo:", error);
      return;
    }

    const pendentes = data.filter((c) => (c.status_cobranca || 'Pendente') === "Pendente");
    const cobradas = data.filter((c) => c.status_cobranca === "Cobrada");
    const canceladas = data.filter((c) => c.status_cobranca === "Cancelada");

    setResumo({
      total: data.length,
      pendentes: pendentes.length,
      cobradas: cobradas.length,
      canceladas: canceladas.length,
      totalAprovadoValue: data.reduce(
        (sum, a) => sum + (a.valor_total_orcamento || 0),
        0
      ),
      pendentesTotalValue: pendentes.reduce(
        (sum, a) => sum + (a.valor_total_orcamento || 0),
        0
      ),
      cobradasTotalValue: cobradas.reduce(
        (sum, a) => sum + (a.valor_total_orcamento || 0),
        0
      ),
      canceladasTotalValue: canceladas.reduce(
        (sum, a) => sum + (a.valor_total_orcamento || 0),
        0
      ),
    });
  };

  const carregarTudo = async () => {
    setLoading(true);
    // Carrega o resumo e a lista em paralelo
    await Promise.all([carregarResumo(), carregarCobrancas()]);
    setLoading(false);
  };

  useEffect(() => {
    carregarTudo();
  }, [filtro, statusFiltro, dataInicio, dataFim]);

  // --- Funções Auxiliares ---

  const handleVerDetalhes = (avaria) => {
    setSelectedAvaria(avaria);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAvaria(null);
  };

  // Função para atualizar o status e recarregar os dados
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
      alert(`✅ Cobrança marcada como ${novoStatus}!`);
      handleCloseModal();
      carregarTudo(); // Recarrega dados e resumo
    } else {
      alert(`❌ Erro ao atualizar status: ${error.message}`);
    }
  };

  const formatarData = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  const formatarDataAvaria = (c) => formatarData(c.dataAvaria || c.data_avaria || c.created_at);
  const formatarDataAprovacao = (c) => formatarData(c.aprovado_em);

  // Calcula a diferença em dias entre a data da avaria e a data de aprovação
  const calcularDeltaDias = (c) => {
    const dataAvariaRaw = c.dataAvaria || c.data_avaria || c.created_at;
    const dataAprovRaw = c.aprovado_em;
    if (!dataAvariaRaw || !dataAprovRaw) return null;

    // Converte para objeto Date
    const dA = new Date(dataAvariaRaw);
    const dB = new Date(dataAprovRaw);

    if (Number.isNaN(dA.getTime()) || Number.isNaN(dB.getTime())) return null;

    const diffMs = dB.getTime() - dA.getTime();
    // 1000ms * 60s * 60m * 24h = 86,400,000 milissegundos em um dia
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDias;
  };

  // --- Lógica de Ordenação ---

  // valor usado internamente para ordenação em cada coluna
  const getSortValue = (item, key) => {
    switch (key) {
      case "numero_da_avaria":
      case "valor_total_orcamento":
      case "valor_cobrado":
      case "delta_dias":
        // Retorna o valor numérico ou 0 para ordenação
        if (key === "delta_dias") return calcularDeltaDias(item) ?? 0;
        return Number(item[key]) || 0;

      case "data_avaria": {
        // Usa a data mais provável
        const dataRaw = item.dataAvaria || item.data_avaria || item.created_at;
        return dataRaw ? new Date(dataRaw).getTime() : 0;
      }
      case "aprovado_em":
      case "created_at":
        return item[key] ? new Date(item[key]).getTime() : 0;

      case "motoristaId":
      case "prefixo":
      case "status_cobranca":
      case "tipoOcorrencia":
        // Retorna a string para ordenação alfabética
        return item[key] || "";
        
      default:
        return item.created_at ? new Date(item.created_at).getTime() : 0;
    }
  };

  // Aplica a ordenação na lista de cobranças visíveis
  const sortedCobrancas = useMemo(() => {
    const data = [...cobrancas];
    if (!sortConfig.key) return data;

    data.sort((a, b) => {
      const vA = getSortValue(a, sortConfig.key);
      const vB = getSortValue(b, sortConfig.key);

      // Tratamento para ordenação alfabética (strings)
      if (typeof vA === 'string' && typeof vB === 'string') {
        const comparison = vA.localeCompare(vB);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }
      
      // Tratamento para ordenação numérica ou por data
      if (vA === vB) return 0;
      if (vA > vB) return sortConfig.direction === "asc" ? 1 : -1;
      return sortConfig.direction === "asc" ? -1 : 1;
    });

    return data;
  }, [cobrancas, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      // Se a mesma coluna for clicada, inverte a direção
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      // Se for uma nova coluna, define a direção padrão (asc para texto, desc para data/número)
      const isDateOrNumber = [
        "created_at",
        "data_avaria",
        "aprovado_em",
        "valor_total_orcamento",
        "valor_cobrado",
        "delta_dias",
        "numero_da_avaria"
      ].includes(key);
      
      return { key, direction: isDateOrNumber ? "desc" : "asc" };
    });
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };
  
  // --- Renderização da Página ---

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-700">
        Central de Cobranças de Avarias 💰
      </h1>
      
      {/* --- Filtros --- */}
      <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center border rounded-md px-2 flex-1 min-w-[220px]">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar (motorista, prefixo, tipo, nº avaria...)"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 outline-none py-1"
          />
        </div>

        {/* Período - Data Início / Data Fim */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Início da Avaria</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border rounded-md p-2 text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Fim da Avaria</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border rounded-md p-2 text-sm"
            />
          </div>
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
            setDataInicio("");
            setDataFim("");
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md px-4 py-2"
        >
          Limpar
        </button>
      </div>
      
      {/* --- Cards resumo --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo
          titulo="Total Aprovado"
          valor={resumo.total}
          subValor={formatCurrency(resumo.totalAprovadoValue)}
          cor="bg-blue-100 text-blue-700"
        />
        <CardResumo
          titulo="Pendentes Cobrança"
          valor={resumo.pendentes}
          subValor={formatCurrency(resumo.pendentesTotalValue)}
          cor="bg-yellow-100 text-yellow-700"
        />
        <CardResumo
          titulo="Cobradas"
          valor={resumo.cobradas}
          subValor={formatCurrency(resumo.cobradasTotalValue)}
          cor="bg-green-100 text-green-700"
        />
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
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("numero_da_avaria")}
              >
                Nº Avaria{renderSortIndicator("numero_da_avaria")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("data_avaria")}
              >
                Data da Avaria{renderSortIndicator("data_avaria")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("aprovado_em")}
              >
                Data Aprovação{renderSortIndicator("aprovado_em")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("delta_dias")}
              >
                Δ (dias){renderSortIndicator("delta_dias")}
              </th>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => handleSort("motoristaId")}
              >
                Motorista{renderSortIndicator("motoristaId")}
              </th>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => handleSort("prefixo")}
              >
                Prefixo{renderSortIndicator("prefixo")}
              </th>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => handleSort("tipoOcorrencia")}
              >
                Tipo Avaria{renderSortIndicator("tipoOcorrencia")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap text-right"
                onClick={() => handleSort("valor_total_orcamento")}
              >
                Valor Orçado{renderSortIndicator("valor_total_orcamento")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap text-right"
                onClick={() => handleSort("valor_cobrado")}
              >
                Valor Cobrado{renderSortIndicator("valor_cobrado")}
              </th>
              <th
                className="p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("status_cobranca")}
              >
                Status Cobrança{renderSortIndicator("status_cobranca")}
              </th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="text-center p-6 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : sortedCobrancas.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center p-6 text-gray-500">
                  Nenhuma cobrança encontrada.
                </td>
              </tr>
            ) : (
              sortedCobrancas.map((c) => {
                const deltaDias = calcularDeltaDias(c);
                const statusCobranca = c.status_cobranca || "Pendente"; // Define "Pendente" como padrão
                
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-700 whitespace-nowrap">
                      {c.numero_da_avaria || "-"}
                    </td>
                    <td className="p-3 text-gray-700 whitespace-nowrap">
                      {formatarDataAvaria(c)}
                    </td>
                    <td className="p-3 text-gray-700 whitespace-nowrap">
                      {formatarDataAprovacao(c)}
                    </td>
                    <td className="p-3 text-center">
                      {deltaDias !== null ? (
                        <span 
                          className={`font-semibold ${
                              deltaDias > 7 ? 'text-red-600' : 'text-green-600'
                          }`}
                          title={`Diferença entre Data da Avaria e Data de Aprovação: ${deltaDias} dias`}
                        >
                          {deltaDias}d
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{c.motoristaId || "-"}</td>
                    <td className="p-3 text-gray-700">{c.prefixo || "-"}</td>
                    <td className="p-3 text-gray-700">{c.tipoOcorrencia || "-"}</td>
                    <td className="p-3 text-gray-700 text-right whitespace-nowrap">
                      {formatCurrency(c.valor_total_orcamento)}
                    </td>
                    <td className="p-3 text-gray-900 font-medium text-right whitespace-nowrap">
                      {formatCurrency(c.valor_cobrado)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusCobranca === "Cobrada"
                            ? "bg-green-100 text-green-800"
                            : statusCobranca === "Cancelada"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {statusCobranca}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {statusCobranca === "Pendente" ? (
                        <button
                          onClick={() => handleVerDetalhes(c)}
                          className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm"
                        >
                          💰 Cobrar
                        </button>
                      ) : statusCobranca === "Cobrada" ? (
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
