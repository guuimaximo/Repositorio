// src/pages/DesempenhoDieselAgente.jsx
import React, { useMemo, useState } from "react";

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

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  // =========================
  // NOVO: filtros (apenas isso)
  // =========================
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

  const files = useMemo(() => {
    const arr = resp?.files || resp?.files_local || [];
    return Array.isArray(arr) ? arr : [];
  }, [resp]);

  const hasHtml = useMemo(
    () => files.some((f) => String(f).toLowerCase().endsWith(".html")),
    [files]
  );
  const hasPdf = useMemo(
    () => files.some((f) => String(f).toLowerCase().endsWith(".pdf")),
    [files]
  );
  const hasPng = useMemo(
    () => files.some((f) => String(f).toLowerCase().endsWith(".png")),
    [files]
  );

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
    if (!periodoInicio || !periodoFim) return true; // deixa a API decidir
    const di = new Date(`${periodoInicio}T00:00:00`);
    const df = new Date(`${periodoFim}T23:59:59`);
    return di <= df;
  }

  // =========================
  // NOVO: POST com filtros
  // =========================
  async function gerar() {
    setLoading(true);
    setErro(null);
    setResp(null);

    try {
      if (!validarPeriodo()) {
        throw new Error("Período inválido: Data início maior que Data fim.");
      }

      const payload = {
        // mantendo compatível com o backend (seu agente já usa periodo_inicio/fim por env)
        tipo: "diesel_gerencial",
        periodo_inicio: periodoInicio || null,
        periodo_fim: periodoFim || null,

        // filtros opcionais (apenas envia; backend aplica)
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
        // tenta manter padrão do que você já vinha exibindo
        const detail =
          data?.error ||
          data?.detail ||
          (Array.isArray(data) ? JSON.stringify(data) : null) ||
          `HTTP ${r.status}`;
        setResp(data);
        throw new Error(detail);
      }

      setResp(data);
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
            Geração de relatório gerencial (HTML/PNG/PDF) via serviço externo.
          </p>

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

      {/* =========================
          NOVO: bloco de filtros
         ========================= */}
      <div className="mt-5 rounded-md border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">Filtros</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Preencha o que quiser. Campos em branco não filtram.
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

      {/* Painel de resultado */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status/Resumo */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Status</h3>
            <Badge tone={statusTone}>{statusText}</Badge>
          </div>

          <div className="mt-3 text-sm text-gray-700 space-y-1">
            <div>
              <span className="font-semibold">Mensagem:</span>{" "}
              {resp?.message || resp?.error || (loading ? "Processando..." : "Aguardando")}
            </div>

            {resp?.report_id && (
              <div>
                <span className="font-semibold">Report ID:</span> {resp.report_id}
              </div>
            )}

            {resp?.output_dir && (
              <div>
                <span className="font-semibold">Pasta:</span> {resp.output_dir}
              </div>
            )}
          </div>

          {erro && (
            <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
              <div className="font-semibold">Erro ao gerar</div>
              <div className="mt-1">{erro}</div>
            </div>
          )}
        </div>

        {/* Arquivos */}
        <div className="rounded-md border p-4">
          <h3 className="text-sm font-semibold text-gray-800">Arquivos gerados</h3>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge tone={hasHtml ? "green" : "gray"}>HTML</Badge>
            <Badge tone={hasPng ? "green" : "gray"}>PNG</Badge>
            <Badge tone={hasPdf ? "green" : "gray"}>PDF</Badge>
          </div>

          <div className="mt-3 text-sm text-gray-700">
            {!files.length ? (
              <div className="text-gray-500">Nenhum arquivo foi listado pela API.</div>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {files.map((f) => (
                  <li key={f} className="break-all">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-600">
            Hoje a API lista nomes dos arquivos gerados no container. Quando você quiser, a gente retorna
            Signed URL do Storage para abrir/baixar direto aqui.
          </div>
        </div>

        {/* Logs */}
        <div className="rounded-md border p-4">
          <h3 className="text-sm font-semibold text-gray-800">Logs</h3>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-600">STDERR</div>
            <pre className="mt-1 text-xs bg-gray-50 border rounded-md p-3 max-h-44 overflow-auto whitespace-pre-wrap">
{resp?.stderr || "(vazio)"}
            </pre>
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-600">STDOUT</div>
            <pre className="mt-1 text-xs bg-gray-50 border rounded-md p-3 max-h-44 overflow-auto whitespace-pre-wrap">
{resp?.stdout || resp?.stdout_tail || "(vazio)"}
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-md border bg-yellow-50 text-yellow-900 text-xs">
        Os filtros acima só funcionam quando o backend do Agente Diesel aplicar esses campos no SELECT do Supabase A
        (motorista/linha/veiculo/cluster) e/ou no Pandas. Aqui no Inove já fica pronto para enviar.
      </div>
    </div>
  );
}  );
  const hasPng = useMemo(
    () => files.some((f) => String(f).toLowerCase().endsWith(".png")),
    [files]
  );

  async function gerar() {
    setErro(null);
    setResp(null);
    setLoading(true);

    try {
      const r = await fetch(`${API_BASE}/relatorios/gerar`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tipo: "diesel_gerencial" }),
});

const data = await r.json().catch(() => null);

if (!r.ok) {
  const msg = data?.detail || data?.error || "Falha ao gerar relatório";
  const stderr = data?.stderr || "";
  const stdout = data?.stdout || data?.stdout_tail || "";
  throw new Error(`${msg}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`);
}
setResp(data);

    } catch (e) {
      setErro(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function copiarNome(nome) {
    try {
      await navigator.clipboard?.writeText(nome);
      alert(`Copiado: ${nome}`);
    } catch {
      alert(`Não consegui copiar automaticamente. Nome: ${nome}`);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Agente Diesel</h2>
          <p className="text-sm text-gray-600">
            Geração de relatório gerencial (HTML/PNG/PDF) via serviço externo.
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge tone="blue">API: {API_BASE}</Badge>
            <Badge tone={loading ? "yellow" : "green"}>
              {loading ? "PROCESSANDO" : "PRONTO"}
            </Badge>
            {hasHtml && <Badge tone="blue">HTML</Badge>}
            {hasPng && <Badge tone="blue">PNG</Badge>}
          </div>
        </div>

        <button
          onClick={gerar}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-semibold shadow-sm border
            ${
              loading
                ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
                : "bg-black text-white border-black hover:bg-gray-900"
            }`}
        >
          {loading ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="mt-6 p-4 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-red-700">Erro ao gerar</div>
            <Badge tone="red">FALHOU</Badge>
          </div>
          <pre className="mt-2 text-xs text-red-900 whitespace-pre-wrap break-words">
            {erro}
          </pre>
          <p className="mt-2 text-xs text-gray-700">
            Normalmente o detalhe do erro aparece no <b>STDERR</b> abaixo quando
            a API retorna logs.
          </p>
        </div>
      )}

      {/* SUCESSO */}
      {resp && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800">Status</div>
              <Badge tone="green">SUCESSO</Badge>
            </div>

            <div className="mt-2 text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500">Mensagem:</span>{" "}
                {resp?.message || "OK"}
              </div>
              <div>
                <span className="text-gray-500">Pasta:</span>{" "}
                <span className="font-mono">{resp?.output_dir}</span>
              </div>
              <div>
                <span className="text-gray-500">Arquivos:</span>{" "}
                <span className="font-mono">{files.length}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-white lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800">Arquivos gerados</div>
              <Badge tone="gray">{files.length}</Badge>
            </div>

            {files.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">
                Nenhum arquivo foi listado pela API.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {files.map((f) => (
                  <div
                    key={f}
                    className="flex items-center justify-between gap-3 p-2 border rounded"
                  >
                    <div className="font-mono text-sm text-gray-800 truncate">
                      {f}
                    </div>
                    <button
                      onClick={() => copiarNome(f)}
                      className="px-3 py-1.5 text-sm font-semibold border rounded hover:bg-gray-50"
                    >
                      Copiar nome
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border rounded bg-gray-50">
                <div className="text-xs font-semibold text-gray-600">STDOUT</div>
                <pre className="mt-1 text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {resp?.stdout_tail || "(vazio)"}
                </pre>
              </div>

              <div className="p-3 border rounded bg-gray-50">
                <div className="text-xs font-semibold text-gray-600">STDERR</div>
                <pre className="mt-1 text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {resp?.stderr_tail || "(vazio)"}
                </pre>
              </div>
            </div>

            <div className="mt-4 p-3 border rounded bg-yellow-50 border-yellow-200 text-sm text-yellow-900">
              Hoje a API retorna apenas os <b>nomes</b> dos arquivos gerados no
              container do Render. O próximo passo (quando você quiser) é subir
              os arquivos no <b>Supabase Storage (bucket relatorios)</b> e
              retornar <b>signed URL</b> para abrir/baixar direto aqui.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
