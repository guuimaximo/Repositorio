import React, { useMemo, useState, useEffect } from "react";
import {
  FaBolt, FaSearch, FaFilePdf, FaSync,
  FaClock, FaHistory,
  FaClipboardList, FaRoad, FaSave, FaTimes, FaPlay
} from "react-icons/fa";
import { supabase } from "../supabase";

// =============================================================================
// HELPERS
// =============================================================================
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalizeStatus(s) {
  const st = String(s || "").toUpperCase().trim();
  if (!st) return "AGUARDANDO_INSTRUTOR";

  // migração/legado (se aparecer)
  if (st === "AGUARDANDO INSTRUTOR") return "AGUARDANDO_INSTRUTOR";
  if (st === "CONCLUIDO") return "AGUARDANDO_INSTRUTOR";
  if (st === "AG_ACOMPANHAMENTO") return "AGUARDANDO_INSTRUTOR";

  return st;
}

function getFoco(item) {
  // Python grava motivo = foco
  if (item?.motivo) return item.motivo;

  // fallback: metadata.foco
  const m = item?.metadata;
  if (m?.foco) return m.foco;

  // fallback: metadata.cluster/linha
  const cl = m?.cluster_foco;
  const ln = m?.linha_foco;
  if (cl && ln) return `${cl} - Linha ${ln}`;
  if (ln) return `Linha ${ln}`;

  return "Geral";
}

function getPdfUrl(item) {
  // Python grava arquivo_pdf_url
  return item?.arquivo_pdf_url || item?.arquivo_pdf_path || null;
}

function daysBetweenUTC(a, b) {
  const one = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const two = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((two - one) / (1000 * 60 * 60 * 24));
}

function calcDiaXdeY(item) {
  const status = normalizeStatus(item?.status);
  if (status !== "EM_MONITORAMENTO") return null;

  // Python cria dt_inicio (date) e dias_monitoramento
  const dtIni = item?.dt_inicio;
  const dias = n(item?.dias_monitoramento) || null;
  if (!dtIni || !dias) return null;

  const ini = new Date(dtIni);
  const hoje = new Date();
  const dia = Math.min(Math.max(daysBetweenUTC(ini, hoje) + 1, 1), dias);
  return { dia, dias };
}

// =============================================================================
// CONSTANTES UI
// =============================================================================
const CHECKLIST_ITENS = [
  { id: "faixa_verde", label: "Operação na Faixa Verde (RPM)" },
  { id: "antecipacao", label: "Antecipação de Parada/Trânsito" },
  { id: "troca_marcha", label: "Troca de Marchas no Tempo Correto" },
  { id: "uso_retarder", label: "Uso Correto do Freio Motor/Retarder" },
  { id: "marcha_lenta", label: "Evitou Marcha Lenta Excessiva" },
  { id: "topografia", label: "Aproveitamento de Inércia (Topografia)" },
];

