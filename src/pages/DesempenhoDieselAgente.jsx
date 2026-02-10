// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { FaBolt, FaCheckCircle, FaExclamationTriangle, FaPlay, FaSpinner, FaGithub } from "react-icons/fa";
import { supabase } from "../supabaseClient";

/* =============================================================================
   CONFIGURAÇÃO GITHUB ACTIONS
   Assegure-se que essas variaveis estao no .env do seu projeto React (Vite)
============================================================================= */
const GH_USER = import.meta.env.VITE_GITHUB_USER;
const GH_REPO = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REF = "main"; // ou o branch que você usa

// Nomes exatos dos arquivos .yml criados anteriormente
const WF_GERENCIAL = "relatorio-gerencial-diesel.yml";
const WF_ACOMP = "gerar-ordens-acompanhamento.yml";

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

// Função genérica para chamar a API do GitHub
async function dispatchGitHubWorkflow(workflowFile, inputs) {
  if (!GH_USER || !GH_REPO || !GH_TOKEN) {
    throw new Error("Credenciais do GitHub não configuradas (.env)");
  }

  const url = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/actions/workflows/${workflowFile}/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: GH_REF,
      inputs: inputs
    }),
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

  // --- Estados de Data ---
  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );
  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  // --- Estados de Controle ---
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // --- Inputs Específicos ---
  const [qtdAcompanhamentos, setQtdAcompanhamentos] = useState(10);
  const [userSession, setUserSession] = useState(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });
  }, []);

  const validarPeriodo = useCallback(
    () => !periodoInicio || !periodoFim || periodoInicio <= periodoFim,
    [periodoInicio, periodoFim]
  );

  // =========================================================================
  // LÓGICA 1: RELATÓRIO GERENCIAL
  // =========================================================================
  const dispararGerencial = async () => {
    setLoading(true); setErro(null); setSucesso(null);

    try {
      const userLogin = userSession?.user?.email || "sistema";
      
      // 1. Criar registro no Supabase (STATUS: CRIADO)
      const { data: record, error: dbError } = await supabase
        .from("relatorios_gerados")
        .insert({
          tipo: "diesel_gerencial",
          status: "PROCESSANDO", // Já marca processando para o usuário ver
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          solicitante_login: userLogin,
          solicitante_nome: userSession?.user?.user_metadata?.full_name
        })
        .select("id")
        .single();

      if (dbError) throw new Error(`Erro Banco: ${dbError.message}`);

      // 2. Disparar GitHub Action passando o ID gerado
      await dispatchGitHubWorkflow(WF_GERENCIAL, {
        report_id: String(record.id),
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        report_tipo: "diesel_gerencial"
      });

      if (mountedRef.current) {
        setSucesso(`Relatório #${record.id} disparado no GitHub! Aguarde o processamento.`);
      }

    } catch (err) {
      console.error(err);
      if (mountedRef.current) setErro(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // =========================================================================
  // LÓGICA 2: ACOMPANHAMENTO (PRONTUÁRIOS)
  // =========================================================================
  const dispararAcompanhamento = async () => {
    setLoading(true); setErro(null); setSucesso(null);

    try {
      // 1. Criar lote no Supabase
      const { data: lote, error: dbError } = await supabase
        .from("acompanhamento_lotes")
        .insert({
          status: "PROCESSANDO",
          qtd: Number(qtdAcompanhamentos)
        })
        .select("id")
        .single();

      if (dbError) throw new Error(`Erro Banco: ${dbError.message}`);

      // 2. Disparar GitHub Action passando o ID do lote
      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(qtdAcompanhamentos)
      });

      if (mountedRef.current) {
        setSucesso(`Lote #${lote.id} disparado no GitHub! Acompanhe na lista.`);
      }

    } catch (err) {
      console.error(err);
      if (mountedRef.current) setErro(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <FaBolt size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agente Diesel</h2>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <FaGithub /> Operando via GitHub Actions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD GERENCIAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-slate-700">Relatório Gerencial</h3>
            <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">MENSAL</span>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Início</label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Fim</label>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={dispararGerencial}
              disabled={loading || !validarPeriodo()}
              className={clsx(
                "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all",
                loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-200"
              )}
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaPlay />}
              {loading ? "Enviando..." : "DISPARAR RELATÓRIO"}
            </button>
          </div>
        </div>

        {/* CARD ACOMPANHAMENTO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-slate-700">Ordens de Monitoria</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">INDIVIDUAL</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500">Qtd. de Motoristas (Piores Rankings)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={qtdAcompanhamentos}
                  onChange={(e) => setQtdAcompanhamentos(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-sm font-medium text-slate-600">Ordens</span>
              </div>
            </div>

            <button
              onClick={dispararAcompanhamento}
              disabled={loading || qtdAcompanhamentos <= 0}
              className={clsx(
                "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all",
                loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
              )}
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaPlay />}
              {loading ? "Enviando..." : "GERAR PRONTUÁRIOS"}
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK */}
      <div className="mt-4">
        {sucesso && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in">
            <FaCheckCircle className="text-xl" />
            <div>
              <p className="font-bold text-sm">Comando Aceito</p>
              <p className="text-xs">{sucesso}</p>
            </div>
          </div>
        )}

        {erro && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-fade-in">
            <FaExclamationTriangle className="text-xl" />
            <div>
              <p className="font-bold text-sm">Falha no Disparo</p>
              <p className="text-xs">{erro}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
