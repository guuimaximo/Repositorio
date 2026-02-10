// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { 
  FaBolt, FaCheckCircle, FaExclamationTriangle, FaPlay, FaSpinner, 
  FaGithub, FaFilePdf, FaFileCode, FaSync, FaInfoCircle 
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

/* =============================================================================
   CONFIGURAÇÃO GITHUB ACTIONS
============================================================================= */
const GH_USER = import.meta.env.VITE_GITHUB_USER;
const GH_REPO = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REF = "main";

// Nomes EXATOS dos arquivos .yml no seu GitHub
const WF_GERENCIAL = "relatorio_gerencial.yml";
const WF_ACOMP = "ordem-acompanhamento.yml";

// URL Base do Bucket (Ajuste a URL do seu projeto se necessário)
const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL; 
const BUCKET_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/relatorios`;

/* =========================
   HELPERS
========================= */
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
  // Se já vier com http (raro), retorna direto
  if (path.startsWith("http")) return path;
  return `${BUCKET_URL}/${path}`;
}

async function dispatchGitHubWorkflow(workflowFile, inputs) {
  if (!GH_USER || !GH_REPO || !GH_TOKEN) throw new Error("Credenciais GitHub ausentes");
  
  const url = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/actions/workflows/${workflowFile}/dispatches`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: GH_REF, inputs: inputs }),
  });

  if (response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erro GitHub: ${response.status}`);
  }
  return true;
}

export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);
  
  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  const [loadingGerencial, setLoadingGerencial] = useState(false);
  const [loadingAcomp, setLoadingAcomp] = useState(false);
  
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [qtdAcompanhamentos, setQtdAcompanhamentos] = useState(10);
  const [userSession, setUserSession] = useState(null);

  // --- LISTAGEM ---
  const [listaRelatorios, setListaRelatorios] = useState([]);
  const [listaProntuarios, setListaProntuarios] = useState([]);
  const [loadingListas, setLoadingListas] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
    buscarHistorico(); 
  }, []);

  const validarPeriodo = useCallback(() => !periodoInicio || !periodoFim || periodoInicio <= periodoFim, [periodoInicio, periodoFim]);

  // =========================================================================
  // BUSCAR HISTÓRICO
  // =========================================================================
  const buscarHistorico = async () => {
    setLoadingListas(true);
    try {
      // 1. Relatórios Gerenciais
      const { data: rels } = await supabase
        .from("relatorios_gerados")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (rels) setListaRelatorios(rels);

      // 2. Prontuários Individuais
      // Trazendo TUDO para debuggar se está vindo null
      const { data: pronts } = await supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (pronts) setListaProntuarios(pronts);

    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoadingListas(false);
    }
  };

  // =========================================================================
  // DISPAROS
  // =========================================================================
  const dispararGerencial = async () => {
    setLoadingGerencial(true); setErro(null); setSucesso(null);
    try {
      const userLogin = userSession?.user?.email || "sistema";
      const { data: record, error } = await supabase
        .from("relatorios_gerados")
        .insert({
          tipo: "diesel_gerencial",
          status: "PROCESSANDO",
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          solicitante_login: userLogin,
          solicitante_nome: userSession?.user?.user_metadata?.full_name
        })
        .select("id").single();

      if (error) throw error;

      await dispatchGitHubWorkflow(WF_GERENCIAL, {
        report_id: String(record.id),
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        report_tipo: "diesel_gerencial"
      });

      setSucesso(`Relatório #${record.id} iniciado.`);
      setTimeout(buscarHistorico, 3000);

    } catch (err) {
      setErro(err.message);
    } finally {
      setLoadingGerencial(false);
    }
  };

  const dispararAcompanhamento = async () => {
    setLoadingAcomp(true); setErro(null); setSucesso(null);
    try {
      const { data: lote, error } = await supabase
        .from("acompanhamento_lotes")
        .insert({ status: "PROCESSANDO", qtd: Number(qtdAcompanhamentos) })
        .select("id").single();

      if (error) throw error;

      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(qtdAcompanhamentos)
      });

      setSucesso(`Lote #${lote.id} iniciado.`);
      setTimeout(buscarHistorico, 3000);

    } catch (err) {
      setErro(err.message);
    } finally {
      setLoadingAcomp(false);
    }
  };

  // =========================================================================
  // RENDERIZAÇÃO
  // =========================================================================
  
  // Componente interno para Status e Erro
  const StatusBadge = ({ status, erroMsg }) => {
    if (status === "CONCLUIDO") {
      return <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">CONCLUÍDO</span>;
    }
    if (status === "ERRO") {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">ERRO</span>
          {erroMsg && (
            <div className="group relative">
              <FaInfoCircle className="cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-50 overflow-auto max-h-40">
                {erroMsg}
              </div>
            </div>
          )}
        </div>
      );
    }
    return <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">{status}</span>;
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <FaBolt size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agente Diesel</h2>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <FaGithub /> Integração GitHub Actions + Supabase
          </p>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD GERENCIAL */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Relatório Gerencial</h3>
            <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">MENSAL</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500">Início</label><input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-bold text-slate-500">Fim</label><input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={dispararGerencial} disabled={loadingGerencial || !validarPeriodo()} className={clsx("w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm", loadingGerencial ? "bg-slate-100 text-slate-400" : "bg-cyan-600 text-white hover:bg-cyan-700")}>
              {loadingGerencial ? <FaSpinner className="animate-spin" /> : <FaPlay />} {loadingGerencial ? "Iniciando..." : "DISPARAR RELATÓRIO"}
            </button>
          </div>
        </div>

        {/* CARD ACOMPANHAMENTO */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Ordens de Monitoria</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">INDIVIDUAL</span>
          </div>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500">Qtd. Motoristas</label><input type="number" min={1} value={qtdAcompanhamentos} onChange={(e) => setQtdAcompanhamentos(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
            <button onClick={dispararAcompanhamento} disabled={loadingAcomp} className={clsx("w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm", loadingAcomp ? "bg-slate-100 text-slate-400" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
              {loadingAcomp ? <FaSpinner className="animate-spin" /> : <FaPlay />} {loadingAcomp ? "Iniciando..." : "GERAR PRONTUÁRIOS"}
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {(sucesso || erro) && (
        <div className={clsx("p-4 rounded-xl border flex items-center gap-3 animate-fade-in", sucesso ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
          {sucesso ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <div><p className="font-bold text-sm">{sucesso ? "Sucesso" : "Atenção"}</p><p className="text-xs">{sucesso || erro}</p></div>
        </div>
      )}

      {/* ======================= TABELAS ======================= */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Histórico de Execuções</h2>
          <button onClick={buscarHistorico} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Atualizar lista">
            <FaSync className={clsx(loadingListas && "animate-spin")} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* TABELA 1: RELATÓRIOS GERENCIAIS */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Relatórios Gerenciais</h3>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">ID / Data</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listaRelatorios.length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-slate-400">Nenhum registro.</td></tr>
                  ) : (
                    listaRelatorios.map((rel) => {
                      const urlPdf = getPublicUrl(rel.arquivo_pdf_path);
                      return (
                        <tr key={rel.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold">#{rel.id}</div>
                            <div className="text-xs text-slate-400">{new Date(rel.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="p-3">
                            <StatusBadge status={rel.status} erroMsg={rel.erro_msg} />
                          </td>
                          <td className="p-3 text-right">
                            {rel.status === "CONCLUIDO" && urlPdf ? (
                              <a href={urlPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-600 font-bold hover:underline">
                                <FaFilePdf /> PDF
                              </a>
                            ) : rel.status === "CONCLUIDO" ? (
                              <span className="text-xs text-red-400" title="Arquivo não foi salvo no banco">Link quebrado</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA 2: PRONTUÁRIOS */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Prontuários Individuais</h3>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Motorista</th>
                    <th className="p-3">Indicadores</th>
                    <th className="p-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listaProntuarios.length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-slate-400">Nenhum prontuário.</td></tr>
                  ) : (
                    listaProntuarios.map((item) => {
                      const urlHtml = getPublicUrl(item.arquivo_html_path);
                      const urlPdf = getPublicUrl(item.arquivo_pdf_path);
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold">{item.motorista_nome || "Desconhecido"}</div>
                            <div className="text-xs text-slate-400">Lote #{item.lote_id}</div>
                            {item.status === "ERRO" && <span className="text-xs text-red-500 font-bold">Erro ao gerar</span>}
                          </td>
                          <td className="p-3">
                            <div className="text-xs">
                              <span className="text-slate-500">Perda:</span> 
                              {item.perda_litros !== null ? <b className="text-red-600"> {item.perda_litros?.toFixed(0)} L</b> : <span className="text-slate-300"> --</span>}
                            </div>
                            <div className="text-xs">
                              <span className="text-slate-500">Gap:</span> 
                              {item.gap !== null ? <b> {item.gap?.toFixed(2)}</b> : <span className="text-slate-300"> --</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {urlHtml && (
                              <a href={urlHtml} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800" title="Ver HTML"><FaFileCode /></a>
                            )}
                            {urlPdf && (
                              <a href={urlPdf} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700" title="Baixar PDF"><FaFilePdf /></a>
                            )}
                            {(!urlHtml && !urlPdf && item.status !== "ERRO") && (
                              <span className="text-xs text-slate-300">Processando...</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
