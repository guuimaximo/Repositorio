import React, { useMemo, useState, useEffect } from "react";
import {
  FaBolt,
  FaSearch,
  FaFilePdf,
  FaSync,
  FaClock,
  FaHistory,
  FaClipboardList,
  FaRoad,
  FaSave,
  FaTimes,
  FaPlay,
  FaCheck,
  FaTimes as FaX,
  FaQuestionCircle,
} from "react-icons/fa";
import { supabase } from "../supabase";
import ResumoLancamentoInstrutor from "../components/desempenho/ResumoLancamentoInstrutor";

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

function hasLancamento(item) {
  if (!item) return false;
  return Boolean(
    item?.intervencao_hora_inicio ||
      item?.dt_inicio_monitoramento ||
      item?.instrutor_login ||
      item?.instrutor_nome ||
      item?.intervencao_checklist ||
      (item?.intervencao_media_teste != null && String(item?.intervencao_media_teste) !== "")
  );
}

function getFoco(item) {
  if (item?.motivo) return item.motivo;

  const m = item?.metadata;
  if (m?.foco) return m.foco;

  const cl = m?.cluster_foco;
  const ln = m?.linha_foco;
  if (cl && ln) return `${cl} - Linha ${ln}`;
  if (ln) return `Linha ${ln}`;

  return "Geral";
}

function getPdfUrl(item) {
  return item?.arquivo_pdf_url || item?.arquivo_pdf_path || null;
}

function daysBetweenUTC(a, b) {
  const one = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const two = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((two - one) / (1000 * 60 * 60 * 24));
}

// Data "YYYY-MM-DD" no fuso America/Sao_Paulo (date-only)
function spDateISO(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Soma dias em cima de um ISO date (YYYY-MM-DD) sem depender de timezone local
function addDaysISO(isoYMD, days) {
  const [y, m, d] = isoYMD.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d)); // date-only neutro
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function calcDiaXdeY(item) {
  const status = normalizeStatus(item?.status);
  if (status !== "EM_MONITORAMENTO") return null;

  const dtIni = item?.dt_inicio_monitoramento;
  const dias = n(item?.dias_monitoramento) || null;
  if (!dtIni || !dias) return null;

  const ini = new Date(dtIni + "T00:00:00Z");
  const hojeISO = spDateISO(new Date());
  const hoje = new Date(hojeISO + "T00:00:00Z");

  const dia = Math.min(Math.max(daysBetweenUTC(ini, hoje) + 1, 1), dias);
  return { dia, dias };
}

// =============================================================================
// CHECKLIST (MODELO PDF)
// =============================================================================
// Checklist de Condução (SIM / NÃO)
const CHECKLIST_CONDUCAO = [
  {
    id: "mecanica",
    titulo: "MECÂNICA",
    desc: "Evita batida de transmissão, uso indevido de embreagem e trancos?",
  },
  {
    id: "eficiencia_rpm",
    titulo: "EFICIÊNCIA (RPM)",
    desc: "Conduz na faixa verde e utiliza corretamente o conta-giros?",
  },
  {
    id: "inerciaparada",
    titulo: "INÉRCIA/PARADA",
    desc: "Aproveita o movimento, sem utilizar 'banguela'?",
  },
  {
    id: "suavidade",
    titulo: "SUAVIDADE",
    desc: "Evita acelerações/frenagens bruscas e antecipa obstáculos/pontos?",
  },
  {
    id: "seguranca",
    titulo: "SEGURANÇA",
    desc: "Respeita velocidade, sinalização e utiliza o cinto de segurança?",
  },
  {
    id: "postura",
    titulo: "POSTURA",
    desc: "Uniformizado, mãos corretas no volante e cortês com passageiros?",
  },
  {
    id: "documentacao",
    titulo: "DOCUMENTAÇÃO",
    desc: "Porta CNH dentro do prazo de validade?",
  },
];

// Avaliação Técnica (Sistemas): SIM / NÃO / DÚVIDAS
const AVALIACAO_TECNICA = [
  {
    id: "freio_motor",
    pergunta: "O motorista demonstra saber utilizar o Freio Motor corretamente?",
  },
  {
    id: "regeneracao_dpf",
    pergunta: "O motorista conhece o procedimento para a Regeneração (DPF)?",
  },
  {
    id: "acelerador_cenarios",
    pergunta:
      "O motorista sabe utilizar o acelerador em cada cenário (plano, aclive e declive)?",
  },
];

const TEC_OPCOES = [
  { value: "SIM", label: "Sim", icon: FaCheck, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "NAO", label: "Não", icon: FaX, cls: "bg-rose-50 border-rose-200 text-rose-700" },
  { value: "DUVIDAS", label: "Dúvidas", icon: FaQuestionCircle, cls: "bg-amber-50 border-amber-200 text-amber-700" },
];

