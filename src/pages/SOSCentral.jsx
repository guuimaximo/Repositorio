import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye } from "react-icons/fa";

export default function SOSCentral() {
  const [sosList, setSosList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    SOS: 0,
    RECOLHEU: 0,
    TROCA: 0,
    AVARIA: 0,
    IMPROCEDENTE: 0,
    "SEGUIU VIAGEM": 0,
  });
  const [busca, setBusca] = useState("");

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Fechado")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar SOS:", error.message);
      setLoading(false);
      return;
    }

    setSosList(data || []);

    // Agrupa contagens por ocorrência
    const contagens = {
      SOS: 0,
      RECOLHEU: 0,
      TROCA: 0,
      AVARIA: 0,
      IMPROCEDENTE: 0,
      "SEGUIU VIAGEM": 0,
    };
    data?.forEach((s) => {
      const o = (s.ocorrencia || "").toUpperCase().trim();
      if (contagens[o] !== undefined) contagens[o]++;
    });
    setCounts(contagens);
    setLoading(false);
  }

  useEffect(() => {
    carregarSOS();
  }, []);

  const filtrados = sosList.filter((s) => {
    const termo = busca.toLowerCase();
    return (
      s.numero_sos?.toString().includes(termo) ||
      s.veiculo?.toLowerCase().includes(termo) ||
      s.motorista_nome?.toLowerCase().includes(termo) ||
      s.linha?.toLowerCase().includes(termo) ||
      s.local_ocorrencia?.toLowerCase().includes(termo) ||
      s.ocorrencia?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Central de Intervenções (Fechadas)
      </h1>

      {/* 🔢 Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <CardResumo titulo="SOS" valor={counts.SOS} cor="bg-red-600 text-white" />
        <CardResumo titulo="RECOLHEU" valor={counts.RECOLHEU} cor="bg-blue-600 text-white" />
        <CardResumo titulo="TROCA" valor={counts.TROCA} cor="bg-yellow-400 text-black" />
        <CardResumo titulo="AVARIA" valor={counts.AVARIA} cor="bg-gray-700 text-white" />
        <CardResumo titulo="IMPROCEDENTE" valor={counts.IMPROCEDENTE} cor="bg-purple-600 text-white" />
        <CardResumo titulo="SEGUIU VIAGEM" valor={counts["SEGUIU VIAGEM"]} cor="bg-green-600 text-white" />
      </div>

      {/* 🔍 Filtro de busca */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por número, veículo, motorista, linha ou local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 outline-none"
          />
          <button
            onClick={carregarSOS}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* 📋 Lista */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-3 px-4 text-left">Número</th>
              <th className="py-3 px-4 text-left">Data</th>
              <th className="py-3 px-4 text-left">Prefixo</th>
              <th className="py-3 px-4 text-left">Motorista</th>
              <th className="py-3 px-4 text-left">Linha</th>
              <th className="py-3 px-4 text-left">Ocorrência</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Carregando intervenções...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Nenhum SOS fechado encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => (
                <tr
                  key={s.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-4">{s.numero_sos}</td>
                  <td className="py-3 px-4">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">{s.veiculo}</td>
                  <td className="py-3 px-4">{s.motorista_nome}</td>
                  <td className="py-3 px-4">{s.linha}</td>
                  <td className="py-3 px-4 font-semibold">
                    <OcorrenciaTag ocorrencia={s.ocorrencia} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2 mx-auto"
                      onClick={() => alert(`Consultar SOS ${s.numero_sos}`)}
                    >
                      <FaEye /> Consultar
                    </button>
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

/* 🧩 CardResumo */
function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-3 text-center`}>
      <h3 className="text-xs font-medium">{titulo}</h3>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </div>
  );
}

/* 🏷️ Tag de Ocorrência com cor */
function OcorrenciaTag({ ocorrencia }) {
  if (!ocorrencia) return <span>-</span>;
  const o = ocorrencia.toUpperCase();
  const estilos = {
    SOS: "bg-red-600 text-white",
    RECOLHEU: "bg-blue-600 text-white",
    TROCA: "bg-yellow-400 text-black",
    AVARIA: "bg-gray-700 text-white",
    IMPROCEDENTE: "bg-purple-600 text-white",
    "SEGUIU VIAGEM": "bg-green-600 text-white",
  };
  const estilo = estilos[o] || "bg-gray-300 text-gray-700";
  return (
    <span
      className={`${estilo} px-2 py-1 rounded text-xs font-semibold`}
    >
      {o}
    </span>
  );
}
