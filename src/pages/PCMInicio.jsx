import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function PCMInicio() {
  const [pcms, setPcms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    buscarPCMs();
  }, []);

  async function buscarPCMs() {
    const { data, error } = await supabase
      .from("pcm_diario")
      .select("*")
      .order("data_referencia", { ascending: false });
    if (!error) setPcms(data);
    setLoading(false);
  }

  async function criarNovoDia() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("pcm_diario")
      .insert([{ data_referencia: hoje, criado_por: "Carlos" }]) // Exemplo de usuário
      .select()
      .single();

    if (error) {
      alert("Erro ou Dia já existente: " + error.message);
    } else {
      navigate(`/pcm-diario/${data.id}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">PCM - Início</h1>
        <button 
          onClick={criarNovoDia}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <span>+</span> Abrir PCM do Dia
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Criado por</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pcms.map((pcm) => (
              <tr key={pcm.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{pcm.data_referencia}</td>
                <td className="p-4 text-gray-600">{pcm.criado_por}</td>
                <td className="p-4 flex justify-center gap-2">
                  <button 
                    onClick={() => navigate(`/pcm-diario/${pcm.id}`)}
                    className="bg-gray-800 text-white px-4 py-1 rounded text-sm flex items-center gap-1"
                  >
                    📝 Abrir PCM
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