const NIVEIS = {
  1: { label: "Nível 1 (Leve)", dias: 5, color: "bg-blue-50 border-blue-200 text-blue-700" },
  2: { label: "Nível 2 (Médio)", dias: 10, color: "bg-amber-50 border-amber-200 text-amber-700" },
  3: { label: "Nível 3 (Crítico)", dias: 15, color: "bg-rose-50 border-rose-200 text-rose-700" },
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function DesempenhoDieselAcompanhamento() {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ATIVOS");

  // Modais
  const [modalLancarOpen, setModalLancarOpen] = useState(false);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Histórico
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    horaInicio: "",
    horaFim: "",
    kmInicio: "",
    kmFim: "",
    mediaTeste: "",
    nivel: 2,
    obs: "",
    checklist: {},
  });

  // ---------------------------------------------------------------------------
  // CARGA DE DADOS
  // ---------------------------------------------------------------------------
  async function carregarOrdens() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(800);

      if (error) throw error;
      setLista(data || []);
    } catch (e) {
      alert("Erro ao carregar: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarOrdens();
  }, []);

  // ---------------------------------------------------------------------------
  // AÇÃO: CONSULTAR (Resumo + Histórico)
  // ---------------------------------------------------------------------------
  const handleConsultar = async (item) => {
    setItemSelecionado(item);
    setModalConsultaOpen(true);
    setLoadingHist(true);

    try {
      const { data, error } = await supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .eq("motorista_chapa", item.motorista_chapa)
        .neq("id", item.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistorico(data || []);
    } catch {
      setHistorico([]);
    } finally {
      setLoadingHist(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AÇÃO: LANÇAR
  // ---------------------------------------------------------------------------
  const handleLancar = (item) => {
    setItemSelecionado(item);
    setForm({
      horaInicio: "",
      horaFim: "",
      kmInicio: "",
      kmFim: "",
      mediaTeste: "",
      nivel: 2,
      obs: "",
      checklist: {},
    });
    setModalLancarOpen(true);
  };

  const toggleCheck = (id) => {
    setForm((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [id]: !prev.checklist[id] },
    }));
  };

  const salvarIntervencao = async () => {
    if (!itemSelecionado?.id) return;

    if (!form.horaInicio || !form.kmInicio || !form.mediaTeste) {
      alert("Preencha: Hora Início, KM Início e Média do Teste.");
      return;
    }

    const dias = NIVEIS[form.nivel]?.dias || 10;

    // Python trabalha com dt_inicio/dt_fim_planejado (DATE)
    const hoje = new Date();
    const dtInicio = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    const dtFim = new Date(dtInicio);
    dtFim.setUTCDate(dtFim.getUTCDate() + (dias - 1));

    const dtInicioISO = dtInicio.toISOString().slice(0, 10); // YYYY-MM-DD
    const dtFimISO = dtFim.toISOString().slice(0, 10);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const instrutorLogin = sess?.session?.user?.email || null;
      const instrutorNome = sess?.session?.user?.user_metadata?.full_name || null;

      const payload = {
        status: "EM_MONITORAMENTO",

        // contrato / monitoramento (ALINHADO AO PYTHON)
        nivel: form.nivel,
        dias_monitoramento: dias,
        dt_inicio: dtInicioISO,
        dt_fim_planejado: dtFimISO,

        // auditoria instrutor
        instrutor_login: instrutorLogin,
        instrutor_nome: instrutorNome,

        // dados da prova
        intervencao_hora_inicio: form.horaInicio,
        intervencao_hora_fim: form.horaFim || null,
        intervencao_km_inicio: n(form.kmInicio),
        intervencao_km_fim: form.kmFim ? n(form.kmFim) : null,
        intervencao_media_teste: n(form.mediaTeste),

        // checklist / obs
        intervencao_checklist: form.checklist || {},
        intervencao_obs: form.obs || null,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("diesel_acompanhamentos")
        .update(payload)
        .eq("id", itemSelecionado.id);

      if (error) throw error;

      setModalLancarOpen(false);
      await carregarOrdens();
      alert("Monitoramento iniciado com sucesso!");
    } catch (e) {
      alert("Erro ao salvar: " + (e?.message || String(e)));
    }
  };

  // ---------------------------------------------------------------------------
  // FILTROS
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    const q = busca.toLowerCase().trim();

    return (lista || []).filter((item) => {
      const nome = String(item.motorista_nome || "").toLowerCase();
      const chapa = String(item.motorista_chapa || "");
      const matchTexto = !q || nome.includes(q) || chapa.includes(q);

      const st = normalizeStatus(item.status);

      if (filtroStatus === "ATIVOS") {
        return matchTexto && ["AGUARDANDO_INSTRUTOR", "EM_MONITORAMENTO"].includes(st);
      }
      if (filtroStatus === "ENCERRADOS") {
        return matchTexto && ["OK", "ENCERRADO", "TRATATIVA", "REJEITADA", "CANCELADO"].includes(st);
      }
      return matchTexto;
    });
  }, [lista, busca, filtroStatus]);

  const abrirPDF = (item) => {
    const url = getPdfUrl(item);
    if (!url) {
      alert("PDF não disponível para este registro.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-[#f8f9fa] font-sans text-slate-800">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <FaBolt className="text-yellow-500" /> Gestão de Ordens de Acompanhamento
          </h1>
          <p className="text-sm text-slate-500">Ordens geradas automaticamente — prontas para ação do instrutor.</p>
        </div>

        <button
          onClick={carregarOrdens}
          className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 text-sm font-bold"
          title="Atualizar"
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-4 mb-2 items-center bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar Motorista (nome ou chapa)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 p-2 border rounded w-72 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="p-2 border rounded text-sm bg-white outline-none focus:border-blue-500"
        >
          <option value="ATIVOS">⚡ Aguardando / Monitorando</option>
          <option value="ENCERRADOS">🏁 Encerrados</option>
          <option value="TODOS">Todos</option>
        </select>

        <div className="ml-auto text-xs text-gray-500 font-medium">
          Mostrando <b>{listaFiltrada.length}</b> registros
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b text-xs uppercase">
            <tr>
              <th className="px-6 py-4">Data Geração</th>
              <th className="px-6 py-4">Motorista</th>
              <th className="px-6 py-4 text-center">Foco</th>
              <th className="px-6 py-4 text-center">Status Atual</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {listaFiltrada.map((item) => {
              const status = normalizeStatus(item.status);
              const showLancar = status === "AGUARDANDO_INSTRUTOR";
              const foco = getFoco(item);
              const diaXY = calcDiaXdeY(item);

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.motorista_nome || "-"}</div>
                    <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded w-fit mt-1">
                      {item.motorista_chapa || "-"}
                    </div>

                    {n(item.perda_litros) >= 80 && (
                      <div className="mt-2 inline-flex items-center text-[10px] font-extrabold px-2 py-1 rounded border bg-rose-50 border-rose-200 text-rose-700">
                        PRIORIDADE ALTA
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold border">
                      {foco}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {showLancar ? (
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200 inline-flex items-center justify-center gap-1">
                        <FaClock /> AGUARDANDO INSTRUTOR
                      </span>
                    ) : status === "EM_MONITORAMENTO" ? (
                      <div className="flex flex-col items-center">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">
                          EM MONITORAMENTO
                        </span>
                        {diaXY ? (
                          <span className="text-[9px] text-gray-500 mt-1">
                            Dia <b>{diaXY.dia}</b> de <b>{diaXY.dias}</b>
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-500 mt-1">Monitoramento ativo</span>
                        )}
                      </div>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">
                        {status}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirPDF(item)}
                        className="p-2 text-rose-600 bg-white border border-rose-200 rounded hover:bg-rose-50 transition shadow-sm"
                        title="Abrir Prontuário PDF"
                      >
                        <FaFilePdf />
                      </button>

                      <button
                        onClick={() => handleConsultar(item)}
                        className="p-2 text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 transition shadow-sm"
                        title="Consultar Histórico"
                      >
                        <FaHistory />
                      </button>

                      {showLancar && (
                        <button
                          onClick={() => handleLancar(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-sm transition"
                        >
                          <FaPlay size={10} /> LANÇAR
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                  Nenhum registro encontrado com os filtros atuais.
                  <div className="text-xs mt-2">
                    Dica: ordens novas chegam como <b>AGUARDANDO INSTRUTOR</b>.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CONSULTA */}
      {modalConsultaOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FaHistory /> Consultar Histórico
              </h3>
              <button onClick={() => setModalConsultaOpen(false)}>
                <FaTimes className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-800 text-sm mb-2">Ordem Atual</h4>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-500 font-bold">Motorista:</span>{" "}
                    {itemSelecionado.motorista_nome || "-"} ({itemSelecionado.motorista_chapa || "-"})
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">Foco:</span>{" "}
                    {getFoco(itemSelecionado)}
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">KM/L Inicial:</span>{" "}
                    {n(itemSelecionado.kml_inicial).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">Meta:</span>{" "}
                    {n(itemSelecionado.kml_meta).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">Status:</span>{" "}
                    {normalizeStatus(itemSelecionado.status)}
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">Dias:</span>{" "}
                    {itemSelecionado.dias_monitoramento ?? "-"}
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-slate-700 text-sm mb-3 border-b pb-1">
                Acompanhamentos Anteriores
              </h4>

              {loadingHist ? (
                <div className="text-center py-4">
                  <FaSync className="animate-spin inline" /> Carregando...
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Nenhum histórico anterior encontrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((h) => {
                    const st = normalizeStatus(h.status);
                    return (
                      <div
                        key={h.id}
                        className="p-3 border rounded-lg flex justify-between items-center text-sm hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-bold text-slate-700">
                            {h.created_at ? new Date(h.created_at).toLocaleDateString() : "-"}
                          </div>
                          <div className="text-xs text-gray-500">{getFoco(h)}</div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-bold text-xs px-2 py-0.5 rounded ${
                              st === "OK" || st === "ENCERRADO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {st}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Nível {h.nivel ?? "-"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LANÇAR */}
      {modalLancarOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FaRoad /> Lançar Intervenção Técnica
              </h3>
              <button onClick={() => setModalLancarOpen(false)}>
                <FaTimes className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1) DADOS DA VIAGEM */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <FaClock /> Dados da Viagem de Teste (Prova)
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Hora Início *</label>
                    <input
                      type="time"
                      value={form.horaInicio}
                      onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500">Hora Fim</label>
                    <input
                      type="time"
                      value={form.horaFim}
                      onChange={(e) => setForm({ ...form, horaFim: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500">KM Início *</label>
                    <input
                      type="number"
                      value={form.kmInicio}
                      onChange={(e) => setForm({ ...form, kmInicio: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500">KM Fim</label>
                    <input
                      type="number"
                      value={form.kmFim}
                      onChange={(e) => setForm({ ...form, kmFim: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-bold text-blue-600">MÉDIA REALIZADA NO TESTE (KM/L) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.mediaTeste}
                    onChange={(e) => setForm({ ...form, mediaTeste: e.target.value })}
                    className="w-full p-2 border border-blue-300 rounded text-sm font-bold text-blue-800 bg-blue-50"
                    placeholder="Ex: 2.80"
                  />
                </div>
              </div>

              {/* 2) CHECKLIST */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <FaClipboardList /> Checklist Técnico (o que foi corrigido?)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHECKLIST_ITENS.map((chk) => (
                    <label
                      key={chk.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                        form.checklist[chk.id]
                          ? "bg-emerald-50 border-emerald-300"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!form.checklist[chk.id]}
                        onChange={() => toggleCheck(chk.id)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3) NÍVEL */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Definir Nível (Contrato)</h4>

                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setForm({ ...form, nivel: lvl })}
                      className={`p-3 rounded-lg border text-center transition ${
                        form.nivel === lvl
                          ? "ring-2 ring-offset-1 ring-slate-400 bg-white"
                          : NIVEIS[lvl].color
                      }`}
                      type="button"
                    >
                      <div className="font-bold">{NIVEIS[lvl].label}</div>
                      <div className="text-xs opacity-80">{NIVEIS[lvl].dias} dias</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">Observação do Instrutor (opcional)</label>
                <textarea
                  rows={3}
                  value={form.obs}
                  onChange={(e) => setForm({ ...form, obs: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Ex.: ajustes aplicados e pontos observados..."
                />
              </div>

              <button
                onClick={salvarIntervencao}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex justify-center items-center gap-2 transition"
              >
                <FaSave /> SALVAR E INICIAR MONITORAMENTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
