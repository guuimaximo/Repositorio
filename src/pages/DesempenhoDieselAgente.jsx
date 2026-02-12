import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlay,
  FaSpinner,
  FaFilePdf,
  FaSync,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaInfoCircle,
  FaTimes,
  FaChartLine,
  FaListAlt
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

// =============================================================================
// CONFIGURAÇÕES E ENV
// =============================================================================
const GH_USER = import.meta.env.VITE_GITHUB_USER;
const GH_REPO = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REF = "main";

const WF_GERENCIAL = "relatorio_gerencial.yml";
const WF_ACOMP = "ordem-acompanhamento.yml";

const SUPABASE_BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET_NAME = "relatorios";

// =============================================================================
// HELPERS
// =============================================================================
function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function fmtDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SUPABASE_BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${cleanPath}`;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// Disparo de GitHub Actions
async function dispatchGitHubWorkflow(workflowFile, inputs) {
  if (!GH_USER || !GH_REPO || !GH_TOKEN) {
    throw new Error("Credenciais GitHub ausentes.");
  }
  const url = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/actions/workflows/${workflowFile}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: GH_REF, inputs }),
  });

  if (response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erro GitHub: ${response.status}`);
  }
  return true;
}

function StatusBadge({ status }) {
  if (status === "CONCLUIDO") return <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">OK</span>;
  if (status === "ERRO") return <span className="px-2 py-1 rounded text-xs font-bold bg-rose-100 text-rose-700">ERRO</span>;
  return <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">{status || "PROCESSANDO"}</span>;
}

