import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function CentralTratativas() {
  const [tratativas, setTratativas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    buscarTratativas();
  }, []);

  const buscarTratativas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tratativas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar tratativas:", error.message);
    } else {
      setTratativas(data || []);
    }
    setLoading(false);
  };

  const atualizarStatus = async (id, novoStatus) => {
    const { error } = await supabase
      .from("tratativas")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) {
      alert("❌ Erro ao atualizar status: " + error.message);
    } else {
      alert("✅ Status atualizado para " + novoStatus);
      buscarTratativas();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-700">
            🧩 Central de Tratativas
          </h1>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            ⬅️ Voltar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Carregando tratativas...</p>
        ) : tratativas.length === 0 ? (
          <p className="text-center text-gray-600">Nenhuma tratativa registrada.</p>
        ) : (
          <table className="w-full text-left border">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="p-2">Motorista</th>
                <th className="p-2">Ocorrência</th>
                <th className="p-2">Prioridade</th>
                <th className="p-2">Setor</th>
                <th className="p-2">Status</th>
                <th className="p-2">Imagem</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tratativas.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b ${
                    t.status === "Resolvido" ? "bg-green-50" : "bg-white"
                  }`}
                >
                  <td className="p-2">{t.motorista_id}</td>
                  <td className="p-2">{t.tipo_ocorrencia}</td>
                  <td className="p-2">{t.prioridade}</td>
                  <td className="p-2">{t.setor_origem}</td>
                  <td className="p-2 font-semibold">{t.status}</td>
                  <td className="p-2">
                    {t.imagem_url ? (
                      <a
                        href={t.imagem_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={t.imagem_url}
                          alt="Imagem da tratativa"
                          className="w-16 h-16 object-cover rounded shadow"
                        />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Sem imagem</span>
                    )}
                  </td>
                  <td className="p-2">
                    {t.status !== "Resolvido" && (
                      <button
                        onClick={() => atualizarStatus(t.id, "Resolvido")}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Marcar Resolvido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
