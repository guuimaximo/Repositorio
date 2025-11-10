import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function SolicitacaoSOS() {
  const [prefixos, setPrefixos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [form, setForm] = useState({
    numero_sos: "",
    plantonista: "",
    veiculo: "",
    motorista_id: "",
    motorista_nome: "",
    reclamacao_motorista: "",
    local_ocorrencia: "",
    linha: "",
    tabela_operacional: "",
    acao_motorista: "",
  });
  const [loading, setLoading] = useState(false);

  // Carrega dados auxiliares
  useEffect(() => {
    async function carregarListas() {
      const [pfx, mot, lin] = await Promise.all([
        supabase.from("prefixos").select("codigo").order("codigo"),
        supabase.from("motoristas").select("chapa, nome").order("nome"),
        supabase.from("linhas").select("codigo, descricao").order("codigo"),
      ]);
      if (pfx.data) setPrefixos(pfx.data);
      if (mot.data) setMotoristas(mot.data);
      if (lin.data) setLinhas(lin.data);
    }
    carregarListas();

    gerarNumeroSOS();
  }, []);

  // Gera número SOS sequencial
  async function gerarNumeroSOS() {
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("numero_sos")
      .order("numero_sos", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) {
      setForm((prev) => ({ ...prev, numero_sos: (data.numero_sos || 0) + 1 }));
    } else {
      setForm((prev) => ({ ...prev, numero_sos: 1 }));
    }
  }

  // Cria novo SOS
  async function salvarSOS() {
    if (!form.veiculo || !form.motorista_nome || !form.reclamacao_motorista) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    setLoading(true);
    const agora = new Date();
    const payload = {
      ...form,
      data_sos: agora.toISOString().split("T")[0],
      hora_sos: agora.toTimeString().split(" ")[0],
      status: "Aberto",
    };

    const { error } = await supabase.from("sos_acionamentos").insert([payload]);
    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erro ao salvar SOS.");
    } else {
      alert(`✅ SOS nº ${form.numero_sos} criado com sucesso!`);
      setForm({
        numero_sos: "",
        plantonista: "",
        veiculo: "",
        motorista_id: "",
        motorista_nome: "",
        reclamacao_motorista: "",
        local_ocorrencia: "",
        linha: "",
        tabela_operacional: "",
        acao_motorista: "",
      });
      gerarNumeroSOS();
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Solicitação de SOS</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Número SOS */}
        <div>
          <label className="text-sm text-gray-500">Número do SOS</label>
          <input
            type="text"
            className="border p-2 rounded w-full bg-gray-100"
            value={form.numero_sos}
            readOnly
          />
        </div>

        {/* Plantonista */}
        <div>
          <label className="text-sm text-gray-500">Plantonista</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.plantonista}
            onChange={(e) => setForm({ ...form, plantonista: e.target.value })}
          />
        </div>

        {/* Prefixo */}
        <div>
          <label className="text-sm text-gray-500">Prefixo do Veículo</label>
          <select
            className="border p-2 rounded w-full"
            value={form.veiculo}
            onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
          >
            <option value="">Selecione...</option>
            {prefixos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo}
              </option>
            ))}
          </select>
        </div>

        {/* Motorista */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-gray-500">Motorista</label>
            <select
              className="border p-2 rounded w-full"
              value={form.motorista_nome}
              onChange={(e) => {
                const nome = e.target.value;
                const motorista = motoristas.find((m) => m.nome === nome);
                setForm({
                  ...form,
                  motorista_nome: nome,
                  motorista_id: motorista ? motorista.chapa : "",
                });
              }}
            >
              <option value="">Selecione...</option>
              {motoristas.map((m) => (
                <option key={m.chapa} value={m.nome}>
                  {m.nome} ({m.chapa})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500">Chapa</label>
            <input
              type="text"
              className="border p-2 rounded w-full bg-gray-100"
              value={form.motorista_id}
              readOnly
            />
          </div>
        </div>

        {/* Reclamação */}
        <div>
          <label className="text-sm text-gray-500">Reclamação do Motorista</label>
          <textarea
            rows={3}
            className="border p-2 rounded w-full"
            value={form.reclamacao_motorista}
            onChange={(e) =>
              setForm({ ...form, reclamacao_motorista: e.target.value })
            }
          ></textarea>
        </div>

        {/* Local */}
        <div>
          <label className="text-sm text-gray-500">Local da Ocorrência</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={form.local_ocorrencia}
            onChange={(e) =>
              setForm({ ...form, local_ocorrencia: e.target.value })
            }
          />
        </div>

        {/* Linha */}
        <div>
          <label className="text-sm text-gray-500">Linha</label>
          <select
            className="border p-2 rounded w-full"
            value={form.linha}
            onChange={(e) => setForm({ ...form, linha: e.target.value })}
          >
            <option value="">Selecione...</option>
            {linhas.map((l) => (
              <option key={l.codigo} value={l.codigo}>
                {l.codigo} - {l.descricao}
              </option>
            ))}
          </select>
        </div>

        {/* Tabela Operacional */}
        <div>
          <label className="text-sm text-gray-500">Tabela Operacional</label>
          <select
            className="border p-2 rounded w-full"
            value={form.tabela_operacional}
            onChange={(e) =>
              setForm({ ...form, tabela_operacional: e.target.value })
            }
          >
            <option value="">Selecione...</option>
            <option value="1MANHA">1MANHÃ</option>
            <option value="2MANHA">2MANHÃ</option>
            <option value="TARDE">TARDE</option>
            <option value="NOITE">NOITE</option>
          </select>
        </div>

        {/* Ação Motorista */}
        <div>
          <label className="text-sm text-gray-500">Ação do Motorista</label>
          <select
            className="border p-2 rounded w-full"
            value={form.acao_motorista}
            onChange={(e) =>
              setForm({ ...form, acao_motorista: e.target.value })
            }
          >
            <option value="">Selecione...</option>
            <option value="Recolheu">Recolheu</option>
            <option value="Seguiu Viagem">Seguiu Viagem</option>
            <option value="Aguardou no Local">Aguardou no Local</option>
          </select>
        </div>

        <div className="text-right">
          <button
            onClick={salvarSOS}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Emitir Solicitação"}
          </button>
        </div>
      </div>
    </div>
  );
}
