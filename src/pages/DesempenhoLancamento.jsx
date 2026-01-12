// src/pages/DesempenhoLancamento.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";
import { useAuth } from "../context/AuthContext"; // ajuste se seu context expõe diferente

const MOTIVOS = [
  "KM/L abaixo da meta",
  "Tendência de queda",
  "Comparativo com cluster",
  "Outro",
];

const DIAS_OPCOES = [7, 15, 30];

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
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
  // Salva como: bucket/<folder>/<timestamp>_<idx>_<nome>
  // Retorna array de { path, publicUrl }
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
  const navigate = useNavigate();

  // ✅ ajuste conforme seu AuthContext (você pode ter user em outro hook)
  // Se não existir useAuth, troque para: const { user } = useContext(AuthContext)
  const { user } = useAuth ? useAuth() : { user: null };

  // Obrigatórios do lançamento
  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });
  const [prefixo, setPrefixo] = useState("");
  const [linha, setLinha] = useState("");
  const [cluster, setCluster] = useState("");

  // Tipo decide o que vem depois
  const [tipo, setTipo] = useState("ACOMPANHAMENTO"); // ACOMPANHAMENTO | TRATATIVA

  // Acompanhamento (por enquanto)
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOutro, setMotivoOutro] = useState("");
  const [dias, setDias] = useState(7);
  const [kmlInicial, setKmlInicial] = useState("");
  const [evidAcomp, setEvidAcomp] = useState([]); // multi + PDF

  // Tratativa (por enquanto: captura do que foi realizado)
  const [acaoRealizada, setAcaoRealizada] = useState("");
  const [evidTratativa, setEvidTratativa] = useState([]); // multi + PDF

  // Histórico (placeholder; depois liga no Supabase)
  const [historicoResumo] = useState([]);

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  function addFiles(setter) {
    return (e) => {
      const list = filesToList(e.target.files);
      setter((prev) => dedupeFiles([...(prev || []), ...list]));
      e.target.value = "";
    };
  }

  function removeFile(setter, idx) {
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  const baseOk = useMemo(() => {
    return (
      (motorista?.chapa || motorista?.nome) &&
      String(prefixo || "").trim() &&
      String(linha || "").trim() &&
      String(cluster || "").trim()
    );
  }, [motorista, prefixo, linha, cluster]);

  const prontoAcompanhamento = useMemo(() => {
    if (!baseOk) return false;
    const motivoOk = String(motivoFinal || "").trim().length > 0;
    const diasOk = Number(dias) >= 1;
    const kmlOk = String(kmlInicial || "").trim().length > 0;
    const evidOk = (evidAcomp || []).length > 0; // evidência obrigatória no lançamento
    return motivoOk && diasOk && kmlOk && evidOk;
  }, [baseOk, motivoFinal, dias, kmlInicial, evidAcomp]);

  const prontoTratativa = useMemo(() => {
    if (!baseOk) return false;
    const acaoOk = String(acaoRealizada || "").trim().length > 0;
    const evidOk = (evidTratativa || []).length > 0;
    return acaoOk && evidOk;
  }, [baseOk, acaoRealizada, evidTratativa]);

  const pronto = tipo === "ACOMPANHAMENTO" ? prontoAcompanhamento : prontoTratativa;

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function limpar() {
    setMotorista({ chapa: "", nome: "" });
    setPrefixo("");
    setLinha("");
    setCluster("");

    setTipo("ACOMPANHAMENTO");

    setMotivo(MOTIVOS[0]);
    setMotivoOutro("");
    setDias(7);
    setKmlInicial("");
    setEvidAcomp([]);

    setAcaoRealizada("");
    setEvidTratativa([]);

    setErrMsg("");
  }

  async function salvarAcompanhamento() {
    setSaving(true);
    setErrMsg("");

    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const dtFimPlanejado = addDaysISO(hoje, Number(dias));

      // ✅ lançador (quem está logado agora)
      const lancadorLogin = user?.login || user?.email || null;
      const lancadorNome = user?.nome || null;
      const lancadorIdNum = user?.id ?? null; // pode ser 5, 7 etc (NÃO é UUID)

      // 1) Upload evidências (bucket: diesel)
      // Se seu bucket tiver outro nome, troque aqui.
      const folder = `diesel/acompanhamentos/${motorista.chapa || "sem_chapa"}/${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidAcomp,
        bucket: "diesel",
        folder,
      });

      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);

      // 2) INSERT acompanhamento (instrutor_* = null)
      const payloadAcomp = {
        motorista_chapa: String(motorista?.chapa || "").trim(),
        motorista_nome: String(motorista?.nome || "").trim() || null,
        motivo: motivoFinal,
        status: "ACOMPANHAMENTO",
        dias_monitoramento: Number(dias),
        dt_inicio: hoje,
        dt_fim_planejado: dtFimPlanejado,
        dt_fim_real: null,
        kml_inicial: Number(kmlInicial),
        kml_meta: null,
        kml_final: null,
        observacao_inicial: null,
        evidencias_urls: evidenciasUrls,

        // ✅ instrutor só depois
        instrutor_login: null,
        instrutor_nome: null,
        instrutor_id: null,

        tratativa_id: null,
        metadata: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),

          // ✅ rastreio do lançador
          lancado_por_login: lancadorLogin,
          lancado_por_nome: lancadorNome,
          lancado_por_usuario_id: lancadorIdNum, // numérico OK em metadata
        },
      };

      const { data: acomp, error: eA } = await supabase
        .from("diesel_acompanhamentos")
        .insert(payloadAcomp)
        .select("id")
        .single();

      if (eA) throw eA;

      // 3) INSERT evento LANCAMENTO (criado_por_* = lançador)
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
        // ✅ só grava se for UUID (geralmente seu user.id é número, então fica null)
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

      // 4) Navega para a tela de acompanhamento
      navigate("/desempenho-diesel#acompanhamento");
    } catch (err) {
      console.error(err);
      setErrMsg(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarTratativaPlaceholder() {
    // Mantemos como placeholder por enquanto (você disse que o instrutor/ações vem depois).
    // Aqui apenas navega para tratativas.
    navigate("/desempenho-diesel#tratativas");
  }

  async function handleAvancar() {
    if (!pronto || saving) return;

    if (tipo === "ACOMPANHAMENTO") {
      await salvarAcompanhamento();
      return;
    }

    await salvarTratativaPlaceholder();
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Preencha os dados básicos e escolha o Tipo de Lançamento. O tipo define o próximo passo.
        </p>
      </div>

      {errMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* BLOCO — INICIAL (sempre) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Dados do Lançamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista" />
          </div>

          <div className="md:col-span-2">
            <CampoPrefixo value={prefixo} onChange={setPrefixo} label="Prefixo" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Linha</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: 07TR"
              value={linha}
              onChange={(e) => setLinha(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Cluster</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: C10"
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Tipo de Lançamento</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="ACOMPANHAMENTO">Acompanhamento</option>
              <option value="TRATATIVA">Tratativa</option>
            </select>
          </div>
        </div>
      </div>

      {/* ACOMPANHAMENTO */}
      {tipo === "ACOMPANHAMENTO" && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Acompanhamento</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-2">Motivo do acompanhamento</label>

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

            <div>
              <label className="block text-sm text-gray-600 mb-1">Tempo de acompanhamento</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
              >
                {DIAS_OPCOES.map((d) => (
                  <option key={d} value={d}>
                    {d} dias
                  </option>
                ))}
              </select>

              <label className="block text-sm text-gray-600 mb-1 mt-4">KM/L inicial (obrigatório)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border px-3 py-2"
                placeholder="Ex.: 2.41"
                value={kmlInicial}
                onChange={(e) => setKmlInicial(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">
                Evidências (lançamento) — múltiplos arquivos + PDF
              </label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="w-full rounded-md border px-3 py-2"
                onChange={addFiles(setEvidAcomp)}
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
                        onClick={() => removeFile(setEvidAcomp, idx)}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico resumido (placeholder) */}
            <div className="md:col-span-3 pt-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Histórico (resumo rápido)</h3>

              {historicoResumo.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhum histórico encontrado (quando ligar no Supabase, aqui aparece se já foi
                  acompanhamento/tratativa e se melhorou/piorou).
                </div>
              ) : (
                <div className="border rounded-md">
                  {historicoResumo.map((h, i) => (
                    <div key={i} className="px-3 py-2 border-b last:border-b-0 text-sm">
                      <span className="font-medium">{h.data}</span>{" "}
                      <span className="px-2 py-[2px] rounded bg-gray-100 text-gray-700">
                        {h.tipo}
                      </span>{" "}
                      <span className="px-2 py-[2px] rounded bg-blue-50 text-blue-700">
                        {h.status}
                      </span>{" "}
                      <span className="text-gray-600">— {h.detalhe}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRATATIVA (placeholder por enquanto) */}
      {tipo === "TRATATIVA" && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Tratativa</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">
                O que foi realizado com esse motorista (obrigatório)
              </label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Ex.: Advertido, orientado, tirado de escala, realocado..."
                value={acaoRealizada}
                onChange={(e) => setAcaoRealizada(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">
                Evidências da tratativa — múltiplos arquivos + PDF
              </label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="w-full rounded-md border px-3 py-2"
                onChange={addFiles(setEvidTratativa)}
              />

              {(evidTratativa || []).length > 0 && (
                <div className="mt-2 border rounded-md">
                  {evidTratativa.map((f, idx) => (
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
                        onClick={() => removeFile(setEvidTratativa, idx)}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AÇÕES */}
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
          onClick={handleAvancar}
        >
          {saving
            ? "Salvando..."
            : tipo === "ACOMPANHAMENTO"
            ? "Iniciar acompanhamento"
            : "Ir para Tratativas"}
        </button>
      </div>
    </div>
  );
}
