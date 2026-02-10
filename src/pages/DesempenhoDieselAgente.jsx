// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import {
  FaBolt,
  FaCloud,
  FaDatabase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSyncAlt,
  FaPlay,
  FaSearch,
  FaFilePdf,
  FaFilter,
  FaBroom,
  FaTimes,
} from "react-icons/fa";

/**
 * ALINHAMENTO / AJUSTES IMPORTANTES
 * - API_BASE via ENV (VITE_AGENTEDIESEL_API_BASE) com fallback
 * - Proteção contra refresh do PDF (signedUrl expira): cria URL sempre que abrir modal
 * - Identifica corretamente o PDF dentro da pasta do report
 * - Ícone/status padronizado
 * - Evita setState após unmount (mountedRef)
 */

const API_BASE =
  import.meta?.env?.VITE_AGENTEDIESEL_API_BASE || "https://agentediesel.onrender.com";
const BUCKET = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 80;

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function fmtDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtBR(dt) {
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return String(dt || "");
  }
}

function normalizePath(p) {
  if (!p) return "";
  return String(p).replace(/^\/+/, "");
}

function getFolderFromPath(p) {
  const parts = normalizePath(p).split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

async function makeUrlFromPath(path, expiresIn = 3600) {
  const clean = normalizePath(path);
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(clean, expiresIn);

  if (!error && data?.signedUrl) {
    return { url: data.signedUrl, mode: "signed", path: clean };
  }

  const pub = supabase.storage.from(BUCKET).getPublicUrl(clean);
  return { url: pub?.data?.publicUrl, mode: "public", path: clean };
}

function statusToneFrom({ loading, erro, ok }) {
  if (loading) return "yellow";
  if (erro) return "red";
  if (ok) return "green";
  return "neutral";
}

function statusTextFrom({ loading, erro, ok }) {
  if (loading) return "PROCESSANDO";
  if (erro) return "FALHOU";
  if (ok) return "SUCESSO";
  return "PRONTO";
}

function Pill({ tone = "neutral", icon = null, children }) {
  const toneCls = {
    neutral: "border-slate-200 bg-white/80 text-slate-700",
    blue: "border-cyan-200 bg-cyan-50 text-cyan-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-800",
    purple: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        toneCls
      )}
    >
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_12px_40px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-6xl">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-sm">{title}</div>
              <button onClick={onClose} className="text-xs flex gap-2 items-center">
                <FaTimes /> Fechar
              </button>
            </div>
            <div className="p-4 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  // ===== EXECUÇÃO =====
  const [loading, setLoading] = useState(false);          // gerencial
  const [loadingAcomp, setLoadingAcomp] = useState(false); // acompanhamento
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // ===== PERÍODO =====
  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  const validarPeriodo = useCallback(
    () => !periodoInicio || !periodoFim || periodoInicio <= periodoFim,
    [periodoInicio, periodoFim]
  );

  // ===== GERENCIAL =====
  const gerar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const payload = {
        tipo: TIPO_RELATORIO,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      };

      const r = await fetch(`${API_BASE}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro gerencial");

      if (mountedRef.current) setResp(data);
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [periodoInicio, periodoFim]);

  // ===== ACOMPANHAMENTO =====
  const gerarAcompanhamento = useCallback(async () => {
    setLoadingAcomp(true);
    setErro(null);
    try {
      const r = await fetch(`${API_BASE}/acompanhamentos/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qtd: 10 }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro acompanhamento");

      alert("Ordens de acompanhamento geradas com sucesso");
    } catch (e) {
      if (mountedRef.current) setErro(e.message);
    } finally {
      if (mountedRef.current) setLoadingAcomp(false);
    }
  }, []);

  const statusTone = statusToneFrom({ loading, erro, ok: resp?.ok });
  const statusText = statusTextFrom({ loading, erro, ok: resp?.ok });

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-4">
        <button className="px-4 py-2 rounded-xl border bg-cyan-50 text-cyan-800">
          AGENTE GERENCIAL
        </button>

        <button
          onClick={gerarAcompanhamento}
          disabled={loadingAcomp}
          className={clsx(
            "px-4 py-2 rounded-xl border",
            loadingAcomp
              ? "bg-white text-slate-400"
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          )}
        >
          {loadingAcomp ? "Gerando..." : "AGENTE ACOMPANHAMENTO"}
        </button>

        <button
          onClick={gerar}
          disabled={loading || !validarPeriodo()}
          className="px-4 py-2 rounded-xl border"
        >
          <FaPlay /> {loading ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      <Pill tone={statusTone} icon={<FaBolt />}>
        {statusText}
      </Pill>

      {erro && (
        <div className="mt-4 p-3 border border-rose-200 bg-rose-50 text-rose-700">
          {erro}
        </div>
      )}
    </div>
  );
}
