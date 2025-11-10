// src/pages/SOSTratamento.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { FaSearch, FaTools, FaTimes, FaPlus, FaTrash, FaCheckCircle } from "react-icons/fa";

/**
 * Requisitos atendidos:
 * - Lista todos os SOS com status = 'Em Andamento'
 * - Ao abrir um SOS, mostra detalhes e permite selecionar Setor -> Grupo -> Defeito (cascata)
 *   a partir da tabela 'sos_manutencao_catalogo' (colunas: setor_macro, grupo, defeito).
 * - Permite adicionar múltiplos defeitos (com observação opcional), remover antes de salvar.
 * - Ao salvar:
 *   1) Tenta inserir cada defeito em 'sos_manutencao_tratadas' (sugestão de schema abaixo).
 *   2) Se a tabela não existir, salva fallback em 'sos_acionamentos.manutencao_defeitos' (JSONB)
 *      e atualiza status para 'Fechado'.
 *
 * Sugestão de schema (recomendado) para 'sos_manutencao_tratadas':
 *  - id (pk, bigint)
 *  - sos_id (uuid ou bigint, conforme sua pk)
 *  - numero_sos (int)
 *  - setor_macro (text)
 *  - grupo (text)
 *  - defeito (text)
 *  - observacao (text)
 *  - criado_por (text)         // opcional
 *  - criado_em (timestamptz)
 */

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
        plantonista,
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
      const comp =
        `${s.numero_sos} ${s.veiculo} ${s.motorista_nome || ""} ${s.linha || ""} ${s.local_ocorrencia || ""} ${s.reclamacao_motorista || ""}`.toLowerCase();
      return comp.includes(q);
    });
  }, [busca, sosList]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaTools className="opacity-80" /> Tratamento de SOS pela Manutenção
        </h1>
        <button
          onClick={carregarSOS}
          className="px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Atualizar
        </button>
      </div>

      {/* Barra de busca */}
      <div className="bg-white rounded-lg shadow mb-5 p-4">
        <div className="flex items-center gap-2">
          <FaSearch />
          <input
            className="flex-1 outline-none"
            placeholder="Buscar por número, veículo, motorista, linha, local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
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
                <h3 className="text-lg font-semibold text-gray-800">
                  SOS #{s.numero_sos}
                </h3>
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  {s.status}
                </span>
              </div>
              <div className="p-5 space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Data:</span>{" "}
                  {new Date(s.created_at).toLocaleString("pt-BR")}
                </p>
                <p>
                  <span className="font-medium">Veículo:</span> {s.veiculo}
                </p>
                <p>
                  <span className="font-medium">Motorista:</span>{" "}
                  {s.motorista_id ? `${s.motorista_id} - ` : ""}
                  {s.motorista_nome}
                </p>
                <p>
                  <span className="font-medium">Linha:</span> {s.linha || "-"}
                </p>
                <p>
                  <span className="font-medium">Local:</span>{" "}
                  {s.local_ocorrencia || "-"}
                </p>
                <p className="line-clamp-2">
                  <span className="font-medium">Reclamação:</span>{" "}
                  {s.reclamacao_motorista || "-"}
                </p>
                <div className="pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(s);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2"
                  >
                    <FaTools /> Tratar Etiqueta
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <TratamentoModal
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

