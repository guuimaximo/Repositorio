// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlay,
  FaSpinner,
  FaFilePdf,
  FaSync,
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

const GH_USER = import.meta.env.VITE_GITHUB_USER;
const GH_REPO = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_REF = "main";

const WF_GERENCIAL = "relatorio_gerencial.yml";
const WF_ACOMP = "ordem-acompanhamento.yml";

const SUPABASE_BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET_NAME = "relatorios";

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

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

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
  const [selected, setSelected] = useState({}); // {chapa: true}

  const validarPeriodo = useCallback(() => {
    if (!periodoInicio || !periodoFim) return true;
    return periodoInicio <= periodoFim;
  }, [periodoInicio, periodoFim]);

  async function carregarTela() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      setUserSession(sess?.session || null);

      // Último relatório gerencial (1 linha)
      const { data: rel } = await supabase
        .from("relatorios_gerados")
        .select("*")
        .eq("tipo", "diesel_gerencial")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setUltimoGerencial(rel || null);

      // Sugestões 30d
      const { data: sug } = await supabase
        .from("v_sugestoes_acompanhamento_30d")
        .select("*")
        .limit(200);

      setSugestoes(sug || []);

      // limpa seleção se a lista mudou muito
      setSelected((prev) => {
        const keep = {};
        (sug || []).forEach((r) => {
          if (prev[r.motorista_chapa]) keep[r.motorista_chapa] = true;
        });
        return keep;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // 1) cria lote
      const { data: lote, error: errL } = await supabase
        .from("acompanhamento_lotes")
        .insert({
          status: "PROCESSANDO",
          qtd: selecionados.length,
          // opcional: guardar período / regra usada
          extra: { origem: "v_sugestoes_acompanhamento_30d", gerado_em: new Date().toISOString() },
        })
        .select("id")
        .single();

      if (errL) throw errL;

      // 2) grava itens do lote
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

      // 3) dispara workflow com lote_id (python lê os itens no banco)
      await dispatchGitHubWorkflow(WF_ACOMP, {
        ordem_batch_id: String(lote.id),
        qtd: String(selecionados.length),
      });

      setSucesso(`Lote #${lote.id} enviado com ${selecionados.length} selecionados.`);
      setSelected({});
      setTimeout(carregarTela, 2000);
    } catch (err) {
      setErro(err?.message || String(err));
    }
  };

  const ultimoPdfUrl = getPublicUrl(ultimoGerencial?.arquivo_pdf_path);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
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

      {/* FEEDBACK */}
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

      {/* CARD GERENCIAL */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Relatório Gerencial</h3>
          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-bold">
            MENSAL
          </span>
        </div>

        {/* ULTIMO RELATORIO (uma linha) */}
        <div className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-3 mb-4">
          <div className="text-sm">
            <span className="text-slate-500 font-bold">Último Relatório Gerencial: </span>
            {ultimoGerencial ? (
              <>
                <span className="font-extrabold text-slate-800">#{ultimoGerencial.id}</span>
                <span className="text-slate-500 text-xs ml-2">
                  {ultimoGerencial.created_at ? new Date(ultimoGerencial.created_at).toLocaleDateString() : "-"}
                </span>
                <span className="ml-3"><StatusBadge status={ultimoGerencial.status} /></span>
              </>
            ) : (
              <span className="text-slate-500">Nenhum ainda</span>
            )}
          </div>

          {ultimoGerencial?.status === "CONCLUIDO" && ultimoPdfUrl && (
            <a
              href={ultimoPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-700 font-extrabold inline-flex items-center gap-2"
            >
              <FaFilePdf /> Abrir PDF
            </a>
          )}
        </div>

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
              "w-full py-3 rounded-xl flex justify-center gap-2 font-bold text-sm",
              "bg-cyan-600 text-white hover:bg-cyan-700"
            )}
          >
            <FaPlay /> DISPARAR RELATÓRIO
          </button>
        </div>

        <div className="text-xs text-slate-500 mt-3">
          O relatório será processado no GitHub Actions e publicado no Storage (bucket <b>{BUCKET_NAME}</b>).
        </div>
      </div>

      {/* SUGESTÕES */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800">Sugestões de Acompanhamento (30 dias)</h3>
            <p className="text-xs text-slate-500">
              Selecione os motoristas alvo e gere os prontuários somente para os selecionados.
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
                "px-4 py-2 rounded-xl font-extrabold text-sm",
                selectedCount === 0
                  ? "bg-slate-100 text-slate-400"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              Gerar formulários
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-white border-b">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="p-3 text-left">Chapa</th>
                <th className="p-3 text-left">Linha mais rodada</th>
                <th className="p-3 text-right">Km percorrido</th>
                <th className="p-3 text-right">Consumo</th>
                <th className="p-3 text-right">KM/L Real</th>
                <th className="p-3 text-right">KM/L Meta</th>
                <th className="p-3 text-right">Comb. desperdiçado</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {sugestoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-slate-500">
                    Nenhuma sugestão encontrada.
                  </td>
                </tr>
              ) : (
                sugestoes.map((r) => {
                  const chapa = r.motorista_chapa;
                  const checked = !!selected[chapa];

                  return (
                    <tr key={chapa} className={clsx("hover:bg-slate-50", checked && "bg-emerald-50/40")}>
                      <td className="p-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(chapa)} />
                      </td>
                      <td className="p-3 font-bold text-slate-800">{chapa}</td>
                      <td className="p-3 text-slate-700">{r.linha_mais_rodada || "-"}</td>
                      <td className="p-3 text-right">{n(r.km_percorrido)?.toFixed(0) ?? "-"}</td>
                      <td className="p-3 text-right">{n(r.combustivel_consumido)?.toFixed(0) ?? "-"}</td>
                      <td className="p-3 text-right font-extrabold">{n(r.kml_realizado)?.toFixed(2) ?? "-"}</td>
                      <td className="p-3 text-right text-slate-500">{n(r.kml_meta)?.toFixed(2) ?? "-"}</td>
                      <td className="p-3 text-right font-extrabold text-rose-700">
                        {n(r.combustivel_desperdicado)?.toFixed(0) ?? "-"}
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
  );
}
