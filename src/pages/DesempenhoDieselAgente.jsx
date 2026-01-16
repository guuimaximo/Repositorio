// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState, useEffect } from "react";

const API_BASE = "https://agentediesel.onrender.com";

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

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // Histórico
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState(null);
  const [items, setItems] = useState([]);

  // Visualização do relatório selecionado
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsErro, setUrlsErro] = useState(null);

  // filtros (mantidos)
  const hoje = useMemo(() => new Date(), []);
  const primeiroDiaMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

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

  async function carregarHistorico() {
    setHistoricoLoading(true);
    setHistoricoErro(null);
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/relatorios?tipo=diesel_gerencial&limit=80`);
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.detail || data?.error || `HTTP ${r.status}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setHistoricoErro(String(e?.message || e));
    } finally {
      setHistoricoLoading(false);
    }
  }

  async function abrirRelatorio(item) {
    setSelected(item);
    setUrls(null);
    setUrlsErro(null);
    setUrlsLoading(true);
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/relatorios/${item.id}/urls?expires_in=3600`);
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.detail || data?.error || `HTTP ${r.status}`);
      setUrls(data?.urls || null);
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

      // Se gerou e já tiver report_id, já abre
      if (data?.report_id) {
        const item = { id: data.report_id, created_at: new Date().toISOString(), status: "CONCLUIDO", tipo: "diesel_gerencial" };
        await abrirRelatorio(item);
      }
    } catch (e) {
      setErro(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Nome amigável do relatório para listar (do lado do INOVE)
  function labelRelatorio(it) {
    const ini = it?.periodo_inicio ? String(it.periodo_inicio) : "";
    const fim = it?.periodo_fim ? String(it.periodo_fim) : "";
    const periodo = ini && fim ? `${ini} → ${fim}` : ini || fim ? (ini || fim) : "Sem período";
    return `Relatório Diesel — ${periodo}`;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Agente Diesel</h2>
          <p className="text-sm text-gray-600">Geração e visualização de relatório gerencial (HTML/PNG/PDF).</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone="blue">API: {API_BASE}</Badge>
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

      {/* Painel: Visualização + Histórico */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visualização HTML */}
        <div className="rounded-md border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800">Visualização do Relatório</h3>

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
              {urls?.pdf && (
                <a
                  href={urls.pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                >
                  Baixar PDF
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
              <div className="font-semibold">Falha ao carregar URLs</div>
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
            </div>
          )}

          {/* IFRAME com o HTML */}
          <div className="mt-4 border rounded-md overflow-hidden" style={{ height: 720 }}>
            {urls?.html ? (
              <iframe title="RelatorioHTML" src={urls.html} className="w-full h-full" />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Nenhum HTML disponível para exibir (ou URLs ainda não carregadas).
              </div>
            )}
          </div>
        </div>

        {/* Histórico de downloads */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Histórico (Bucket)</h3>
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

      {/* Debug de logs do script (quando o POST falha) */}
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
