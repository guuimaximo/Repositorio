// src/pages/DesempenhoLancamento.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../supabase";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";
import { useAuth } from "../context/AuthContext";
import { FaTimes } from "react-icons/fa";

const API_BASE = "https://agentediesel.onrender.com"; // ✅ API Python

// ✅ tipo do prontuário (seu backend deve reconhecer e rodar prontuarios_acompanhamento.py)
const TIPO_PRONTUARIO = "prontuarios_acompanhamento";

// ✅ Bucket do relatório (PDF)
const BUCKET_RELATORIOS = "relatorios";

const MOTIVOS = [
  "KM/L abaixo da meta",
  "Tendência de queda",
  "Comparativo com cluster",
  "Outro",
];

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

/**
 * ✅ RESUMO (premiacao_diaria via agentediesel)
 * IMPORTANTÍSSIMO:
 * - divisão por dia + linha + carro no resumo
 *
 * Esperado do endpoint:
 *  - totais: { dias, km, litros, kml }
 *  - dias: [{ dia, km, litros, kml, linhas:[...], veiculos:[...] }]
 *  - veiculos (opcional): agregação por veiculo (fallback)
 */
async function fetchResumoPremiacao({ chapa, inicio, fim }) {
  const qs = new URLSearchParams({
    chapa: String(chapa || "").trim(),
    inicio: String(inicio || "").trim(),
    fim: String(fim || "").trim(),
  }).toString();

  const r = await fetch(`${API_BASE}/premiacao/resumo?${qs}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || j?.error || "Erro ao consultar premiação.");
  return j;
}

/**
 * ✅ MERITOCRACIA (Supabase de consulta / tabela "premiacao")
 * Retorna 1 linha do mês:
 *  motorista, linha_com_mais_horas, kml_linha_com_mais_horas, meta_linha, kml_meta_linha_mais_horas
 *
 * Front chama o Python:
 *  GET /premiacao/meritocracia?motorista=...&mes=...&ano=...
 */
async function fetchMeritocracia({ chapa, mes, ano }) {
  const qs = new URLSearchParams({
    motorista: String(chapa || "").trim(),
    mes: String(mes || "").trim(),
    ano: String(ano || "").trim(),
  }).toString();

  const r = await fetch(`${API_BASE}/premiacao/meritocracia?${qs}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || j?.error || "Erro ao consultar meritocracia.");
  return j;
}

/* =========================
   HELPERS
========================= */
function normalizePath(p) {
  if (!p) return "";
  return String(p).replace(/^\/+/, "");
}

function getFolderFromPath(p) {
  const parts = normalizePath(p).split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

async function makeUrlFromPath(bucket, path, expiresIn = 3600) {
  const clean = normalizePath(path);

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, expiresIn);
  if (!error && data?.signedUrl) return { url: data.signedUrl, mode: "signed", path: clean };

  const pub = supabase.storage.from(bucket).getPublicUrl(clean);
  return { url: pub?.data?.publicUrl, mode: "public", path: clean };
}

