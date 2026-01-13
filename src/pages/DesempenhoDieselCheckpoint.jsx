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

export default function DesempenhoDieselCheckpoint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth ? useAuth() : { user: null };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [acomp, setAcomp] = useState(null);

  // formulário do instrutor
  const [checklist, setChecklist] = useState({
    orientacao_consumo: false,
    orientacao_trocas: false,
    orientacao_marcha_lenta: false,
    orientacao_rotas: false,
    orientacao_paradas: false,
    orientacao_conducao: false,
  });

  const [observacoes, setObservacoes] = useState("");
  const [evidencias, setEvidencias] = useState([]);

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
            "id, created_at, motorista_chapa, motorista_nome, motivo, status, dias_monitoramento, dt_inicio, dt_inicio_monitoramento, dt_fim_planejado, instrutor_nome, instrutor_login, metadata"
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setAcomp(data || null);

        // se quiser “puxar” algo do metadata (ex.: prefixo/linha/cluster)
        // fica em acomp.metadata
      } catch (e) {
        console.error(e);
        setErrMsg(e?.message || "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function addFiles(e) {
    const list = filesToList(e.target.files);
    setEvidencias((prev) => dedupeFiles([...(prev || []), ...list]));
    e.target.value = "";
  }

  function removeFile(idx) {
    setEvidencias((prev) => prev.filter((_, i) => i !== idx));
  }

  const checklistResumo = useMemo(() => {
    const keys = Object.keys(checklist || {});
    const marcados = keys.filter((k) => checklist?.[k]).length;
    return `${marcados}/${keys.length}`;
  }, [checklist]);

  const pronto = useMemo(() => {
    if (!acomp?.id) return false;
    if (!String(observacoes || "").trim()) return false;
    if ((evidencias || []).length === 0) return false;
    return true;
  }, [acomp?.id, observacoes, evidencias]);

  async function salvarCheckpoint() {
    if (!pronto || saving) return;

    setSaving(true);
    setErrMsg("");
    setOkMsg("");

    try {
      if (!acomp?.id) throw new Error("Acompanhamento inválido.");

      // instrutor (logado)
      const instrutorLogin = user?.login || user?.email || null;
      const instrutorNome = user?.nome || null;
      const instrutorId = isUuid(user?.id) ? user.id : null;

      // upload evidências
      const folder = `diesel/acompanhamentos/${acomp.motorista_chapa || "sem_chapa"}/checkpoint_${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidencias,
        bucket: "diesel",
        folder,
      });
      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);

      // define datas se for o primeiro checkpoint
      const hoje = toISODate();
      const diasMonitoramento = Number(acomp.dias_monitoramento || 10) || 10;

      const isPrimeiro = !acomp.dt_inicio_monitoramento;
      const dtInicioMon = isPrimeiro ? hoje : acomp.dt_inicio_monitoramento;
      const dtFimPlan = isPrimeiro ? addDaysISO(hoje, diasMonitoramento) : acomp.dt_fim_planejado;

      // 1) evento CHECKPOINT
      const payloadEvento = {
        acompanhamento_id: acomp.id,
        tipo: "CHECKPOINT",
        observacoes: `Checklist: ${checklistResumo}\n\n${String(observacoes || "").trim()}`,
        evidencias_urls: evidenciasUrls,
        km: null,
        litros: null,
        kml: null,
        periodo_inicio: null,
        periodo_fim: null,
        criado_por_login: instrutorLogin,
        criado_por_nome: instrutorNome,
        criado_por_id: instrutorId,
        extra: {
          checklist,
          checklist_resumo: checklistResumo,
        },
      };

      const { error: eEvt } = await supabase
        .from("diesel_acompanhamento_eventos")
        .insert(payloadEvento);

      if (eEvt) throw eEvt;

      // 2) update acompanhamento: inicia monitoramento e muda status
      const payloadUpdate = {
        status: "EM_ANALISE",
        instrutor_login: instrutorLogin,
        instrutor_nome: instrutorNome,
        instrutor_id: instrutorId,

        dt_inicio_monitoramento: dtInicioMon,
        dt_fim_planejado: dtFimPlan,

        // opcional: guardar algo no metadata
        metadata: {
          ...(acomp.metadata || {}),
          ultimo_checklist_resumo: checklistResumo,
          ultimo_checklist: checklist,
          ultimo_checkpoint_em: new Date().toISOString(),
        },
      };

      const { error: eUp } = await supabase
        .from("diesel_acompanhamentos")
        .update(payloadUpdate)
        .eq("id", acomp.id);

      if (eUp) throw eUp;

      setOkMsg(isPrimeiro ? "Checkpoint salvo. Monitoramento iniciado (10 dias)." : "Checkpoint salvo.");

      // volta para central
      setTimeout(() => navigate("/desempenho-diesel#acompanhamento"), 300);
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
          onClick={() => navigate("/desempenho-diesel#acompanhamento")}
        >
          Voltar
        </button>
      </div>
    );
  }

  const meta = acomp?.kml_meta;
  const prefixo = acomp?.metadata?.prefixo || "—";
  const linha = acomp?.metadata?.linha || "—";
  const cluster = acomp?.metadata?.cluster || "—";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Checkpoint do Instrutor</h1>
          <p className="text-sm text-gray-600 mt-1">
            Ao salvar o primeiro checkpoint, o monitoramento inicia e o prazo de 10 dias é calculado.
          </p>
        </div>
        <button
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={() => navigate("/desempenho-diesel#acompanhamento")}
          disabled={saving}
        >
          Voltar
        </button>
      </div>

      {errMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {okMsg && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {okMsg}
        </div>
      )}

      {/* Resumo do caso */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500">Motorista</div>
            <div className="font-semibold text-gray-800">{acomp.motorista_nome || "—"}</div>
            <div className="text-xs text-gray-500">Chapa {acomp.motorista_chapa || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Operação</div>
            <div className="text-sm text-gray-800">Prefixo: <span className="font-semibold">{prefixo}</span></div>
            <div className="text-sm text-gray-800">Linha: <span className="font-semibold">{linha}</span></div>
            <div className="text-sm text-gray-800">Cluster: <span className="font-semibold">{cluster}</span></div>
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
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Checklist do instrutor</h2>
          <span className="text-xs text-gray-600">Marcados: {checklistResumo}</span>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            ["orientacao_consumo", "Orientou consumo / condução econômica"],
            ["orientacao_trocas", "Orientou trocas de marcha / rotação"],
            ["orientacao_marcha_lenta", "Orientou evitar marcha lenta"],
            ["orientacao_rotas", "Orientou rotas / percurso"],
            ["orientacao_paradas", "Orientou paradas / acelerações"],
            ["orientacao_conducao", "Orientou condução segura e suave"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={!!checklist?.[key]}
                onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
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
            setChecklist({
              orientacao_consumo: false,
              orientacao_trocas: false,
              orientacao_marcha_lenta: false,
              orientacao_rotas: false,
              orientacao_paradas: false,
              orientacao_conducao: false,
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
        >
          {saving ? "Salvando..." : "Salvar acompanhamento"}
        </button>
      </div>
    </div>
  );
}
