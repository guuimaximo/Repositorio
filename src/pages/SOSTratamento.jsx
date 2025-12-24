// src/pages/SOSTratamento.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaTools, FaCheckCircle, FaTimes } from "react-icons/fa";

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
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <FaTools /> Tratamento de Interveção — Manutenção
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
              {/* ✅ NOVA COLUNA */}
              <th className="py-3 px-4 text-left text-sm font-semibold">Ocorrência</th>
              <th className="py-3 px-4 text-center text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-600">
                  Carregando acionamento em andamento...
                </td>
              </tr>
            ) : acionamentos.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-600">
                  Nenhuma acionamento em andamento.
                </td>
              </tr>
            ) : (
              acionamentos.map((a) => (
                <tr
                  key={a.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">{a.numero_sos}</td>
                  <td className="py-3 px-4">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">{a.veiculo}</td>
                  <td className="py-3 px-4">{a.motorista_nome}</td>
                  <td className="py-3 px-4">{a.linha}</td>
                  <td className="py-3 px-4">{a.local_ocorrencia}</td>
                  {/* ✅ NOVA COLUNA */}
                  <td className="py-3 px-4">{a.ocorrencia}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm flex items-center justify-center gap-2 transition"
                    >
                      <FaTools /> Tratar Acionamento
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

// 🟦 Modal de Tratamento da Manutenção
function TratamentoModal({ sos, onClose, onAtualizar }) {
  const [form, setForm] = useState({
    setor_manutencao: "",
    grupo_manutencao: "",
    problema_encontrado: "",
    solucao: "",
    solucionador: "",
  });
  const [saving, setSaving] = useState(false);
  const [catalogo, setCatalogo] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [defeitos, setDefeitos] = useState([]);

  useEffect(() => {
    async function carregarCatalogo() {
      const { data } = await supabase
        .from("sos_manutencao_catalogo")
        .select("*")
        .order("setor_macro", { ascending: true });
      setCatalogo(data || []);
    }
    carregarCatalogo();
  }, []);

  function handleSetorChange(setor) {
    setForm({
      ...form,
      setor_manutencao: setor,
      grupo_manutencao: "",
      problema_encontrado: "",
    });
    const gruposUnicos = Array.from(
      new Set(catalogo.filter((c) => c.setor_macro === setor).map((c) => c.grupo))
    );
    setGrupos(gruposUnicos);
  }

  function handleGrupoChange(grupo) {
    setForm({ ...form, grupo_manutencao: grupo, problema_encontrado: "" });
    const defeitosUnicos = Array.from(
      new Set(
        catalogo
          .filter(
            (c) => c.setor_macro === form.setor_manutencao && c.grupo === grupo
          )
          .map((c) => c.defeito)
      )
    );
    setDefeitos(defeitosUnicos);
  }

  async function salvarTratamento() {
    if (
      !form.setor_manutencao ||
      !form.grupo_manutencao ||
      !form.problema_encontrado ||
      !form.solucionador
    ) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("sos_acionamentos")
      .update({
        setor_manutencao: form.setor_manutencao,
        grupo_manutencao: form.grupo_manutencao,
        problema_encontrado: form.problema_encontrado,
        solucao: form.solucao,
        solucionador: form.solucionador,
        data_fechamento: new Date().toISOString(),
        status: "Fechado",
      })
      .eq("id", sos.id);

    setSaving(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Tratamento salvo com sucesso ✅");
    onAtualizar();
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-100 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            Tratamento do SOS #{sos.numero_sos}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Setor */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Setor de Manutenção
              </label>
              <select
                className="w-full border rounded p-2"
                value={form.setor_manutencao}
                onChange={(e) => handleSetorChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {Array.from(new Set(catalogo.map((c) => c.setor_macro))).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Grupo */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">Grupo</label>
              <select
                className="w-full border rounded p-2"
                value={form.grupo_manutencao}
                onChange={(e) => handleGrupoChange(e.target.value)}
                disabled={!form.setor_manutencao}
              >
                <option value="">Selecione...</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Defeito */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Problema encontrado
            </label>
            <select
              className="w-full border rounded p-2"
              value={form.problema_encontrado}
              onChange={(e) =>
                setForm({ ...form, problema_encontrado: e.target.value })
              }
              disabled={!form.grupo_manutencao}
            >
              <option value="">Selecione...</option>
              {defeitos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Solução */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Solução aplicada
            </label>
            <textarea
              className="w-full border rounded p-2"
              rows="2"
              placeholder="Descreva a ação ou serviço realizado..."
              value={form.solucao}
              onChange={(e) => setForm({ ...form, solucao: e.target.value })}
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Responsável pela manutenção
            </label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={form.solucionador}
              onChange={(e) => setForm({ ...form, solucionador: e.target.value })}
              placeholder="Ex: Fernando, Clécio..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={salvarTratamento}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition"
          >
            <FaCheckCircle />
            {saving ? "Salvando..." : "Confirmar Tratamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
