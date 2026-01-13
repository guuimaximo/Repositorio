// src/pages/DesempenhoDieselCheckpoint.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

function toISODate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDaysISO(dateISO, days) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function filesToList(files) {
  if (!files?.length) return [];
  return Array.from(files).map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
    lastModified: f.lastModified,
    file: f,
  }));
}

function dedupeFiles(list) {
  const seen = new Set();
  return (list || []).filter((x) => {
    const k = `${x.name}__${x.size}__${x.lastModified}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function uploadManyToStorage({ files, bucket, folder }) {
  if (!files?.length) return [];
  const out = [];
  const ts = Date.now();

  for (let i = 0; i < files.length; i++) {
    const f = files[i]?.file;
    if (!f) continue;

    const safeName = String(f.name || `arquivo_${i}`)
      .replaceAll(" ", "_")
      .replace(/[^\w.\-()]/g, "");

    const path = `${folder}/${ts}_${i}_${safeName}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, {
      upsert: false,
      cacheControl: "3600",
      contentType: f.type || undefined,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    out.push({ path, publicUrl: pub?.publicUrl || null });
  }

  return out;
}

function EvidenceList({ list, onRemove }) {
  const arr = Array.isArray(list) ? list : [];
  if (arr.length === 0) return null;

  return (
    <div className="mt-2 border rounded-md">
      {arr.map((f, idx) => (
        <div
          key={`${f.name}-${idx}`}
          className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
            <div className="text-xs text-gray-500">
              {(f.type || "arquivo")} • {(f.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() => onRemove(idx)}
          >
            remover
          </button>
        </div>
      ))}
    </div>
  );
}

/* ===========================
   Checklist OK/NOK dinâmico
=========================== */

function groupItems(items) {
  const g = {};
  (items || []).forEach((it) => {
    const grupo = it.grupo || "GERAL";
    if (!g[grupo]) g[grupo] = [];
    g[grupo].push(it);
  });

  Object.keys(g).forEach((k) => {
    g[k].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  });

  return g;
}

function OkNokToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`px-3 py-1 rounded-md text-xs font-semibold border ${
          value === true ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700"
        }`}
        onClick={() => onChange(true)}
      >
        OK
      </button>

      <button
        type="button"
        className={`px-3 py-1 rounded-md text-xs font-semibold border ${
          value === false ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700"
        }`}
        onClick={() => onChange(false)}
      >
        NOK
      </button>
    </div>
  );
}

/* ===========================
   Helpers para resumo (horas/km)
=========================== */

function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":");
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function minutesToHoursStr(mins) {
  if (!Number.isFinite(mins) || mins < 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ✅ NOVO: nome amigável do link
function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const p = u.pathname || "";
    const last = p.split("/").pop() || url;
    return decodeURIComponent(last).slice(0, 80);
  } catch {
    const parts = String(url || "").split("/");
    return parts[parts.length - 1] || String(url || "");
  }
}

