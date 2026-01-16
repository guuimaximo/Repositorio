// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "../supabase";

// Bucket do Supabase (mesmo projeto do INOVE = SUPABASE B)
const BUCKET_RELATORIOS = "relatorios";
const TIPO_RELATORIO = "diesel_gerencial";
const LIMIT_HISTORICO = 120;

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

function dirname(path) {
  const p = String(path || "");
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

function basename(path) {
  const p = String(path || "");
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

function buildPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from(BUCKET_RELATORIOS).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

// Tenta inferir os caminhos padrão (HTML + PNG) dentro da mesma pasta report_*
function inferPathsFromArquivoPath(arquivoPath) {
  const folder = dirname(arquivoPath);
  if (!folder) return { htmlPath: null, pngPath: null };

  // padrão do seu script
  const htmlName = "Relatorio_Gerencial.html";
  const pngName = "cluster_evolution_unificado.png";

  return {
    htmlPath: `${folder}/${htmlName}`,
    pngPath: `${folder}/${pngName}`,
  };
}

export default function DesempenhoDieselAgente() {
  // filtros (mantidos na tela, mas aqui não geramos via API)
  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    [hoje]
  );

  const [periodoInicio, setPeriodoInicio] = useState(
    fmtDateInput(primeiroDiaMes)
  );
  const [periodoFim, setPeriodoFim] = useState(fmtDateInput(hoje));
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroLinha, setFiltroLinha] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroCluster, setFiltroCluster] = useState("");

  // histórico
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  // seleção / visualização
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  // status (somente informativo)
  const statusTone = useMemo(() => {
    if (historicoLoading || urlsLoading) return "yellow";
    if (historicoErro || urlsErro) return "red";
    return "green";
  }, [historicoLoading, urlsLoading, historicoErro, urlsErro]);

  const statusText = useMemo(() => {
    if (historicoLoading || urlsLoading) return "CARREGANDO";
    if (historicoErro || urlsErro) return "ERRO";
    return "OK";
  }, [historicoLoading, urlsLoading, historicoErro, urlsErro]);

  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo =
      ini && fim ? `${ini} → ${fim}` : ini || fim ? ini || fim : "Sem período";
    return `Relatório Diesel — ${periodo}`;
  }

  // Filtro local (só na lista, sem mexer em query)
  const itemsFiltrados = useMemo(() => {
    const m = filtroMotorista.trim().toLowerCase();
    const l = filtroLinha.trim().toLowerCase();
    const v = filtroVeiculo.trim().toLowerCase();
    const c = filtroCluster.trim().toLowerCase();

    const di = periodoInicio ? new Date(`${periodoInicio}T00:00:00`) : null;
    const df = periodoFim ? new Date(`${periodoFim}T23:59:59`) : null;

    return (items || []).filter((it) => {
      // período (usando created_at como fallback)
      const dtBase = it?.created_at
        ? new Date(it.created_at)
        : it?.periodo_fim
        ? new Date(`${it.periodo_fim}T12:00:00`)
        : null;

      if (di && dtBase && dtBase < di) return false;
      if (df && dtBase && dtBase > df) return false;

      // observação: esses filtros abaixo só funcionam se você persistir esses campos na tabela.
      // Mantemos no front para não quebrar a UI.
      if (m) {
        const s = `${it?.solicitante_login || ""} ${it?.solicitante_nome || ""}`
          .toLowerCase()
          .trim();
        if (!s.includes(m)) return false;
      }
      if (l) {
        const s = String(it?.linha || "").toLowerCase();
        if (!s.includes(l)) return false;
      }
      if (v) {
        const s = String(it?.veiculo || "").toLowerCase();
        if (!s.includes(v)) return false;
      }
      if (c) {
        const s = String(it?.cluster || "").toLowerCase();
        if (!s.includes(c)) return false;
      }

      return true;
    });
  }, [
    items,
    filtroMotorista,
    filtroLinha,
    filtroVeiculo,
    filtroCluster,
    periodoInicio,
    periodoFim,
  ]);

  async function carregarHistorico() {
    setHistoricoLoading(true);
    setHistoricoErro(null);

    try {
      const { data, error } = await supabase
        .from("relatorios_gerados")
        .select(
          [
            "id",
            "created_at",
            "tipo",
            "status",
            "periodo_inicio",
            "periodo_fim",
            "arquivo_path",
            "arquivo_nome",
            "mime_type",
            "tamanho_bytes",
            "erro_msg",
            "solicitante_login",
            "solicitante_nome",
          ].join(",")
        )
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
      const arquivoPath = it?.arquivo_path;

      // 1) se o arquivo_path já é HTML (novo padrão)
      if (arquivoPath && String(arquivoPath).toLowerCase().endsWith(".html")) {
        const { htmlPath, pngPath } = inferPathsFromArquivoPath(arquivoPath);
        const htmlUrl = buildPublicUrl(htmlPath || arquivoPath);
        const pngUrl = buildPublicUrl(pngPath);

        if (!htmlUrl) throw new Error("Não foi possível gerar URL pública do HTML.");
        setUrls({
          html: htmlUrl,
          png: pngUrl || null,
          html_path: htmlPath || arquivoPath,
          png_path: pngPath || null,
        });
        return;
      }

      // 2) se for legado (ex: pdf) ainda assim tentamos achar HTML/PNG na pasta
      if (arquivoPath) {
        const folder = dirname(arquivoPath);
        const htmlPath = `${folder}/Relatorio_Gerencial.html`;
        const pngPath = `${folder}/cluster_evolution_unificado.png`;

        const htmlUrl = buildPublicUrl(htmlPath);
        const pngUrl = buildPublicUrl(pngPath);

        if (!htmlUrl) {
          throw new Error(
            "Relatório não tem HTML (ou o bucket não está público / arquivo não existe)."
          );
        }

        setUrls({
          html: htmlUrl,
          png: pngUrl || null,
          html_path: htmlPath,
          png_path: pngPath,
        });
        return;
      }

      throw new Error("Item sem arquivo_path.");
    } catch (e) {
      setUrlsErro(String(e?.message || e));
    } finally {
      setUrlsLoading(false);
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
          <p className="text-sm text-gray-600">
            Visualização do relatório gerencial direto do Supabase (bucket público).
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone="blue">Supabase: {BUCKET_RELATORIOS}</Badge>
            <Badge tone={statusTone}>{statusText}</Badge>
          </div>
        </div>

        <button
          onClick={carregarHistorico}
          disabled={historicoLoading}
          className={`px-4 py-2 rounded-md text-white font-semibold ${
            historicoLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-gray-900"
          }`}
        >
          {historicoLoading ? "Atualizando..." : "Atualizar histórico"}
        </button>
      </div>

      {/* Filtros (somente na lista) */}
      <div className="mt-5 rounded-md border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">Filtros</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Aqui filtra a LISTA no INOVE. (A geração do relatório é externa.)
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              placeholder="Login/nome solicitante"
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

      {/* Painel: Visualização + Histórico */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visualização HTML */}
        <div className="rounded-md border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800">
              Visualização do Relatório (HTML)
            </h3>

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

          {urlsLoading && (
            <div className="mt-3 text-sm text-gray-600">Carregando URLs...</div>
          )}
          {urlsErro && (
            <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Falha ao abrir relatório</div>
              <div className="mt-1">{urlsErro}</div>
            </div>
          )}

          {!selected ? (
            <div className="mt-3 text-sm text-gray-600">
              Selecione um relatório no histórico para visualizar.
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-600">
              <div>
                <span className="font-semibold">Selecionado:</span>{" "}
                {labelRelatorio(selected)}
              </div>
              <div>
                <span className="font-semibold">Gerado em:</span>{" "}
                {fmtBR(selected.created_at)}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {String(selected.status || "")}
              </div>
              {selected?.arquivo_path && (
                <div className="break-all">
                  <span className="font-semibold">Pasta:</span>{" "}
                  {dirname(selected.arquivo_path) || "(n/d)"}
                </div>
              )}
            </div>
          )}

          {/* IFRAME com o HTML (mesma pasta do PNG; img src relativo funciona) */}
          <div className="mt-4 border rounded-md overflow-hidden" style={{ height: 720 }}>
            {urls?.html ? (
              <iframe title="RelatorioHTML" src={urls.html} className="w-full h-full" />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Nenhum HTML disponível para exibir.
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">
              Histórico (Tabela relatorios_gerados)
            </h3>
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
            {!itemsFiltrados.length ? (
              <div className="text-gray-500">Nenhum relatório encontrado.</div>
            ) : (
              <ul className="space-y-2">
                {itemsFiltrados.map((it) => {
                  const isSel = selected?.id === it.id;

                  // links rápidos (públicos) baseados no arquivo_path
                  const ap = it?.arquivo_path || "";
                  const inferred = ap ? inferPathsFromArquivoPath(ap) : { htmlPath: null, pngPath: null };
                  const htmlQuick =
                    ap && String(ap).toLowerCase().endsWith(".html")
                      ? buildPublicUrl(ap)
                      : inferred?.htmlPath
                      ? buildPublicUrl(inferred.htmlPath)
                      : null;
                  const pngQuick = inferred?.pngPath ? buildPublicUrl(inferred.pngPath) : null;

                  return (
                    <li
                      key={it.id}
                      className={`p-3 rounded-md border ${isSel ? "border-black" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {labelRelatorio(it)}
                          </div>

                          <div className="text-xs text-gray-600 mt-0.5">
                            {fmtBR(it.created_at)} •{" "}
                            <span className="font-semibold">{it.status}</span>
                          </div>

                          {it?.arquivo_nome && (
                            <div className="mt-2 text-xs text-gray-600 break-all">
                              <span className="font-semibold">Arquivo:</span>{" "}
                              {it.arquivo_nome}
                            </div>
                          )}

                          {it?.arquivo_path && (
                            <div className="mt-1 text-[11px] text-gray-500 break-all">
                              <span className="font-semibold">Path:</span>{" "}
                              {it.arquivo_path}
                            </div>
                          )}

                          {it?.erro_msg && it.status === "ERRO" && (
                            <div className="mt-2 text-xs text-red-700 break-all">
                              <span className="font-semibold">Erro:</span>{" "}
                              {it.erro_msg}
                            </div>
                          )}

                          {/* Links rápidos */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {htmlQuick && (
                              <a
                                href={htmlQuick}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                              >
                                HTML
                              </a>
                            )}
                            {pngQuick && (
                              <a
                                href={pngQuick}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                              >
                                PNG
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => abrirRelatorio(it)}
                          className="shrink-0 px-3 py-2 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-900"
                        >
                          Ver
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-600">
            Importante: para o iframe abrir e para o HTML carregar o PNG por{" "}
            <b>src relativo</b>, o bucket <b>{BUCKET_RELATORIOS}</b> precisa estar{" "}
            <b>público</b>.
          </div>
        </div>
      </div>

      {/* Observação final */}
      <div className="mt-4 p-3 rounded-md border bg-yellow-50 text-yellow-900 text-xs">
        Aqui o INOVE lê direto do Supabase (tabela <b>relatorios_gerados</b> + bucket{" "}
        <b>{BUCKET_RELATORIOS}</b>). Não depende mais da API do agente para listar/abrir relatórios.
      </div>
    </div>
  );
}
