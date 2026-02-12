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

// Helper de Cluster (Mesma lógica do Python para consistência)
function getCluster(veiculo) {
    const v = String(veiculo || "").trim();
    if (v.startsWith("2216")) return "C8";
    if (v.startsWith("2222")) return "C9";
    if (v.startsWith("2224")) return "C10";
    if (v.startsWith("2425")) return "C11";
    if (v.startsWith("W")) return "C6";
    return "OUTROS";
}

// Metas aproximadas por Cluster (Fallback caso não tenha no banco)
const METAS_CLUSTER = { "C6": 2.5, "C8": 2.6, "C9": 2.73, "C10": 2.8, "C11": 2.9, "OUTROS": 2.5 };

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
    // data = [{ label: 'SEM 1', real: 2.3, meta: 2.7 }, ...]
    if (!data || data.length === 0) return null;

    const width = 400;
    const height = 150;
    const padding = 20;

    const maxVal = Math.max(...data.map(d => Math.max(d.real, d.meta))) * 1.1;
    const minVal = Math.min(...data.map(d => Math.min(d.real, d.meta))) * 0.9;
    const range = maxVal - minVal;

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
                    {/* Ponto Real */}
                    <circle cx={getX(i)} cy={getY(d.real)} r="3" fill="#e11d48" />
                    <text x={getX(i)} y={getY(d.real) - 8} textAnchor="middle" fontSize="10" fill="#e11d48" fontWeight="bold">
                        {d.real.toFixed(2)}
                    </text>

                     {/* Label X Axis */}
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

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [userSession, setUserSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const [ultimoGerencial, setUltimoGerencial] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [selected, setSelected] = useState({}); 
  const [sortConfig, setSortConfig] = useState({ key: "combustivel_desperdicado", direction: "desc" });
  
  // MODAL DETALHADO
  const [viewingDetails, setViewingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState({ raioX: [], chartData: [] });

  // ---------------------------------------------------------------------------
  // CARGA INICIAL
  // ---------------------------------------------------------------------------
  async function carregarTela() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      setUserSession(sess?.session || null);

      const { data: rel } = await supabase.from("relatorios_gerados").select("*").eq("tipo", "diesel_gerencial").order("created_at", { ascending: false }).limit(1).maybeSingle();
      setUltimoGerencial(rel || null);

      const { data: sug } = await supabase.from("v_sugestoes_acompanhamento_30d").select("*").limit(500);
      setSugestoes(sug || []);
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTela();
  }, []);

  // ---------------------------------------------------------------------------
  // BUSCA DETALHADA (QUANDO CLICA NO 'i')
  // ---------------------------------------------------------------------------
  const fetchDetalhesMotorista = async (chapa) => {
    setLoadingDetails(true);
    setDetailsData({ raioX: [], chartData: [] });
    
    try {
        // Busca dados brutos dos últimos 30 dias para este motorista
        const dataCorte = new Date();
        dataCorte.setDate(dataCorte.getDate() - 30);
        const strDataCorte = fmtDateInput(dataCorte);

        const { data: raw, error } = await supabase
            .from("premiacao_diaria")
            .select('dia, motorista, veiculo, linha, km_rodado, combustivel_consumido')
            .eq("motorista", chapa)
            .gte("dia", strDataCorte)
            .order("dia", { ascending: true });

        if (error) throw error;
        if (!raw || raw.length === 0) return;

        // --- PROCESSA RAIO-X (Agrupar por Linha + Cluster) ---
        const mapRaioX = {};
        raw.forEach(row => {
            const cluster = getCluster(row.veiculo);
            const key = `${row.linha}||${cluster}`;
            
            if (!mapRaioX[key]) {
                mapRaioX[key] = { 
                    linha: row.linha, 
                    cluster: cluster, 
                    veiculos: new Set(),
                    km: 0, 
                    litros: 0 
                };
            }
            mapRaioX[key].km += n(row.km_rodado);
            mapRaioX[key].litros += n(row.combustivel_consumido);
            mapRaioX[key].veiculos.add(row.veiculo);
        });

        const listaRaioX = Object.values(mapRaioX).map(item => {
            const kmlReal = item.km / item.litros;
            const kmlMeta = METAS_CLUSTER[item.cluster] || 2.5;
            const litrosIdeal = item.km / kmlMeta;
            const desperdicio = item.litros - litrosIdeal;
            
            return {
                ...item,
                veiculoExemplo: [...item.veiculos][0], // Pega um exemplo
                kmlReal,
                kmlMeta,
                desperdicio: desperdicio > 0 ? desperdicio : 0
            };
        }).sort((a, b) => b.desperdicio - a.desperdicio); // Ordena por maior desperdício

        // --- PROCESSA GRÁFICO (Agrupar por Semana) ---
        const mapWeek = {};
        raw.forEach(row => {
            const d = new Date(row.dia);
            // Pega o início da semana (Domingo)
            const first = d.getDate() - d.getDay();
            const weekStart = new Date(d.setDate(first)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            if (!mapWeek[weekStart]) mapWeek[weekStart] = { km: 0, litros: 0, metaSoma: 0, count: 0 };
            
            mapWeek[weekStart].km += n(row.km_rodado);
            mapWeek[weekStart].litros += n(row.combustivel_consumido);
            
            // Estimativa grosseira da meta daquela viagem baseada no veiculo
            const metaViagem = METAS_CLUSTER[getCluster(row.veiculo)] || 2.5;
            mapWeek[weekStart].metaSoma += metaViagem;
            mapWeek[weekStart].count += 1;
        });

        const listaChart = Object.keys(mapWeek).map(label => {
            const w = mapWeek[label];
            return {
                label,
                real: w.litros > 0 ? w.km / w.litros : 0,
                meta: w.count > 0 ? w.metaSoma / w.count : 2.5
            };
        });

        setDetailsData({ raioX: listaRaioX, chartData: listaChart });

    } catch (err) {
        console.error("Erro detalhes:", err);
    } finally {
        setLoadingDetails(false);
    }
  };

  const openModal = (motorista) => {
    setViewingDetails(motorista);
    fetchDetalhesMotorista(motorista.motorista_chapa);
  };

  // ---------------------------------------------------------------------------
  // ORDENAÇÃO E AÇÕES
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
  // DISPAROS (Gerencial e Lotes)
  // ---------------------------------------------------------------------------
  const dispararGerencial = async () => { /* ... Código existente mantido ... */ };
  const gerarFormulariosSelecionados = async () => { /* ... Código existente mantido ... */ };

  // ... (Funções de toggle checkbox mantidas) ...
  const toggleAll = () => { /* ... */ };
  const toggleOne = (chapa) => { setSelected(prev => ({ ...prev, [chapa]: !prev[chapa] })); };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto relative">
      {/* ... (Header e Cards Superiores mantidos iguais ao anterior) ... */}
      
      {/* Tabela Principal */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* ... Header da Tabela ... */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-white border-b sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center"><input type="checkbox" /></th>
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
      {/* MODAL DE DETALHES AVANÇADO (RAIO-X + GRÁFICO) */}
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
                   Motorista: <span className="font-mono bg-slate-700 px-1 rounded">{viewingDetails.motorista_chapa}</span> - {viewingDetails.motorista_nome || "Nome não identificado"}
                </p>
                <div className="text-xs text-slate-400 mt-1">
                    Período Analisado: Últimos 30 dias
                </div>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-full transition">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Corpo Modal */}
            <div className="p-6 space-y-8 flex-1">
              
              {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                      <FaSpinner className="animate-spin text-3xl" />
                      <p>Calculando Raio-X da operação...</p>
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
                                    {detailsData.raioX.map((row, idx) => (
                                        <tr key={idx} className={row.desperdicio > 10 ? "bg-rose-50" : ""}>
                                            <td className="p-2 font-bold text-slate-700">{row.linha}</td>
                                            <td className="p-2 text-slate-500">{row.cluster}</td>
                                            <td className="p-2 text-right">{n(row.km).toFixed(0)}</td>
                                            <td className="p-2 text-right">{n(row.litros).toFixed(0)}</td>
                                            <td className="p-2 text-right font-bold">{n(row.kmlReal).toFixed(2)}</td>
                                            <td className="p-2 text-right text-slate-500">{n(row.kmlMeta).toFixed(2)}</td>
                                            <td className={`p-2 text-right font-bold ${row.desperdicio > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {n(row.desperdicio).toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                    {detailsData.raioX.length === 0 && (
                                        <tr><td colSpan={7} className="p-4 text-center text-slate-400">Sem dados detalhados para o período.</td></tr>
                                    )}
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
                             <SimpleLineChart data={detailsData.chartData} />
                             
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
