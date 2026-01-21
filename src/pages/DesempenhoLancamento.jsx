// src/pages/DesempenhoLancamento.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";
import { useAuth } from "../context/AuthContext";

const API_BASE = "https://agentediesel.onrender.com"; // ✅ consulta premiacao (API Python)

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

// ✅ consulta API (Supabase A / premiacao_diaria via agentediesel)
async function fetchResumoPremiacao({ chapa, inicio, fim }) {
  const qs = new URLSearchParams({
    chapa: String(chapa || "").trim(),
    inicio: String(inicio || "").trim(),
    fim: String(fim || "").trim(),
  }).toString();

  const r = await fetch(`${API_BASE}/premiacao/resumo?${qs}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || j?.error || "Erro ao consultar premiacao.");
  return j;
}

export default function DesempenhoLancamento() {
  const { user } = useAuth ? useAuth() : { user: null };

  const [linhasOpt, setLinhasOpt] = useState([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });
  const [prefixo, setPrefixo] = useState("");
  const [linha, setLinha] = useState("");
  const [cluster, setCluster] = useState("");

  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOutro, setMotivoOutro] = useState("");
  const dias = 10;

  const [kmlInicial, setKmlInicial] = useState("");

  // ✅ NOVO: KM/L meta
  const [kmlMeta, setKmlMeta] = useState("");

  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  const [observacaoInicial, setObservacaoInicial] = useState("");
  const [evidAcomp, setEvidAcomp] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // ✅ resumo premiacao (Supabase A)
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoErr, setResumoErr] = useState("");
  const [resumoTotais, setResumoTotais] = useState({ dias: 0, km: 0, litros: 0, kml: 0 });
  const [resumoVeiculos, setResumoVeiculos] = useState([]);

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

  // ✅ busca resumo quando chapa + periodo estiverem preenchidos
  useEffect(() => {
    const chapa = String(motorista?.chapa || "").trim();
    const ini = String(periodoInicio || "").trim();
    const fim = String(periodoFim || "").trim();

    // limpa quando faltar info
    if (!chapa || !ini || !fim) {
      setResumoErr("");
      setResumoLoading(false);
      setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
      setResumoVeiculos([]);
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
      } catch (e) {
        if (!alive) return;
        setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
        setResumoVeiculos([]);
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

    // ✅ meta obrigatória
    const metaOk = String(kmlMeta || "").trim().length > 0;

    const evidOk = (evidAcomp || []).length > 0;
    const periodoOk = String(periodoInicio || "").trim() && String(periodoFim || "").trim();

    return motivoOk && kmlOk && metaOk && evidOk && periodoOk;
  }, [
    motorista,
    prefixo,
    linha,
    cluster,
    motivoFinal,
    kmlInicial,
    kmlMeta,
    evidAcomp,
    periodoInicio,
    periodoFim,
  ]);

  function limpar() {
    setMotorista({ chapa: "", nome: "" });
    setPrefixo("");
    setLinha("");
    setCluster("");
    setMotivo(MOTIVOS[0]);
    setMotivoOutro("");
    setKmlInicial("");
    setKmlMeta("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setObservacaoInicial("");
    setEvidAcomp([]);
    setErrMsg("");
    setOkMsg("");

    // ✅ limpa resumo
    setResumoLoading(false);
    setResumoErr("");
    setResumoTotais({ dias: 0, km: 0, litros: 0, kml: 0 });
    setResumoVeiculos([]);
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

      const folder = `diesel/acompanhamentos/${motorista.chapa || "sem_chapa"}/lancamento_${Date.now()}`;
      const uploaded = await uploadManyToStorage({
        files: evidAcomp,
        bucket: "diesel",
        folder,
      });

      const evidenciasUrls = uploaded.map((u) => u.publicUrl).filter(Boolean);

      const obsInit = String(observacaoInicial || "").trim() || null;

      const payloadAcomp = {
        motorista_chapa: String(motorista?.chapa || "").trim(),
        motorista_nome: String(motorista?.nome || "").trim() || null,
        motivo: motivoFinal,
        status: "A_SER_ACOMPANHADO",
        dias_monitoramento: Number(dias),

        dt_inicio: new Date().toISOString().slice(0, 10),
        dt_inicio_monitoramento: null,
        dt_fim_planejado: null,
        dt_fim_real: null,

        kml_inicial: Number(kmlInicial),

        // ✅ NOVO: grava meta aqui
        kml_meta: Number(kmlMeta),

        kml_final: null,

        observacao_inicial: obsInit,
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

          lancamento_periodo_inicio: String(periodoInicio || "").trim(),
          lancamento_periodo_fim: String(periodoFim || "").trim(),
        },
      };

      const { data: acomp, error: eA } = await supabase
        .from("diesel_acompanhamentos")
        .insert(payloadAcomp)
        .select("id")
        .single();

      if (eA) throw eA;

      const payloadEvento = {
        acompanhamento_id: acomp.id,
        tipo: "LANCAMENTO",
        observacoes: obsInit ? `${motivoFinal}\n\n${obsInit}` : motivoFinal,
        evidencias_urls: evidenciasUrls,

        // guarda kml inicial e meta no evento
        kml: Number(kmlInicial),
        periodo_inicio: String(periodoInicio || "").trim() || null,
        periodo_fim: String(periodoFim || "").trim() || null,

        criado_por_login: lancadorLogin,
        criado_por_nome: lancadorNome,
        criado_por_id: isUuid(user?.id) ? user.id : null,
        extra: {
          prefixo: String(prefixo || "").trim(),
          linha: String(linha || "").trim(),
          cluster: String(cluster || "").trim(),

          kml_meta: Number(kmlMeta),
          evidencias_kml_inicial: true,
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

          <div>
            <label className="block text-sm text-gray-600 mb-1">KM/L inicial (obrigatório)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: 2.41"
              value={kmlInicial}
              onChange={(e) => setKmlInicial(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* ✅ NOVO: meta */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">KM/L meta (obrigatório)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: 2.65"
              value={kmlMeta}
              onChange={(e) => setKmlMeta(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Período analisado do KM/L (obrigatório)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                disabled={saving}
              />
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                disabled={saving}
              />
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

                  {(resumoVeiculos || []).length > 0 && (
                    <div className="mt-3 overflow-auto border rounded-md bg-white">
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
