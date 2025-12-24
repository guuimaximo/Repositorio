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

              {/* ✅ ALTERADO: Local -> Reclamação */}
              <th className="py-3 px-4 text-left text-sm font-semibold">Reclamação</th>

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

                  {/* ✅ ALTERADO: agora mostra a coluna reclamacao_motorista */}
                  <td className="py-3 px-4">{a.reclamacao_motorista}</td>

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

// ===============================
// Campo de Mecânico (seleção) - ATUALIZADO
// ===============================
// Busca na tabela: "motoristas"
// Filtra: cargo NÃO inicia com "MOTORISTA"
// Colunas: chapa, nome, cargo
function CampoMecanico({ value, onChange }) {
  const [busca, setBusca] = useState(value?.nome || value?.chapa || "");
  const [opcoes, setOpcoes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBusca(value?.nome || value?.chapa || "");
  }, [value?.nome, value?.chapa]);

  useEffect(() => {
    let alive = true;

    async function buscar() {
      const termo = (busca || "").trim();
      if (termo.length < 2) {
        setOpcoes([]);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("motoristas")
        .select("chapa, nome, cargo")
        .not("cargo", "ilike", "MOTORISTA%")
        .or(`nome.ilike.%${termo}%,chapa.ilike.%${termo}%`)
        .order("nome", { ascending: true })
        .limit(10);

      if (!alive) return;

      setLoading(false);

      if (error) {
        console.error("Erro ao buscar colaboradores:", error);
        setOpcoes([]);
        return;
      }

      setOpcoes(data || []);
    }

    buscar();
    return () => {
      alive = false;
    };
  }, [busca]);

  function selecionar(m) {
    onChange({ chapa: m.chapa, nome: m.nome });
    setOpcoes([]);
    setBusca(m.nome || m.chapa);
  }

  function limpar() {
    onChange({ chapa: "", nome: "" });
    setBusca("");
    setOpcoes([]);
  }

  return (
    <div className="relative">
      <label className="block text-sm text-gray-500 mb-1">
        Mecânico Executor <span className="text-red-600">*</span>
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder="Digite nome ou chapa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          type="button"
          onClick={limpar}
          className="border rounded px-3 text-sm hover:bg-gray-50"
        >
          Limpar
        </button>
      </div>

      {loading && <div className="text-xs text-gray-500 mt-1">Buscando...</div>}

      {opcoes.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white border rounded shadow-lg overflow-hidden">
          {opcoes.map((m) => (
            <button
              key={m.chapa}
              type="button"
              onClick={() => selecionar(m)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-800">{m.nome}</div>
              <div className="text-xs text-gray-500">
                Chapa: {m.chapa} • {m.cargo}
              </div>
            </button>
          ))}
        </div>
      )}

      {value?.chapa || value?.nome ? (
        <div className="mt-2 text-xs text-gray-600">
          Selecionado: <strong>{value.nome}</strong> (Chapa {value.chapa})
        </div>
      ) : null}
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

    // ✅ NOVOS CAMPOS
    mecanico_executor: { chapa: "", nome: "" },
    numero_os_corretiva: "",
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
    setForm((prev) => ({
      ...prev,
      setor_manutencao: setor,
      grupo_manutencao: "",
      problema_encontrado: "",
    }));

    const gruposUnicos = Array.from(
      new Set(catalogo.filter((c) => c.setor_macro === setor).map((c) => c.grupo))
    );
    setGrupos(gruposUnicos);
  }

  function handleGrupoChange(grupo) {
    setForm((prev) => ({ ...prev, grupo_manutencao: grupo, problema_encontrado: "" }));

    const defeitosUnicos = Array.from(
      new Set(
        catalogo
          .filter((c) => c.setor_macro === form.setor_manutencao && c.grupo === grupo)
          .map((c) => c.defeito)
      )
    );
    setDefeitos(defeitosUnicos);
  }

  async function salvarTratamento() {
    const mecanicoOk =
      (form.mecanico_executor?.chapa || "").trim() &&
      (form.mecanico_executor?.nome || "").trim();

    if (
      !form.setor_manutencao ||
      !form.grupo_manutencao ||
      !form.problema_encontrado ||
      !form.solucionador ||
      !mecanicoOk
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

        mecanico_executor: `${form.mecanico_executor.chapa} - ${form.mecanico_executor.nome}`,
        numero_os_corretiva: form.numero_os_corretiva || null,

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
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Setor de Manutenção <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full border rounded p-2"
                value={form.setor_manutencao}
                onChange={(e) => handleSetorChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {Array.from(new Set(catalogo.map((c) => c.setor_macro))).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Grupo <span className="text-red-600">*</span>
              </label>
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

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Problema encontrado <span className="text-red-600">*</span>
            </label>
            <select
              className="w-full border rounded p-2"
              value={form.problema_encontrado}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, problema_encontrado: e.target.value }))
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

          <CampoMecanico
            value={form.mecanico_executor}
            onChange={(m) => setForm((prev) => ({ ...prev, mecanico_executor: m }))}
          />

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Número da OS Corretiva
            </label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Ex: 123456"
              value={form.numero_os_corretiva}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, numero_os_corretiva: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Solução aplicada</label>
            <textarea
              className="w-full border rounded p-2"
              rows="2"
              placeholder="Descreva a ação ou serviço realizado..."
              value={form.solucao}
              onChange={(e) => setForm((prev) => ({ ...prev, solucao: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Responsável pela manutenção <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={form.solucionador}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, solucionador: e.target.value }))
              }
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
