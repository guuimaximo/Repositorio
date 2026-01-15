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

export default function DesempenhoDieselAgente() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  const files = useMemo(() => {
    const arr = resp?.files || [];
    return Array.isArray(arr) ? arr : [];
  }, [resp]);

  const hasHtml = useMemo(
    () => files.some((f) => String(f).toLowerCase().endsWith(".html")),
    [files]
  );
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
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        const detail =
          data?.detail || data?.error || "Falha ao gerar relatório";
        throw new Error(
          typeof detail === "string" ? detail : JSON.stringify(detail)
        );
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
