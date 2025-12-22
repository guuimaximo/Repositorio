// src/pages/SOSFechamento.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { FaCheckCircle, FaTimes, FaWrench } from "react-icons/fa";

/* =======================
   AJUSTE DATA (NOVO)
   - Preferir data_sos (tipo DATE) -> não sofre fuso
   - Fallback: created_at exibindo em UTC (não cai 1 dia)
======================= */
function formatDateBRFromDateOnly(value) {
  // value esperado: "YYYY-MM-DD"
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd)); // local, sem shift
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function formatDateBRFromUtcTimestamp(value) {
  // value esperado: ISO/timestamptz (ex.: created_at)
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" }); // força data em UTC
}

function formatDataSOS(a) {
  // 1) data_sos (DATE) -> ideal
  const ds = formatDateBRFromDateOnly(a?.data_sos);
  if (ds) return ds;
  // 2) fallback -> created_at em UTC
  return formatDateBRFromUtcTimestamp(a?.created_at);
}

export default function SOSFechamento() {
  const [acionamentos, setAcionamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sos_acionamentos")
      .select("*")
      .eq("status", "Aberto")
      // Ordena por data_sos (faz mais sentido com o que mostramos na tela)
      .order("data_sos", { ascending: false, nullsFirst: false })
      // Fallback de ordenação: created_at
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
        Fechamento do Acionamento - Operação
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
                  Carregando SOS...
                </td>
              </tr>
            ) : acionamentos.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-600">
                  Nenhum SOS em aberto 🎉
                </td>
              </tr>
            ) : (
              acionamentos.map((a) => (
                <tr
                  key={a.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">{a.numero_sos}</td>
                  <td className="py-3 px-4">{formatDataSOS(a)}</td>
                  <td className="py-3 px-4">{a.veiculo}</td>
                  <td className="py-3 px-4">{a.motorista_nome}</td>
                  <td className="py-3 px-4">{a.linha}</td>
                  <td className="py-3 px-4">{a.local_ocorrencia}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md text-sm flex items-center justify-center gap-2 font-medium transition"
                    >
                      <FaWrench className="text-black" /> Fechar Etiqueta
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FechamentoModal
          sos={selected}
          onClose={() => setSelected(null)}
          onAtualizar={carregarSOS}
        />
      )}
    </div>
  );
}

// 🟨 Modal de Fechamento (sem alteração de campos)
function FechamentoModal({ sos, onClose, onAtualizar }) {
  const [form, setForm] = useState({
    avaliador: "",
    procedencia_socorrista: "Procedente",
    ocorrencia: "",
    carro_substituto: "",
    sr_numero: "",
  });
  const [saving, setSaving] = useState(false);
  const [prefixos, setPrefixos] = useState([]);

  const ocorrencias = ["SEGUIU VIAGEM", "RECOLHEU", "TROCA", "AVARIA", "IMPROCEDENTE"];

  useEffect(() => {
    async function carregarPrefixos() {
      const { data } = await supabase.from("prefixos").select("codigo").order("codigo");
      setPrefixos(data || []);
    }
    carregarPrefixos();
  }, []);

  async function salvarFechamento() {
    if (!form.avaliador || !form.ocorrencia) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("sos_acionamentos")
      .update({
        avaliador: form.avaliador,
        procedencia_socorrista: form.procedencia_socorrista,
        ocorrencia: form.ocorrencia,
        carro_substituto: form.carro_substituto,
        sr_numero: form.sr_numero,
        data_fechamento: new Date().toISOString(),
        status: "Em Andamento",
      })
      .eq("id", sos.id);

    setSaving(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Fechamento
