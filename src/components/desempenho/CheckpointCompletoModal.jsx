// src/components/desempenho/CheckpointCompletoModal.jsx
import React from "react";
import EvidenceList from "./EvidenceList";

export default function CheckpointCompletoModal({ open, onClose, checkpoint, acompanhamento }) {
  if (!open) return null;

  const nome = acompanhamento?.motorista_nome || "—";
  const chapa = acompanhamento?.motorista_chapa || "—";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">Checklist / Checkpoint — Completo</div>
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

              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-700 mb-1">Observações</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{checkpoint.observacoes || "—"}</div>
              </div>

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
                    Ver dados completos (extra)
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
          Registro completo do último CHECKPOINT.
        </div>
      </div>
    </div>
  );
}
