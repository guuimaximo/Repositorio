// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

const API_BASE = "https://agentediesel.onrender.com";
const BUCKET = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 80;

function Badge({ children, tone = "gray" }) {
  const toneCls = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
  }[tone];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded ${toneCls}`}
    >
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

  // 1) tenta publicUrl (funciona mesmo se bucket não for público; só retornará URL,
  // mas se não for público, ao abrir dará 403/400 — então caímos no signed abaixo)
  const pub = supabase.storage.from(BUCKET).getPublicUrl(clean);
  const publicUrl = pub?.data?.publicUrl;

  // tenta verificar rápido com signed quando necessário (mais confiável)
  // Se bucket for público, publicUrl vai funcionar e pronto.
  // Se bucket não for público, use signedUrl.
  // Para decidir: se publicUrl existe, a gente tenta usar; se falhar no iframe, você verá 403/400.
  // Aqui já retornamos signed direto para evitar 400 chato em ambiente com políticas.
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(clean, expiresIn);
  if (!error && data?.signedUrl) return { url: data.signedUrl, mode: "signed", path: clean };

  // fallback final: public
  return { url: publicUrl, mode: "public", path: clean };
}

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // Histórico
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  // Visualização
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  // anti erro ao sair da página
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [periodoInicio, setPeriodoInicio] = useState(fmtDateInput(primeiroDiaMes));
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroLinha, setFiltroLinha] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroCluster, setFiltroCluster] = useState("");

  const statusTone = useMemo(() => {
    if (loading) return "yellow";
    if (erro) return "red";
    if (resp?.ok === true) return "green";
    return "gray";
  }, [loading, erro, resp]);

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

  // Nome amigável
  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo =
      ini && fim ? `${ini} → ${fim}` : ini || fim ? ini || fim : "Sem período";
    return `Relatório Diesel — ${periodo}`;
  }

  async function carregarHistorico() {
    setHistoricoLoading(true);
    setHistoricoErro(null);

    try {
      const q = supabase
        .from("relatorios_gerados")
        .select(
          "id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg"
        )
        .eq("tipo", TIPO_RELATORIO)
        .order("created_at", { ascending: false })
        .limit(LIMIT_HISTORICO);

      const { data, error } = await q;
      if (error) throw error;

      if (!mountedRef.current) return;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!mountedRef.current) return;
      setHistoricoErro(String(e?.message || e));
      setItems([]);
    } finally {
      if (mountedRef.current) setHistoricoLoading(false);
    }
  }

  // >>> AQUI É O PONTO PRINCIPAL: abrir HTML corretamente
  async function abrirRelatorio(it) {
    setSelected(it);
    setUrls(null);
    setUrlsErro(null);
    setUrlsLoading(true);

    try {
      const arquivoPath = normalizePath(it?.arquivo_path || "");
      if (!arquivoPath) throw new Error("arquivo_path vazio no relatorios_gerados");

      const folder = getFolderFromPath(arquivoPath);

      // regra: se o registro já aponta pra HTML, usa ele.
      // se apontar para pdf antigo, tenta achar o HTML padrão na mesma pasta.
      let htmlPath = arquivoPath;
      if (!/\.html$/i.test(htmlPath)) {
        // tenta padrão do seu script
        htmlPath = `${folder}/Relatorio_Gerencial.html`;
      }

      const pngPath = `${folder}/cluster_evolution_unificado.png`;

      // assina URLs corretamente (path, não URL completa)
      const htmlRes = await makeUrlFromPath(htmlPath, 3600);
      const pngRes = await makeUrlFromPath(pngPath, 3600);

      if (!mountedRef.current) return;

      setUrls({
        html: htmlRes.url,
        png: pngRes.url,
        folder,
        html_path_used: htmlRes.path,
        html_mode: htmlRes.mode,
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setUrlsErro(String(e?.message || e));
    } finally {
      if (mountedRef.current) setUrlsLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function gerar() {
    setLoading(true);
    setErro(null);
    setResp(null);

    try {
      if (!validarPeriodo()) throw new Error("Período inválido: Data início maior que Data fim.");

      const payload = {
        tipo: TIPO_RELATORIO,
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

      // abre automaticamente o recém gerado (lendo do banco, não inventando)
      if (data?.report_id) {
        const { data: row, error } = await supabase
          .from("relatorios_gerados")
          .select(
            "id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg"
          )
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Agente Diesel</h2>
          <p className="text-sm text-gray-600">
            Geração (API) e visualização (Supabase Storage renderizado no INOVE).
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone="blue">API: {API_BASE}</Badge>
            <Badge tone="blue">Bucket: {BUCKET}</Badge>
            <Badge tone={statusTone}>{statusText}</Badge>
          </div>
        </div>

        <button
          onClick={gerar}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white font-semibold ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-900"
          }`}
        >
          {loading ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      {/* Filtros */}
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
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Data fim</label>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Motorista</label>
            <input
              value={filtroMotorista}
              onChange={(e) => setFiltroMotorista(e.target.value)}
              placeholder="Chapa ou nome"
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Linha</label>
            <input
              value={filtroLinha}
              onChange={(e) => setFiltroLinha(e.target.value)}
              placeholder="Ex: 08TR"
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Veículo</label>
            <input
              value={filtroVeiculo}
              onChange={(e) => setFiltroVeiculo(e.target.value)}
              placeholder="Prefixo"
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Cluster</label>
            <select
              value={filtroCluster}
              onChange={(e) => setFiltroCluster(e.target.value)}
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white"
            >
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

      {/* Visualização + Histórico */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-md border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800">Visualização do Relatório (HTML)</h3>

            <div className="flex items-center gap-2">
              {urls?.html && (
                <a
                  href={urls.html}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-md bg-black text-white text-sm font-semibold hover:bg-gray-900"
                >
                  Abrir HTML em nova aba
                </a>
              )}
              {urls?.png && (
                <a
                  href={urls.png}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                >
                  Baixar PNG
                </a>
              )}
            </div>
          </div>

          {urlsLoading && <div className="mt-3 text-sm text-gray-600">Carregando URLs...</div>}
          {urlsErro && (
            <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Falha ao abrir</div>
              <div className="mt-1">{urlsErro}</div>
            </div>
          )}

          {!selected ? (
            <div className="mt-3 text-sm text-gray-600">Selecione um relatório no histórico para visualizar.</div>
          ) : (
            <div className="mt-3 text-xs text-gray-600">
              <div><span className="font-semibold">Selecionado:</span> {labelRelatorio(selected)}</div>
              <div><span className="font-semibold">Gerado em:</span> {fmtBR(selected.created_at)}</div>
              <div><span className="font-semibold">Status:</span> {String(selected.status || "")}</div>
              {urls?.html_path_used && (
                <div><span className="font-semibold">Path usado:</span> {urls.html_path_used} ({urls.html_mode})</div>
              )}
            </div>
          )}

          {/* IFRAME: abre a página de verdade */}
          <div className="mt-4 border rounded-md overflow-hidden" style={{ height: 720 }}>
            {urls?.html ? (
              <iframe
                title="RelatorioHTML"
                src={urls.html}
                className="w-full h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Nenhum HTML disponível para exibir.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Histórico</h3>
            <button
              onClick={carregarHistorico}
              disabled={historicoLoading}
              className={`px-3 py-2 rounded-md border text-sm ${
                historicoLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
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
                  <li
                    key={it.id}
                    className={`p-3 rounded-md border ${selected?.id === it.id ? "border-black" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{labelRelatorio(it)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {fmtBR(it.created_at)} • <span className="font-semibold">{it.status}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => abrirRelatorio(it)}
                        className="shrink-0 px-3 py-2 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-900"
                      >
                        Ver
                      </button>
                    </div>

                    {it?.arquivo_nome && (
                      <div className="mt-2 text-xs text-gray-600 break-all">
                        <span className="font-semibold">Arquivo:</span> {it.arquivo_nome}
                      </div>
                    )}

                    {it?.arquivo_path && (
                      <div className="mt-1 text-[11px] text-gray-500 break-all">
                        <span className="font-semibold">Path:</span> {it.arquivo_path}
                      </div>
                    )}

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

      {/* Debug quando API falha */}
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