function TratamentoModal({ sos, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [setores, setSetores] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [defeitos, setDefeitos] = useState([]);

  const [selSetor, setSelSetor] = useState("");
  const [selGrupo, setSelGrupo] = useState("");
  const [selDefeito, setSelDefeito] = useState("");
  const [observacao, setObservacao] = useState("");

  const [lista, setLista] = useState([]); // [{setor_macro, grupo, defeito, observacao}]
  const [responsavel, setResponsavel] = useState(""); // opcional para log

  // Carrega todos os setores disponíveis (distinct)
  async function carregarSetores() {
    const { data, error } = await supabase
      .from("sos_manutencao_catalogo")
      .select("setor_macro")
      .order("setor_macro", { ascending: true });
    if (error) {
      alert("Erro ao carregar setores: " + error.message);
      return;
    }
    const uniques = Array.from(new Set((data || []).map((d) => d.setor_macro))).filter(Boolean);
    setSetores(uniques);
  }

  // Carrega grupos conforme setor
  async function carregarGrupos(setor_macro) {
    setGrupos([]);
    setDefeitos([]);
    setSelGrupo("");
    setSelDefeito("");
    if (!setor_macro) return;
    const { data, error } = await supabase
      .from("sos_manutencao_catalogo")
      .select("grupo")
      .eq("setor_macro", setor_macro)
      .order("grupo", { ascending: true });
    if (error) {
      alert("Erro ao carregar grupos: " + error.message);
      return;
    }
    const uniques = Array.from(new Set((data || []).map((d) => d.grupo))).filter(Boolean);
    setGrupos(uniques);
  }

  // Carrega defeitos conforme setor + grupo
  async function carregarDefeitos(setor_macro, grupo) {
    setDefeitos([]);
    setSelDefeito("");
    if (!setor_macro || !grupo) return;
    const { data, error } = await supabase
      .from("sos_manutencao_catalogo")
      .select("defeito")
      .eq("setor_macro", setor_macro)
      .eq("grupo", grupo)
      .order("defeito", { ascending: true });
    if (error) {
      alert("Erro ao carregar defeitos: " + error.message);
      return;
    }
    const uniques = Array.from(new Set((data || []).map((d) => d.defeito))).filter(Boolean);
    setDefeitos(uniques);
  }

  useEffect(() => {
    carregarSetores();
  }, []);

  // handlers cascata
  function onChangeSetor(val) {
    setSelSetor(val);
    carregarGrupos(val);
  }
  function onChangeGrupo(val) {
    setSelGrupo(val);
    carregarDefeitos(selSetor, val);
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

  function removeDefeito(idx) {
    setLista((old) => old.filter((_, i) => i !== idx));
  }

  async function salvarTratamento() {
    if (lista.length === 0) {
      alert("Adicione pelo menos um defeito para salvar.");
      return;
    }

    setSaving(true);

    // 1) Tenta inserir cada item na tabela recomendada 'sos_manutencao_tratadas'
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
      let insertOk = true;

      // Tenta inserir (caso a tabela exista)
      const { error: insErr } = await supabase
        .from("sos_manutencao_tratadas")
        .insert(registros);

      if (insErr) {
        // Se erro for por a tabela não existir ou permissão, faz fallback
        insertOk = false;
      }

      if (!insertOk) {
        // Fallback: salva jsonb em 'sos_acionamentos.manutencao_defeitos'
        const { error: upErr } = await supabase
          .from("sos_acionamentos")
          .update({
            manutencao_defeitos: registros, // jsonb
          })
          .eq("id", sos.id);
        if (upErr) throw upErr;
      }

      // Atualiza status para "Fechado"
      const { error: stErr } = await supabase
        .from("sos_acionamentos")
        .update({
          status: "Fechado",
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", sos.id);

      if (stErr) throw stErr;

      alert("Tratamento salvo com sucesso ✅");
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar tratamento: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Tratar Etiqueta — SOS #{sos.numero_sos}
            </h2>
            <p className="text-xs text-gray-500">
              Criado em {new Date(sos.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
            title="Fechar"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 space-y-6">
          {/* Detalhes do SOS */}
          <section className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Detalhes da Etiqueta
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Veículo: </span>
                {sos.veiculo}
              </p>
              <p>
                <span className="font-medium">Motorista: </span>
                {sos.motorista_id ? `${sos.motorista_id} - ` : ""}
                {sos.motorista_nome || "-"}
              </p>
              <p>
                <span className="font-medium">Linha: </span>
                {sos.linha || "-"}
              </p>
              <p>
                <span className="font-medium">Local: </span>
                {sos.local_ocorrencia || "-"}
              </p>
              <p className="md:col-span-2">
                <span className="font-medium">Reclamação: </span>
                {sos.reclamacao_motorista || "-"}
              </p>
            </div>
          </section>

          {/* Responsável (opcional) */}
          <section className="bg-white border rounded-lg p-4">
            <label className="block text-sm text-gray-600 mb-1">
              Responsável técnico (opcional)
            </label>
            <input
              className="w-full border rounded p-2"
              placeholder="Ex: Fernando, Natalia..."
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </section>

          {/* Cascata: Setor -> Grupo -> Defeito */}
          <section className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Adicionar defeitos (cascata)
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Setor Macro
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={selSetor}
                  onChange={(e) => onChangeSetor(e.target.value)}
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
                <label className="block text-xs text-gray-500 mb-1">Grupo</label>
                <select
                  className="w-full border rounded p-2"
                  value={selGrupo}
                  onChange={(e) => onChangeGrupo(e.target.value)}
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
                <label className="block text-xs text-gray-500 mb-1">Defeito</label>
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

            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">
                Observação (opcional)
              </label>
              <textarea
                rows="2"
                className="w-full border rounded p-2"
                placeholder="Descreva observações da manutenção, se necessário..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <button
                onClick={addDefeito}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                <FaPlus /> Adicionar
              </button>
            </div>
          </section>

          {/* Lista de defeitos adicionados */}
          <section className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Defeitos adicionados
            </h3>

            {lista.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum defeito adicionado.</p>
            ) : (
              <ul className="divide-y">
                {lista.map((item, idx) => (
                  <li key={idx} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.setor_macro} • {item.grupo} • {item.defeito}
                      </p>
                      {item.observacao && (
                        <p className="text-xs text-gray-600 mt-1">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-red-600 hover:text-red-700"
                      title="Remover"
                      onClick={() => removeDefeito(idx)}
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm bg-white border hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={salvarTratamento}
            disabled={saving || lista.length === 0}
            className="px-4 py-2 rounded-md text-sm text-white bg-green-600 hover:bg-green-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            <FaCheckCircle />
            {saving ? "Salvando..." : "Confirmar Tratamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
