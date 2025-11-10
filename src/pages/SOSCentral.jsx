// src/pages/SOSCentral.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye, FaTimes } from "react-icons/fa";

export default function SOSCentral() {
  const [sosList, setSosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState(null);

  async function carregarFechadas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Fechado")
      .order("data_fechamento", { ascending: false });

    if (!error) setSosList(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarFechadas();
  }, []);

  const filtradas = sosList.filter((s) => {
    const q = busca.toLowerCase();
    return (
      s.numero_sos?.toString().includes(q) ||
      s.veiculo?.toLowerCase().includes(q) ||
      s.motorista_nome?.toLowerCase().includes(q) ||
      s.linha?.toLowerCase().includes(q) ||
      s.local_ocorrencia?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Central de SOS — Etiquetas Finalizadas
      </h1>

      {/* Barra de busca */}
      <div className="bg-white shadow rounded-lg mb-5 p-4 flex items-center gap-2">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por número, veículo, motorista, linha, local..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 outline-none text-gray-700"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold">Número</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Data</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Prefixo</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Motorista</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Linha</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Local</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Avaliador</th>
              <th className="py-3 px-4 text-center text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-600">
                  Carregando SOS fechadas...
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-600">
                  Nenhuma etiqueta finalizada encontrada.
                </td>
              </tr>
            ) : (
              filtradas.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{s.numero_sos}</td>
                  <td className="py-3 px-4">
                    {s.data_fechamento
                      ? new Date(s.data_fechamento).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="py-3 px-4">{s.veiculo}</td>
                  <td className="py-3 px-4">{s.motorista_nome}</td>
                  <td className="py-3 px-4">{s.linha}</td>
                  <td className="py-3 px-4">{s.local_ocorrencia}</td>
                  <td className="py-3 px-4">{s.avaliador || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelected(s)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center justify-center gap-2 transition"
                    >
                      <FaEye /> Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetalhesModal
          sos={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// 🟦 Modal de Detalhes
function DetalhesModal({ sos, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full animate-fadeIn overflow-y-auto max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b bg-blue-50 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            Detalhes do SOS #{sos.numero_sos}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4 text-sm text-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <p><span className="font-medium">Data Abertura:</span> {new Date(sos.created_at).toLocaleString("pt-BR")}</p>
            <p><span className="font-medium">Data Fechamento:</span> {sos.data_fechamento ? new Date(sos.data_fechamento).toLocaleString("pt-BR") : "-"}</p>
            <p><span className="font-medium">Veículo:</span> {sos.veiculo}</p>
            <p><span className="font-medium">Motorista:</span> {sos.motorista_nome}</p>
            <p><span className="font-medium">Linha:</span> {sos.linha}</p>
            <p><span className="font-medium">Local:</span> {sos.local_ocorrencia}</p>
          </div>

          <div className="pt-3 border-t">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Informações de Fechamento</h3>
            <p><span className="font-medium">Avaliador:</span> {sos.avaliador || "-"}</p>
            <p><span className="font-medium">Procedência:</span> {sos.procedencia_socorrista || "-"}</p>
            <p><span className="font-medium">Ocorrência:</span> {sos.ocorrencia || "-"}</p>
            <p><span className="font-medium">Carro Substituto:</span> {sos.carro_substituto || "-"}</p>
            <p><span className="font-medium">SR:</span> {sos.sr_numero || "-"}</p>
          </div>

          {sos.manutencao_defeitos?.length > 0 && (
            <div className="pt-3 border-t">
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Defeitos registrados pela Manutenção
              </h3>
              <ul className="list-disc ml-5 space-y-1">
                {sos.manutencao_defeitos.map((d, i) => (
                  <li key={i}>
                    {d.setor_macro} • {d.grupo} • {d.defeito}
                    {d.observacao && (
                      <span className="text-gray-600 text-xs"> — {d.observacao}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
