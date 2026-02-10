// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { FaBolt, FaCheckCircle, FaExclamationTriangle, FaPlay } from "react-icons/fa";

import { supabase } from "../supabaseClient"; // ✅ B normal (INOVE)

/* =========================
   CONFIG (GITHUB ACTIONS)
========================= */
const GH_USER = import.meta?.env?.VITE_GITHUB_USER;
const GH_REPO = import.meta?.env?.VITE_GITHUB_REPO;
const GH_REF = import.meta?.env?.VITE_GITHUB_REF || "main";
const GH_TOKEN = import.meta?.env?.VITE_GITHUB_TOKEN;

// ✅ nomes dos workflows (arquivo .yml/.yaml dentro de .github/workflows/)
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

function assertGithubEnv() {
  const missing = [];
  if (!GH_USER) missing.push("VITE_GITHUB_USER");
  if (!GH_REPO) missing.push("VITE_GITHUB_REPO");
  if (!GH_TOKEN) missing.push("VITE_GITHUB_TOKEN");
  if (missing.length) {
    throw new Error(`ENV do GitHub ausente: ${missing.join(", ")}`);
  }
}

async function dispatchWorkflow({ workflowFile, ref, inputs }) {
  assertGithubEnv();

  const url = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/actions/workflows/${workflowFile}/dispatches`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: ref || GH_REF,
      inputs: inputs || {},
    }),
  });

  // GitHub retorna 204 (No Content) quando aceita
  if (r.status === 204) return { ok: true };

  let msg = `Erro ao disparar workflow (${r.status})`;
  try {
    const data = await r.json();
    msg = data?.message || msg;
  } catch {}
  throw new Error(msg);
}

/**
 * ✅ Cria um registro em public.relatorios_gerados (Supabase B)
 * e retorna o ID para passar no workflow_dispatch.
 *
 * Ajuste campos aqui se a tabela tiver NOT NULL adicionais.
 */
async function criarRelatorioGerencialB({ periodoInicio, periodoFim }) {
  // payload mínimo (mantém simples)
  const payload = {
    tipo: "diesel_gerencial",
    status: "PENDENTE",
    periodo_inicio: periodoInicio || null,
    periodo_fim: periodoFim || null,
  };

  const { data, error } = await supabase
    .from("relatorios_gerados")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao criar relatorio no Supabase B: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Relatório criado mas não retornou ID.");
  }
  return data.id;
}

/* =========================
   COMPONENT
========================= */
export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  const [loadingGerencial, setLoadingGerencial] = useState(false);
  const [loadingAcomp, setLoadingAcomp] = useState(false);

  const [erro, setErro] = useState(null);
  const [resp, setResp] = useState(null);

  const [qtdAcompanhamentos, setQtdAcompanhamentos] = useState(10);

  const validarPeriodo = useCallback(
    () => !periodoInicio || !periodoFim || periodoInicio <= periodoFim,
    [periodoInicio, periodoFim]
  );

  /* =========================
     GERENCIAL (GITHUB)
     - Cria report no Supabase B e usa o id no dispatch
  ========================= */
  const gerarGerencial = useCallback(async () => {
    setLoadingGerencial(true);
    setErro(null);
    setResp(null);

    try {
      if (!validarPeriodo()) throw new Error("Período inválido.");

      // 1) cria o registro no Supabase B
      const reportId = await criarRelatorioGerencialB({
        periodoInicio,
        periodoFim,
      });

      // 2) dispara workflow do GitHub passando o report_id
      await dispatchWorkflow({
        workflowFile: WF_GERENCIAL,
        inputs: {
          report_id: String(reportId),
          periodo_inicio: String(periodoInicio || ""),
          periodo_fim: String(periodoFim || ""),
          report_tipo: "diesel_gerencial",
        },
      });

      if (mountedRef.current) setResp({ ok: true, report_id: reportId });
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoadingGerencial(false);
    }
  }, [periodoInicio, periodoFim, validarPeriodo]);

  /* =========================
     ACOMPANHAMENTO (GITHUB)
     - Só dispara workflow (GitHub responde 204)
  ========================= */
  const gerarAcompanhamento = useCallback(async () => {
    setLoadingAcomp(true);
    setErro(null);

    try {
      await dispatchWorkflow({
        workflowFile: WF_ACOMP,
        inputs: {
          qtd: String(qtdAcompanhamentos),
          ordem_batch_id: "", // opcional
        },
      });

      alert("Workflow disparado com sucesso (GitHub Actions).");
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoadingAcomp(false);
    }
  }, [qtdAcompanhamentos]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border flex items-center justify-center">
          <FaBolt />
        </div>
        <h2 className="text-xl font-semibold">Agente Diesel</h2>
      </div>

      {/* ===== GERENCIAL ===== */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Agente Gerencial (GitHub)</h3>

        <div className="flex gap-3">
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <button
          onClick={gerarGerencial}
          disabled={loadingGerencial || !validarPeriodo()}
          className={clsx(
            "px-4 py-2 rounded-xl border flex items-center gap-2",
            loadingGerencial
              ? "text-slate-400"
              : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
          )}
        >
          <FaPlay />
          {loadingGerencial ? "Disparando..." : "Disparar relatório gerencial"}
        </button>
      </div>

      {/* ===== ACOMPANHAMENTO ===== */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Agente de Acompanhamento (GitHub)</h3>

        <div className="flex items-center gap-3">
          <span className="text-sm">Qtd. de prontuários:</span>
          <input
            type="number"
            min={1}
            value={qtdAcompanhamentos}
            onChange={(e) => setQtdAcompanhamentos(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-24"
          />
        </div>

        <button
          onClick={gerarAcompanhamento}
          disabled={loadingAcomp}
          className={clsx(
            "px-4 py-2 rounded-xl border flex items-center gap-2",
            loadingAcomp
              ? "text-slate-400"
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          )}
        >
          <FaPlay />
          {loadingAcomp ? "Disparando..." : "Disparar acompanhamentos"}
        </button>
      </div>

      {resp?.ok && (
        <div className="flex items-center gap-2 text-emerald-700">
          <FaCheckCircle />
          Workflow disparado (report_id: <b>{resp.report_id}</b>)
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 text-rose-700">
          <FaExclamationTriangle />
          {erro}
        </div>
      )}
    </div>
  );
}