function PublicUrlList({ title, urls }) {
  const arr = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (arr.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="border rounded-md bg-white">
        {arr.map((u, idx) => (
          <div key={`${u}-${idx}`} className="px-3 py-2 border-b last:border-b-0">
            <a
              href={u}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700 hover:underline break-all"
            >
              {filenameFromUrl(u)}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesempenhoDieselCheckpoint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth ? useAuth() : { user: null };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [acomp, setAcomp] = useState(null);

  const [itensChecklist, setItensChecklist] = useState([]);
  const [respostasChecklist, setRespostasChecklist] = useState({});

  // Observações e evidências (checkpoint)
  const [observacoes, setObservacoes] = useState("");
  const [evidencias, setEvidencias] = useState([]);

  // ✅ Detalhes do acompanhamento (data/hora/km)
  const [detalhes, setDetalhes] = useState({
    data_acompanhamento: "",
    hora_inicial: "",
    hora_final: "",
    km_inicial: "",
    km_final: "",
  });

  // KM/L durante o teste (período)
  const [periodo, setPeriodo] = useState({
    km_total: null,
    litros_total: null,
    kml_periodo: null,
    dias: 0,
    data_inicio: null,
    data_fim: null,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrMsg("");
      setOkMsg("");

      try {
        if (!id) throw new Error("ID inválido.");

        const { data, error } = await supabase
          .from("diesel_acompanhamentos")
          .select(
            [
              "id",
              "created_at",
              "motorista_chapa",
              "motorista_nome",
              "motivo",
              "status",
              "dias_monitoramento",
              "dt_inicio",
              "dt_inicio_monitoramento",
              "dt_fim_planejado",
              "dt_fim_real",
              "instrutor_nome",
              "instrutor_login",
              "metadata",
              "kml_meta",

              // ✅ NOVO: origem do lançamento
              "kml_inicial",
              "observacao_inicial",
              "evidencias_urls",

              // campos do detalhe
              "data_acompanhamento",
              "hora_inicial",
              "hora_final",
              "km_inicial",
              "km_final",
            ].join(",")
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setAcomp(data || null);

        setDetalhes({
          data_acompanhamento: data?.data_acompanhamento || "",
          hora_inicial: data?.hora_inicial || "",
          hora_final: data?.hora_final || "",
          km_inicial: data?.km_inicial != null ? String(data.km_inicial) : "",
          km_final: data?.km_final != null ? String(data.km_final) : "",
        });

        const itens = await supabase
          .from("diesel_checklist_itens")
          .select("id, grupo, ordem, codigo, descricao, ajuda, ativo")
          .eq("ativo", true)
          .order("grupo", { ascending: true })
          .order("ordem", { ascending: true });

        if (itens.error) throw itens.error;
        setItensChecklist(itens.data || []);
        setRespostasChecklist({});
      } catch (e) {
        console.error(e);
        setErrMsg(e?.message || "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // KM/L durante o teste (período)
  useEffect(() => {
    if (!acomp?.motorista_chapa) return;

    (async () => {
      try {
        const inicioISO =
          acomp.dt_inicio_monitoramento ||
          acomp.dt_inicio ||
          (acomp.created_at ? String(acomp.created_at).slice(0, 10) : null) ||
          null;

        const fimISO = acomp.dt_fim_real || toISODate();
        if (!inicioISO || !fimISO) {
          setPeriodo({
            km_total: null,
            litros_total: null,
            kml_periodo: null,
            dias: 0,
            data_inicio: inicioISO,
            data_fim: fimISO,
          });
          return;
        }

        const { data, error } = await supabase
          .from("diesel_metricas_motorista_dia")
          .select("data, km, litros")
          .eq("chapa", String(acomp.motorista_chapa))
          .gte("data", inicioISO)
          .lte("data", fimISO)
          .order("data", { ascending: true });

        if (error) throw error;

        const rows = data || [];
        const kmTotal = rows.reduce((acc, r) => acc + (Number(r.km) || 0), 0);
        const litrosTotal = rows.reduce((acc, r) => acc + (Number(r.litros) || 0), 0);
        const kmlPeriodo = litrosTotal > 0 ? kmTotal / litrosTotal : null;

        setPeriodo({
          km_total: kmTotal,
          litros_total: litrosTotal,
          kml_periodo: kmlPeriodo,
          dias: rows.length,
          data_inicio: inicioISO,
          data_fim: fimISO,
        });
      } catch (e) {
        console.error("Erro ao calcular KM/L do período:", e);
        setPeriodo({
          km_total: null,
          litros_total: null,
          kml_periodo: null,
          dias: 0,
          data_inicio: null,
          data_fim: null,
        });
      }
    })();
  }, [
    acomp?.motorista_chapa,
    acomp?.dt_inicio_monitoramento,
    acomp?.dt_inicio,
    acomp?.dt_fim_real,
    acomp?.created_at,
  ]);

  function addFiles(e) {
    const list = filesToList(e.target.files);
    setEvidencias((prev) => dedupeFiles([...(prev || []), ...list]));
    e.target.value = "";
  }

  function removeFile(idx) {
    setEvidencias((prev) => prev.filter((_, i) => i !== idx));
  }

  const checklistResumo = useMemo(() => {
    const total = (itensChecklist || []).length;
    const ok = Object.values(respostasChecklist || {}).filter((v) => v === true).length;
    return `${ok}/${total}`;
  }, [respostasChecklist, itensChecklist]);

  const faltandoResponder = useMemo(() => {
    const total = (itensChecklist || []).length;
    if (!total) return 0;
    const responded = (itensChecklist || []).filter((it) => {
      const v = respostasChecklist?.[it.codigo];
      return v === true || v === false;
    }).length;
    return Math.max(0, total - responded);
  }, [itensChecklist, respostasChecklist]);

  const pronto = useMemo(() => {
    if (!acomp?.id) return false;
    if (!String(observacoes || "").trim()) return false;
    if ((evidencias || []).length === 0) return false;
    if ((itensChecklist || []).length > 0 && faltandoResponder > 0) return false;
    return true;
  }, [acomp?.id, observacoes, evidencias, itensChecklist, faltandoResponder]);

  const itensPorGrupo = useMemo(() => groupItems(itensChecklist), [itensChecklist]);

  const resumoDetalhes = useMemo(() => {
    const iniMin = parseTimeToMinutes(detalhes.hora_inicial);
    const fimMin = parseTimeToMinutes(detalhes.hora_final);

    let minutos = null;
    if (iniMin != null && fimMin != null) {
      minutos = fimMin >= iniMin ? fimMin - iniMin : fimMin + 24 * 60 - iniMin;
    }

    const kmIni = detalhes.km_inicial !== "" ? Number(detalhes.km_inicial) : null;
    const kmFim = detalhes.km_final !== "" ? Number(detalhes.km_final) : null;
    const kmAcomp = kmIni != null && kmFim != null ? kmFim - kmIni : null;

    return {
      minutos,
      horasStr: minutos != null ? minutesToHoursStr(minutos) : "—",
      kmAcomp: kmAcomp != null && Number.isFinite(kmAcomp) ? kmAcomp : null,
    };
  }, [detalhes.hora_inicial, detalhes.hora_final, detalhes.km_inicial, detalhes.km_final]);

  async function salvarCheckpoint() {
    if (!pronto || saving) return;

    setSaving(true);
    setErrMsg("");
    setOkMsg("");

    try {
      if (!acomp?.id) throw new Error("Acompanhamento inválido.");

      const instrutorLogin = user?.login || user?.email || null;
      const instrutorNome = user?.nome || null;
      const instrutorId = isUuid(user?.id) ? user.id : null;

      const folder = `diesel/acompanhamentos/${acomp.motorista_chapa || "sem_chapa"}/checkpoint_${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidencias,
        bucket: "diesel",
        folder,
      });
      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);

      const hoje = toISODate();
      const diasMonitoramento = Number(acomp.dias_monitoramento || 10) || 10;

      const isPrimeiro = !acomp.dt_inicio_monitoramento;
      const dtInicioMon = isPrimeiro ? hoje : acomp.dt_inicio_monitoramento;
      const dtFimPlan = isPrimeiro ? addDaysISO(hoje, diasMonitoramento) : acomp.dt_fim_planejado;

      const payloadEvento = {
        acompanhamento_id: acomp.id,
        tipo: "CHECKPOINT",
        observacoes: `Checklist (OK/NOK): ${checklistResumo}\n\n${String(observacoes || "").trim()}`,
        evidencias_urls: evidenciasUrls,
        criado_por_login: instrutorLogin,
        criado_por_nome: instrutorNome,
        criado_por_id: instrutorId,
        extra: {
          checklist_oknok: true,
          checklist_resumo: checklistResumo,
          checklist_faltando: faltandoResponder,
          detalhes_acompanhamento: {
            data_acompanhamento: detalhes.data_acompanhamento || null,
            hora_inicial: detalhes.hora_inicial || null,
            hora_final: detalhes.hora_final || null,
            km_inicial: detalhes.km_inicial !== "" ? Number(detalhes.km_inicial) : null,
            km_final: detalhes.km_final !== "" ? Number(detalhes.km_final) : null,
            horas_acompanhadas_min: resumoDetalhes.minutos,
            km_acompanhado: resumoDetalhes.kmAcomp,
            kml_durante_teste: periodo.kml_periodo,
          },
        },
      };

      const { data: evtData, error: eEvt } = await supabase
        .from("diesel_acompanhamento_eventos")
        .insert(payloadEvento)
        .select("id")
        .single();
      if (eEvt) throw eEvt;

      const payloadChecklist = {
        acompanhamento_id: acomp.id,
        evento_id: evtData?.id || null,
        criado_por_login: instrutorLogin,
        criado_por_nome: instrutorNome,
        criado_por_id: instrutorId,
        versao: 1,
        respostas: respostasChecklist || {},
        observacoes: String(observacoes || "").trim(),
        resumo: checklistResumo,
      };

      const { error: eChk } = await supabase.from("diesel_checklist_respostas").insert(payloadChecklist);
      if (eChk) throw eChk;

      const payloadUpdate = {
        status: "EM_ANALISE",
        instrutor_login: instrutorLogin,
        instrutor_nome: instrutorNome,
        instrutor_id: instrutorId,

        dt_inicio_monitoramento: dtInicioMon,
        dt_fim_planejado: dtFimPlan,

        data_acompanhamento: detalhes.data_acompanhamento || null,
        hora_inicial: detalhes.hora_inicial || null,
        hora_final: detalhes.hora_final || null,
        km_inicial: detalhes.km_inicial !== "" ? Number(detalhes.km_inicial) : null,
        km_final: detalhes.km_final !== "" ? Number(detalhes.km_final) : null,

        metadata: {
          ...(acomp.metadata || {}),
          ultimo_checklist_resumo: checklistResumo,
          ultimo_checkpoint_em: new Date().toISOString(),
        },
      };

      const { error: eUp } = await supabase.from("diesel_acompanhamentos").update(payloadUpdate).eq("id", acomp.id);
      if (eUp) throw eUp;

      setOkMsg(isPrimeiro ? "Checkpoint salvo. Monitoramento iniciado." : "Checkpoint salvo.");
      setTimeout(() => navigate("/desempenho-diesel-acompanhamento"), 300);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "Erro ao salvar checkpoint.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!acomp) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errMsg || "Acompanhamento não encontrado."}
        </div>
        <button
          className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={() => navigate("/desempenho-diesel-acompanhamento")}
        >
          Voltar
        </button>
      </div>
    );
  }

  const meta = acomp?.kml_meta;
  const kmlInicialLancado = acomp?.kml_inicial; // ✅ NOVO
  const obsInicialLancada = acomp?.observacao_inicial; // ✅ NOVO
  const evidLancamento = Array.isArray(acomp?.evidencias_urls) ? acomp.evidencias_urls : []; // ✅ NOVO

  const prefixo = acomp?.metadata?.prefixo || "—";
  const linha = acomp?.metadata?.linha || "—";
  const cluster = acomp?.metadata?.cluster || "—";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Checkpoint do Instrutor</h1>
          <p className="text-sm text-gray-600 mt-1">
            Preencha o checklist (OK/NOK), adicione evidências e salve o acompanhamento.
          </p>
        </div>
        <button
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={() => navigate("/desempenho-diesel-acompanhamento")}
          disabled={saving}
        >
          Voltar
        </button>
      </div>

      {errMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errMsg}</div>
      )}

      {okMsg && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{okMsg}</div>
      )}

      {/* Resumo do caso */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500">Motorista</div>
            <div className="font-semibold text-gray-800">{acomp.motorista_nome || "—"}</div>
            <div className="text-xs text-gray-500">Chapa {acomp.motorista_chapa || "—"}</div>

            {/* ✅ NOVO: KM/L inicial do lançamento */}
            <div className="mt-2 text-xs text-gray-500">KM/L inicial (lançamento)</div>
            <div className="text-sm font-semibold text-gray-800">
              {kmlInicialLancado != null ? Number(kmlInicialLancado).toFixed(2) : "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Operação</div>
            <div className="text-sm text-gray-800">
              Prefixo: <span className="font-semibold">{prefixo}</span>
            </div>
            <div className="text-sm text-gray-800">
              Linha: <span className="font-semibold">{linha}</span>
            </div>
            <div className="text-sm text-gray-800">
              Cluster: <span className="font-semibold">{cluster}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Monitoramento</div>
            <div className="text-sm text-gray-800">
              Dias: <span className="font-semibold">{acomp.dias_monitoramento || 10}</span>
            </div>
            <div className="text-sm text-gray-800">
              Início: <span className="font-semibold">{acomp.dt_inicio_monitoramento || "—"}</span>
            </div>
            <div className="text-sm text-gray-800">
              Vence: <span className="font-semibold">{acomp.dt_fim_planejado || "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-700">
          Motivo: <span className="font-semibold">{acomp.motivo || "—"}</span>
          {meta != null ? (
            <span className="ml-3 text-gray-500">
              Meta: <span className="font-semibold">≥ {Number(meta).toFixed(2)}</span>
            </span>
          ) : null}
        </div>

        {/* ✅ NOVO: Observação inicial do lançamento (quando existir) */}
        {String(obsInicialLancada || "").trim() ? (
          <div className="mt-3 rounded-md border bg-gray-50 p-3">
            <div className="text-xs text-gray-500 mb-1">Observação inicial (lançamento)</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {String(obsInicialLancada || "").trim()}
            </div>
          </div>
        ) : null}

        {/* ✅ NOVO: Evidências do lançamento */}
        <PublicUrlList title="Evidências do lançamento" urls={evidLancamento} />
      </div>

      {/* Checklist (OK/NOK) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Checklist (OK/NOK)</h2>
          <div className="text-xs text-gray-600">
            OKs: <span className="font-semibold">{checklistResumo}</span>
            {faltandoResponder > 0 ? (
              <span className="ml-2 text-red-600">Faltam {faltandoResponder}</span>
            ) : (
              <span className="ml-2 text-green-700">Completo</span>
            )}
          </div>
        </div>

        {itensChecklist.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">
            Nenhum item ativo no checklist. Cadastre em <code>diesel_checklist_itens</code>.
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {Object.keys(itensPorGrupo).map((grupo) => (
              <div key={grupo} className="border rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-800 mb-3">{grupo}</div>

                <div className="space-y-3">
                  {itensPorGrupo[grupo].map((it) => {
                    const val = respostasChecklist?.[it.codigo];
                    return (
                      <div
                        key={it.codigo}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-800">
                            <span className="font-semibold">{it.ordem}.</span> {it.descricao}
                          </div>
                          {it.ajuda ? <div className="text-xs text-gray-500 mt-1">{it.ajuda}</div> : null}
                        </div>

                        <OkNokToggle
                          value={val}
                          onChange={(next) =>
                            setRespostasChecklist((prev) => ({ ...(prev || {}), [it.codigo]: next }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detalhes do acompanhamento */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Detalhes do acompanhamento</h2>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Data do acompanhamento</div>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={detalhes.data_acompanhamento}
              onChange={(e) => setDetalhes((p) => ({ ...p, data_acompanhamento: e.target.value }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Hora inicial</div>
            <input
              type="time"
              className="w-full rounded-md border px-3 py-2"
              value={detalhes.hora_inicial}
              onChange={(e) => setDetalhes((p) => ({ ...p, hora_inicial: e.target.value }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Hora final</div>
            <input
              type="time"
              className="w-full rounded-md border px-3 py-2"
              value={detalhes.hora_final}
              onChange={(e) => setDetalhes((p) => ({ ...p, hora_final: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">KM inicial</div>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              value={detalhes.km_inicial}
              onChange={(e) => setDetalhes((p) => ({ ...p, km_inicial: e.target.value }))}
              placeholder="Ex.: 12345,67"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">KM final</div>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              value={detalhes.km_final}
              onChange={(e) => setDetalhes((p) => ({ ...p, km_final: e.target.value }))}
              placeholder="Ex.: 12480,10"
            />
          </div>
        </div>

        <div className="mt-4 border rounded-lg p-3 bg-gray-50">
          <div className="text-sm font-semibold text-gray-800 mb-2">Resumo</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded-md p-3 bg-white">
              <div className="text-xs text-gray-500">Horas acompanhadas</div>
              <div className="text-lg font-bold text-gray-800">{resumoDetalhes.horasStr}</div>
            </div>

            <div className="border rounded-md p-3 bg-white">
              <div className="text-xs text-gray-500">KM acompanhado</div>
              <div className="text-lg font-bold text-gray-800">
                {resumoDetalhes.kmAcomp != null ? resumoDetalhes.kmAcomp.toFixed(2) : "—"}
              </div>
            </div>

            <div className="border rounded-md p-3 bg-white">
              <div className="text-xs text-gray-500">KM/L durante o teste</div>
              <div className="text-lg font-bold text-gray-800">
                {periodo.kml_periodo != null ? Number(periodo.kml_periodo).toFixed(2) : "—"}
              </div>
              {periodo.data_inicio && periodo.data_fim ? (
                <div className="text-xs text-gray-500 mt-1">
                  Período: <span className="font-semibold">{periodo.data_inicio}</span> até{" "}
                  <span className="font-semibold">{periodo.data_fim}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Observações (obrigatório)</h2>
        <textarea
          className="w-full min-h-[120px] rounded-md border px-3 py-2"
          placeholder="Descreva o que foi orientado / observado..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {/* Evidências */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Evidências (obrigatório)</h2>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="w-full rounded-md border px-3 py-2"
          onChange={addFiles}
        />
        <EvidenceList list={evidencias} onRemove={removeFile} />
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3">
        <button
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={() => {
            setRespostasChecklist({});
            setDetalhes({
              data_acompanhamento: "",
              hora_inicial: "",
              hora_final: "",
              km_inicial: "",
              km_final: "",
            });
            setObservacoes("");
            setEvidencias([]);
            setErrMsg("");
            setOkMsg("");
          }}
          disabled={saving}
        >
          Limpar
        </button>

        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={salvarCheckpoint}
          disabled={!pronto || saving}
          title={faltandoResponder > 0 ? "Complete o checklist (OK/NOK) antes de salvar." : ""}
        >
          {saving ? "Salvando..." : "Salvar acompanhamento"}
        </button>
      </div>
    </div>
  );
}
