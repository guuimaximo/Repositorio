// src/pages/SOSTratamento.jsx
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase";
import {
  FaSearch,
  FaTools,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

export default function SOSTratamento() {
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [sosList, setSosList] = useState([]);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select(
        `
        id,
        numero_sos,
        created_at,
        veiculo,
        motorista_nome,
        motorista_id,
        linha,
        local_ocorrencia,
        reclamacao_motorista,
        status
      `
      )
      .eq("status", "Em Andamento")
      .order("created_at", { ascending: false });

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
      const comp = `${s.numero_sos} ${s.veiculo} ${s.motorista_nome || ""} ${
        s.linha || ""
      } ${s.local_ocorrencia || ""} ${s.reclamacao_motorista || ""}`.toLowerCase();
      return comp.includes(q);
    });
  }, [busca, sosList]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Tratamento de SOS pela Manutenção
      </h1>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm w-full max-w-md">
          <FaSearch className="text-gray-500" />
          <input
            className="flex-1 outline-none text-sm"
            placeholder="Buscar por número, veículo, motorista, linha, local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          onClick={carregarSOS}
          className="ml-4 px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-blue-600 text-white text-sm">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Prefixo</th>
              <th className="px-4 py-3">Motorista</th>
              <th className="px-4 py-3">Linha</th>
              <th className="px-4 py-3">Local</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-6 text-gray-500 italic"
                >
                  Carregando etiquetas em andamento...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-6 text-gray-500 italic"
                >
                  Nenhuma etiqueta <b>Em Andamento</b> encontrada.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => (
                <tr
                  key={s.id}
                  className="border-t hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="px-4 py-3">{s.numero_sos}</td>
                  <td className="px-4 py-3">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{s.veiculo}</td>
                  <td className="px-4 py-3">
                    {s.motorista_nome || "-"}
                  </td>
                  <td className="px-4 py-3">{s.linha || "-"}</td>
                  <td className="px-4 py-3">{s.local_ocorrencia || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelected(s)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-3 py-1.5 rounded flex items-center gap-2 justify-center mx-auto"
                    >
                      <FaTools /> Tratar SOS
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ModalTratamento
          sos={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            carregarSOS();
          }}
        />
      )}
    </div>
  );
}

// =================== MODAL TRATAMENTO ===================
function ModalTratamento({ sos, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [setores, setSetores] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [defeitos, setDefeitos] = useState([]);
  const [selSetor, setSelSetor] = useState("");
  const [selGrupo, setSelGrupo] = useState("");
  const [selDefeito, setSelDefeito] = useState("");
  const [observacao, setObservacao] = useState("");
  const [lista, setLista] = useState([]);
  const [responsavel, setResponsavel] = useState("");

  useEffect(() => {
    carregarSetores();
  }, []);

  async function carregarSetores() {
    const { data, error } = await supabase
      .from("sos_manutencao_catalogo")
      .select("setor_macro")
      .order("setor_macro", { ascending: true });
    if (!error) {
      const uniques = Array.from(
        new Set((data || []).map((d) => d.setor_macro))
      ).filter(Boolean);
      setSetores(uniques);
    }
  }

  async function carregarGrupos(setor_macro) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("grupo")
      .eq("setor_macro", setor_macro);
    setGrupos(
      Array.from(new Set(data.map((d) => d.grupo))).filter(Boolean)
    );
  }

  async function carregarDefeitos(setor_macro, grupo) {
    const { data } = await supabase
      .from("sos_manutencao_catalogo")
      .select("defeito")
      .eq("setor_macro", setor_macro)
      .eq("grupo", grupo);
    setDefeitos(
      Array.from(new Set(data.map((d) => d.defeito))).filter(Boolean)
    );
  }

  function addDefeito() {
    if (!selSetor || !selGrupo || !selDefeito) {
      alert("Selecione Setor, Grupo e Defeito.");
      return;
    }
    const novo = {
      setor_macro: selSetor,
      grupo: selGrupo,
      defeito: selDefeito,
      observacao: observacao?.trim() || null,
    };
    setLista((old) => [...old, novo]);
    setSelDefeito("");
    setObservacao("");
  }

  async function salvar() {
    if (lista.length === 0) {
      alert("Adicione pelo menos um defeito.");
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

    try {
      await supabase.from("sos_manutencao_tratadas").insert(registros);
      await supabase
        .from("sos_acionamentos")
        .update({
          status: "Fechado",
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", sos.id);
      alert("Tratamento salvo com sucesso ✅");
      onSaved();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b px-6 py-4 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            Tratar SOS #{sos.numero_sos}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-600"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* SCROLL CONTENT */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700">
            <p>
              <b>Veículo:</b> {sos.veiculo} &nbsp;&nbsp;
              <b>Motorista:</b> {sos.motorista_nome}
            </p>
            <p>
              <b>Linha:</b> {sos.linha || "-"} &nbsp;&nbsp;
              <b>Local:</b> {sos.local_ocorrencia || "-"}
            </p>
            <p>
              <b>Reclamação:</b> {sos.reclamacao_motorista || "-"}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600">Responsável técnico</label>
            <input
              className="w-full border rounded p-2 mt-1"
              placeholder="Ex: Fernando, Natalia..."
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500">Setor</label>
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
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Grupo</label>
              <select
                className="w-full border rounded p-2"
                value={selGrupo}
                disabled={!selSetor}
                onChange={(e) => {
                  setSelGrupo(e.target.value);
                  carregarDefeitos(selSetor, e.target.value);
                }}
              >
                <option value="">Selecione...</option>
                {grupos.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Defeito</label>
              <select
                className="w-full border rounded p-2"
                value={selDefeito}
                disabled={!selGrupo}
                onChange={(e) => setSelDefeito(e.target.value)}
              >
                <option value="">Selecione...</option>
                {defeitos.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            rows="2"
            className="w-full border rounded p-2 mt-2 text-sm"
            placeholder="Observação (opcional)..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          <button
            onClick={addDefeito}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <FaPlus /> Adicionar Defeito
          </button>

          <div className="bg-white border rounded-lg p-3">
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              Defeitos adicionados
            </h3>
            {lista.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum defeito adicionado.</p>
            ) : (
              <ul className="divide-y">
                {lista.map((item, i) => (
                  <li
                    key={i}
                    className="py-2 flex justify-between items-center text-sm"
                  >
                    <div>
                      <p>
                        {item.setor_macro} • {item.grupo} • {item.defeito}
                      </p>
                      {item.observacao && (
                        <p className="text-xs text-gray-600">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-red-600 hover:text-red-700"
                      onClick={() =>
                        setLista((old) => old.filter((_, idx) => idx !== i))
                      }
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving || lista.length === 0}
            className="px-4 py-2 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
          >
            <FaCheckCircle />
            {saving ? "Salvando..." : "Confirmar Tratamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
