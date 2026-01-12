// src/pages/DesempenhoDieselAcompanhamento.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

/**
 * Tela: Acompanhamento (monitoramento ativo)
 * - Lista casos de diesel_acompanhamentos (preferindo a view v_diesel_acompanhamentos_resumo)
 * - Mostra: motorista, linha/cluster (via metadata), prefixo (via metadata), kml atual (via view v_diesel_metricas_motorista_ultima),
 *   meta, dias acompanhados, status visual.
 * - Ações: Ver histórico (modal) / Avaliar evolução (placeholder por enquanto)
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
  if (s === "OK")
    return <span className={`${base} bg-green-100 text-green-800`}>🟢 OK</span>;
  if (s === "PIOROU_TRATATIVA")
    return <span className={`${base} bg-red-100 text-red-800`}>🔴 Piorou</span>;
  if (s === "ENCERRADO")
    return <span className={`${base} bg-gray-100 text-gray-800`}>⚪ Encerrado</span>;
  return <span className={`${base} bg-yellow-100 text-yellow-800`}>🟡 Em acompanhamento</span>;
}

function MetricBadge({ kmlAtual, kmlMeta }) {
  const kml = Number(kmlAtual);
  const meta = Number(kmlMeta);

  const hasKml = Number.isFinite(kml);
  const hasMeta = Number.isFinite(meta);

  if (!hasKml && !hasMeta) {
    return <span className="text-xs text-gray-500">KM/L: —</span>;
  }

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
      <span className={`font-semibold ${ok ? "text-green-700" : "text-red-700"}`}>
        {kml.toFixed(2)}
      </span>{" "}
      <span className="text-gray-500">| Meta: ≥ {meta.toFixed(2)}</span>
    </span>
  );
}

function EvidenceList({ urls }) {
  const list = Array.isArray(urls) ? urls : [];
  if (list.length === 0) return <span className="text-sm text-gray-500">Sem evidências</span>;

  return (
    <div className="space-y-1">
      {list.map((u, idx) => (
        <div key={`${u}-${idx}`} className="text-sm">
          <a
            href={u}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {u}
          </a>
        </div>
      ))}
    </div>
  );
}

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
          "id, created_at, tipo, observacoes, evidencias_urls, km, litros, kml, periodo_inicio, periodo_fim, criado_por_nome, criado_por_login"
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
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* Cabeçalho do caso */}
          <div className="border rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={acompanhamento?.status} />
                <span className="text-sm text-gray-700">
                  Início:{" "}
                  <span className="font-semibold">{acompanhamento?.dt_inicio || "—"}</span>
                </span>
                <span className="text-sm text-gray-700">
                  Fim planejado:{" "}
                  <span className="font-semibold">{acompanhamento?.dt_fim_planejado || "—"}</span>
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Motivo: <span className="font-semibold">{acompanhamento?.motivo || "—"}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-gray-800 mb-1">Evidências do lançamento</div>
              <EvidenceList urls={acompanhamento?.evidencias_urls} />
            </div>
          </div>

          {/* Timeline */}
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
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                        {e.tipo}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Registrado por:{" "}
                      <span className="font-semibold">
                        {e.criado_por_nome || e.criado_por_login || "—"}
                      </span>
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
                      Período:{" "}
                      <span className="font-semibold">{e.periodo_inicio || "—"}</span> até{" "}
                      <span className="font-semibold">{e.periodo_fim || "—"}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Evidências</div>
                    <EvidenceList urls={e.evidencias_urls} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 text-xs text-gray-600">
          Observação: a Tratativa vai herdar este histórico + evidências quando o caso for escalonado.
        </div>
      </div>
    </div>
  );
}

