// src/pages/AgenteDiesel.jsx
import { useMemo, useState } from "react";

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

export default function AgenteDiesel() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [erro, setErro] = useState(null);

  const files = useMemo(() => {
    const arr = resp?.files || [];
    return Array.isArray(arr) ? arr : [];
  }, [resp]);

  const hasHtml = useMemo(() => files.some((f) => String(f).toLowerCase().endsWith(".html")), [files]);
  const hasPng = useMemo(() => files.some((f) => String(f).toLowerCase().endsWith(".png")), [files]);

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
        const detail = data?.detail || data?.error || "Falha ao gerar relatório";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      setResp(data);
    } catch (e) {
      setErro(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function abrirArquivo(nome) {
    // Seu backend hoje NÃO expõe arquivo estático; então aqui a gente só copia o nome
    // e orienta a evoluir para Storage/Signed URL depois.
    navigator.clipboard?.writeText(nome);
    alert(`Arquivo "${nome}" copiado. (Próximo passo: expor link/signed URL no backend)`);
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agente Diesel</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gera o relatório gerencial (HTML/PNG/PDF) chamando o serviço externo.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="blue">API: {API_BASE}</Badge>
            <Badge tone={loading ? "yellow" : "green"}>{loading ? "PROCESSANDO" : "PRONTO"}</Badge>
          </div>
        </div>

        <button
          onClick={gerar}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-semibold shadow-sm border
            ${loading ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed" : "bg-black text-white border-black hover:bg-gray-900"}
          `}
        >
          {loading ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="mt-6 p-4 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-red-700">Erro ao gerar</div>
            <Badge tone="red">FALHOU</Badge>
          </div>
          <pre className="mt-2 text-xs text-red-900 whitespace-pre-wrap break-words">{erro}</pre>
          <p className="mt-2 text-xs text-gray-700">
            Dica: se o erro vier do Python, ele normalmente aparece no <b>stderr</b> retornado pela API.
          </p>
        </div>
      )}

      {/* Resposta */}
      {resp && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800">Status</div>
              <Badge tone="green">SUCESSO</Badge>
            </div>
            <div className="mt-2 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Mensagem:</span> {resp?.message || "OK"}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">Pasta:</span> <span className="font-mono">{resp?.output_dir}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {hasHtml && <Badge tone="blue">HTML</Badge>}
              {hasPng && <Badge tone="blue">PNG</Badge>}
              {!hasHtml && !hasPng && <Badge tone="gray">Sem artefatos detectados</Badge>}
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-white lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800">Arquivos gerados</div>
              <Badge tone="gray">{files.length}</Badge>
            </div>

            {files.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Nenhum arquivo foi listado pela API.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {files.map((f) => (
                  <div key={f} className="flex items-center justify-between gap-3 p-2 border rounded">
                    <div className="font-mono text-sm text-gray-800 truncate">{f}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirArquivo(f)}
                        className="px-3 py-1.5 text-sm font-semibold border rounded hover:bg-gray-50"
                      >
                        Copiar nome
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Logs */}
            <div className="mt-4">
              <div className="font-semibold text-gray-800">Logs (tail)</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <p className="mt-1 text-[11px] text-gray-500">
                    Se aparecer erro aqui, é erro do script Python (dependência, credencial, query, etc.).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observação importante */}
      <div className="mt-8 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <div className="font-semibold text-yellow-900">Observação</div>
        <p className="mt-1 text-sm text-yellow-900">
          Hoje a API retorna somente os <b>nomes</b> dos arquivos gerados no container do Render.
          Para conseguir <b>abrir/baixar</b> no INOVE, o próximo passo é subir esses arquivos no
          <b> Storage do Supabase B (bucket relatorios)</b> e retornar uma <b>signed URL</b> no JSON.
        </p>
      </div>
    </div>
  );
}
