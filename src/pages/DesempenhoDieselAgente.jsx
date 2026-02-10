// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlay,
} from "react-icons/fa";

/* =========================
   CONFIG
========================= */
const API_BASE =
  import.meta?.env?.VITE_AGENTEDIESEL_API_BASE ||
  "https://agentediesel.onrender.com";

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

/* =========================
   COMPONENT
========================= */
export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  /* =========================
     STATE
  ========================= */
  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [periodoInicio, setPeriodoInicio] = useState(
    fmtDateInput(primeiroDiaMes)
  );
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
     GERENCIAL
  ========================= */
  const gerarGerencial = useCallback(async () => {
    setLoadingGerencial(true);
    setErro(null);

    try {
      const payload = {
        tipo: "diesel_gerencial",
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      };

      const r = await fetch(`${API_BASE}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro no robô gerencial");

      if (mountedRef.current) setResp(data);
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoadingGerencial(false);
    }
  }, [periodoInicio, periodoFim]);

  /* =========================
     ACOMPANHAMENTO (LOTE)
  ========================= */
  const gerarAcompanhamento = useCallback(async () => {
    setLoadingAcomp(true);
    setErro(null);

    try {
      const payload = {
        tipo: "prontuarios_acompanhamento",
        qtd: qtdAcompanhamentos,
      };

      const r = await fetch(`${API_BASE}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok)
        throw new Error(data?.error || "Erro no robô de acompanhamento");

      alert(`Lote ${data.lote_id} gerado com sucesso`);
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoadingAcomp(false);
    }
  }, [qtdAcompanhamentos]);

  /* =========================
     UI
  ========================= */
  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border flex items-center justify-center">
          <FaBolt />
        </div>
        <h2 className="text-xl font-semibold">Agente Diesel</h2>
      </div>

      {/* ===== GERENCIAL ===== */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Agente Gerencial</h3>

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
          {loadingGerencial ? "Gerando..." : "Gerar relatório gerencial"}
        </button>
      </div>

      {/* ===== ACOMPANHAMENTO ===== */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Agente de Acompanhamento</h3>

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
          {loadingAcomp ? "Gerando..." : "Gerar acompanhamentos"}
        </button>
      </div>

      {/* ===== STATUS ===== */}
      {resp?.ok && (
        <div className="flex items-center gap-2 text-emerald-700">
          <FaCheckCircle />
          Execução iniciada com sucesso
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
