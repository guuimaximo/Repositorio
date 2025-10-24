import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch } from "react-icons/fa";

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

  // === Buscar cobranças do Supabase ===
  const carregarCobrancas = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("cobrancas_avarias")
      .select("*, avarias:avarias!id_avaria(prefixo, tipo_avaria, valor_estimado)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      let filtradas = data;

      if (filtro)
        filtradas = filtradas.filter((c) =>
          [
            c.motorista_chapa,
            c.prefixo,
            c.avarias?.tipo_avaria,
            c.descricao_acao,
          ]
            .join(" ")
            .toLowerCase()
            .includes(filtro.toLowerCase())
        );

      if (statusFiltro)
        filtradas = filtradas.filter((c) => c.status_cobranca === statusFiltro);

      setCobrancas(filtradas);

      // Calcular resumo
      setResumo({
        total: data.length,
        pendentes: data.filter((c) => c.status_cobranca === "Pendente").length,
        cobradas: data.filter((c) => c.status_cobranca === "Cobrada").length,
        canceladas: data.filter((c) => c.status_cobranca === "Cancelada").length,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    carregarCobrancas();
  }, [filtro, statusFiltro]);

  // === Tratar cobrança ===
  const tratarCobranca = async (cobranca, novoStatus) => {
    const { error } = await supabase
      .from("cobrancas_avarias")
      .update({ status_cobranca: novoStatus })
      .eq("id", cobranca.id);

    if (!error) {
      alert(`✅ Cobrança marcada como ${novoStatus}`);
      carregarCobrancas();
    } else {
      alert("❌ Erro ao atualizar cobrança.");
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <CardResumo titulo="Total" valor={resumo.total} cor="bg-blue-100" />
        <CardResumo titulo="Pendentes" valor={resumo.pendentes} cor="bg-yellow-100" />
        <CardResumo titulo="Cobradas" valor={resumo.cobradas} cor="bg-green-100" />
        <CardResumo titulo="Canceladas" valor={resumo.canceladas} cor="bg-red-100" />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-3">Data</th>
              <th className="p-3">Motorista</th>
              <th className="p-3">Prefixo</th>
              <th className="p-3">Tipo Avaria</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Status</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center p-6">
                  Carregando...
                </td>
              </tr>
            ) : cobrancas.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-6 text-gray-500">
                  Nenhuma cobrança encontrada.
                </td>
              </tr>
            ) : (
              cobrancas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">{c.motorista_chapa}</td>
                  <td className="p-3">{c.avarias?.prefixo || "-"}</td>
                  <td className="p-3">{c.avarias?.tipo_avaria || "-"}</td>
                  <td className="p-3">
                    R$ {c.avarias?.valor_estimado?.toFixed(2) || "-"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        c.status_cobranca === "Cobrada"
                          ? "bg-green-100 text-green-800"
                          : c.status_cobranca === "Cancelada"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {c.status_cobranca}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {c.status_cobranca === "Pendente" ? (
                      <>
                        <button
                          onClick={() => tratarCobranca(c, "Cobrada")}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Cobrar
                        </button>
                        <button
                          onClick={() => tratarCobranca(c, "Cancelada")}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                        Consultar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente para card de resumo
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg p-4 shadow text-center`}>
      <h3 className="text-gray-600 text-sm">{titulo}</h3>
      <p className="text-2xl font-bold text-gray-800">{valor}</p>
    </div>
  );
}
