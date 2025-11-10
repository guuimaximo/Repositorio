// src/pages/SOSCentral.jsx
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaEye, FaTimes } from "react-icons/fa";

export default function SOSCentral() {
  const [sosList, setSosList] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Fechado")
      .order("data_fechamento", { ascending: false });

    if (error) {
      alert("Erro ao carregar SOS: " + error.message);
    } else {
      setSosList(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarSOS();
  }, []);

  const filtrados = useMemo(() => {
    const q = (busca || "").toLowerCase();
    if (!q) return sosList;
    return sosList.filter((s) => {
      const comp = `${s.numero_sos} ${s.veiculo} ${s.motorista_nome || ""} ${s.linha || ""} ${s.local_ocorrencia || ""} ${s.avaliador || ""}`.toLowerCase();
      return comp.includes(q);
    });
  }, [busca, sosList]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Central de SOS — Etiquetas Finalizadas</h1>
        <button
          onClick={carregarSOS}
          className="px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Atualizar
        </button>
      </div>

      {/* Barra de busca */}
      <div className="bg-white rounded-lg shadow mb-5 p-4 flex items-center gap-2">
        <FaSearch />
        <input
          className="flex-1 outline-none"
          placeholder="Buscar por número, veículo, motorista, linha, local..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
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
              <th className="py-3 px-4 text-left text-sm font-semibold">Procedência</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Ocorrência</th>
              <th className="py-3 px-4 text-center text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-6 text-gray-600">
                  Carregando SOS...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-6 text-gray-600">
                  Nenhuma SOS finalizada encontrada.
                </td>
              </tr>
            ) : (
              filtrados.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{a.numero_sos}</td>
                  <td className="py-3 px-4">
                    {a.data_fechamento
                      ? new Date(a.data_fechamento).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="py-3 px-4">{a.veiculo}</td>
                  <td className="py-3 px-4">{a.motorista_nome}</td>
                  <td className="py-3 px-4">{a.linha}</td>
                  <td className="py-3 px-4">{a.local_ocorrencia}</td>
                  <td className="py-3 px-4">{a.avaliador || a.responsavel_manutencao || "-"}</td>
                  <td className="py-3 px-4">{a.procedencia_socorrista || "-"}</td>
                  <td className="py-3 px-4">{a.ocorrencia || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm flex items-center justify-center gap-2 transition"
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

      {selected && <DetalhesModal sos={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// 🔹 Modal de Detalhes
function DetalhesModal({ sos, onClose }) {
  const defeitos = sos.manutencao_defeitos || [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl animate-fadeIn overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-100 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            SOS #{sos.numero_sos} — Detalhes do Fechamento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <section className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Informações Gerais
            </h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
              <p><b>Data:</b> {new Date(sos.data_fechamento).toLocaleString("pt-BR")}</p>
              <p><b>Veículo:</b> {sos.veiculo}</p>
              <p><b>Motorista:</b> {sos.motorista_nome}</p>
              <p><b>Linha:</b> {sos.linha}</p>
              <p><b>Local:</b> {sos.local_ocorrencia}</p>
              <p><b>Avaliador:</b> {sos.avaliador || sos.responsavel_manutencao || "-"}</p>
              <p><b>Procedência:</b> {sos.procedencia_socorrista || "-"}</p>
              <p><b>Ocorrência:</b> {sos.ocorrencia || "-"}</p>
              <p><b>Carro Substituto:</b> {sos.carro_substituto || "-"}</p>
              <p><b>SR Operação:</b> {sos.sr_numero || "-"}</p>
            </div>
          </section>

          {defeitos.length > 0 && (
            <section className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Defeitos tratados pela manutenção
              </h3>
              <ul className="space-y-2">
                {defeitos.map((d, idx) => (
                  <li key={idx} className="border rounded p-2 bg-gray-50 text-sm">
                    <b>{d.setor_macro}</b> • {d.grupo} • {d.defeito}
                    {d.observacao && (
                      <p className="text-xs text-gray-600 mt-1">
                        Obs: {d.observacao}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
