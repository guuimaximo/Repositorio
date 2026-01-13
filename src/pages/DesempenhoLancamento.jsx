// src/pages/DesempenhoLancamento.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import CampoMotorista from "../components/CampoMotorista";
import { useAuth } from "../context/AuthContext";

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

export default function DesempenhoLancamento() {
  const { user } = useAuth ? useAuth() : { user: null };

  // refs (linhas/prefixos)
  const [linhasOpt, setLinhasOpt] = useState([]);
  const [prefixosOpt, setPrefixosOpt] = useState([]);
  const [refsLoading, setRefsLoading] = useState(false);

  // Dados do lançamento
  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });

  const [prefixo, setPrefixo] = useState("");
  const [linha, setLinha] = useState("");
  const [cluster, setCluster] = useState(""); // agora automático pelo prefixo

  // Lançamento (fila)
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOutro, setMotivoOutro] = useState("");
  const dias = 10; // fixo no fluxo novo
  const [kmlInicial, setKmlInicial] = useState("");
  const [evidAcomp, setEvidAcomp] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  // ========= Carregar LINHAS e PREFIXOS =========
  useEffect(() => {
    (async () => {
      setRefsLoading(true);
      try {
        // LINHAS: id, codigo, descricao
        const { data: linhasData, error: eLinhas } = await supabase
          .from("linhas")
          .select("id, codigo, descricao")
          .order("codigo", { ascending: true });

        if (eLinhas) throw eLinhas;
        setLinhasOpt(linhasData || []);

        // PREFIXOS: ajuste os campos conforme sua tabela
        // Aqui assumo que existe uma coluna "prefixo" OU "codigo", e a nova coluna "cluster"
        const { data: prefData, error: ePref } = await supabase
          .from("prefixos")
          .select("id, prefixo, codigo, descricao, cluster")
          .order("prefixo", { ascending: true });

        if (ePref) throw ePref;
        setPrefixosOpt(prefData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setRefsLoading(false);
      }
    })();
  }, []);

  function getPrefixValue(row) {
    return String(row?.prefixo || row?.codigo || "").trim();
  }

  function getPrefixLabel(row) {
    const p = getPrefixValue(row);
    const d = String(row?.descricao || "").trim();
    return d ? `${p} — ${d}` : p;
  }

  function onChangePrefixo(v) {
    setPrefixo(v);

    // cluster automático pelo prefixo selecionado
    const found = (prefixosOpt || []).find((r) => getPrefixValue(r) === String(v || "").trim());
    const cl = String(found?.cluster || "").trim();
    setCluster(cl);
  }

  function addFiles(e) {
    const list = filesToList(e.target.files);
    setEvidAcomp((prev) => dedupeFiles([...(prev || []), ...list]));
    e.target.value = "";
  }

  function removeFile(idx) {
    setEvidAcomp((prev) => prev.filter((_, i) => i !== idx));
  }

  const pronto = useMemo(() => {
    const baseOk =
      (motorista?.chapa || motorista?.nome) &&
      String(prefixo || "").trim() &&
      String(linha || "").trim() &&
      String(cluster || "").trim();

    if (!baseOk) return false;

    const motivoOk = String(motivoFinal || "").trim().length > 0;
    const kmlOk = String(kmlInicial || "").trim().length > 0;
    const evidOk = (evidAcomp || []).length > 0;

    return motivoOk && kmlOk && evidOk;
  }, [motorista, prefixo, linha, cluster, motivoFinal, kmlInicial, evidAcomp]);

  function limpar() {
    setMotorista({ chapa: "", nome: "" });
    setPrefixo("");
    setLinha("");
    setCluster("");
    setMotivo(MOTIVOS[0]);
    setMotivoOutro("");
    setKmlInicial("");
    setEvidAcomp([]);
    setErrMsg("");
    setOkMsg("");
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

      // Upload evidências do lançamento
      const folder = `diesel/acompanhamentos/${motorista.chapa || "sem_chapa"}/lancamento_${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidAcomp,
        bucket: "diesel",
        folder,
      });

      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);

      // INSERT: fila semanal -> A_SER_ACOMPANHADO
      const payloadAcomp = {
        motorista_chapa: String(motorista?.chapa || "").trim(),
        motorista_nome: String(motorista?.nome || "").trim() || null,
        motivo: motivoFinal,
        status: "A_SER_ACOMPANHADO",
        dias_monitoramento: Number(dias),

        // fila
        dt_inicio: new Date().toISOString().slice(0, 10),
        dt_inicio_monitoramento: null,
        dt_fim_planejado: null,
        dt_fim_real: null,

        kml_inicial: Number(kmlInicial),
        kml_meta: null,
        kml_final: null,
        observacao_inicial: null,
        evidencias_urls: evidenciasUrls,

        instrutor_login: null,
        instrutor_nome: null,
        instrutor_id: null,

        tratativa_id: null,
        metadata: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),

          lancado_por_login: lancadorLogin,
          lancado_por_nome: lancadorNome,
          lancado_por_usuario_id: lancadorIdNum,
        },
      };

      const { data: acomp, error: eA } = await supabase
        .from("diesel_acompanhamentos")
        .insert(payloadAcomp)
        .select("id")
        .single();

      if (eA) throw eA;

      // Evento LANCAMENTO
      const payloadEvento = {
        acompanhamento_id: acomp.id,
        tipo: "LANCAMENTO",
        observacoes: motivoFinal,
        evidencias_urls: evidenciasUrls,
        km: null,
        litros: null,
        kml: Number(kmlInicial),
        periodo_inicio: null,
        periodo_fim: null,
        criado_por_login: lancadorLogin,
        criado_por_nome: lancadorNome,
        criado_por_id: isUuid(user?.id) ? user.id : null,
        extra: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),
        },
      };

      const { error: eE } = await supabase
        .from("diesel_acompanhamento_eventos")
        .insert(payloadEvento);

      if (eE) throw eE;

      setOkMsg("Lançamento realizado com sucesso. O caso está em 'A ser acompanhado'.");
      limpar();
    } catch (err) {
      console.error(err);
      setErrMsg(err?.message || "Erro ao lançar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Aqui você apenas lança a fila da semana. O monitoramento de 10 dias começa no primeiro
          acompanhamento do instrutor.
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

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Dados do Lançamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista" />
          </div>

          {/* Prefixo (select do banco) */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Prefixo</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-white"
              value={prefixo}
              onChange={(e) => onChangePrefixo(e.target.value)}
              disabled={refsLoading}
            >
              <option value="">{refsLoading ? "Carregando..." : "Selecione o prefixo"}</option>
              {prefixosOpt.map((p) => {
                const val = getPrefixValue(p);
                if (!val) return null;
                return (
                  <option key={p.id || val} value={val}>
                    {getPrefixLabel(p)}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-gray-500">O cluster virá automaticamente do prefixo.</p>
          </div>

          {/* Linha (select do banco) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Linha</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-white"
              value={linha}
              onChange={(e) => setLinha(e.target.value)}
              disabled={refsLoading}
            >
              <option value="">{refsLoading ? "Carregando..." : "Selecione a linha"}</option>
              {linhasOpt.map((l) => (
                <option key={l.id || l.codigo} value={String(l.codigo || "").trim()}>
                  {String(l.codigo || "").trim()} — {String(l.descricao || "").trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Cluster automático */}
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

          <div>
            <label className="block text-sm text-gray-600 mb-1">KM/L inicial (obrigatório)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: 2.41"
              value={kmlInicial}
              onChange={(e) => setKmlInicial(e.target.value)}
            />
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
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Evidências do lançamento</h2>

        <label className="block text-sm text-gray-600 mb-1">
          Evidências — múltiplos arquivos + PDF (obrigatório)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="w-full rounded-md border px-3 py-2"
          onChange={addFiles}
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
          disabled={saving}
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
    </div>
  );
}

