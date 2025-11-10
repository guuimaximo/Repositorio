// src/pages/SOSTratamento.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaTools, FaTimes, FaPlus, FaTrash, FaCheckCircle } from "react-icons/fa";

export default function SOSTratamento() {
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [sosList, setSosList] = useState([]);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Em Andamento")
      .order("created_at", { ascending: false });

    if (error) alert("Erro ao carregar SOS: " + error.message);
    else setSosList(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarSOS();
  }, []);

  const filtrados = useMemo(() => {
    const q = (busca || "").toLowerCase();
    if (!q) return sosList;
    return sosList.filter((s) => {
      const comp = `${s.numero_sos} ${s.veiculo} ${s.motorista_nome || ""} ${s.linha || ""} ${s.local_ocorrencia || ""} ${s.reclamacao_motorista || ""}`.toLowerCase();
      return comp.includes(q);
    });
  }, [busca, sosList]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaTools className="opacity-80" /> Tratamento de SOS
        </h1>
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

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-gray-600 py-8">
            Carregando etiquetas em andamento...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="col-span-full text-center text-gray-600 py-8">
            Nenhuma etiqueta <b>Em Andamento</b> encontrada.
          </div>
        ) : (
          filtrados.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer border border-gray-100"
              onClick={() => setSelected(s)}
            >
              <div className="px-5 py-4 border-b bg-gray-50 rounded-t-lg flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">SOS #{s.numero_sos}</h3>
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  {s.status}
                </span>
              </div>
              <div className="p-5 space-y-2 text-sm text-gray-700">
                <p><span className="font-medium">Data:</span> {new Date(s.created_at).toLocaleString("pt-BR")}</p>
                <p><span className="font-medium">Veículo:</span> {s.veiculo}</p>
                <p><span className="font-medium">Motorista:</span> {s.motorista_nome}</p>
                <p><span className="font-medium">Linha:</span> {s.linha || "-"}</p>
                <p><span className="font-medium">Local:</span> {s.local_ocorrencia || "-"}</p>
                <p className="line-clamp-2">
                  <span className="font-medium">Reclamação:</span> {s.reclamacao_motorista || "-"}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(s);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 mt-3"
                >
                  <FaTools /> Tratar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <TratamentoModal
          sos={selected}
          onClose={() => setSelected(null)}
          onSaved={carregarSOS}
        />
      )}
    </div>
  );
}

// Modal de Tratamento
function TratamentoModal({ sos, onClose, onSaved }) {
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

  // Carregar opções
  useEffect(() => {
    async function carregarSetores() {
      const { data } = await supabase.from("sos_manutencao_catalogo").select("setor_macro");
      const uniques = Array.from(new Set((data || []).map((d) => d.setor_macro))).filter(Boolean);
      setSetores(uniques);
    }
    carregarSetores();
  }, []);

  async function carregarGrupos(setor) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("grupo")
      .eq("setor_macro", setor);
    const uniques = Array.from(new Set((data || []).map((d) => d.grupo))).filter(Boolean);
    setGrupos(uniques);
  }

  async function carregarDefeitos(setor, grupo) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("defeito")
      .eq("setor_macro", setor)
      .eq("grupo", grupo);
    const uniques = Array.from(new Set((data || []).map((d) => d.defeito))).filter(Boolean);
    setDefeitos(uniques);
  }

  function addDefeito() {
    if (!selSetor || !selGrupo || !selDefeito) {
      alert("Selecione setor, grupo e defeito");
      return;
    }
    setLista((prev) => [
      ...prev,
      { setor_macro: selSetor, grupo: selGrupo, defeito: selDefeito, observacao },
    ]);
    setObservacao("");
    setSelDefeito("");
  }

  async function salvar() {
    if (lista.length === 0) return alert("Adicione ao menos um defeito!");
    setSaving(true);

    const { error } = await supabase
      .from("sos_acionamentos")
      .update({
        manutencao_defeitos: lista,
        responsavel_manutencao: responsavel,
        status: "Fechado",
        data_fechamento: new Date().toISOString(),
      })
      .eq("id", sos.id);

    setSaving(false);

    if (error) alert("Erro ao salvar: " + error.message);
    else {
      alert("Tratamento salvo com sucesso ✅");
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Tratamento — SOS #{sos.numero_sos}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Dados principais */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm"><b>Veículo:</b> {sos.veiculo}</p>
            <p className="text-sm"><b>Motorista:</b> {sos.motorista_nome}</p>
            <p className="text-sm"><b>Local:</b> {sos.local_ocorrencia}</p>
            <p className="text-sm"><b>Reclamação:</b> {sos.reclamacao_motorista}</p>
          </div>

          {/* Responsável */}
          <div>
            <label className="text-sm text-gray-600">Responsável técnico</label>
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Ex: Fernando, Clécio..."
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          {/* Cascata */}
          <div className="grid md:grid-cols-3 gap-4">
            <select
              className="border rounded p-2"
              value={selSetor}
              onChange={(e) => {
                setSelSetor(e.target.value);
                carregarGrupos(e.target.value);
              }}
            >
              <option value="">Setor</option>
              {setores.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={selGrupo}
              onChange={(e) => {
                setSelGrupo(e.target.value);
                carregarDefeitos(selSetor, e.target.value);
              }}
              disabled={!selSetor}
            >
              <option value="">Grupo</option>
              {grupos.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={selDefeito}
              onChange={(e) => setSelDefeito(e.target.value)}
              disabled={!selGrupo}
            >
              <option value="">Defeito</option>
              {defeitos.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <textarea
            rows="2"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observação opcional"
            className="w-full border rounded p-2"
          ></textarea>

          <button
            onClick={addDefeito}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <FaPlus /> Adicionar defeito
          </button>

          {lista.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Defeitos adicionados</h4>
              <ul className="space-y-2">
                {lista.map((item, idx) => (
                  <li key={idx} className="flex justify-between bg-gray-50 border p-2 rounded">
                    <div>
                      <p className="text-sm font-medium">
                        {item.setor_macro} • {item.grupo} • {item.defeito}
                      </p>
                      {item.observacao && (
                        <p className="text-xs text-gray-600">Obs: {item.observacao}</p>
                      )}
                    </div>
                    <button
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setLista(lista.filter((_, i) => i !== idx))}
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border rounded-md">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"
          >
            <FaCheckCircle />
            {saving ? "Salvando..." : "Confirmar Tratamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