function parseISODateParts(iso) {
  try {
    if (!iso) return null;
    const [y, m] = String(iso).split("-").map((x) => parseInt(x, 10));
    if (!y || !m) return null;
    return { ano: y, mes: m };
  } catch {
    return null;
  }
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Fechar"
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-6xl">
          <div
            className="rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_25px_90px_rgba(0,0,0,0.25)] overflow-hidden"
            style={{ maxHeight: "calc(100vh - 24px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/70 bg-white/95">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{title}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <FaTimes />
                Fechar
              </button>
            </div>

            <div className="p-4 overflow-auto" style={{ maxHeight: "calc(100vh - 24px - 52px)" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesempenhoLancamento() {
  const { user } = useAuth ? useAuth() : { user: null };
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [linhasOpt, setLinhasOpt] = useState([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });
  const [prefixo, setPrefixo] = useState("");
  const [linha, setLinha] = useState("");
  const [cluster, setCluster] = useState("");

  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOutro, setMotivoOutro] = useState("");
  const dias = 10;

  // ✅ Meta agora vem da meritocracia (tabela premiacao / Supabase consulta via API)
  const [kmlMeta, setKmlMeta] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaErr, setMetaErr] = useState("");
  const [meritRow, setMeritRow] = useState(null);

  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  const [observacaoInicial, setObservacaoInicial] = useState("");
  const [evidAcomp, setEvidAcomp] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // ✅ resumo premiação (Supabase A)
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoErr, setResumoErr] = useState("");
  const [resumoTotais, setResumoTotais] = useState({ dias: 0, km: 0, litros: 0, kml: 0 });
  const [resumoVeiculos, setResumoVeiculos] = useState([]);

  // ✅ divisão por dia (com linha e veículo no resumo)
  const [resumoDias, setResumoDias] = useState([]);

  // ✅ PRONTUÁRIO
  const [prontLoading, setProntLoading] = useState(false);
  const [prontErr, setProntErr] = useState("");
  const [prontRow, setProntRow] = useState(null);
  const [prontUrlsLoading, setProntUrlsLoading] = useState(false);
  const [prontPdfUrl, setProntPdfUrl] = useState(null);
  const [prontPdfPathUsed, setProntPdfPathUsed] = useState(null);
  const [prontPdfOpen, setProntPdfOpen] = useState(false);

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  useEffect(() => {
    (async () => {
      setRefsLoading(true);
      try {
        const { data: linhasData, error: eLinhas } = await supabase
          .from("linhas")
          .select("id, codigo, descricao")
          .order("codigo", { ascending: true });

        if (eLinhas) throw eLinhas;
        setLinhasOpt(linhasData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setRefsLoading(false);
      }
    })();
  }, []);

  // ✅ busca resumo (premiacao_diaria) quando chapa + periodo estiverem preenchidos
  useEffect(() => {
    const chapa = String(motorista?.chapa || "").trim();
    const ini = String(periodoInicio || "").trim();
    const fim = String(periodoFim || "").trim();

    if (!chapa || !ini || !fim) {
      setResumoErr("");
      setResumoLoading(false);
      setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
      setResumoVeiculos([]);
      setResumoDias([]);
      return;
    }

    let alive = true;
    (async () => {
      setResumoLoading(true);
      setResumoErr("");
      try {
        const j = await fetchResumoPremiacao({ chapa, inicio: ini, fim });
        if (!alive) return;

        setResumoTotais(j?.totais || { dias: 0, km: 0, litros: 0, kml: 0 });
        setResumoVeiculos(Array.isArray(j?.veiculos) ? j.veiculos : []);
        setResumoDias(Array.isArray(j?.dias) ? j.dias : []);
      } catch (e) {
        if (!alive) return;
        setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
        setResumoVeiculos([]);
        setResumoDias([]);
        setResumoErr(e?.message || "Erro ao buscar resumo.");
      } finally {
        if (!alive) return;
        setResumoLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [motorista?.chapa, periodoInicio, periodoFim]);

  // ✅ busca meritocracia (meta) por mês de referência (usando o mês do periodoInicio)
  useEffect(() => {
    const chapa = String(motorista?.chapa || "").trim();
    const parts = parseISODateParts(String(periodoInicio || "").trim());
    if (!chapa || !parts?.mes || !parts?.ano) {
      setMetaErr("");
      setMetaLoading(false);
      setMeritRow(null);
      return;
    }

    let alive = true;
    (async () => {
      setMetaLoading(true);
      setMetaErr("");
      try {
        const j = await fetchMeritocracia({ chapa, mes: parts.mes, ano: parts.ano });
        if (!alive) return;

        const item = j?.item || j?.data || j?.row || null;
        setMeritRow(item);

        const meta = item?.kml_meta_linha_mais_horas ?? item?.kml_meta ?? null;
        if (meta !== null && meta !== undefined && String(meta).trim() !== "") {
          setKmlMeta(String(meta));
        } else {
          setKmlMeta("");
        }
      } catch (e) {
        if (!alive) return;
        setMeritRow(null);
        setMetaErr(e?.message || "Erro ao buscar meta (meritocracia).");
        setKmlMeta("");
      } finally {
        if (!alive) return;
        setMetaLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [motorista?.chapa, periodoInicio]);

  function addFiles(e) {
    const list = filesToList(e.target.files);
    setEvidAcomp((prev) => dedupeFiles([...(prev || []), ...list]));
    e.target.value = "";
  }

  function removeFile(idx) {
    setEvidAcomp((prev) => prev.filter((_, i) => i !== idx));
  }

  // ✅ pronto: meta não é obrigatória; mantém período + evidências + dados base + motivo
  const pronto = useMemo(() => {
    const baseOk =
      (motorista?.chapa || motorista?.nome) &&
      String(prefixo || "").trim() &&
      String(linha || "").trim() &&
      String(cluster || "").trim();

    if (!baseOk) return false;

    const motivoOk = String(motivoFinal || "").trim().length > 0;
    const evidOk = (evidAcomp || []).length > 0;
    const periodoOk = String(periodoInicio || "").trim() && String(periodoFim || "").trim();

    return motivoOk && evidOk && periodoOk;
  }, [motorista, prefixo, linha, cluster, motivoFinal, evidAcomp, periodoInicio, periodoFim]);

  function limpar() {
    setMotorista({ chapa: "", nome: "" });
    setPrefixo("");
    setLinha("");
    setCluster("");
    setMotivo(MOTIVOS[0]);
    setMotivoOutro("");

    setKmlMeta("");
    setMetaLoading(false);
    setMetaErr("");
    setMeritRow(null);

    setPeriodoInicio("");
    setPeriodoFim("");
    setObservacaoInicial("");
    setEvidAcomp([]);
    setErrMsg("");
    setOkMsg("");

    setResumoLoading(false);
    setResumoErr("");
    setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
    setResumoVeiculos([]);
    setResumoDias([]);

    setProntLoading(false);
    setProntErr("");
    setProntRow(null);
    setProntUrlsLoading(false);
    setProntPdfUrl(null);
    setProntPdfPathUsed(null);
    setProntPdfOpen(false);
  }

  async function lancar() {
    if (!pronto || saving) return;

    setSaving(true);
    setErrMsg("");
    setOkMsg("");

    try {
      const lancadorLogin = user?.login || user?.email || null;
      const lancadorNome = user?.nome || null;
      const lancadorIdNum = user?.id ?? null;

      const chapa = String(motorista?.chapa || "").trim();
      const nomeMotorista = String(motorista?.nome || "").trim() || null;
      const ini = String(periodoInicio || "").trim();
      const fim = String(periodoFim || "").trim();

      if (!chapa) throw new Error("Informe a chapa do motorista.");
      if (!ini || !fim) throw new Error("Informe o período (início e fim).");

      const folder = `diesel/acompanhamentos/${chapa || "sem_chapa"}/lancamento_${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidAcomp,
        bucket: "diesel",
        folder,
      });

      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);
      const obsInit = String(observacaoInicial || "").trim() || null;

      // ✅ snapshots (instrutor vê no acompanhamento / tratativa)
      const meritSnap = meritRow
        ? {
            motorista: meritRow?.motorista ?? null,
            linha_com_mais_horas: meritRow?.linha_com_mais_horas ?? null,
            kml_linha_com_mais_horas: meritRow?.kml_linha_com_mais_horas ?? null,
            meta_linha: meritRow?.meta_linha ?? null,
            kml_meta_linha_mais_horas: meritRow?.kml_meta_linha_mais_horas ?? null,
          }
        : {};

      const resumoTotaisSnap = resumoTotais || { dias: 0, km: 0, litros: 0, kml: 0 };
      const resumoDiasSnap = Array.isArray(resumoDias) ? resumoDias : [];
      const resumoVeiculosSnap = Array.isArray(resumoVeiculos) ? resumoVeiculos : [];

      // ✅ 1) salva lançamento completo (tabela nova no Supabase)
      const payloadLancamento = {
        motorista_chapa: chapa,
        motorista_nome: nomeMotorista,
        prefixo: String(prefixo || "").trim(),
        linha: String(linha || "").trim(),
        cluster: String(cluster || "").trim(),

        motivo: motivoFinal,
        observacao_inicial: obsInit,
        periodo_inicio: ini,
        periodo_fim: fim,

        dias_monitoramento: Number(dias) || 10,
        kml_meta: String(kmlMeta || "").trim() ? safeNumber(kmlMeta) : null,

        evidencias_urls: evidenciasUrls,

        meritocracia: meritSnap,
        resumo_totais: resumoTotaisSnap,
        resumo_dias: resumoDiasSnap,
        resumo_veiculos: resumoVeiculosSnap,

        lancado_por_login: lancadorLogin,
        lancado_por_nome: lancadorNome,
        lancado_por_usuario_id: lancadorIdNum ? String(lancadorIdNum) : null,

        metadata: {
          lancamento_periodo_inicio: ini,
          lancamento_periodo_fim: fim,
        },
      };

      const { data: lanc, error: eL } = await supabase
        .from("diesel_lancamentos")
        .insert(payloadLancamento)
        .select("id")
        .single();

      if (eL) throw eL;

      // ✅ 2) cria acompanhamento, vinculando ao lançamento
      const payloadAcomp = {
        motorista_chapa: chapa,
        motorista_nome: nomeMotorista,
        motivo: motivoFinal,
        status: "A_SER_ACOMPANHADO",
        dias_monitoramento: Number(dias),

        dt_inicio: new Date().toISOString().slice(0, 10),
        dt_inicio_monitoramento: null,
        dt_fim_planejado: null,
        dt_fim_real: null,

        kml_inicial: null, // removido
        kml_meta: String(kmlMeta || "").trim() ? safeNumber(kmlMeta) : null,
        kml_final: null,

        observacao_inicial: obsInit,
        evidencias_urls: evidenciasUrls,

        instrutor_login: null,
        instrutor_nome: null,
        instrutor_id: null,

        tratativa_id: null,

        // ✅ vínculo para puxar snapshot depois
        lancamento_id: lanc.id,

        metadata: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),

          lancado_por_login: lancadorLogin,
          lancado_por_nome: lancadorNome,
          lancado_por_usuario_id: lancadorIdNum,

          lancamento_periodo_inicio: ini,
          lancamento_periodo_fim: fim,
        },
      };

      const { data: acomp, error: eA } = await supabase
        .from("diesel_acompanhamentos")
        .insert(payloadAcomp)
        .select("id")
        .single();

      if (eA) throw eA;

      // ✅ 3) evento inicial com snapshot (redundante de propósito para “mastigado” no histórico)
      const payloadEvento = {
        acompanhamento_id: acomp.id,
        tipo: "LANCAMENTO",
        observacoes: obsInit ? `${motivoFinal}\n\n${obsInit}` : motivoFinal,
        evidencias_urls: evidenciasUrls,

        kml: null,
        periodo_inicio: ini || null,
        periodo_fim: fim || null,

        criado_por_login: lancadorLogin,
        criado_por_nome: lancadorNome,
        criado_por_id: isUuid(user?.id) ? user.id : null,

        extra: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),
          kml_meta: String(kmlMeta || "").trim() ? safeNumber(kmlMeta) : null,

          evidencias_kml_inicial: false,

          lancamento_id: lanc.id,
          meritocracia: meritSnap,
          resumo_totais: resumoTotaisSnap,
          resumo_dias: resumoDiasSnap,
          resumo_veiculos: resumoVeiculosSnap,
        },
      };

      const { error: eE } = await supabase.from("diesel_acompanhamento_eventos").insert(payloadEvento);
      if (eE) throw eE;

      setOkMsg("Lançamento realizado com sucesso.");
      limpar();
    } catch (err) {
      console.error(err);
      setErrMsg(err?.message || "Erro ao lançar.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     PRONTUÁRIO
  ========================= */
  async function gerarProntuario() {
    if (prontLoading) return;

    setProntLoading(true);
    setProntErr("");
    setProntRow(null);
    setProntPdfUrl(null);
    setProntPdfPathUsed(null);

    try {
      const chapa = String(motorista?.chapa || "").trim();
      const ini = String(periodoInicio || "").trim();
      const fim = String(periodoFim || "").trim();
      if (!chapa) throw new Error("Informe a chapa do motorista.");
      if (!ini || !fim) throw new Error("Informe o período (início e fim).");

      const payload = {
        tipo: TIPO_PRONTUARIO,
        periodo_inicio: ini,
        periodo_fim: fim,
        motorista: chapa,
        linha: String(linha || "").trim() || null,
        veiculo: String(prefixo || "").trim() || null,
        cluster: String(cluster || "").trim() || null,
      };

      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/relatorios/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const detail = data?.error || data?.detail || `HTTP ${r.status}`;
        throw new Error(detail);
      }

      if (!data?.report_id) {
        throw new Error("API não retornou report_id do prontuário.");
      }

      const { data: row, error } = await supabase
        .from("relatorios_gerados")
        .select(
          "id, created_at, tipo, status, periodo_inicio, periodo_fim, arquivo_path, arquivo_nome, mime_type, tamanho_bytes, erro_msg"
        )
        .eq("id", data.report_id)
        .single();

      if (error || !row) {
        throw new Error("Não consegui localizar o registro em relatorios_gerados.");
      }

      if (!mountedRef.current) return;
      setProntRow(row);

      setProntUrlsLoading(true);

      const arquivoPath = normalizePath(row?.arquivo_path || "");
      let pdfPath = arquivoPath;

      const folder = getFolderFromPath(arquivoPath);

      if (!/\.pdf$/i.test(pdfPath)) {
        pdfPath = folder ? `${folder}/${chapa}_Prontuario.pdf` : `${chapa}_Prontuario.pdf`;
      }

      let resPdf = await makeUrlFromPath(BUCKET_RELATORIOS, pdfPath, 3600);
      if (!resPdf?.url && folder) {
        const alt = `${folder}/Prontuario.pdf`;
        resPdf = await makeUrlFromPath(BUCKET_RELATORIOS, alt, 3600);
      }

      if (!resPdf?.url) {
        throw new Error(
          `Não encontrei PDF do prontuário no bucket '${BUCKET_RELATORIOS}'. Path tentado: ${pdfPath}`
        );
      }

      if (!mountedRef.current) return;
      setProntPdfUrl(resPdf.url);
      setProntPdfPathUsed(resPdf.path);
      setProntPdfOpen(true);
    } catch (e) {
      if (!mountedRef.current) return;
      setProntErr(String(e?.message || e));
    } finally {
      if (mountedRef.current) {
        setProntUrlsLoading(false);
        setProntLoading(false);
      }
    }
  }

  const prontoProntuario = useMemo(() => {
    const chapa = String(motorista?.chapa || "").trim();
    const ini = String(periodoInicio || "").trim();
    const fim = String(periodoFim || "").trim();
    return !!(chapa && ini && fim);
  }, [motorista?.chapa, periodoInicio, periodoFim]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Aqui você lança a fila. O monitoramento de 10 dias começa no primeiro acompanhamento do instrutor.
        </p>
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

      {/* ✅ PRONTUÁRIO (status UI) */}
      {(prontLoading || prontErr || prontRow) && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800">Prontuário</div>
              <div className="text-xs text-gray-500">
                Tipo: <span className="font-semibold">{TIPO_PRONTUARIO}</span>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              {prontLoading ? "Carregando prontuário..." : prontErr ? "Falhou" : "Pronto"}
            </div>
          </div>

          {prontLoading && (
            <div className="mt-2 text-sm text-gray-700">
              Gerando prontuário no Python… isso pode levar alguns segundos.
            </div>
          )}

          {prontErr && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {prontErr}
            </div>
          )}

          {!!prontRow && (
            <div className="mt-2 text-xs text-gray-600">
              Registro: <span className="font-semibold">{String(prontRow.status || "")}</span> •{" "}
              {String(prontRow.periodo_inicio || "—")} → {String(prontRow.periodo_fim || "—")}
              {prontPdfPathUsed ? (
                <div className="mt-1 text-[11px] text-gray-500 break-all">
                  PDF path: {prontPdfPathUsed}
                </div>
              ) : null}
            </div>
          )}

          {prontUrlsLoading && (
            <div className="mt-2 text-sm text-gray-700">Preparando arquivo do bucket…</div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Dados do Lançamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista" />
          </div>

          <div className="md:col-span-2">
            <CampoPrefixo
              value={prefixo}
              onChange={setPrefixo}
              onChangeCluster={setCluster}
              disabled={saving}
              label="Prefixo"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Linha</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-white"
              value={linha}
              onChange={(e) => setLinha(e.target.value)}
              disabled={refsLoading || saving}
            >
              <option value="">{refsLoading ? "Carregando..." : "Selecione a linha"}</option>
              {linhasOpt.map((l) => (
                <option key={l.id || l.codigo} value={String(l.codigo || "").trim()}>
                  {String(l.codigo || "").trim()} — {String(l.descricao || "").trim()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Cluster (automático)</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-gray-50"
              value={cluster}
              readOnly
              placeholder="Selecione um prefixo"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Tempo de monitoramento</label>
            <input className="w-full rounded-md border px-3 py-2 bg-gray-50" value="10 dias" readOnly />
          </div>

          {/* ✅ KM/L META agora vem do Supabase de consulta (meritocracia) */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">KM/L Meta (puxado da meritocracia)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border px-3 py-2 bg-gray-50"
                placeholder={metaLoading ? "Buscando..." : "—"}
                value={kmlMeta}
                readOnly
              />
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {metaLoading ? "Carregando..." : metaErr ? "Erro" : meritRow ? "OK" : "—"}
              </div>
            </div>
            {metaErr && <div className="mt-1 text-xs text-red-700">{metaErr}</div>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Período analisado do KM/L (obrigatório)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                disabled={saving || prontLoading}
              />
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                disabled={saving || prontLoading}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!prontoProntuario || prontLoading || saving}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={gerarProntuario}
                title="Gera e abre o prontuário do motorista (PDF)"
              >
                {prontLoading ? "Carregando prontuário..." : "Gerar prontuário (PDF)"}
              </button>

              {prontPdfUrl && (
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setProntPdfOpen(true)}
                >
                  Abrir prontuário
                </button>
              )}

              {prontPdfUrl && (
                <a
                  href={prontPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Abrir em nova aba
                </a>
              )}
            </div>
          </div>

          {/* ✅ MERITOCRACIA (linha única do mês) */}
          <div className="md:col-span-4">
            <div className="rounded-md border bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-800">Meritocracia (mês de referência)</div>
                <div className="text-xs text-gray-500">
                  {metaLoading ? "Consultando..." : metaErr ? "Erro" : meritRow ? "OK" : "—"}
                </div>
              </div>

              {!meritRow && !metaLoading && !metaErr && (
                <div className="mt-2 text-sm text-gray-600">
                  Informe a chapa e a data de início do período para puxar a meritocracia do mês.
                </div>
              )}

              {meritRow && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <div className="rounded-md bg-gray-50 border p-2">
                    <div className="text-xs text-gray-500">Chapa</div>
                    <div className="text-sm font-semibold text-gray-800">{meritRow?.motorista ?? "—"}</div>
                  </div>

                  <div className="rounded-md bg-gray-50 border p-2">
                    <div className="text-xs text-gray-500">Linha que mais trabalhou</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {meritRow?.linha_com_mais_horas ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 border p-2">
                    <div className="text-xs text-gray-500">KM/L na linha</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {Number(meritRow?.kml_linha_com_mais_horas || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 border p-2">
                    <div className="text-xs text-gray-500">Meta da linha</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {Number(meritRow?.meta_linha || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 border p-2">
                    <div className="text-xs text-gray-500">Meta do motorista</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {Number(meritRow?.kml_meta_linha_mais_horas || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ RESUMO AUTOMÁTICO (premiacao_diaria) */}
          <div className="md:col-span-4">
            <div className="rounded-md border bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-800">Resumo do período (premiação)</div>
                <div className="text-xs text-gray-500">
                  {resumoLoading ? "Consultando..." : resumoErr ? "Erro" : "OK"}
                </div>
              </div>

              {resumoErr ? (
                <div className="mt-2 text-sm text-red-700">{resumoErr}</div>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-xs text-gray-500">Dias</div>
                      <div className="text-sm font-semibold text-gray-800">{resumoTotais?.dias ?? 0}</div>
                    </div>
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-xs text-gray-500">KM rodado</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {Number(resumoTotais?.km || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-xs text-gray-500">Combustível</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {Number(resumoTotais?.litros || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-xs text-gray-500">KM/L (período)</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {Number(resumoTotais?.kml || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ✅ Divisão por dia (com linha e veículo no resumo) */}
                  {(resumoDias || []).length > 0 && (
                    <div className="mt-3 overflow-auto border rounded-md bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="text-left px-3 py-2">Dia</th>
                            <th className="text-left px-3 py-2">Linhas (no dia)</th>
                            <th className="text-left px-3 py-2">Veículos (no dia)</th>
                            <th className="text-right px-3 py-2">KM</th>
                            <th className="text-right px-3 py-2">Comb.</th>
                            <th className="text-right px-3 py-2">KM/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumoDias.map((d, idx) => (
                            <tr key={`${d?.dia || idx}`} className="border-t">
                              <td className="px-3 py-2 whitespace-nowrap">{d?.dia || "—"}</td>
                              <td className="px-3 py-2">
                                {Array.isArray(d?.linhas) ? d.linhas.join(", ") : d?.linha || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {Array.isArray(d?.veiculos) ? d.veiculos.join(", ") : d?.veiculo || "—"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(d?.km || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(d?.litros || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(d?.kml || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ✅ fallback antigo: por veículo */}
                  {(resumoDias || []).length === 0 && (resumoVeiculos || []).length > 0 && (
                    <div className="mt-3 overflow-auto border rounded-md bg-white">
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Observação: seu backend ainda está retornando agrupado por veículo. Quando devolver “dias” no
                        endpoint, essa tabela vira divisão por dia automaticamente.
                      </div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="text-left px-3 py-2">Veículo</th>
                            <th className="text-right px-3 py-2">Dias</th>
                            <th className="text-right px-3 py-2">KM</th>
                            <th className="text-right px-3 py-2">Comb.</th>
                            <th className="text-right px-3 py-2">KM/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumoVeiculos.map((v) => (
                            <tr key={v.veiculo} className="border-t">
                              <td className="px-3 py-2">{v.veiculo}</td>
                              <td className="px-3 py-2 text-right">{v.dias}</td>
                              <td className="px-3 py-2 text-right">
                                {Number(v.km || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(v.litros || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(v.kml || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!resumoLoading &&
                    !resumoErr &&
                    String(motorista?.chapa || "").trim() &&
                    String(periodoInicio || "").trim() &&
                    String(periodoFim || "").trim() &&
                    (resumoDias || []).length === 0 &&
                    (resumoVeiculos || []).length === 0 && (
                      <div className="mt-2 text-sm text-gray-600">Nenhum dado encontrado para o período.</div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Motivo do lançamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {MOTIVOS.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="motivo"
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
                disabled={saving}
              />
              {m}
            </label>
          ))}
        </div>

        {motivo === "Outro" && (
          <input
            className="mt-3 w-full rounded-md border px-3 py-2"
            placeholder="Descreva o motivo..."
            value={motivoOutro}
            onChange={(e) => setMotivoOutro(e.target.value)}
            disabled={saving}
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Observação inicial</h2>
        <textarea
          className="w-full min-h-[110px] rounded-md border px-3 py-2"
          placeholder="Contexto do lançamento..."
          value={observacaoInicial}
          onChange={(e) => setObservacaoInicial(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Evidências do KM/L (lançamento)</h2>

        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="w-full rounded-md border px-3 py-2"
          onChange={addFiles}
          disabled={saving}
        />

        {(evidAcomp || []).length > 0 && (
          <div className="mt-2 border rounded-md">
            {evidAcomp.map((f, idx) => (
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
                  onClick={() => removeFile(idx)}
                  disabled={saving}
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={limpar}
          disabled={saving || prontLoading}
        >
          Limpar
        </button>

        <button
          type="button"
          disabled={!pronto || saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={lancar}
        >
          {saving ? "Lançando..." : "Lançar"}
        </button>
      </div>

      {/* ✅ MODAL PDF DO PRONTUÁRIO */}
      <Modal
        open={prontPdfOpen}
        onClose={() => setProntPdfOpen(false)}
        title={motorista?.chapa ? `Prontuário — Motorista ${String(motorista.chapa)}` : "Prontuário — PDF"}
      >
        {!prontPdfUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            Nenhum PDF disponível para exibir.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Viewer seguro (Signed URL)
              </div>
              <a
                href={prontPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                title="Abrir em nova aba"
              >
                Abrir
              </a>
            </div>

            <div className="bg-slate-50/70" style={{ height: "calc(100vh - 24px - 52px - 140px)" }}>
              <iframe
                title="ProntuarioPDF"
                src={prontPdfUrl}
                className="w-full h-full"
                style={{ background: "transparent" }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
