// src/pages/FechamentoSOS.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function FechamentoSOS() {
  const [acionamentos, setAcionamentos] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [form, setForm] = useState({
    id: null,
    ocorrencia: "",
    carro_substituto: "",
    sr_numero: "",
    setor_manutencao: "",
    grupo_manutencao: "",
    problema_encontrado: "",
    solucionador: "",
    solucao: "",
  });
  const [loading, setLoading] = useState(false);

  // 🔹 Carrega SOS em aberto
  useEffect(() => {
    async function carregarSOS() {
      const { data, error } = await supabase
        .from("sos_acionamentos")
        .select("*")
        .eq("status", "Aberto")
        .order("created_at", { ascending: false });

      if (!error) setAcionamentos(data || []);
    }
    carregarSOS();
  }, []);

  // 🔹 Carrega veículos para substituição
  useEffect(() => {
    async function carregarVeiculos() {
      const { data, error } = await supabase
        .from("equipamentos")
        .select("id, nr_ordem AS prefixo")
        .eq("id_empresa", "046")
        .order("nr_ordem");
      if (!error) setVeiculos(data || []);
    }
    carregarVeiculos();
  }, []);

  async function fecharSOS() {
    if (!form.id) {
      alert("Selecione uma etiqueta antes de fechar.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("sos_acionamentos")
        .update({
          ocorrencia: form.ocorrencia,
          carro_substituto: form.carro_substituto || null,
          sr_numero: form.sr_numero,
          setor_manutencao: form.setor_manutencao,
          grupo_manutencao: form.grupo_manutencao,
          problema_encontrado: form.problema_encontrado,
          solucionador: form.solucionador,
          solucao: form.solucao,
          status: "Fechado",
        })
        .eq("id", form.id);

      if (error) throw error;

      alert("Etiqueta fechada com sucesso!");
      setForm({
        id: null,
        ocorrencia: "",
        carro_substituto: "",
        sr_numero: "",
        setor_manutencao: "",
        grupo_manutencao: "",
        problema_encontrado: "",
        solucionador: "",
        solucao: "",
      });
      // Atualiza lista
      const { data } = await supabase
        .from("sos_acionamentos")
        .select("*")
        .eq("status", "Aberto");
      setAcionamentos(data || []);
    } catch (e) {
      console.error(e);
      alert("Erro ao fechar etiqueta: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Fechamento de Acionamentos SOS</h1>

      {/* 🔹 Lista de SOS abertos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {acionamentos.map((sos) => (
          <div
            key={sos.id}
            onClick={() => setForm({ ...form, id: sos.id })}
            className={`p-4 rounded-lg border-2 cursor-pointer ${
              form.id === sos.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p><strong>Etiqueta:</strong> #{sos.numero_sos}</p>
            <p><strong>Data:</strong> {new Date(sos.created_at).toLocaleDateString()}</p>
            <p><strong>Veículo:</strong> {sos.veiculo}</p>
            <p><strong>Motorista:</strong> {sos.motorista_nome || sos.motorista_id}</p>
            <p><strong>Local:</strong> {sos.local_ocorrencia}</p>
            <p><strong>Defeito:</strong> {sos.reclamacao_motorista}</p>
            <p><strong>Plantonista:</strong> {sos.plantonista}</p>

            <button
              className="mt-2 w-full bg-blue-600 text-white rounded-md py-1 text-sm font-medium hover:bg-blue-700"
              onClick={() => setForm({ ...form, id: sos.id })}
            >
              Fechar Etiqueta
            </button>
          </div>
        ))}
      </div>

      {/* 🔹 Formulário de fechamento */}
      {form.id && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-3">Fechamento da Etiqueta #{form.id}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ocorrência */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ocorrência</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={form.ocorrencia}
                onChange={(e) => setForm({ ...form, ocorrencia: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="Seguiu Viagem">Seguiu Viagem</option>
                <option value="Recolheu">Recolheu</option>
                <option value="Troca de Carro">Troca de Carro</option>
                <option value="Atendimento no Local">Atendimento no Local</option>
                <option value="Abandonado">Abandonado</option>
              </select>
            </div>

            {/* Carro Substituto */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Carro que entrou no lugar (opcional)</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={form.carro_substituto}
                onChange={(e) => setForm({ ...form, carro_substituto: e.target.value })}
              >
                <option value="">Nenhum</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.prefixo}>{v.prefixo}</option>
                ))}
              </select>
            </div>

            {/* SR */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Número da SR</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={form.sr_numero}
                onChange={(e) => setForm({ ...form, sr_numero: e.target.value })}
              />
            </div>

            {/* Setor */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Setor da Manutenção</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={form.setor_manutencao}
                onChange={(e) => setForm({ ...form, setor_manutencao: e.target.value })}
              />
            </div>

            {/* Grupo */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Grupo</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={form.grupo_manutencao}
                onChange={(e) => setForm({ ...form, grupo_manutencao: e.target.value })}
              />
            </div>

            {/* Problema */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Problema Encontrado</label>
              <textarea
                rows={2}
                className="w-full rounded-md border px-3 py-2"
                value={form.problema_encontrado}
                onChange={(e) => setForm({ ...form, problema_encontrado: e.target.value })}
              />
            </div>

            {/* Solucionador */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Solucionador</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={form.solucionador}
                onChange={(e) => setForm({ ...form, solucionador: e.target.value })}
              />
            </div>

            {/* Solução */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Solução</label>
              <textarea
                rows={2}
                className="w-full rounded-md border px-3 py-2"
                value={form.solucao}
                onChange={(e) => setForm({ ...form, solucao: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={fecharSOS}
              disabled={loading}
              className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Fechar Etiqueta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
