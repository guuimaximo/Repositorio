// src/components/desempenho/AnaliseResumoModal.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import EvidenceList from "./EvidenceList";
import CheckpointCompletoModal from "./CheckpointCompletoModal";

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const base = "inline-flex items-center px-2 py-1 rounded text-xs font-semibold";

  if (s === "OK") return <span className={`${base} bg-green-100 text-green-800`}>OK</span>;
  if (s === "PIOROU_TRATATIVA") return <span className={`${base} bg-red-100 text-red-800`}>Piorou</span>;
  if (s === "ENCERRADO") return <span className={`${base} bg-gray-100 text-gray-800`}>Encerrado</span>;
  if (s === "AGUARDANDO_ANALISE") return <span className={`${base} bg-orange-100 text-orange-800`}>Aguardando análise</span>;
  if (s === "EM_ANALISE") return <span className={`${base} bg-blue-100 text-blue-800`}>Em análise</span>;
  if (s === "A_SER_ACOMPANHADO") return <span className={`${base} bg-yellow-100 text-yellow-800`}>A ser acompanhado</span>;

  return <span className={`${base} bg-gray-100 text-gray-800`}>{s || "—"}</span>;
}

export default function AnaliseResumoModal({ open, onClose, acompanhamento }) {
  const [loading, setLoading] = useState(false);
  const [checkpoint, setCheckpoint] = useState(null);
  const [checkpointOpen, setCheckpointOpen] = useState(false);

  useEffect(() => {
    if (!open || !acompanhamento?.id) return;

    (async () => {
      setLoading(true);
      setCheckpoint(null);

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
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge status={acompanhamento?.status} />
            <span className="text-sm text-gray-700">
              Início monitoramento: <span className="font-semibold">{acompanhamento?.dt_inicio_monitoramento || "—"}</span>
            </span>
            <span className="text-sm text-gray-700">
              Vence em: <span className="font-semibold">{acompanhamento?.dt_fim_planejado || "—"}</span>
            </span>
            <span className="text-sm text-gray-700">
              Motivo: <span className="font-semibold">{acompanhamento?.motivo || "—"}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500">KM/L inicial</div>
              <div className="text-2xl font-bold text-gray-800">{kmlInicial != null ? Number(kmlInicial).toFixed(2) : "—"}</div>
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
              <div className="text-2xl font-bold text-gray-800">{kmlManual != null ? Number(kmlManual).toFixed(2) : "—"}</div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-800 mb-2">O que foi realizado (último CHECKPOINT)</div>

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
                    Instrutor: <span className="font-semibold">{checkpoint.criado_por_nome || checkpoint.criado_por_login || "—"}</span>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setCheckpointOpen(true)}
                    className="bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-black text-sm"
                  >
                    Ver checklist completo
                  </button>
                </div>

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
                          (detalhes.km_acompanhado != null ? ` | ${Number(detalhes.km_acompanhado).toFixed(2)} km` : "")}
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

                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Observações</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{checkpoint.observacoes || "—"}</div>
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

      <CheckpointCompletoModal
        open={checkpointOpen}
        onClose={() => setCheckpointOpen(false)}
        checkpoint={checkpoint}
        acompanhamento={acompanhamento}
      />
    </div>
  );
}