export default function DesempenhoDieselAcompanhamento() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState([]);
  const [metricas, setMetricas] = useState({}); // chapa -> {kml,data,km,litros}
  const [erro, setErro] = useState("");

  // filtros
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("ACOMPANHAMENTO"); // default: só ativos
  const [ordenacao, setOrdenacao] = useState("MAIS_RECENTE"); // MAIS_RECENTE | MAIS_DIAS | PIOR_KML

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  async function carregar() {
    setLoading(true);
    setErro("");

    // 1) Casos (preferir view)
    const { data: casos, error: errCasos } = await supabase
      .from("v_diesel_acompanhamentos_resumo")
      .select(
        "id, motorista_chapa, motorista_nome, instrutor_nome, instrutor_login, motivo, status, dias_monitoramento, dt_inicio, dt_fim_planejado, dt_fim_real, kml_inicial, kml_meta, kml_final, evidencias_urls, metadata, ultimo_evento_em, ultimo_evento_tipo, ultimo_evento_obs"
      )
      .order("created_at", { ascending: false });

    if (errCasos) {
      console.error(errCasos);
      setErro(errCasos.message || "Erro ao carregar acompanhamentos.");
      setItens([]);
      setLoading(false);
      return;
    }

    const lista = casos || [];
    setItens(lista);

    // 2) Métrica mais recente por motorista (para KM/L atual)
    const { data: ult, error: errUlt } = await supabase
      .from("v_diesel_metricas_motorista_ultima")
      .select("chapa, nome, data, km, litros, kml, fonte");

    if (errUlt) {
      console.error(errUlt);
      // não trava a tela
      setMetricas({});
      setLoading(false);
      return;
    }

    const map = {};
    (ult || []).forEach((m) => {
      if (!m?.chapa) return;
      map[String(m.chapa)] = m;
    });
    setMetricas(map);

    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = String(busca || "").trim().toLowerCase();

    let list = (itens || []).slice();

    if (status !== "TODOS") {
      list = list.filter((x) => String(x.status || "").toUpperCase() === status);
    }

    if (q) {
      list = list.filter((x) => {
        const chapa = String(x.motorista_chapa || "").toLowerCase();
        const nome = String(x.motorista_nome || "").toLowerCase();
        const motivo = String(x.motivo || "").toLowerCase();
        const meta = x.metadata || {};
        const linha = String(meta.linha || meta.linha_desc || "").toLowerCase();
        const cluster = String(meta.cluster || "").toLowerCase();
        const prefixo = String(meta.prefixo || "").toLowerCase();
        return (
          chapa.includes(q) ||
          nome.includes(q) ||
          motivo.includes(q) ||
          linha.includes(q) ||
          cluster.includes(q) ||
          prefixo.includes(q)
        );
      });
    }

    // ordenação
    if (ordenacao === "MAIS_DIAS") {
      list.sort((a, b) => {
        const da = daysBetween(a.dt_inicio, new Date());
        const db = daysBetween(b.dt_inicio, new Date());
        return db - da;
      });
    } else if (ordenacao === "PIOR_KML") {
      list.sort((a, b) => {
        const ka = Number(metricas[String(a.motorista_chapa)]?.kml);
        const kb = Number(metricas[String(b.motorista_chapa)]?.kml);
        const va = Number.isFinite(ka) ? ka : 999;
        const vb = Number.isFinite(kb) ? kb : 999;
        return va - vb;
      });
    } else {
      // MAIS_RECENTE
      list.sort((a, b) => {
        const ta = new Date(a.ultimo_evento_em || a.created_at || 0).getTime();
        const tb = new Date(b.ultimo_evento_em || b.created_at || 0).getTime();
        return tb - ta;
      });
    }

    return list;
  }, [itens, busca, status, ordenacao, metricas]);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Desempenho Diesel — Acompanhamento</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitoramento ativo com indicadores, meta e histórico. Ao escalar, nada se perde.
          </p>
        </div>

        <button
          onClick={carregar}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Motorista, chapa, linha, cluster, prefixo, motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACOMPANHAMENTO">Em acompanhamento</option>
              <option value="OK">OK</option>
              <option value="PIOROU_TRATATIVA">Piorou</option>
              <option value="ENCERRADO">Encerrado</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ordenar</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
            >
              <option value="MAIS_RECENTE">Mais recente</option>
              <option value="MAIS_DIAS">Mais dias acompanhados</option>
              <option value="PIOR_KML">Pior KM/L</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {erro ? (
          <div className="text-sm text-red-700">{erro}</div>
        ) : loading ? (
          <div className="text-sm text-gray-600">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhum motorista encontrado para os filtros selecionados.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((x) => {
              const meta = x.metadata || {};
              const linha = meta.linha || meta.linha_desc || "—";
              const cluster = meta.cluster || "—";
              const prefixo = meta.prefixo || "—";

              const m = metricas[String(x.motorista_chapa)] || null;

              const diasAcomp = daysBetween(x.dt_inicio, new Date());
              const diasPlano = Number(x.dias_monitoramento || 0) || 0;

              const kmlAtual = m?.kml ?? null;
              const kmlMeta = x.kml_meta ?? null;

              return (
                <div key={x.id} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold truncate">
                        {x.motorista_nome || "—"}{" "}
                        <span className="text-sm text-gray-500 font-medium">
                          — Chapa {x.motorista_chapa || "—"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Linha: <span className="font-semibold">{linha}</span>
                        </span>
                        <span>
                          Cluster: <span className="font-semibold">{cluster}</span>
                        </span>
                        <span>
                          Prefixo: <span className="font-semibold">{prefixo}</span>
                        </span>
                      </div>

                      <div className="mt-2">
                        <MetricBadge kmlAtual={kmlAtual} kmlMeta={kmlMeta} />
                        {m?.data && (
                          <span className="ml-2 text-xs text-gray-500">
                            (último dia: {m.data})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={x.status} />
                      <div className="text-xs text-gray-600">
                        Dias:{" "}
                        <span className="font-semibold">
                          {diasAcomp}
                        </span>
                        {diasPlano ? (
                          <span className="text-gray-500"> / {diasPlano}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-700">
                    Motivo: <span className="font-semibold">{x.motivo || "—"}</span>
                  </div>

                  {x.ultimo_evento_tipo && (
                    <div className="mt-2 text-xs text-gray-600">
                      Último evento:{" "}
                      <span className="font-semibold">{x.ultimo_evento_tipo}</span>
                      {x.ultimo_evento_em ? (
                        <span className="text-gray-500"> — {new Date(x.ultimo_evento_em).toLocaleString()}</span>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                      onClick={() => {
                        setSelected(x);
                        setModalOpen(true);
                      }}
                    >
                      Ver histórico
                    </button>

                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      onClick={() => {
                        // Próximo passo: criar a tela de avaliação (PAGE 3)
                        alert("Próximo passo: tela de Avaliação de Evolução (Melhorou / Manteve / Piorou).");
                      }}
                    >
                      Avaliar evolução
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <HistoricoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        acompanhamento={selected}
      />
    </div>
  );
}
