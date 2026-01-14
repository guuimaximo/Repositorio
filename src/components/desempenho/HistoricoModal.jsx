// src/components/desempenho/HistoricoModal.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import EvidenceList from "./EvidenceList";

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

export default function HistoricoModal({ open, onClose, acompanhamento }) {
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
                  Início monitoramento: <span className="font-semibold">{acompanhamento?.dt_inicio_monitoramento || "—"}</span>
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
                      Registrado por: <span className="font-semibold">{e.criado_por_nome || e.criado_por_login || "—"}</span>
                    </div>
                  </div>

                  {e.observacoes && <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{e.observacoes}</div>}

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