// =============================================================================
// COMPONENTE DE GRÁFICO SVG (Simples e Leve)
// =============================================================================
const SimpleLineChart = ({ data }) => {
    // Espera data = [{ label: 'SEM 1', real: 2.3, meta: 2.7 }, ...]
    if (!data || data.length === 0) return <div className="text-center text-xs text-slate-400 py-10">Sem dados gráficos disponíveis</div>;

    const width = 400;
    const height = 150;
    const padding = 20;

    // Calcula escalas
    const allValues = data.flatMap(d => [d.real, d.meta]);
    const maxVal = Math.max(...allValues) * 1.1 || 5;
    const minVal = Math.min(...allValues) * 0.9 || 0;
    const range = maxVal - minVal || 1;

    const getX = (i) => padding + (i / (data.length - 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - ((val - minVal) / range) * (height - 2 * padding);

    const pointsReal = data.map((d, i) => `${getX(i)},${getY(d.real)}`).join(" ");
    const pointsMeta = data.map((d, i) => `${getX(i)},${getY(d.meta)}`).join(" ");

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto border bg-white rounded-lg">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = height - padding - pct * (height - 2 * padding);
                return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#eee" strokeWidth="1" />;
            })}

            {/* Linha Meta (Tracejada Cinza) */}
            <polyline fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5" points={pointsMeta} />
            
            {/* Linha Real (Sólida Vermelha) */}
            <polyline fill="none" stroke="#e11d48" strokeWidth="2" points={pointsReal} />

            {/* Pontos */}
            {data.map((d, i) => (
                <g key={i}>
                    <circle cx={getX(i)} cy={getY(d.real)} r="3" fill="#e11d48" />
                    <text x={getX(i)} y={getY(d.real) - 8} textAnchor="middle" fontSize="10" fill="#e11d48" fontWeight="bold">
                        {n(d.real).toFixed(2)}
                    </text>
                     <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="9" fill="#64748b">
                        {d.label}
                    </text>
                </g>
            ))}
        </svg>
    );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

  // Estados de Filtro/Dados
  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [userSession, setUserSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Dados do BD
  const [ultimoGerencial, setUltimoGerencial] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [selected, setSelected] = useState({}); 
  const [sortConfig, setSortConfig] = useState({ key: "combustivel_desperdicado", direction: "desc" });
  
  // MODAL DETALHADO
  const [viewingDetails, setViewingDetails] = useState(null);
  const [modalContent, setModalContent] = useState({ raioX: [], chartData: [] });

  const validarPeriodo = useCallback(() => {
    if (!periodoInicio || !periodoFim) return true;
    return periodoInicio <= periodoFim;
  }, [periodoInicio, periodoFim]);

  // ---------------------------------------------------------------------------
  // CARREGAMENTO DE DADOS
  // ---------------------------------------------------------------------------
  async function carregarTela() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      setUserSession(sess?.session || null);

      // 1. Último relatório gerencial
      const { data: rel } = await supabase.from("relatorios_gerados").select("*").eq("tipo", "diesel_gerencial").order("created_at", { ascending: false }).limit(1).maybeSingle();
      setUltimoGerencial(rel || null);

      // 2. Sugestões (View ou Tabela)
      // Importante: A view precisa trazer a coluna 'detalhes_json' se ela existir na tabela original
      const { data: sug } = await supabase.from("v_sugestoes_acompanhamento_30d").select("*").limit(500);
      setSugestoes(sug || []);

    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTela();
  }, []);

  // ---------------------------------------------------------------------------
  // ABRIR MODAL COM DADOS PRÉ-CALCULADOS
  // ---------------------------------------------------------------------------
  const openModal = async (motorista) => {
      // Tenta ler o JSON que já veio na consulta ou busca sob demanda se a view não tiver
      let detalhes = motorista.detalhes_json;

      // Se a view não trouxe o JSON, fazemos um fetch rápido na tabela original (Supabase B)
      if (!detalhes) {
          const { data } = await supabase
              .from("diesel_sugestoes_acompanhamento")
              .select("detalhes_json")
              .eq("chapa", motorista.motorista_chapa)
              .eq("mes_ref", motorista.mes_ref || new Date().toISOString().slice(0, 7)) // Fallback de segurança
              .maybeSingle();
          
          if (data && data.detalhes_json) {
              detalhes = data.detalhes_json;
          }
      }

      setViewingDetails(motorista);
      
      if (detalhes) {
          setModalContent({
              raioX: detalhes.raio_x || [],
              chartData: detalhes.grafico_semanal || []
          });
      } else {
          setModalContent({ raioX: [], chartData: [] });
      }
  };

  // ---------------------------------------------------------------------------
  // LÓGICA DE ORDENAÇÃO
  // ---------------------------------------------------------------------------
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedSugestoes = useMemo(() => {
    if (!sugestoes) return [];
    let items = [...sugestoes];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        const nums = ["km_percorrido", "combustivel_consumido", "kml_realizado", "kml_meta", "combustivel_desperdicado"];
        if (nums.includes(sortConfig.key)) { aVal = n(aVal); bVal = n(bVal); }
        else { aVal = String(aVal || "").toLowerCase(); bVal = String(bVal || "").toLowerCase(); }
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [sugestoes, sortConfig]);

  const ThSortable = ({ label, columnKey, align = "left" }) => (
    <th className={`p-3 cursor-pointer hover:bg-slate-100 text-${align}`} onClick={() => handleSort(columnKey)}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {label}
        {sortConfig.key !== columnKey ? <FaSort className="text-slate-300" /> : (sortConfig.direction === "asc" ? <FaSortUp className="text-cyan-600" /> : <FaSortDown className="text-cyan-600" />)}
      </div>
    </th>
  );

  // ---------------------------------------------------------------------------
  // AÇÕES
  // ---------------------------------------------------------------------------
  const dispararGerencial = async () => {
    setErro(null); setSucesso(null);
    try {
      const { data: record, error } = await supabase
        .from("relatorios_gerados")
        .insert({
          tipo: "diesel_gerencial",
          status: "PROCESSANDO",
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          solicitante_login: userSession?.user?.email || "sistema",
          solicitante_nome: userSession?.user?.user_metadata?.full_name,
        })
        .select("id")
        .single();

      if (error) throw error;

      await dispatchGitHubWorkflow(WF_GERENCIAL, {
        report_id: String(record.id),
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        report_tipo: "diesel_gerencial",
      });

      setSucesso(`Relatório #${record.id} enviado.`);
      setTimeout(carregarTela, 2000);
    } catch (err) {
      setErro(err?.message || String(err));
    }
  };

  const gerarFormulariosSelecionados = async () => {
    setErro(null); setSucesso(null);
    const selecionados = sugestoes.filter((r) => selected[r.motorista_chapa]);
    if (!selecionados.length) { setErro("Selecione pelo menos 1 motorista."); return; }

    try {
      const { data: lote, error: errL } = await supabase
        .from("acompanhamento_lotes")
        .insert({
          status: "PROCESSANDO",
          qtd: selecionados.length,
          extra: { origem: "v_sugestoes_acompanhamento_30d", gerado_em: new Date().toISOString() },
        })
        .select("id").single();
      if (errL) throw errL;

      const itens = selecionados.map((r) => ({
        lote_id: lote.id,
        motorista_chapa: r.motorista_chapa,
        linha_mais_rodada: r.linha_mais_rodada ?? null,
        km_percorrido: n(r.km_percorrido),
        combustivel_consumido: n(r.combustivel_consumido),
        kml_realizado: n(r.kml_realizado),
        kml_meta: n(r.kml_meta),
        combustivel_desperdicado: n(r.combustivel_desperdicado),
        extra: { motorista_nome: r.motorista_nome ?? null },
      }));

      const { error: errI } = await supabase.from("acompanhamento_lote_itens").insert(itens);
      if (errI) throw errI;

      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(selecionados.length),
      });

      setSucesso(`Lote #${lote.id} enviado. Processando...`);
      setSelected({});
      setTimeout(carregarTela, 2500);
    } catch (err) {
      setErro(err?.message || String(err));
    }
  };

  const ultimoPdfUrl = getPublicUrl(ultimoGerencial?.arquivo_pdf_path);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const allChecked = useMemo(() => sugestoes.length && sugestoes.every((r) => selected[r.motorista_chapa]), [sugestoes, selected]);
  const toggleAll = () => { if (allChecked) { setSelected({}); } else { const m = {}; sugestoes.forEach((r) => (m[r.motorista_chapa] = true)); setSelected(m); } };
  const toggleOne = (chapa) => { setSelected((p) => ({ ...p, [chapa]: !p[chapa] })); };

  // ===========================================================================
  // RENDERIZAÇÃO
  // ===========================================================================
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto relative">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <FaBolt size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Agente Diesel</h2>
            <p className="text-sm text-slate-500">Gerencial + Sugestões de Acompanhamento</p>
          </div>
        </div>
        <button onClick={carregarTela} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Atualizar">
          <FaSync className={clsx(loading && "animate-spin")} />
        </button>
      </div>

      {/* 2. FEEDBACK MSG */}
      {(sucesso || erro) && (
        <div className={clsx("p-4 rounded-xl border flex items-center gap-3", sucesso ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
          {sucesso ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <div>
            <p className="font-bold text-sm">{sucesso ? "Sucesso" : "Atenção"}</p>
            <p className="text-xs">{sucesso || erro}</p>
          </div>
        </div>
      )}

      {/* 3. PAINEL GERENCIAL (A PARTE QUE TINHA SUMIDO) */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Relatório Gerencial</h3>
          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">MENSAL</span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-3 mb-4">
          <div className="text-sm">
            <span className="text-slate-500 font-bold">Último Relatório: </span>
            {ultimoGerencial ? (
              <>
                <span className="font-extrabold text-slate-800">#{ultimoGerencial.id}</span>
                <span className="text-slate-500 text-xs ml-2">
                  {ultimoGerencial.created_at ? new Date(ultimoGerencial.created_at).toLocaleDateString() : "-"}
                </span>
                <span className="ml-3"><StatusBadge status={ultimoGerencial.status} /></span>
              </>
            ) : (
              <span className="text-slate-500">Nenhum registro encontrado</span>
            )}
          </div>
          {ultimoGerencial?.status === "CONCLUIDO" && ultimoPdfUrl && (
            <a href={ultimoPdfUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-700 font-extrabold inline-flex items-center gap-2 hover:underline">
              <FaFilePdf /> Abrir PDF
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500">Início</label>
            <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Fim</label>
            <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={dispararGerencial} disabled={!validarPeriodo()} className={clsx("w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm transition-colors", "bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-300")}>
            <FaPlay /> DISPARAR RELATÓRIO
          </button>
        </div>
      </div>

      {/* 4. Tabela Principal */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800">Sugestões de Acompanhamento (30 dias)</h3>
            <p className="text-xs text-slate-500">Selecione os motoristas e gere prontuários para iniciar o ciclo.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">Selecionados: <b>{selectedCount}</b></div>
            <button onClick={gerarFormulariosSelecionados} disabled={selectedCount === 0} className={clsx("px-4 py-2 rounded-xl font-extrabold text-sm transition-colors", selectedCount === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
              Gerar formulários
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-white border-b sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="p-3 w-10"></th>
                <ThSortable label="Chapa" columnKey="motorista_chapa" />
                <ThSortable label="Linha" columnKey="linha_mais_rodada" />
                <ThSortable label="KM Total" columnKey="km_percorrido" align="right" />
                <ThSortable label="Consumo" columnKey="combustivel_consumido" align="right" />
                <ThSortable label="Real" columnKey="kml_realizado" align="right" />
                <ThSortable label="Meta" columnKey="kml_meta" align="right" />
                <ThSortable label="Desperdício" columnKey="combustivel_desperdicado" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedSugestoes.map((r) => (
                <tr key={r.motorista_chapa} className="hover:bg-slate-50">
                  <td className="p-3 text-center"><input type="checkbox" checked={!!selected[r.motorista_chapa]} onChange={() => toggleOne(r.motorista_chapa)} /></td>
                  <td className="p-3 text-center">
                    <button onClick={() => openModal(r)} className="text-slate-400 hover:text-cyan-600 transition-colors p-1" title="Ver detalhes completos">
                      <FaInfoCircle size={18} />
                    </button>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{r.motorista_chapa}</td>
                  <td className="p-3 text-slate-700">{r.linha_mais_rodada}</td>
                  <td className="p-3 text-right">{n(r.km_percorrido).toFixed(0)}</td>
                  <td className="p-3 text-right">{n(r.combustivel_consumido).toFixed(0)}</td>
                  <td className="p-3 text-right font-bold">{n(r.kml_realizado).toFixed(2)}</td>
                  <td className="p-3 text-right text-slate-500">{n(r.kml_meta).toFixed(2)}</td>
                  <td className="p-3 text-right text-rose-700 font-bold">{n(r.combustivel_desperdicado).toFixed(0)} L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 5. MODAL DE DETALHES (LENDO DO JSON DO BANCO) */}
      {/* ================================================================== */}
      {viewingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header Modal */}
            <div className="bg-slate-800 text-white p-5 flex justify-between items-start sticky top-0 z-20">
              <div>
                <div className="flex items-center gap-2">
                    <FaBolt className="text-yellow-400" />
                    <h3 className="text-lg font-bold">Auditoria de Eficiência</h3>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                   Motorista: <span className="font-mono bg-slate-700 px-1 rounded">{viewingDetails.motorista_chapa}</span> - {viewingDetails.motorista_nome}
                </p>
                <div className="text-xs text-slate-400 mt-1">
                   Dados processados pela IA no momento da sugestão.
                </div>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-full transition">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Corpo Modal */}
            <div className="p-6 space-y-8 flex-1">
              
              {(!modalContent.raioX || modalContent.raioX.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3 border-2 border-dashed rounded-xl bg-slate-50">
                      <FaExclamationTriangle className="text-3xl text-slate-300" />
                      <p>Detalhes não disponíveis para este registro.</p>
                      <span className="text-xs">Execute o relatório novamente para gerar os dados detalhados.</span>
                  </div>
              ) : (
                <>
                    {/* SEÇÃO 1: RAIO-X DA OPERAÇÃO */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                            <FaListAlt />
                            <h4 className="font-bold text-sm uppercase tracking-wide">1. Raio-X da Operação (Onde houve perda?)</h4>
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-100 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-2 text-left">Linha</th>
                                        <th className="p-2 text-left">Cluster</th>
                                        <th className="p-2 text-right">KM</th>
                                        <th className="p-2 text-right">Litros</th>
                                        <th className="p-2 text-right">Real</th>
                                        <th className="p-2 text-right">Meta</th>
                                        <th className="p-2 text-right">Desp.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {modalContent.raioX.map((row, idx) => (
                                        <tr key={idx} className={row.desperdicio > 10 ? "bg-rose-50" : ""}>
                                            <td className="p-2 font-bold text-slate-700">{row.linha}</td>
                                            <td className="p-2 text-slate-500">{row.cluster}</td>
                                            <td className="p-2 text-right">{n(row.km).toFixed(0)}</td>
                                            <td className="p-2 text-right">{n(row.litros).toFixed(0)}</td>
                                            <td className="p-2 text-right font-bold">{n(row.kml_real).toFixed(2)}</td>
                                            <td className="p-2 text-right text-slate-500">{n(row.kml_meta).toFixed(2)}</td>
                                            <td className={`p-2 text-right font-bold ${row.desperdicio > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {n(row.desperdicio).toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SEÇÃO 2: GRÁFICO DE TENDÊNCIA */}
                    <div className="space-y-3">
                         <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                            <FaChartLine />
                            <h4 className="font-bold text-sm uppercase tracking-wide">2. Evolução Semanal (Meta vs Realizado)</h4>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                             <SimpleLineChart data={modalContent.chartData} />
                             
                             {/* Legenda do Gráfico */}
                             <div className="flex justify-center gap-6 mt-4 text-xs">
                                 <div className="flex items-center gap-2">
                                     <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                                     <span className="font-bold text-slate-700">Realizado</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="w-6 h-1 border-t-2 border-dashed border-slate-400"></span>
                                     <span className="font-bold text-slate-500">Meta (Ref)</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                </>
              )}
              
              <div className="pt-4 border-t flex justify-end">
                 <button onClick={() => setViewingDetails(null)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors">
                   Fechar Análise
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
