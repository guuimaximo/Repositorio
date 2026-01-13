// src/pages/DesempenhoDieselAcompanhamento.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

/**
 * CENTRAL — ACOMPANHAMENTO (no padrão CentralTratativas)
 * - Filtros em objeto + applyCommonFilters
 * - Lista com limite alto
 * - Contadores via head:true / count:exact (não sofrem limite)
 * - Botões:
 *   - "Lançar acompanhamento" -> abre tela de detalhe do instrutor (checkpoint)
 *   - "Ver histórico" -> modal
 *   - "Analisar" -> quando AGUARDANDO_ANALISE (rota opcional)
 *
 * ✅ AJUSTE AGORA:
 * - Dentro do modal de ANÁLISE, botão "Ver checkpoint completo"
 *   -> abre um modal com o CHECKPOINT completo (observações, métricas, período, extra e evidências)
 */

function daysBetween(a, b) {
  try {
    const da = new Date(a);
    const db = new Date(b);
    const diff = db.getTime() - da.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const base = "inline-flex items-center px-2 py-1 rounded text-xs font-semibold";

  if (s === "OK") return <span className={`${base} bg-green-100 text-green-800`}>OK</span>;
  if (s === "PIOROU_TRATATIVA") return <span className={`${base} bg-red-100 text-red-800`}>Piorou</span>;
  if (s === "ENCERRADO") return <span className={`${base} bg-gray-100 text-gray-800`}>Encerrado</span>;
  if (s === "AGUARDANDO_ANALISE")
    return <span className={`${base} bg-orange-100 text-orange-800`}>Aguardando análise</span>;
  if (s === "EM_ANALISE") return <span className={`${base} bg-blue-100 text-blue-800`}>Em análise</span>;
  if (s === "A_SER_ACOMPANHADO")
    return <span className={`${base} bg-yellow-100 text-yellow-800`}>A ser acompanhado</span>;

  return <span className={`${base} bg-gray-100 text-gray-800`}>{s || "—"}</span>;
}

function MetricBadge({ kmlAtual, kmlMeta }) {
  const kml = Number(kmlAtual);
  const meta = Number(kmlMeta);

  const hasKml = Number.isFinite(kml);
  const hasMeta = Number.isFinite(meta);

  if (!hasKml && !hasMeta) return <span className="text-xs text-gray-500">KM/L: —</span>;

  if (hasKml && !hasMeta) {
    return (
      <span className="text-xs text-gray-700">
        KM/L atual: <span className="font-semibold">{kml.toFixed(2)}</span>
      </span>
    );
  }

  if (!hasKml && hasMeta) {
    return (
      <span className="text-xs text-gray-700">
        Meta: <span className="font-semibold">≥ {meta.toFixed(2)}</span>
      </span>
    );
  }

  const ok = kml >= meta;
  return (
    <span className="text-xs text-gray-700">
      KM/L atual:{" "}
      <span className={`font-semibold ${ok ? "text-green-700" : "text-red-700"}`}>{kml.toFixed(2)}</span>{" "}
      <span className="text-gray-500">| Meta: ≥ {meta.toFixed(2)}</span>
    </span>
  );
}

/* ===========================
   Evidências (tiles)
=========================== */
function isImage(url) {
  return /\.(jpg|jpeg|png|webp)$/i.test(String(url || ""));
}
function isPdf(url) {
  return /\.pdf$/i.test(String(url || ""));
}
function getFileName(url) {
  try {
    return decodeURIComponent(String(url || "").split("/").pop() || "");
  } catch {
    return String(url || "").split("/").pop() || "";
  }
}

function EvidenceList({ urls }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (list.length === 0) return <span className="text-sm text-gray-500">Sem evidências</span>;

  return (
    <div className="flex flex-wrap gap-3">
      {list.map((u, idx) => (
        <a
          key={`${u}-${idx}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="border rounded-lg p-2 hover:bg-gray-50 transition"
          title="Abrir arquivo"
        >
          {isImage(u) ? (
            <img src={u} alt="Evidência" className="w-24 h-24 object-cover rounded" loading="lazy" />
          ) : isPdf(u) ? (
            <div className="w-24 h-24 flex flex-col items-center justify-center text-[11px] text-gray-700">
              <span className="text-red-600 font-semibold">PDF</span>
              <span className="mt-1 text-center break-all line-clamp-3">{getFileName(u) || "arquivo.pdf"}</span>
            </div>
          ) : (
            <div className="w-24 h-24 flex items-center justify-center text-[11px] text-gray-700 text-center break-all">
              {getFileName(u) || "arquivo"}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

/* ===========================
   ✅ NOVO: Modal do Checkpoint Completo
=========================== */
function CheckpointCompletoModal({ open, onClose, checkpoint, acompanhamento }) {
  if (!open) return null;

  const nome = acompanhamento?.motorista_nome || "—";
  const chapa = acompanhamento?.motorista_chapa || "—";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">Checkpoint — Completo</div>
            <div className="text-sm text-gray-600 truncate">
              {nome} — Chapa {chapa}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200">
            Fechar
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {!checkpoint ? (
            <div className="text-sm text-gray-500">Nenhum checkpoint encontrado.</div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">CHECKPOINT</span>
                  <span className="text-xs text-gray-500">
                    {checkpoint.created_at ? new Date(checkpoint.created_at).toLocaleString("pt-BR") : "—"}
                  </span>
                </div>

                <div className="text-xs text-gray-500">
                  Instrutor:{" "}
                  <span className="font-semibold">
                    {checkpoint.criado_por_nome || checkpoint.criado_por_login || "—"}
                  </span>
                </div>
              </div>

              {checkpoint.observacoes ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Observações</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{checkpoint.observacoes}</div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-500">Sem observações.</div>
              )}

              {(checkpoint.kml ?? checkpoint.km ?? checkpoint.litros) != null ? (
                <div className="mt-3 text-xs text-gray-600">
                  {checkpoint.kml != null && (
                    <span className="mr-3">
                      KM/L: <span className="font-semibold">{Number(checkpoint.kml).toFixed(2)}</span>
                    </span>
                  )}
                  {checkpoint.km != null && (
                    <span className="mr-3">
                      KM: <span className="font-semibold">{Number(checkpoint.km).toFixed(2)}</span>
                    </span>
                  )}
                  {checkpoint.litros != null && (
                    <span className="mr-3">
                      Litros: <span className="font-semibold">{Number(checkpoint.litros).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              ) : null}

              {(checkpoint.periodo_inicio || checkpoint.periodo_fim) ? (
                <div className="mt-2 text-xs text-gray-600">
                  Período: <span className="font-semibold">{checkpoint.periodo_inicio || "—"}</span> até{" "}
                  <span className="font-semibold">{checkpoint.periodo_fim || "—"}</span>
                </div>
              ) : null}

              {checkpoint.extra ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                    Ver dados do checkpoint (extra)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 border rounded text-xs overflow-x-auto">
                    {JSON.stringify(checkpoint.extra, null, 2)}
                  </pre>
                </details>
              ) : null}

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-700 mb-2">Evidências</div>
                <EvidenceList urls={checkpoint.evidencias_urls} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 text-xs text-gray-600">
          Aqui está o registro completo do último CHECKPOINT.
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Histórico (já existia)
=========================== */
function HistoricoModal({ open, onClose, acompanhamento }) {
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    if (!open || !acompanhamento?.id) return;

    (async () => {
      setLoading(true);
      setEventos([]);

      const { data, error } = await supabase
        .from("diesel_acompanhamento_eventos")
        .select(
          "id, created_at, tipo, observacoes, evidencias_urls, km, litros, kml, periodo_inicio, periodo_fim, criado_por_nome, criado_por_login, extra"
        )
        .eq("acompanhamento_id", acompanhamento.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setEventos(data || []);
      setLoading(false);
    })();
  }, [open, acompanhamento?.id]);

  if (!open) return null;

  const nome = acompanhamento?.motorista_nome || "—";
  const chapa = acompanhamento?.motorista_chapa || "—";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">Histórico do Motorista</div>
            <div className="text-sm text-gray-600 truncate">
              {nome} — Chapa {chapa}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200">
            Fechar
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="border rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={acompanhamento?.status} />
                <span className="text-sm text-gray-700">
                  Lançado em:{" "}
                  <span className="font-semibold">
                    {acompanhamento?.created_at ? new Date(acompanhamento.created_at).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </span>
                <span className="text-sm text-gray-700">
                  Início monitoramento:{" "}
                  <span className="font-semibold">{acompanhamento?.dt_inicio_monitoramento || "—"}</span>
                </span>
                <span className="text-sm text-gray-700">
                  Vence em: <span className="font-semibold">{acompanhamento?.dt_fim_planejado || "—"}</span>
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Motivo: <span className="font-semibold">{acompanhamento?.motivo || "—"}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-gray-800 mb-2">Evidências do lançamento</div>
              <EvidenceList urls={acompanhamento?.evidencias_urls} />
            </div>
          </div>

          <div className="text-sm font-semibold text-gray-800 mb-2">Eventos</div>

          {loading ? (
            <div className="text-sm text-gray-600">Carregando eventos...</div>
          ) : eventos.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum evento registrado.</div>
          ) : (
            <div className="space-y-3">
              {eventos.map((e) => (
                <div key={e.id} className="border rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">{e.tipo}</span>
                      <span className="text-xs text-gray-500">
                        {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Registrado por:{" "}
                      <span className="font-semibold">{e.criado_por_nome || e.criado_por_login || "—"}</span>
                    </div>
                  </div>

                  {e.observacoes && (
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{e.observacoes}</div>
                  )}

                  {(e.kml ?? e.km ?? e.litros) != null && (
                    <div className="mt-2 text-xs text-gray-600">
                      {e.kml != null && (
                        <span className="mr-3">
                          KM/L: <span className="font-semibold">{Number(e.kml).toFixed(2)}</span>
                        </span>
                      )}
                      {e.km != null && (
                        <span className="mr-3">
                          KM: <span className="font-semibold">{Number(e.km).toFixed(2)}</span>
                        </span>
                      )}
                      {e.litros != null && (
                        <span className="mr-3">
                          Litros: <span className="font-semibold">{Number(e.litros).toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {(e.periodo_inicio || e.periodo_fim) && (
                    <div className="mt-2 text-xs text-gray-600">
                      Período: <span className="font-semibold">{e.periodo_inicio || "—"}</span> até{" "}
                      <span className="font-semibold">{e.periodo_fim || "—"}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Evidências</div>
                    <EvidenceList urls={e.evidencias_urls} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 text-xs text-gray-600">
          Observação: ao escalar para Tratativa, o histórico + evidências devem ser herdados.
        </div>
      </div>
    </div>
  );
}

/* ===========================
   ✅ Modal de ANÁLISE (com botão Ver checkpoint completo)
=========================== */
function AnaliseResumoModal({ open, onClose, acompanhamento }) {
  const [loading, setLoading] = useState(false);
  const [checkpoint, setCheckpoint] = useState(null);

  // ✅ NOVO
  const [checkpointOpen, setCheckpointOpen] = useState(false);

  useEffect(() => {
    if (!open || !acompanhamento?.id) return;

    (async () => {
      setLoading(true);
      setCheckpoint(null);

      // Pega o ÚLTIMO checkpoint do acompanhamento
      const { data, error } = await supabase
        .from("diesel_acompanhamento_eventos")
        .select(
          "id, created_at, tipo, observacoes, evidencias_urls, km, litros, kml, periodo_inicio, periodo_fim, criado_por_nome, criado_por_login, extra"
        )
        .eq("acompanhamento_id", acompanhamento.id)
        .eq("tipo", "CHECKPOINT")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error(error);
      setCheckpoint(data || null);

      setLoading(false);
    })();
  }, [open, acompanhamento?.id]);

  if (!open) return null;

  const nome = acompanhamento?.motorista_nome || "—";
  const chapa = acompanhamento?.motorista_chapa || "—";

  const kmlInicial = acompanhamento?.kml_inicial ?? null;
  const kmlMeta = acompanhamento?.kml_meta ?? null;

  // Manual do acompanhamento (se você estiver salvando em algum lugar)
  // Aqui mantive como fallback em metadata, ajuste se seu schema for diferente.
  const kmlManual = acompanhamento?.metadata?.kml_manual ?? null;

  const resumoChecklist = checkpoint?.extra?.checklist_resumo ?? "—";
  const detalhes = checkpoint?.extra?.detalhes_acompanhamento || null;

  return (
    <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">Análise — Resumo do Acompanhamento</div>
            <div className="text-sm text-gray-600 truncate">
              {nome} — Chapa {chapa}
            </div>
          </div>

          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200">
            Fechar
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* Cabeçalho / Status */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge status={acompanhamento?.status} />
            <span className="text-sm text-gray-700">
              Início monitoramento:{" "}
              <span className="font-semibold">{acompanhamento?.dt_inicio_monitoramento || "—"}</span>
            </span>
            <span className="text-sm text-gray-700">
              Vence em: <span className="font-semibold">{acompanhamento?.dt_fim_planejado || "—"}</span>
            </span>
            <span className="text-sm text-gray-700">
              Motivo: <span className="font-semibold">{acompanhamento?.motivo || "—"}</span>
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500">KM/L inicial</div>
              <div className="text-2xl font-bold text-gray-800">
                {kmlInicial != null ? Number(kmlInicial).toFixed(2) : "—"}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500">KM/L meta</div>
              <div className="text-2xl font-bold text-gray-800">{kmlMeta != null ? Number(kmlMeta).toFixed(2) : "—"}</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500">Último checklist</div>
              <div className="text-2xl font-bold text-gray-800">{resumoChecklist || "—"}</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500">KM/L (manual do acompanhamento)</div>
              <div className="text-2xl font-bold text-gray-800">
                {kmlManual != null ? Number(kmlManual).toFixed(2) : "—"}
              </div>
            </div>
          </div>

          {/* Último CHECKPOINT */}
          <div className="border rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              O que foi realizado (último CHECKPOINT)
            </div>

            {loading ? (
              <div className="text-sm text-gray-600">Carregando checkpoint...</div>
            ) : !checkpoint ? (
              <div className="text-sm text-gray-500">Nenhum checkpoint registrado ainda.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">CHECKPOINT</span>
                    <span className="text-xs text-gray-500">
                      {checkpoint.created_at ? new Date(checkpoint.created_at).toLocaleString("pt-BR") : "—"}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Instrutor:{" "}
                    <span className="font-semibold">
                      {checkpoint.criado_por_nome || checkpoint.criado_por_login || "—"}
                    </span>
                  </div>
                </div>

                {/* ✅ BOTÃO NOVO */}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setCheckpointOpen(true)}
                    className="bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-black text-sm"
                  >
                    Ver checkpoint completo
                  </button>
                </div>

                {/* Cards mastigados (se tiver) */}
                {detalhes ? (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border rounded-lg p-3 bg-white">
                      <div className="text-xs text-gray-500">Data / Hora</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {(detalhes.data_acompanhamento || "—") +
                          (detalhes.hora_inicial || detalhes.hora_final
                            ? ` • ${detalhes.hora_inicial || "—"} → ${detalhes.hora_final || "—"}`
                            : "")}
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-white">
                      <div className="text-xs text-gray-500">KM do acompanhamento</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {(detalhes.km_inicial != null ? Number(detalhes.km_inicial).toFixed(2) : "—") +
                          " → " +
                          (detalhes.km_final != null ? Number(detalhes.km_final).toFixed(2) : "—") +
                          (detalhes.km_acompanhado != null
                            ? ` | ${Number(detalhes.km_acompanhado).toFixed(2)} km`
                            : "")}
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-white">
                      <div className="text-xs text-gray-500">Horas acompanhadas</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {detalhes.horas_acompanhadas_min != null
                          ? `${Math.floor(Number(detalhes.horas_acompanhadas_min) / 60)}h ${String(
                              Number(detalhes.horas_acompanhadas_min) % 60
                            ).padStart(2, "0")}m`
                          : "—"}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Observações mastigadas (resumo) */}
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Observações</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {checkpoint.observacoes || "—"}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Evidências do checkpoint</div>
                  <EvidenceList urls={checkpoint.evidencias_urls} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 text-xs text-gray-600">
          Encerramento: ao completar os dias, compare KM/L final vs meta e decida (Tratativa | +X dias | Concluído).
        </div>
      </div>

      {/* ✅ MODAL CHECKPOINT COMPLETO */}
      <CheckpointCompletoModal
        open={checkpointOpen}
        onClose={() => setCheckpointOpen(false)}
        checkpoint={checkpoint}
        acompanhamento={acompanhamento}
      />
    </div>
  );
}

function CardResumo({ titulo, valor, cor, subtitulo = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subtitulo ? <p className="text-xs font-medium mt-1 text-gray-600">{subtitulo}</p> : null}
    </div>
  );
}

export default function DesempenhoDieselAcompanhamento() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [itens, setItens] = useState([]);
  const [metricas, setMetricas] = useState({});
  const [erro, setErro] = useState("");

  const [totalCount, setTotalCount] = useState(0);
  const [aserCount, setAserCount] = useState(0);
  const [emAnaliseCount, setEmAnaliseCount] = useState(0);
  const [aguardandoCount, setAguardandoCount] = useState(0);

  const [filtros, setFiltros] = useState({
    busca: "",
    dataInicio: "",
    dataFim: "",
    status: "",
    ordenacao: "MAIS_RECENTE",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Modal de análise
  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [analiseSelected, setAnaliseSelected] = useState(null);

  function applyCommonFilters(query) {
    const f = filtros;

    if (f.busca) {
      const q = String(f.busca).replaceAll(",", " ");
      query = query.or(
        `motorista_nome.ilike.%${q}%,motorista_chapa.ilike.%${q}%,motivo.ilike.%${q}%`
      );
    }

    if (f.status) query = query.eq("status", f.status);

    if (f.dataInicio) query = query.gte("created_at", f.dataInicio);

    if (f.dataFim) {
      const df = new Date(f.dataFim);
      df.setDate(df.getDate() + 1);
      query = query.lt("created_at", df.toISOString().slice(0, 10));
    }

    return query;
  }

  async function carregarLista() {
    let query = supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select(
        [
          "id",
          "created_at",
          "motorista_chapa",
          "motorista_nome",
          "instrutor_nome",
          "instrutor_login",
          "motivo",
          "status",
          "dias_monitoramento",
          "dt_inicio",
          "dt_inicio_monitoramento",
          "dt_fim_planejado",
          "dt_fim_real",
          "kml_inicial",
          "kml_meta",
          "kml_final",
          "evidencias_urls",
          "metadata",
          "ultimo_evento_em",
          "ultimo_evento_tipo",
          "ultimo_evento_obs",
        ].join(",")
      )
      .limit(100000);

    query = applyCommonFilters(query);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao carregar lista:", error);
      throw error;
    }

    setItens(data || []);
  }

  async function carregarMetricas() {
    const { data, error } = await supabase
      .from("v_diesel_metricas_motorista_ultima")
      .select("chapa, nome, data, km, litros, kml, fonte");

    if (error) {
      console.error("Erro ao carregar métricas:", error);
      setMetricas({});
      return;
    }

    const map = {};
    (data || []).forEach((m) => {
      if (!m?.chapa) return;
      map[String(m.chapa)] = m;
    });
    setMetricas(map);
  }

  async function carregarContadores() {
    let qTotal = supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select("id", { count: "exact", head: true });
    qTotal = applyCommonFilters(qTotal);
    const { count: total } = await qTotal;

    let qAser = supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select("id", { count: "exact", head: true })
      .eq("status", "A_SER_ACOMPANHADO");
    qAser = applyCommonFilters(qAser);
    const { count: aser } = await qAser;

    let qEm = supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select("id", { count: "exact", head: true })
      .eq("status", "EM_ANALISE");
    qEm = applyCommonFilters(qEm);
    const { count: em } = await qEm;

    let qAg = supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select("id", { count: "exact", head: true })
      .eq("status", "AGUARDANDO_ANALISE");
    qAg = applyCommonFilters(qAg);
    const { count: ag } = await qAg;

    setTotalCount(total || 0);
    setAserCount(aser || 0);
    setEmAnaliseCount(em || 0);
    setAguardandoCount(ag || 0);
  }

  async function aplicar() {
    setLoading(true);
    setErro("");

    try {
      await Promise.all([carregarLista(), carregarMetricas(), carregarContadores()]);
    } catch (e) {
      setErro(e?.message || "Erro ao carregar dados.");
      setItens([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    aplicar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limparFiltros() {
    setFiltros({
      busca: "",
      dataInicio: "",
      dataFim: "",
      status: "",
      ordenacao: "MAIS_RECENTE",
    });
    setTimeout(() => aplicar(), 0);
  }

  const listaOrdenada = useMemo(() => {
    const list = (itens || []).slice();

    if (filtros.ordenacao === "MAIS_DIAS") {
      list.sort((a, b) => {
        const da = daysBetween(a.dt_inicio_monitoramento || a.dt_inicio || a.created_at, new Date());
        const db = daysBetween(b.dt_inicio_monitoramento || b.dt_inicio || b.created_at, new Date());
        return db - da;
      });
      return list;
    }

    if (filtros.ordenacao === "PIOR_KML") {
      list.sort((a, b) => {
        const ka = Number(metricas[String(a.motorista_chapa)]?.kml);
        const kb = Number(metricas[String(b.motorista_chapa)]?.kml);
        const va = Number.isFinite(ka) ? ka : 999;
        const vb = Number.isFinite(kb) ? kb : 999;
        return va - vb;
      });
      return list;
    }

    list.sort((a, b) => {
      const ta = new Date(a.ultimo_evento_em || a.created_at || 0).getTime();
      const tb = new Date(b.ultimo_evento_em || b.created_at || 0).getTime();
      return tb - ta;
    });
    return list;
  }, [itens, filtros.ordenacao, metricas]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-700">Desempenho Diesel — Acompanhamento</h1>
          <p className="text-sm text-gray-600">
            Central de lançamentos e monitoramento (10 dias). Registro do instrutor inicia o acompanhamento real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/desempenho-lancamento")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Lançar acompanhamento
          </button>

          <button
            onClick={aplicar}
            disabled={loading}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-60"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {erro ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar (nome, chapa, motivo...)"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="A_SER_ACOMPANHADO">A ser acompanhado</option>
            <option value="EM_ANALISE">Em análise</option>
            <option value="AGUARDANDO_ANALISE">Aguardando análise</option>
            <option value="OK">OK</option>
            <option value="PIOROU_TRATATIVA">Piorou</option>
            <option value="ENCERRADO">Encerrado</option>
          </select>

          <select
            value={filtros.ordenacao}
            onChange={(e) => setFiltros({ ...filtros, ordenacao: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="MAIS_RECENTE">Mais recente</option>
            <option value="MAIS_DIAS">Mais dias</option>
            <option value="PIOR_KML">Pior KM/L</option>
          </select>
        </div>

        <div className="flex justify-end mt-3">
          <button onClick={limparFiltros} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
            Limpar
          </button>

          <button
            onClick={aplicar}
            disabled={loading}
            className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Total" valor={totalCount} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="A ser acompanhado" valor={aserCount} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Em análise" valor={emAnaliseCount} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Aguardando análise" valor={aguardandoCount} cor="bg-orange-100 text-orange-700" />
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Lançado em</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">KM/L</th>
              <th className="py-2 px-3 text-left">Motivo</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Dias</th>
              <th className="py-2 px-3 text-left">Último evento</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : listaOrdenada.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-500">
                  Nenhum acompanhamento encontrado.
                </td>
              </tr>
            ) : (
              listaOrdenada.map((x) => {
                const m = metricas[String(x.motorista_chapa)] || null;

                const inicioRef = x.dt_inicio_monitoramento || x.dt_inicio || x.created_at || null;
                const diasAcomp = inicioRef ? daysBetween(inicioRef, new Date()) : 0;
                const diasPlano = Number(x.dias_monitoramento || 0) || 0;

                const kmlAtual = m?.kml ?? null;
                const kmlMeta = x.kml_meta ?? null;

                const status = String(x.status || "").toUpperCase();
                const podeCheckpoint = status === "A_SER_ACOMPANHADO" || status === "EM_ANALISE";

                return (
                  <tr key={x.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">
                      {x.created_at ? new Date(x.created_at).toLocaleDateString("pt-BR") : "-"}
                    </td>

                    <td className="py-2 px-3 text-gray-700">
                      <div className="font-medium">{x.motorista_nome || "-"}</div>
                      <div className="text-xs text-gray-500">Chapa {x.motorista_chapa || "-"}</div>
                    </td>

                    <td className="py-2 px-3 text-gray-700">
                      <MetricBadge kmlAtual={kmlAtual} kmlMeta={kmlMeta} />
                      {m?.data ? <div className="text-xs text-gray-500 mt-1">Último dia: {m.data}</div> : null}
                    </td>

                    <td className="py-2 px-3 text-gray-700">{x.motivo || "-"}</td>

                    <td className="py-2 px-3">
                      <StatusBadge status={x.status} />
                    </td>

                    <td className="py-2 px-3 text-gray-700">
                      <span className="font-semibold">{diasAcomp}</span>
                      {diasPlano ? <span className="text-gray-500"> / {diasPlano}</span> : null}
                    </td>

                    <td className="py-2 px-3 text-gray-700">
                      {x.ultimo_evento_tipo ? (
                        <div className="text-sm">
                          <div className="font-medium">{x.ultimo_evento_tipo}</div>
                          <div className="text-xs text-gray-500">
                            {x.ultimo_evento_em ? new Date(x.ultimo_evento_em).toLocaleString("pt-BR") : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>

                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        {podeCheckpoint ? (
                          <button
                            onClick={() => navigate(`/desempenho-diesel-checkpoint/${x.id}`)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                          >
                            Lançar acompanhamento
                          </button>
                        ) : null}

                        {status === "AGUARDANDO_ANALISE" ? (
                          <button
                            onClick={() => {
                              setAnaliseSelected(x);
                              setAnaliseOpen(true);
                            }}
                            className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 text-sm"
                          >
                            Analisar
                          </button>
                        ) : null}

                        <button
                          onClick={() => {
                            setSelected(x);
                            setModalOpen(true);
                          }}
                          className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm"
                        >
                          Ver histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <HistoricoModal open={modalOpen} onClose={() => setModalOpen(false)} acompanhamento={selected} />

      {/* ✅ Modal de análise com botão "Ver checkpoint completo" */}
      <AnaliseResumoModal
        open={analiseOpen}
        onClose={() => setAnaliseOpen(false)}
        acompanhamento={analiseSelected}
      />
    </div>
  );
}
