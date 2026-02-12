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

// Converte para número seguro (evita NaN em cálculos e ordenação)
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// Disparo de GitHub Actions
async function dispatchGitHubWorkflow(workflowFile, inputs) {
  if (!GH_USER || !GH_REPO || !GH_TOKEN) {
    throw new Error("Credenciais GitHub ausentes (.env): VITE_GITHUB_USER/REPO/TOKEN");
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

// Componente de Badge de Status
function StatusBadge({ status }) {
  if (status === "CONCLUIDO") {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
        OK
      </span>
    );
  }
  if (status === "ERRO") {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-rose-100 text-rose-700">
        ERRO
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">
      {status || "PROCESSANDO"}
    </span>
  );
}

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
  
  // Seleção e Ordenação
  const [selected, setSelected] = useState({}); // {chapa: true}
  const [sortConfig, setSortConfig] = useState({ key: "combustivel_desperdicado", direction: "desc" });
  
  // Modal
  const [viewingDetails, setViewingDetails] = useState(null);

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
      const { data: rel } = await supabase
        .from("relatorios_gerados")
        .select("*")
        .eq("tipo", "diesel_gerencial")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setUltimoGerencial(rel || null);

      // 2. Sugestões (View que filtra quem já tem ordem)
      const { data: sug } = await supabase
        .from("v_sugestoes_acompanhamento_30d")
        .select("*")
        .limit(500); // Limite de segurança

      setSugestoes(sug || []);

      // Limpa seleção de IDs que não existem mais na lista
      setSelected((prev) => {
        const keep = {};
        (sug || []).forEach((r) => {
          if (prev[r.motorista_chapa]) keep[r.motorista_chapa] = true;
        });
        return keep;
      });
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // LÓGICA DE ORDENAÇÃO
  // ---------------------------------------------------------------------------
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedSugestoes = useMemo(() => {
    if (!sugestoes) return [];
    
    let sortableItems = [...sugestoes];
    
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Verifica colunas numéricas
        const numericCols = ["km_percorrido", "combustivel_consumido", "kml_realizado", "kml_meta", "combustivel_desperdicado"];
        
        if (numericCols.includes(sortConfig.key)) {
            aVal = n(aVal);
            bVal = n(bVal);
        } else {
            // String comparison
            aVal = String(aVal || "").toLowerCase();
            bVal = String(bVal || "").toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [sugestoes, sortConfig]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <FaSort className="text-slate-300" />;
    return sortConfig.direction === "asc" ? <FaSortUp className="text-cyan-600" /> : <FaSortDown className="text-cyan-600" />;
  };

  // Subcomponente de Header Sortable
  const ThSortable = ({ label, columnKey, align = "left" }) => (
    <th 
      className={`p-3 cursor-pointer hover:bg-slate-100 transition-colors text-${align}`}
      onClick={() => handleSort(columnKey)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {label}
        {getSortIcon(columnKey)}
      </div>
    </th>
  );

  // ---------------------------------------------------------------------------
  // LÓGICA DE SELEÇÃO
  // ---------------------------------------------------------------------------
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const allChecked = useMemo(() => {
    if (!sugestoes.length) return false;
    return sugestoes.every((r) => selected[r.motorista_chapa]);
  }, [sugestoes, selected]);

  const toggleAll = () => {
    if (!sugestoes.length) return;
    if (allChecked) {
      setSelected({});
      return;
    }
    const m = {};
    sugestoes.forEach((r) => (m[r.motorista_chapa] = true));
    setSelected(m);
  };

  const toggleOne = (chapa) => {
    setSelected((p) => ({ ...p, [chapa]: !p[chapa] }));
  };

  // ---------------------------------------------------------------------------
  // AÇÕES (DISPAROS)
  // ---------------------------------------------------------------------------
  const dispararGerencial = async () => {
    setErro(null);
    setSucesso(null);

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
    setErro(null);
    setSucesso(null);

    const selecionados = sugestoes.filter((r) => selected[r.motorista_chapa]);
    if (!selecionados.length) {
      setErro("Selecione pelo menos 1 motorista.");
      return;
    }

    try {
      // 1. Cria lote
      const { data: lote, error: errL } = await supabase
        .from("acompanhamento_lotes")
        .insert({
          status: "PROCESSANDO",
          qtd: selecionados.length,
          extra: { origem: "v_sugestoes_acompanhamento_30d", gerado_em: new Date().toISOString() },
        })
        .select("id")
        .single();

      if (errL) throw errL;

      // 2. Grava itens
      const itens = selecionados.map((r) => ({
        lote_id: lote.id,
        motorista_chapa: r.motorista_chapa,
        linha_mais_rodada: r.linha_mais_rodada ?? null,
        km_percorrido: n(r.km_percorrido),
        combustivel_consumido: n(r.combustivel_consumido), // Nome da coluna na view pode variar, ajustar se necessario
        kml_realizado: n(r.kml_realizado),
        kml_meta: n(r.kml_meta),
        combustivel_desperdicado: n(r.combustivel_desperdicado),
        extra: { motorista_nome: r.motorista_nome ?? null },
      }));

      const { error: errI } = await supabase.from("acompanhamento_lote_itens").insert(itens);
      if (errI) throw errI;

      // 3. Dispara Workflow
      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(selecionados.length),
      });

      setSucesso(`Lote #${lote.id} gerado com ${selecionados.length} motoristas. Processando...`);
      setSelected({});
      setTimeout(carregarTela, 2500);
    } catch (err) {
      setErro(err?.message || String(err));
    }
  };

  const ultimoPdfUrl = getPublicUrl(ultimoGerencial?.arquivo_pdf_path);

  // ===========================================================================
  // RENDERIZAÇÃO
  // ===========================================================================
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto relative">
      {/* HEADER */}
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

        <button
          onClick={carregarTela}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
          title="Atualizar"
        >
          <FaSync className={clsx(loading && "animate-spin")} />
        </button>
      </div>

      {/* FEEDBACK MSG */}
      {(sucesso || erro) && (
        <div
          className={clsx(
            "p-4 rounded-xl border flex items-center gap-3",
            sucesso
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {sucesso ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <div>
            <p className="font-bold text-sm">{sucesso ? "Sucesso" : "Atenção"}</p>
            <p className="text-xs">{sucesso || erro}</p>
          </div>
        </div>
      )}

      {/* PAINEL GERENCIAL */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Relatório Gerencial</h3>
          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">
            MENSAL
          </span>
        </div>

        {/* Status do último relatório */}
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
            <a
              href={ultimoPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-700 font-extrabold inline-flex items-center gap-2 hover:underline"
            >
              <FaFilePdf /> Abrir PDF
            </a>
          )}
        </div>

        {/* Controles de Data e Disparo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500">Início</label>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Fim</label>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={dispararGerencial}
            disabled={!validarPeriodo()}
            className={clsx(
              "w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm transition-colors",
              "bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-300"
            )}
          >
            <FaPlay /> DISPARAR RELATÓRIO
          </button>
        </div>
      </div>

      {/* PAINEL DE SUGESTÕES (TRIAGEM) */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Header da Tabela */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800">Sugestões de Acompanhamento (30 dias)</h3>
            <p className="text-xs text-slate-500">
              Selecione os motoristas e gere prontuários para iniciar o ciclo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">
              Selecionados: <b>{selectedCount}</b>
            </div>
            <button
              onClick={gerarFormulariosSelecionados}
              disabled={selectedCount === 0}
              className={clsx(
                "px-4 py-2 rounded-xl font-extrabold text-sm transition-colors",
                selectedCount === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              Gerar formulários
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-white border-b sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="p-3 w-10"></th> {/* Coluna de Info */}
                
                <ThSortable label="Chapa" columnKey="motorista_chapa" />
                <ThSortable label="Linha" columnKey="linha_mais_rodada" />
                <ThSortable label="KM Total" columnKey="km_percorrido" align="right" />
                <ThSortable label="Consumo" columnKey="combustivel_consumido" align="right" />
                <ThSortable label="KM/L Real" columnKey="kml_realizado" align="right" />
                <ThSortable label="Meta" columnKey="kml_meta" align="right" />
                <ThSortable label="Desperdício" columnKey="combustivel_desperdicado" align="right" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {sortedSugestoes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-slate-500 text-center">
                    Nenhuma sugestão encontrada para o período.
                  </td>
                </tr>
              ) : (
                sortedSugestoes.map((r) => {
                  const chapa = r.motorista_chapa;
                  const checked = !!selected[chapa];
                  // Cálculo de desvio %
                  const desvio = r.kml_meta > 0 ? ((r.kml_meta - r.kml_realizado) / r.kml_meta * 100) : 0;
                  const litrosPerdidos = n(r.combustivel_desperdicado);

                  return (
                    <tr key={chapa} className={clsx("hover:bg-slate-50 transition-colors", checked && "bg-emerald-50/40")}>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(chapa)} />
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => setViewingDetails(r)}
                          className="text-slate-400 hover:text-cyan-600 transition-colors p-1"
                          title="Ver detalhes do diagnóstico"
                        >
                          <FaInfoCircle size={16} />
                        </button>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{chapa}</td>
                      <td className="p-3 text-slate-700 font-mono text-xs">{r.linha_mais_rodada || "-"}</td>
                      <td className="p-3 text-right text-slate-600">{n(r.km_percorrido)?.toFixed(0)}</td>
                      <td className="p-3 text-right text-slate-600">{n(r.combustivel_consumido)?.toFixed(0)}</td>
                      <td className={clsx("p-3 text-right font-bold", desvio > 5 ? "text-rose-600" : "text-slate-800")}>
                        {n(r.kml_realizado)?.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-slate-500 text-xs">{n(r.kml_meta)?.toFixed(2)}</td>
                      <td className="p-3 text-right">
                         <span className={clsx("px-2 py-1 rounded text-xs font-bold", 
                            litrosPerdidos > 50 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                         )}>
                           {litrosPerdidos?.toFixed(0)} L
                         </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES (OVERLAY) */}
      {viewingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="bg-slate-800 text-white p-5 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Diagnóstico de Eficiência</h3>
                <p className="text-slate-300 text-sm">
                   Motorista: {viewingDetails.motorista_chapa} - {viewingDetails.motorista_nome || "Nome N/D"}
                </p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-slate-400 hover:text-white">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Corpo Modal */}
            <div className="p-6 space-y-6">
              
              {/* Card Resumo */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-center">
                 <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                    <FaExclamationTriangle size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-amber-900">Motivo da Sugestão</h4>
                    <p className="text-sm text-amber-800">
                      Performance abaixo da meta na linha <b>{viewingDetails.linha_mais_rodada}</b>.
                    </p>
                 </div>
              </div>

              {/* A Matemática */}
              <div className="space-y-2">
                 <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cálculo de Impacto</h5>
                 
                 <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg border">
                       <div className="text-slate-500 text-xs">Meta da Linha</div>
                       <div className="font-bold text-slate-700 text-lg">{n(viewingDetails.kml_meta)?.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                       <div className="text-rose-500 text-xs">Realizado</div>
                       <div className="font-bold text-rose-700 text-lg">{n(viewingDetails.kml_realizado)?.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                       <div className="text-slate-500 text-xs">KM Rodado</div>
                       <div className="font-bold text-slate-700 text-lg">{n(viewingDetails.km_percorrido)?.toFixed(0)}</div>
                    </div>
                 </div>

                 {/* Fórmula Explicada */}
                 <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-600 mt-2">
                    <div className="flex justify-between mb-1">
                       <span>Consumo Real:</span>
                       <span className="font-bold">{n(viewingDetails.combustivel_consumido)?.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between mb-1">
                       <span>Consumo Ideal (se atingisse a meta):</span>
                       <span>
                          ({n(viewingDetails.km_percorrido)?.toFixed(0)} / {n(viewingDetails.kml_meta)?.toFixed(2)}) = 
                          <b> {(n(viewingDetails.km_percorrido) / (n(viewingDetails.kml_meta) || 1))?.toFixed(1)} L</b>
                       </span>
                    </div>
                    <div className="border-t border-slate-300 my-1"></div>
                    <div className="flex justify-between text-rose-700 font-bold text-sm">
                       <span>Desperdício Total:</span>
                       <span>{n(viewingDetails.combustivel_desperdicado)?.toFixed(1)} Litros</span>
                    </div>
                 </div>
              </div>
              
              <div className="text-center">
                 <button 
                   onClick={() => setViewingDetails(null)}
                   className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                 >
                   Fechar
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
