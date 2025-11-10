// src/pages/SolicitacaoSOS.jsx

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function SolicitacaoSOS() {
  const [form, setForm] = useState({
    plantonista: "",
    veiculo: "",
    motorista_id: "",
    motorista_nome: "",
    reclamacao_motorista: "",
    local_ocorrencia: "",
    linha: "",
    tabela_operacional: "",
  });

  const [tabelas, setTabelas] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numeroSOS, setNumeroSOS] = useState(null);

  // Data e hora automáticas
  const agora = new Date();
  const dataAtual = agora.toLocaleDateString("pt-BR");
  const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    async function carregarListas() {
      const { data: linhasData } = await supabase.from("linhas").select("codigo, descricao").order("codigo");
      const { data: tabelasData } = await supabase.from("tabelas_operacionais").select("codigo, descricao");
      setLinhas(linhasData || []);
      setTabelas(tabelasData || []);
    }
    carregarListas();

    // Obter último número SOS
    async function getNextSOS() {
      const { data, error } = await supabase
        .from("sos_acionamentos")
        .select("numero_sos")
        .order("numero_sos", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") console.error(error);
      setNumeroSOS(data ? Number(data.numero_sos) + 1 : 3000); // começa em 3000 caso vazio
    }
    getNextSOS();
  }, []);

  async function salvarSOS() {
    if (!form.veiculo || !form.motorista_nome || !form.reclamacao_motorista) {
      alert("Preencha veículo, motorista e reclamação!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        numero_sos: numeroSOS,
        plantonista: form.plantonista,
        veiculo: form.veiculo,
        motorista_id: form.motorista_id,
        motorista_nome: form.motorista_nome,
        reclamacao_motorista: form.reclamacao_motorista,
        local_ocorrencia: form.local_ocorrencia,
        linha: form.linha,
        tabela_operacional: form.tabela_operacional,
        status: "Aberto",
      };

      const { error } = await supabase.from("sos_acionamentos").insert(payload);
      if (error) throw error;

      // Gerar mensagem formatada
      const mensagem = `*Acionamento de Troca/SOS:* ${numeroSOS}\n*Data:* ${dataAtual}\n*Veículo:* ${form.veiculo}\n*Motorista:* ${form.motorista_id || ""} ${form.motorista_nome}\n*Linha:* ${form.linha}\n*Local:* ${form.local_ocorrencia}\n*Defeito:* ${form.reclamacao_motorista}\n*Plantonista:* ${form.plantonista}`;
      
      await navigator.clipboard.writeText(mensagem);
      alert("Solicitação registrada! Mensagem copiada para o WhatsApp ✅");

      // Resetar
      setForm({
        plantonista: "",
        veiculo: "",
        motorista_id: "",
        motorista_nome: "",
        reclamacao_motorista: "",
        local_ocorrencia: "",
        linha: "",
        tabela_operacional: "",
      });
      setNumeroSOS((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Solicitação de SOS</h1>

      {/* Cabeçalho */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Número do SOS</p>
          <p className="text-xl font-semibold text-blue-600">{numeroSOS || "..."}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Data e Hora</p>
          <p className="text-xl font-semibold text-gray-700">{dataAtual} • {horaAtual}</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Plantonista</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={form.plantonista}
            onChange={(e) => setForm({ ...form, plantonista: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Prefixo do Veículo</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={form.veiculo}
            onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Chapa do Motorista</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={form.motorista_id}
            onChange={(e) => setForm({ ...form, motorista_id: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Nome do Motorista</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={form.motorista_nome}
            onChange={(e) => setForm({ ...form, motorista_nome: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Local</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={form.local_ocorrencia}
            onChange={(e) => setForm({ ...form, local_ocorrencia: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Linha</label>
          <select
            className="w-full border rounded p-2"
            value={form.linha}
            onChange={(e) => setForm({ ...form, linha: e.target.value })}
          >
            <option value="">Selecione</option>
            {linhas.map((l) => (
              <option key={l.codigo} value={l.codigo}>
                {l.codigo} - {l.descricao}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Tabela Operacional</label>
          <select
            className="w-full border rounded p-2"
            value={form.tabela_operacional}
            onChange={(e) => setForm({ ...form, tabela_operacional: e.target.value })}
          >
            <option value="">Selecione</option>
            {tabelas.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.descricao}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Reclamação / Defeito</label>
          <textarea
            rows="3"
            className="w-full border rounded p-2"
            value={form.reclamacao_motorista}
            onChange={(e) => setForm({ ...form, reclamacao_motorista: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={salvarSOS}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {loading ? "Salvando..." : "Enviar SOS"}
        </button>
      </div>
    </div>
  );
}
