// src/pages/DesempenhoDieselAcompanhamento.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

import HistoricoModal from "../components/desempenho/HistoricoModal";
import AnaliseResumoModal from "../components/desempenho/AnaliseResumoModal";

/* ===========================
   Helpers
=========================== */
function daysBetween(a, b) {
  try {
    const da = new Date(a);
    const db = b instanceof Date ? b : new Date(b);
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
  if (s === "AGUARDANDO_ANALISE") return <span className={`${base} bg-orange-100 text-orange-800`}>Aguardando análise</span>;
  if (s === "EM_ANALISE") return <span className={`${base} bg-blue-100 text-blue-800`}>Em análise</span>;
  if (s === "A_SER_ACOMPANHADO") return <span className={`${base} bg-yellow-100 text-yellow-800`}>A ser acompanhado</span>;

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

function CardResumo({ titulo, valor, cor, subtitulo = null }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
      {subtitulo ? <p className="text-xs font-medium mt-1 text-gray-600">{subtitulo}</p> : null}
    </div>
  );
}

/* ===========================
   Storage helpers (NOVO)
   - A tela NÃO chama prontuário pelo backend; ela abre o arquivo do BUCKET via Signed URL
=========================== */
const DEFAULT_BUCKET = "ordens_acompanhamento";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 min

async function getSignedUrl(bucket, path) {
  if (!bucket || !path) return null;

  // remove barras iniciais
  const cleanPath = String(path).replace(/^\/+/, "");

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data?.signedUrl || null;
}

/* ===========================
   Page
=========================== */
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

  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [analiseSelected, setAnaliseSelected] = useState(null);

  function applyCommonFilters(query) {
    const f = filtros;

    if (f.busca) {
      const q = String(f.busca).replaceAll(",", " ");
      query = query.or(`motorista_nome.ilike.%${q}%,motorista_chapa.ilike.%${q}%,motivo.ilike.%${q}%`);
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

          // ✅ NOVO: campos da Ordem no bucket
          "ordem_bucket",
          "ordem_path",
          "ordem_mime",
          "ordem_tamanho_bytes",
          "ordem_gerada_em",
        ].join(",")
      )
      .limit(100000);

    query = applyCommonFilters(query);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    setItens(data || []);
  }

  async function carregarMetricas() {
    const { data, error } = await supabase
      .from("v_diesel_metricas_motorista_ultima")
      .select("chapa, nome, data, km, litros, kml, fonte");

    if (error) {
      console.error(error);
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
    let qTotal = supabase.from("v_diesel_acompanhamentos_resumo").select("id", { count: "exact", head: true });
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
      console.error(e);
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
    setFiltros({ busca: "", dataInicio: "", dataFim: "", status: "", ordenacao: "MAIS_RECENTE" });
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

  // ✅ NOVO: abrir arquivo da ordem via bucket (Signed URL)
  async function abrirOrdemAcompanhamento(item) {
    try {
      const bucket = item?.ordem_bucket || DEFAULT_BUCKET;
      const path = item?.ordem_path;

      if (!path) {
        setErro("Este acompanhamento ainda não possui Ordem gerada no bucket.");
        return;
      }

      const signedUrl = await getSignedUrl(bucket, path);
      if (!signedUrl) {
        setErro("Não foi possível gerar link assinado do arquivo.");
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      setErro(e?.message || "Erro ao abrir arquivo do bucket.");
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-700">Desempenho Diesel — Acompanhamento</h1>
          <p className="text-sm text-gray-600">
            Central de lançamentos e monitoramento. Aqui você consulta a Ordem no bucket (arquivo gerado).
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

      {erro ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div> : null}

      {/* Filtros */}
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

      {/* Resumos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardResumo titulo="Total" valor={totalCount} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="A ser acompanhado" valor={aserCount} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Em análise" valor={emAnaliseCount} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Aguardando análise" valor={aguardandoCount} cor="bg-orange-100 text-orange-700" />
      </div>

      {/* Tabela */}
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

                // ✅ regra: EM_ANALISE NÃO pode lançar checkpoint
                const podeCheckpoint = status === "A_SER_ACOMPANHADO";
                const podeAnalise = status === "EM_ANALISE";
                const podeAnalisar = status === "AGUARDANDO_ANALISE";

                const temOrdem = Boolean(x?.ordem_path);

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
                        {/* ✅ NOVO: abrir a ordem do bucket */}
                        <button
                          onClick={() => abrirOrdemAcompanhamento(x)}
                          disabled={!temOrdem}
                          className={`px-3 py-1 rounded-md text-sm ${
                            temOrdem
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                          title={temOrdem ? "Abrir ordem (bucket)" : "Sem ordem gerada"}
                        >
                          Ver ordem
                        </button>

                        {podeCheckpoint ? (
                          <button
                            onClick={() => navigate(`/desempenho-diesel-checkpoint/${x.id}`)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                          >
                            Lançar acompanhamento
                          </button>
                        ) : null}

                        {podeAnalise ? (
                          <button
                            onClick={() => {
                              setAnaliseSelected(x);
                              setAnaliseOpen(true);
                            }}
                            className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-sm"
                          >
                            Análise
                          </button>
                        ) : null}

                        {podeAnalisar ? (
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

                      {/* detalhe opcional do arquivo */}
                      {temOrdem ? (
                        <div className="mt-2 text-[11px] text-gray-500">
                          Arquivo: <span className="font-mono">{String(x.ordem_path).split("/").pop()}</span>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ “estrutura” final: os modais moram aqui */}
      <HistoricoModal open={modalOpen} onClose={() => setModalOpen(false)} acompanhamento={selected} />
      <AnaliseResumoModal open={analiseOpen} onClose={() => setAnaliseOpen(false)} acompanhamento={analiseSelected} />
    </div>
  );
}