// =============================================================================
// CONSTANTES UI
// =============================================================================
const NIVEIS = {
  1: { label: "Nível 1 (Leve)", dias: 5, color: "bg-blue-50 border-blue-200 text-blue-700" },
  2: { label: "Nível 2 (Médio)", dias: 10, color: "bg-amber-50 border-amber-200 text-amber-700" },
  3: { label: "Nível 3 (Crítico)", dias: 15, color: "bg-rose-50 border-rose-200 text-rose-700" },
};

function emptyChecklist() {
  // SIM/NAO -> boolean | null
  const conducao = {};
  CHECKLIST_CONDUCAO.forEach((i) => (conducao[i.id] = null));

  // SIM/NAO/DUVIDAS -> "SIM" | "NAO" | "DUVIDAS" | ""
  const tecnica = {};
  AVALIACAO_TECNICA.forEach((i) => (tecnica[i.id] = ""));

  return { conducao, tecnica };
}

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
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
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

    // ✅ novo modelo (PDF)
    checklistConducao: emptyChecklist().conducao,
    avaliacaoTecnica: emptyChecklist().tecnica,
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
  // CONTADORES PARA OS CARDS
  // ---------------------------------------------------------------------------
  const countAguardando = lista.filter(i => normalizeStatus(i.status) === "AGUARDANDO_INSTRUTOR").length;
  const countMonitoramento = lista.filter(i => normalizeStatus(i.status) === "EM_MONITORAMENTO").length;
  const countConcluido = lista.filter(i => ["OK", "ENCERRADO", "ATAS"].includes(normalizeStatus(i.status))).length;

  // ---------------------------------------------------------------------------
  // AÇÃO: CONSULTAR (Histórico)
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
  // AÇÃO: DETALHES (Resumo do lançamento)
  // ---------------------------------------------------------------------------
  const handleDetalhes = (item) => {
    setItemSelecionado(item);
    setModalDetalhesOpen(true);
  };

  // ---------------------------------------------------------------------------
  // AÇÃO: LANÇAR
  // ---------------------------------------------------------------------------
  const handleLancar = (item) => {
    setItemSelecionado(item);

    const base = emptyChecklist();

    setForm({
      horaInicio: "",
      horaFim: "",
      kmInicio: "",
      kmFim: "",
      mediaTeste: "",
      nivel: 2,
      obs: "",

      checklistConducao: base.conducao,
      avaliacaoTecnica: base.tecnica,
    });

    setModalLancarOpen(true);
  };

  const setConducao = (id, val) => {
    setForm((prev) => ({
      ...prev,
      checklistConducao: { ...prev.checklistConducao, [id]: val },
    }));
  };

  const setTecnica = (id, val) => {
    setForm((prev) => ({
      ...prev,
      avaliacaoTecnica: { ...prev.avaliacaoTecnica, [id]: val },
    }));
  };

  const salvarIntervencao = async () => {
    if (!itemSelecionado?.id) return;

    if (!form.horaInicio || !form.kmInicio || !form.mediaTeste) {
      alert("Preencha: Hora Início, KM Início e Média do Teste.");
      return;
    }

    const dias = NIVEIS[form.nivel]?.dias || 10;

    // início e fim previstos baseados no momento do lançamento (data SP)
    const inicioISO = spDateISO(new Date()); // YYYY-MM-DD (SP)
    const fimISO = addDaysISO(inicioISO, dias - 1);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const instrutorLogin = sess?.session?.user?.email || null;
      const instrutorNome = sess?.session?.user?.user_metadata?.full_name || null;

      // ✅ salva tudo dentro de intervencao_checklist (JSON)
      const intervencaoChecklist = {
        versao: "FORM_ACOMPANHAMENTO_TELEMETRIA_v1",
        conducao: form.checklistConducao || {},
        tecnica: form.avaliacaoTecnica || {},
      };

      const payload = {
        status: "EM_MONITORAMENTO",

        // contrato / monitoramento
        nivel: form.nivel,
        dias_monitoramento: dias,
        dt_inicio_monitoramento: inicioISO,
        dt_fim_previsao: fimISO,

        // auditoria instrutor
        instrutor_login: instrutorLogin,
        instrutor_nome: instrutorNome,

        // dados da prova
        intervencao_hora_inicio: form.horaInicio,
        intervencao_hora_fim: form.horaFim || null,
        intervencao_km_inicio: n(form.kmInicio),
        intervencao_km_fim: form.kmFim ? n(form.kmFim) : null,
        intervencao_media_teste: n(form.mediaTeste),

        // ✅ novo checklist / avaliação técnica
        intervencao_checklist: intervencaoChecklist,
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
        return matchTexto && ["OK", "ENCERRADO", "ATAS", "REJEITADA", "CANCELADO"].includes(st);
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

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-sm text-gray-500 font-bold">Aguardando Instrutor</p>
            <p className="text-2xl font-black text-slate-800">{countAguardando}</p>
          </div>
          <FaClock className="text-4xl text-amber-50" />
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm text-gray-500 font-bold">Em Monitoramento</p>
            <p className="text-2xl font-black text-slate-800">{countMonitoramento}</p>
          </div>
          <FaRoad className="text-4xl text-blue-50" />
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm text-gray-500 font-bold">Concluídos / Atas</p>
            <p className="text-2xl font-black text-slate-800">{countConcluido}</p>
          </div>
          <FaCheck className="text-4xl text-emerald-50" />
        </div>
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
          <option value="ENCERRADOS">🏁 Encerrados / Atas</option>
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

              const showDetalhes = hasLancamento(item) && !showLancar; // pós-lançamento

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

                      {showDetalhes && (
                        <button
                          onClick={() => handleDetalhes(item)}
                          className="p-2 text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 transition shadow-sm"
                          title="Ver Detalhes do Lançamento do Instrutor"
                        >
                          <FaClipboardList />
                        </button>
                      )}

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

      {/* MODAL DETALHES (Resumo do lançamento) */}
      {modalDetalhesOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FaClipboardList /> Detalhes do Lançamento
              </h3>
              <button onClick={() => setModalDetalhesOpen(false)}>
                <FaTimes className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg border bg-slate-50">
                <div className="text-sm">
                  <span className="font-bold text-slate-700">Motorista:</span>{" "}
                  {itemSelecionado.motorista_nome || "-"}{" "}
                  <span className="text-slate-400 font-mono">
                    ({itemSelecionado.motorista_chapa || "-"})
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-slate-700">Foco:</span> {getFoco(itemSelecionado)}
                </div>
              </div>

              <ResumoLancamentoInstrutor item={itemSelecionado} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONSULTA (Histórico) */}
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
                    <span className="text-blue-500 font-bold">Foco:</span> {getFoco(itemSelecionado)}
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

                  <div>
                    <span className="text-blue-500 font-bold">Início Monit.:</span>{" "}
                    {itemSelecionado.dt_inicio_monitoramento || "-"}
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">Fim Previsto:</span>{" "}
                    {itemSelecionado.dt_fim_previsao || "-"}
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
                          {h.dt_inicio_monitoramento && (
                            <div className="text-[11px] text-gray-400 mt-1 font-mono">
                              Monit.: {h.dt_inicio_monitoramento} → {h.dt_fim_previsao || "-"}
                            </div>
                          )}
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
                          <div className="text-xs text-gray-400 mt-1">Nível {h.nivel ?? "-"}</div>
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

              {/* 2) CHECKLIST DE CONDUÇÃO (SIM/NÃO) */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <FaClipboardList /> Checklist de Condução (Resumo Operacional)
                </h4>

                <div className="space-y-3">
                  {CHECKLIST_CONDUCAO.map((it) => {
                    const val = form.checklistConducao?.[it.id]; // true/false/null
                    return (
                      <div key={it.id} className="p-3 border rounded-lg bg-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-700">{it.titulo}</div>
                            <div className="text-sm text-slate-600">{it.desc}</div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConducao(it.id, true)}
                              className={`px-3 py-2 rounded border text-xs font-bold transition ${
                                val === true
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              SIM
                            </button>

                            <button
                              type="button"
                              onClick={() => setConducao(it.id, false)}
                              className={`px-3 py-2 rounded border text-xs font-bold transition ${
                                val === false
                                  ? "bg-rose-600 text-white border-rose-700"
                                  : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                              }`}
                            >
                              NÃO
                            </button>
                          </div>
                        </div>

                        {val === null && (
                          <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                            Selecione SIM ou NÃO
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3) AVALIAÇÃO TÉCNICA (SISTEMAS) */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Avaliação Técnica (Sistemas)</h4>

                <div className="space-y-3">
                  {AVALIACAO_TECNICA.map((q) => {
                    const v = form.avaliacaoTecnica?.[q.id] || "";
                    return (
                      <div key={q.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="text-sm text-slate-700 font-semibold mb-2">{q.pergunta}</div>

                        <div className="flex flex-wrap gap-2">
                          {TEC_OPCOES.map((op) => {
                            const Icon = op.icon;
                            const active = v === op.value;
                            return (
                              <button
                                key={op.value}
                                type="button"
                                onClick={() => setTecnica(q.id, op.value)}
                                className={`px-3 py-2 rounded border text-xs font-bold transition inline-flex items-center gap-2 ${
                                  active
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : `${op.cls} hover:brightness-95`
                                }`}
                              >
                                <Icon /> {op.label}
                              </button>
                            );
                          })}
                        </div>

                        {!v && (
                          <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                            Selecione uma opção
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4) NÍVEL */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Definir Nível (Contrato)</h4>

                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setForm({ ...form, nivel: lvl })}
                      className={`p-3 rounded-lg border text-center transition ${
                        form.nivel === lvl ? "ring-2 ring-offset-1 ring-slate-400 bg-white" : NIVEIS[lvl].color
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
