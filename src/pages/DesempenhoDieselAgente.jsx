// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlay,
  FaSpinner,
  FaFilePdf,
  FaFileCode,
  FaSync,
  FaInfoCircle,
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

/* =============================================================================
   CONFIGURAÇÃO GITHUB ACTIONS
============================================================================= */
const GH_USER = import.meta.env.VITE_GITHUB_USER;
const GH_REPO = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REF = "main";

const WF_GERENCIAL = "relatorio_gerencial.yml";
const WF_ACOMP = "ordem-acompanhamento.yml";

// --- URL BASE DO SUPABASE ---
const SUPABASE_BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET_NAME = "relatorios";

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
  if (path.startsWith("http")) return path;

  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SUPABASE_BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${cleanPath}`;
}

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

function Tabs({ value, onChange, items }) {
  return (
    <div className="inline-flex bg-slate-100 border rounded-2xl p-1">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-extrabold transition",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            type="button"
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, erroMsg }) {
  if (status === "CONCLUIDO") {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
        OK
      </span>
    );
  }

  if (status === "ERRO") {
    return (
      <div className="group relative inline-block">
        <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 cursor-help flex items-center gap-1">
          ERRO <FaInfoCircle />
        </span>
        <div className="absolute bottom-full mb-2 w-72 p-2 bg-slate-800 text-white text-xs rounded hidden group-hover:block z-50">
          {erroMsg || "Erro desconhecido"}
        </div>
      </div>
    );
  }

  return (
    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
      {status || "PROCESSANDO"}
    </span>
  );
}

export default function DesempenhoDieselAgente() {
  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [activeTab, setActiveTab] = useState("gerencial"); // "gerencial" | "prontuarios"

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));

  const [loadingGerencial, setLoadingGerencial] = useState(false);
  const [loadingAcomp, setLoadingAcomp] = useState(false);

  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const [qtdAcompanhamentos, setQtdAcompanhamentos] = useState(10);
  const [userSession, setUserSession] = useState(null);

  const [listaRelatorios, setListaRelatorios] = useState([]);
  const [listaProntuarios, setListaProntuarios] = useState([]);
  const [loadingListas, setLoadingListas] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
    buscarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validarPeriodo = useCallback(() => {
    if (!periodoInicio || !periodoFim) return true;
    return periodoInicio <= periodoFim;
  }, [periodoInicio, periodoFim]);

  const buscarHistorico = async () => {
    setLoadingListas(true);
    try {
      // 1) Relatórios
      const { data: rels, error: errR } = await supabase
        .from("relatorios_gerados")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!errR && rels) setListaRelatorios(rels);

      // 2) Prontuários
      const { data: pronts, error: errP } = await supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);

      if (!errP && pronts) setListaProntuarios(pronts);
    } catch (e) {
      console.error("Erro histórico:", e);
    } finally {
      setLoadingListas(false);
    }
  };

  const dispararGerencial = async () => {
    setLoadingGerencial(true);
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
      setTimeout(buscarHistorico, 2500);
    } catch (err) {
      setErro(err?.message || String(err));
    } finally {
      setLoadingGerencial(false);
    }
  };

  const dispararAcompanhamento = async () => {
    setLoadingAcomp(true);
    setErro(null);
    setSucesso(null);

    try {
      const { data: lote, error } = await supabase
        .from("acompanhamento_lotes")
        .insert({ status: "PROCESSANDO", qtd: Number(qtdAcompanhamentos) })
        .select("id")
        .single();

      if (error) throw error;

      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(qtdAcompanhamentos),
      });

      setSucesso(`Lote #${lote.id} enviado.`);
      setTimeout(buscarHistorico, 2500);
    } catch (err) {
      setErro(err?.message || String(err));
    } finally {
      setLoadingAcomp(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <FaBolt size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Agente Diesel</h2>
            <p className="text-sm text-slate-500">Operando via GitHub Actions</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: "gerencial", label: "Gerencial" },
            { value: "prontuarios", label: "Prontuários" },
          ]}
        />
      </div>

      {/* FEEDBACK */}
      {(sucesso || erro) && (
        <div
          className={clsx(
            "p-4 rounded-xl border flex items-center gap-3 animate-fade-in",
            sucesso
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {sucesso ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <div>
            <p className="font-bold text-sm">{sucesso ? "Sucesso" : "Status"}</p>
            <p className="text-xs">{sucesso || erro}</p>
          </div>
        </div>
      )}

      {/* CONTENT */}
      {activeTab === "gerencial" ? (
        <>
          {/* Card Gerencial */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Relatório Gerencial</h3>
              <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">
                MENSAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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

              <div className="flex items-end">
                <button
                  onClick={dispararGerencial}
                  disabled={loadingGerencial || !validarPeriodo()}
                  className={clsx(
                    "w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm",
                    loadingGerencial
                      ? "bg-slate-100 text-slate-400"
                      : "bg-cyan-600 text-white hover:bg-cyan-700"
                  )}
                >
                  {loadingGerencial ? <FaSpinner className="animate-spin" /> : <FaPlay />}{" "}
                  {loadingGerencial ? "Enviando..." : "DISPARAR RELATÓRIO"}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              O relatório será processado no GitHub Actions e publicado no Storage (bucket{" "}
              <b>{BUCKET_NAME}</b>).
            </div>
          </div>

          {/* HISTÓRICO GERENCIAL */}
          <div className="border-t pt-6">
            <div className="flex justify-between mb-4 items-center">
              <h2 className="text-xl font-bold text-slate-800">Histórico — Gerencial</h2>
              <button
                onClick={buscarHistorico}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                title="Atualizar"
              >
                <FaSync className={clsx(loadingListas && "animate-spin")} />
              </button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 border-b font-bold text-slate-600 text-xs uppercase">
                Relatórios Gerenciais
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {listaRelatorios.length === 0 ? (
                    <tr>
                      <td className="p-4 text-slate-500 text-sm" colSpan={3}>
                        Nenhum relatório encontrado.
                      </td>
                    </tr>
                  ) : (
                    listaRelatorios.map((rel) => {
                      const url = getPublicUrl(rel.arquivo_pdf_path);
                      return (
                        <tr key={rel.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-700">#{rel.id}</div>
                            <div className="text-xs text-slate-400">
                              {rel.created_at ? new Date(rel.created_at).toLocaleDateString() : "-"}
                            </div>
                          </td>
                          <td className="p-3">
                            <StatusBadge status={rel.status} erroMsg={rel.erro_msg} />
                          </td>
                          <td className="p-3 text-right">
                            {rel.status === "CONCLUIDO" && url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-600 font-bold hover:underline inline-flex items-center justify-end gap-1"
                              >
                                <FaFilePdf /> PDF
                              </a>
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
        </>
      ) : (
        <>
          {/* Card Prontuários */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Ordens de Monitoria</h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">
                INDIVIDUAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500">Qtd. Motoristas</label>
                <input
                  type="number"
                  min={1}
                  value={qtdAcompanhamentos}
                  onChange={(e) => setQtdAcompanhamentos(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>

              <button
                onClick={dispararAcompanhamento}
                disabled={loadingAcomp}
                className={clsx(
                  "w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm",
                  loadingAcomp
                    ? "bg-slate-100 text-slate-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {loadingAcomp ? <FaSpinner className="animate-spin" /> : <FaPlay />}{" "}
                {loadingAcomp ? "Enviando..." : "GERAR PRONTUÁRIOS"}
              </button>
            </div>

            <div className="text-xs text-slate-500 mt-3">
              O lote será processado e os prontuários serão gerados (HTML/PDF) e salvos no Storage.
            </div>
          </div>

          {/* HISTÓRICO PRONTUÁRIOS */}
          <div className="border-t pt-6">
            <div className="flex justify-between mb-4 items-center">
              <h2 className="text-xl font-bold text-slate-800">Histórico — Prontuários</h2>
              <button
                onClick={buscarHistorico}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                title="Atualizar"
              >
                <FaSync className={clsx(loadingListas && "animate-spin")} />
              </button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 border-b font-bold text-slate-600 text-xs uppercase">
                Últimos Prontuários
              </div>

              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {listaProntuarios.length === 0 ? (
                    <tr>
                      <td className="p-4 text-slate-500 text-sm" colSpan={3}>
                        Nenhum prontuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    listaProntuarios.map((item) => {
                      const htmlUrl = getPublicUrl(item.arquivo_html_path);
                      const pdfUrl = getPublicUrl(item.arquivo_pdf_path);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-700 text-xs truncate max-w-[220px]">
                              {item.motorista_nome || "Motorista"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Lote #{item.lote_id || "-"} • {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                            </div>
                          </td>

                          <td className="p-3 text-xs">
                            <div>
                              Perda:{" "}
                              <b className="text-red-600">
                                {Number.isFinite(item.perda_litros) ? item.perda_litros.toFixed(0) : (item.perda_litros ?? "-")}{" "}
                                L
                              </b>
                            </div>
                            <div>
                              Gap:{" "}
                              <b>
                                {Number.isFinite(item.gap) ? item.gap.toFixed(2) : (item.gap ?? "-")}
                              </b>
                            </div>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-3">
                              {htmlUrl && (
                                <a
                                  href={htmlUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-blue-600"
                                  title="Ver HTML"
                                >
                                  <FaFileCode size={16} />
                                </a>
                              )}
                              {pdfUrl && (
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-red-500 hover:text-red-700"
                                  title="Ver PDF"
                                >
                                  <FaFilePdf size={16} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
