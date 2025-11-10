// src/pages/SOSTratamento.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaTools, FaTimes, FaPlus, FaTrash, FaCheckCircle } from "react-icons/fa";

export default function SOSTratamento() {
  const [acionamentos, setAcionamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Em Andamento")
      .order("created_at", { ascending: false });

    if (!error) setAcionamentos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarSOS();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Tratamento de Interveção - Manutenção
      </h1>

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
              <th className="py-3 px-4 text-center text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Carregando SOS em andamento...
                </td>
              </tr>
            ) : acionamentos.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Nenhuma Interveção em andamento ⚙️
                </td>
              </tr>
            ) : (
              acionamentos.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{a.numero_sos}</td>
                  <td className="py-3 px-4">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">{a.veiculo}</td>
                  <td className="py-3 px-4">{a.motorista_nome}</td>
                  <td className="py-3 px-4">{a.linha}</td>
                  <td className="py-3 px-4">{a.local_ocorrencia}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-3 py-1.5 rounded-md text-sm flex items-center justify-center gap-2 transition"
                    >
                      <FaTools /> Tratar Intervenção
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <TratamentoModal
          sos={selected}
          onClose={() => setSelected(null)}
          onAtualizar={carregarSOS}
        />
      )}
    </div>
  );
}

// 🟨 Modal para tratar o SOS (adicionar defeitos em cascata)
function TratamentoModal({ sos, onClose, onAtualizar }) {
  const [setores, setSetores] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [defeitos, setDefeitos] = useState([]);
  const [selSetor, setSelSetor] = useState("");
  const [selGrupo, setSelGrupo] = useState("");
  const [selDefeito, setSelDefeito] = useState("");
  const [observacao, setObservacao] = useState("");
  const [lista, setLista] = useState([]);
  const [responsavel, setResponsavel] = useState("");
  const [saving, setSaving] = useState(false);

  async function carregarSetores() {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("setor_macro")
      .order("setor_macro", { ascending: true });
    const uniques = Array.from(new Set((data || []).map((d) => d.setor_macro)));
    setSetores(uniques);
  }

  async function carregarGrupos(setor_macro) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("grupo")
      .eq("setor_macro", setor_macro);
    const uniques = Array.from(new Set((data || []).map((d) => d.grupo)));
    setGrupos(uniques);
  }

  async function carregarDefeitos(setor_macro, grupo) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("defeito")
      .eq("setor_macro", setor_macro)
      .eq("grupo", grupo);
    const uniques = Array.from(new Set((data || []).map((d) => d.defeito)));
    setDefeitos(uniques);
  }

  useEffect(() => {
    carregarSetores();
  }, []);

  const addDefeito = () => {
    if (!selSetor || !selGrupo || !selDefeito) {
      alert("Selecione setor, grupo e defeito!");
      return;
    }
    const novo = {
      setor_macro: selSetor,
      grupo: selGrupo,
      defeito: selDefeito,
      observacao: observacao || null,
    };
    setLista([...lista, novo]);
    setSelDefeito("");
    setObservacao("");
  };

  const salvar = async () => {
    if (lista.length === 0) {
      alert("Adicione pelo menos um defeito!");
      return;
    }

    setSaving(true);
    const registros = lista.map((d) => ({
      sos_id: sos.id,
      numero_sos: sos.numero_sos,
      setor_macro: d.setor_macro,
      grupo: d.grupo,
      defeito: d.defeito,
      observacao: d.observacao,
      criado_por: responsavel || null,
      criado_em: new Date().toISOString(),
    }));

    const { error } = await supabase.from("sos_manutencao_tratadas").insert(registros);
    if (!error) {
      await supabase
        .from("sos_acionamentos")
        .update({ status: "Fechado", data_fechamento: new Date().toISOString() })
        .eq("id", sos.id);
      alert("Tratamento salvo com sucesso ✅");
      onAtualizar();
      onClose();
    } else alert("Erro ao salvar: " + error.message);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b bg-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Tratar SOS #{sos.numero_sos}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            <strong>Veículo:</strong> {sos.veiculo} <br />
            <strong>Motorista:</strong> {sos.motorista_nome} <br />
            <strong>Local:</strong> {sos.local_ocorrencia}
          </p>

          <div>
            <label className="block text-sm mb-1">Responsável Técnico</label>
            <input
              className="w-full border rounded p-2"
              placeholder="Ex: Fernando, Natalia..."
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm">Setor Macro</label>
              <select
                className="w-full border rounded p-2"
                value={selSetor}
                onChange={(e) => {
                  setSelSetor(e.target.value);
                  carregarGrupos(e.target.value);
                }}
              >
                <option value="">Selecione...</option>
                {setores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Grupo</label>
              <select
                className="w-full border rounded p-2"
                value={selGrupo}
                onChange={(e) => {
                  setSelGrupo(e.target.value);
                  carregarDefeitos(selSetor, e.target.value);
                }}
                disabled={!selSetor}
              >
                <option value="">Selecione...</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Defeito</label>
              <select
                className="w-full border rounded p-2"
                value={selDefeito}
                onChange={(e) => setSelDefeito(e.target.value)}
                disabled={!selGrupo}
              >
                <option value="">Selecione...</option>
                {defeitos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            rows="2"
            className="w-full border rounded p-2"
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          <button
            onClick={addDefeito}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <FaPlus /> Adicionar
          </button>

          {lista.length > 0 && (
            <ul className="divide-y border rounded mt-3">
              {lista.map((l, i) => (
                <li key={i} className="p-2 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {l.setor_macro} • {l.grupo} • {l.defeito}
                    </p>
                    {l.observacao && (
                      <p className="text-xs text-gray-600">{l.observacao}</p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setLista((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-red-600 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={salvar}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaCheckCircle />
            {saving ? "Salvando..." : "Confirmar Tratamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
