// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "../supabase";

const API_BASE = "https://agentediesel.onrender.com";
const BUCKET_RELATORIOS = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 120;
const URL_EXPIRES = 60 * 60; // 1h

function Badge({ children, tone = "gray" }) {
  const toneCls = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
  }[tone];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded ${toneCls}`}>
      {children}
    </span>
  );
}

function fmtDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtBR(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString("pt-BR");
  } catch {
    return String(dt || "");
  }
}

/** ===== PATH HELPERS (CORREÇÃO PRINCIPAL) ===== **/
function normPath(p) {
  // remove espaços, barras iniciais, e "buracos" tipo ////
  let s = String(p || "").trim();
  s = s.replace(/^\/+/, "");      // tira "/" do começo
  s = s.replace(/\/{2,}/g, "/");  // colapsa // em /
  return s;
}

function dirname(p) {
  const s = normPath(p);
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(0, i) : "";
}

function isHtml(p) {
  return normPath(p).toLowerCase().endsWith(".html");
}

async function signedUrl(path, expiresIn = URL_EXPIRES) {
  const p = normPath(path);
  if (!p) return null;
  const { data, error } = await supabase.storage.from(BUCKET_RELATORIOS).createSignedUrl(p, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

function publicUrl(path) {
  const p = normPath(path);
  if (!p) return null;
  const { data } = supabase.storage.from(BUCKET_RELATORIOS).getPublicUrl(p);
  return data?.publicUrl || null;
}

/**
 * IMPORTANTÍSSIMO:
 * getPublicUrl SEMPRE te dá uma URL, mesmo se o arquivo não existir.
 * Então aqui nós usamos signedUrl como “validador de existência” quando possível.
 * Se signedUrl não estiver permitido no anon key, a gente cai no publicUrl.
 */
async function firstWorkingUrl(paths) {
  const tried = [];

  // 1) tenta assinar (valida existência)
  for (const raw of paths) {
    const p = normPath(raw);
    if (!p) continue;
    tried.push(p);
    try {
      const u = await signedUrl(p);
      if (u) return { url: u, path: p, mode: "signed", tried };
    } catch {
      // continua
    }
  }

  // 2) fallback: url pública (assume bucket público / ou você aceita 403)
  for (const raw of paths) {
    const p = normPath(raw);
    if (!p) continue;
    tried.push(p);
    const u = publicUrl(p);
    if (u) return { url: u, path: p, mode: "public", tried };
  }

  return { url: null, path: null, mode: null, tried };
}

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroLinha, setFiltroLinha] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroCluster, setFiltroCluster] = useState("");

  const statusTone = useMemo(() => {
    if (loading || historicoLoading || urlsLoading) return "yellow";
    if (erro || historicoErro || urlsErro) return "red";
    if (resp?.ok === true) return "green";
    return "gray";
  }, [loading, historicoLoading, urlsLoading, erro, historicoErro, urlsErro, resp]);

  const statusText = useMemo(() => {
    if (loading) return "PROCESSANDO";
    if (erro) return "FALHOU";
    if (resp?.ok === true) return "SUCESSO";
    return "PRONTO";
  }, [loading, erro, resp]);

  function validarPeriodo() {
    if (!periodoInicio || !periodoFim) return true;
    const di = new Date(`${periodoInicio}T00:00:00`);
    const df = new Date(`${periodoFim}T23:59:59`);
    return di <= df;
  }

  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo = ini && fim ? `${ini} → ${fim}` : ini || fim ? ini || fim : "Sem período";
    return `Relatório Diesel — ${periodo}`;
  }

  async function carregarHistorico() {
    setHistoricoLoading(true);
    setHistoricoErro(null);
    try {
      const { data, error } = await supabase
        .from("relatorios_gerados")
        .select("id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg")
        .eq("tipo", TIPO_RELATORIO)
        .order("created_at", { ascending: false })
        .limit(LIMIT_HISTORICO);

      if (error) throw error;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setHistoricoErro(String(e?.message || e));
      setItems([]);
    } finally {
      setHistoricoLoading(false);
    }
  }

  async function abrirRelatorio(it) {
    setSelected(it);
    setUrls(null);
    setUrlsErro(null);
    setUrlsLoading(true);

    try {
      const apRaw = it?.arquivo_path;
      const ap = normPath(apRaw);

      if (!ap) {
        throw new Error("Item sem arquivo_path na tabela relatorios_gerados.");
      }

      // Folder REAL do report vem do arquivo_path (fonte da verdade)
      const folder = dirname(ap);
      if (!folder) throw new Error(`arquivo_path inválido: ${ap}`);

      // Candidatos de HTML:
      // - se arquivo_path já for .html, é ele
      // - senão, usa o nome padrão que o seu script grava
      // - e por garantia tenta também pelo arquivo_nome se ele for .html
      const candidates = [];

      if (isHtml(ap)) candidates.push(ap);
      candidates.push(`${folder}/Relatorio_Gerencial.html`);

      if (String(it?.arquivo_nome || "").toLowerCase().endsWith(".html")) {
        candidates.push(`${folder}/${normPath(it.arquivo_nome)}`);
      }

      // PNG padrão do script
      const pngCandidates = [`${folder}/cluster_evolution_unificado.png`];

      const htmlRes = await firstWorkingUrl(candidates);
      if (!htmlRes.url) {
        throw new Error(
          `HTML não encontrado. arquivo_path=${ap} | folder=${folder} | tentativas=${htmlRes.tried.join(" | ")}`
        );
      }

      // PNG é opcional
      let pngUrl = null;
      try {
        const pngRes = await firstWorkingUrl(pngCandidates);
        pngUrl = pngRes.url || null;
      } catch {
        pngUrl = null;
      }

      setUrls({
        html: htmlRes.url,
        png: pngUrl,
        folder,
        html_path_used: htmlRes.path,
        html_mode: htmlRes.mode,
        tried: htmlRes.tried,
      });
    } catch (e) {
      setUrlsErro(String(e?.message || e));
    } finally {
      setUrlsLoading(false);
    }
  }

  async function gerar() {
    setLoading(true);
    setErro(null);
    setResp(null);

    try {
      if (!validarPeriodo()) throw new Error("Período inválido: Data início maior que Data fim.");

      const payload = {
        tipo: "diesel_gerencial",
        periodo_inicio: periodoInicio || null,
        periodo_fim: periodoFim || null,
        motorista: filtroMotorista?.trim() || null,
        linha: filtroLinha?.trim() || null,
        veiculo: filtroVeiculo?.trim() || null,
        cluster: filtroCluster?.trim() || null,
      };

      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        const detail = data?.error || data?.detail || `HTTP ${r.status}`;
        setResp(data);
        throw new Error(detail);
      }

      setResp(data);
      await carregarHistorico();

      if (data?.report_id) {
        const { data: row, error } = await supabase
          .from("relatorios_gerados")
          .select("id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg")
          .eq("id", data.report_id)
          .single();

        if (!error && row) await abrirRelatorio(row);
      }
    } catch (e) {
      setErro(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Agente Diesel</h2>
          <p className="text-sm text-gray-600">Geração (API) e visualização (Supabase Storage) dentro do INOVE.</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone="blue">API: {API_BASE}</Badge>
            <Badge tone="blue">Bucket: {BUCKET_RELATORIOS}</Badge>
            <Badge tone={statusTone}>{statusText}</Badge>
          </div>
        </div>

        <button
          onClick={gerar}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white font-semibold ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-900"}`}
        >
          {loading ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      <div className="mt-5 rounded-md border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">Filtros</p>
            <p className="text-xs text-gray-600 mt-0.5">Campos em branco não filtram.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setPeriodoInicio(fmtDateInput(primeiroDiaMes));
              setPeriodoFim(fmtDateInput(hoje));
              setFiltroMotorista("");
              setFiltroLinha("");
              setFiltroVeiculo("");
              setFiltroCluster("");
            }}
            className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Data início</label>
            <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Data fim</label>
            <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Motorista</label>
            <input value={filtroMotorista} onChange={(e) => setFiltroMotorista(e.target.value)} placeholder="Chapa ou nome" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Linha</label>
            <input value={filtroLinha} onChange={(e) => setFiltroLinha(e.target.value)} placeholder="Ex: 08TR" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Veículo</label>
            <input value={filtroVeiculo} onChange={(e) => setFiltroVeiculo(e.target.value)} placeholder="Prefixo" className="w-full mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Cluster</label>
            <select value={filtroCluster} onChange={(e) => setFiltroCluster(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white">
              <option value="">(Todos)</option>
              <option value="C6">C6</option>
              <option value="C8">C8</option>
              <option value="C9">C9</option>
              <option value="C10">C10</option>
              <option value="C11">C11</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-md border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800">Visualização do Relatório (HTML)</h3>

            <div className="flex items-center gap-2">
              {urls?.html && (
                <a href={urls.html} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md bg-black text-white text-sm font-semibold hover:bg-gray-900">
                  Abrir HTML em nova aba
                </a>
              )}
              {urls?.png && (
                <a href={urls.png} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">
                  Baixar PNG
                </a>
              )}
            </div>
          </div>

          {urlsLoading && <div className="mt-3 text-sm text-gray-600">Carregando...</div>}
          {urlsErro && (
            <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Falha ao abrir</div>
              <div className="mt-1">{urlsErro}</div>
            </div>
          )}

          {!!urls?.html_path_used && (
            <div className="mt-3 text-xs text-gray-600">
              <span className="font-semibold">Path usado:</span> {urls.html_path_used} •{" "}
              <span className="font-semibold">Modo:</span> {urls.html_mode}
            </div>
          )}

          {!selected ? (
            <div className="mt-3 text-sm text-gray-600">Selecione um relatório no histórico para visualizar.</div>
          ) : (
            <div className="mt-3 text-xs text-gray-600">
              <div><span className="font-semibold">Selecionado:</span> {labelRelatorio(selected)}</div>
              <div><span className="font-semibold">Gerado em:</span> {fmtBR(selected.created_at)}</div>
              <div><span className="font-semibold">Status:</span> {String(selected.status || "")}</div>
            </div>
          )}

          <div className="mt-4 border rounded-md overflow-hidden bg-white" style={{ height: 720 }}>
            {urls?.html ? (
              <iframe title="RelatorioHTML" src={urls.html} className="w-full h-full bg-white" />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">Nenhum HTML disponível.</div>
            )}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Histórico</h3>
            <button
              onClick={carregarHistorico}
              disabled={historicoLoading}
              className={`px-3 py-2 rounded-md border text-sm ${historicoLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              {historicoLoading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          {historicoErro && (
            <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Erro ao carregar histórico</div>
              <div className="mt-1">{historicoErro}</div>
            </div>
          )}

          <div className="mt-3 text-sm text-gray-700">
            {!items.length ? (
              <div className="text-gray-500">Nenhum relatório encontrado.</div>
            ) : (
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.id} className={`p-3 rounded-md border ${selected?.id === it.id ? "border-black" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{labelRelatorio(it)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {fmtBR(it.created_at)} • <span className="font-semibold">{it.status}</span>
                        </div>

                        {!!it?.arquivo_path && (
                          <div className="mt-2 text-xs text-gray-600 break-all">
                            <span className="font-semibold">Path:</span> {it.arquivo_path}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => abrirRelatorio(it)}
                        className="shrink-0 px-3 py-2 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-900"
                      >
                        Ver
                      </button>
                    </div>

                    {it?.erro_msg && it.status === "ERRO" && (
                      <div className="mt-2 text-xs text-red-700 break-all">
                        <span className="font-semibold">Erro:</span> {it.erro_msg}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {erro && (
            <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Erro ao gerar</div>
              <div className="mt-1">{erro}</div>
            </div>
          )}
        </div>
      </div>

      {!!resp && (resp?.stderr || resp?.stdout || resp?.stdout_tail) && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-xs font-semibold text-gray-600">STDERR</div>
            <pre className="mt-1 text-xs bg-gray-50 border rounded-md p-3 max-h-56 overflow-auto whitespace-pre-wrap">
{resp?.stderr || "(vazio)"}
            </pre>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-xs font-semibold text-gray-600">STDOUT</div>
            <pre className="mt-1 text-xs bg-gray-50 border rounded-md p-3 max-h-56 overflow-auto whitespace-pre-wrap">
{resp?.stdout || resp?.stdout_tail || "(vazio)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
