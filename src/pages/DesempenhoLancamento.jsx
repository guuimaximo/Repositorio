// src/pages/DesempenhoLancamento.jsx
import { useMemo, useState } from "react";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";
import { useAuth } from "../context/AuthContext"; // se não existir, remova esta linha e use responsável manual

const MOTIVOS = [
  "KM/L abaixo da meta",
  "Tendência de queda",
  "Comparativo com cluster",
  "Outro",
];

const DIAS_OPCOES = [7, 15, 30];

const ORIENTACOES_SUGESTOES = [
  { key: "conducao", label: "Condução econômica" },
  { key: "lenta", label: "Redução de lenta" },
  { key: "aceleracao", label: "Aceleração progressiva" },
  { key: "marcha", label: "Troca de marcha" },
  { key: "freio_motor", label: "Uso correto do freio motor" },
];

const TIPOS_TRATATIVA = [
  "Orientação",
  "Advertência",
  "Suspensão",
  "Aviso de última oportunidade",
  "Contato Pessoal",
  "Contato via Celular",
  "Elogiado",
  "Não aplicada",
];

function hojeYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export default function DesempenhoLancamento() {
  // Se você não tiver useAuth, comente a linha do import e troque responsavelAuto por "".
  let responsavelAuto = "";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth?.() || {};
    responsavelAuto = user?.nome || user?.login || "";
  } catch {
    responsavelAuto = "";
  }

  // Reaproveita os componentes existentes (motoristas / prefixos)
  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });
  const [prefixo, setPrefixo] = useState("");

  // Contexto operacional
  const [linha, setLinha] = useState(""); // linha que ele trabalha (obrigatório)
  const [cluster, setCluster] = useState(""); // opcional (se quiser usar)
  const [periodo, setPeriodo] = useState(""); // ex: 2026-01

  // Tipo de fluxo
  const [tipo, setTipo] = useState("ACOMPANHAMENTO"); // ACOMPANHAMENTO | TRATATIVA

  // Motivo / contexto
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOutro, setMotivoOutro] = useState("");

  // Acompanhamento — plano
  const [orientacoesMarcadas, setOrientacoesMarcadas] = useState(() => {
    const obj = {};
    ORIENTACOES_SUGESTOES.forEach((o) => (obj[o.key] = false));
    return obj;
  });
  const [orientacaoTexto, setOrientacaoTexto] = useState("");
  const [dias, setDias] = useState(7);
  const [kmlMeta, setKmlMeta] = useState(""); // ≥ 2,60
  const [dtInicio] = useState(hojeYYYYMMDD()); // automático
  const [statusInicial] = useState("Em acompanhamento"); // fixo no lançamento

  // Evidências (multi-arquivo + PDF)
  const [evidAcompInstrutor, setEvidAcompInstrutor] = useState([]);
  const [evidOrientacao, setEvidOrientacao] = useState([]);

  // Tratativa — campos específicos
  const [tipoTratativa, setTipoTratativa] = useState(TIPOS_TRATATIVA[0]);
  const [acaoAplicada, setAcaoAplicada] = useState("");
  const [conclusao, setConclusao] = useState("");
  const [evidTratativa, setEvidTratativa] = useState([]);

  function addFiles(setter) {
    return (e) => {
      const list = filesToList(e.target.files);
      setter((prev) => {
        const merged = [...(prev || []), ...list];
        // remove duplicados por (name+size+lastModified)
        const seen = new Set();
        return merged.filter((x) => {
          const k = `${x.name}__${x.size}__${x.lastModified}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      });
      e.target.value = "";
    };
  }

  function removeFile(setter, idx) {
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  const prontoParaSalvar = useMemo(() => {
    const baseOk =
      (motorista?.chapa || motorista?.nome) &&
      String(prefixo || "").trim().length > 0 &&
      String(linha || "").trim().length > 0 &&
      String(periodo || "").trim().length > 0 &&
      String(motivoFinal || "").trim().length > 0;

    if (!baseOk) return false;

    if (tipo === "ACOMPANHAMENTO") {
      const orientacaoOk = String(orientacaoTexto || "").trim().length > 0;
      const evidInstrutorOk = (evidAcompInstrutor || []).length > 0; // recomendado/forte (protege o processo)
      const metaOk = String(kmlMeta || "").trim().length > 0;
      const diasOk = Number(dias) >= 1;

      return orientacaoOk && evidInstrutorOk && metaOk && diasOk;
    }

    // TRATATIVA
    const acaoOk = String(acaoAplicada || "").trim().length > 0;
    const conclusaoOk = String(conclusao || "").trim().length > 0;
    const evidOk = (evidTratativa || []).length > 0; // recomendado
    return acaoOk && conclusaoOk && evidOk;
  }, [
    motorista,
    prefixo,
    linha,
    periodo,
    motivoFinal,
    tipo,
    orientacaoTexto,
    evidAcompInstrutor,
    kmlMeta,
    dias,
    acaoAplicada,
    conclusao,
    evidTratativa,
  ]);

  function limparTudo() {
    setMotorista({ chapa: "", nome: "" });
    setPrefixo("");
    setLinha("");
    setCluster("");
    setPeriodo("");
    setTipo("ACOMPANHAMENTO");
    setMotivo(MOTIVOS[0]);
    setMotivoOutro("");

    setOrientacoesMarcadas(() => {
      const obj = {};
      ORIENTACOES_SUGESTOES.forEach((o) => (obj[o.key] = false));
      return obj;
    });
    setOrientacaoTexto("");
    setDias(7);
    setKmlMeta("");
    setEvidAcompInstrutor([]);
    setEvidOrientacao([]);

    setTipoTratativa(TIPOS_TRATATIVA[0]);
    setAcaoAplicada("");
    setConclusao("");
    setEvidTratativa([]);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Porta de entrada do fluxo: <b>Acompanhamento</b> (sem punição) ou <b>Tratativa</b>.
          Evidências aceitam múltiplos arquivos e PDF.
        </p>
      </div>

      {/* BLOCO 1 — Motorista */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Motorista</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista (nome + chapa)" />
          <CampoPrefixo value={prefixo} onChange={setPrefixo} label="Prefixo" />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo do Lançamento</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="ACOMPANHAMENTO">Acompanhamento</option>
              <option value="TRATATIVA">Tratativa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Linha (obrigatório)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: 07TR, 10TR..."
              value={linha}
              onChange={(e) => setLinha(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Cluster (opcional)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: C10, C9..."
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Período analisado</label>
            <input
              type="month"
              className="w-full rounded-md border px-3 py-2"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* BLOCO 2 — Motivo */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Motivo do {tipo === "ACOMPANHAMENTO" ? "Acompanhamento" : "Lançamento de Tratativa"}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Selecione o motivo</label>
            <div className="space-y-2">
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
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Contexto (quando necessário)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder={motivo === "Outro" ? "Descreva o motivo..." : "Detalhe adicional (opcional)"}
              value={motivo === "Outro" ? motivoOutro : ""}
              onChange={(e) => setMotivoOutro(e.target.value)}
              disabled={motivo !== "Outro"}
            />
            <p className="text-xs text-gray-500 mt-2">
              Aqui nasce o contexto: o sistema precisa ficar defensável e rastreável.
            </p>
          </div>
        </div>
      </div>

      {/* ACOMPANHAMENTO — blocos específicos */}
      {tipo === "ACOMPANHAMENTO" && (
        <>
          {/* BLOCO 3 — Plano de Acompanhamento */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Plano de Acompanhamento</h2>

            <label className="block text-sm text-gray-600 mb-2">Orientações aplicadas (checklist)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {ORIENTACOES_SUGESTOES.map((o) => (
                <label key={o.key} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={!!orientacoesMarcadas[o.key]}
                    onChange={(e) =>
                      setOrientacoesMarcadas((prev) => ({ ...prev, [o.key]: e.target.checked }))
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>

            <label className="block text-sm text-gray-600 mb-1">O que foi combinado com o motorista (obrigatório)</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[110px]"
              placeholder='Ex.: "Orientado sobre aceleração progressiva e redução de lenta."'
              value={orientacaoTexto}
              onChange={(e) => setOrientacaoTexto(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Evidências do acompanhamento (o que o instrutor fez) — múltiplos arquivos/PDF
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="w-full rounded-md border px-3 py-2"
                  onChange={addFiles(setEvidAcompInstrutor)}
                />

                {(evidAcompInstrutor || []).length > 0 && (
                  <div className="mt-2 border rounded-md">
                    {evidAcompInstrutor.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                          <div className="text-xs text-gray-500">
                            {(f.type || "arquivo")} • {(f.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => removeFile(setEvidAcompInstrutor, idx)}
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado como obrigatório para padronizar e proteger o processo.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Evidência da orientação (se houver) — múltiplos arquivos/PDF
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="w-full rounded-md border px-3 py-2"
                  onChange={addFiles(setEvidOrientacao)}
                />

                {(evidOrientacao || []).length > 0 && (
                  <div className="mt-2 border rounded-md">
                    {evidOrientacao.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                          <div className="text-xs text-gray-500">
                            {(f.type || "arquivo")} • {(f.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => removeFile(setEvidOrientacao, idx)}
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

          {/* BLOCO 4 — Regra de Monitoramento */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Regra de Monitoramento</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Período de acompanhamento</label>
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
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Indicador monitorado</label>
                <input
                  className="w-full rounded-md border px-3 py-2 bg-gray-50"
                  value="KM/L"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Meta esperada (KM/L) — obrigatório</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ex.: 2.60"
                  value={kmlMeta}
                  onChange={(e) => setKmlMeta(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* BLOCO 5 — Status Inicial */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Status Inicial</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <input
                  className="w-full rounded-md border px-3 py-2 bg-gray-50"
                  value={statusInicial}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Responsável</label>
                <input
                  className="w-full rounded-md border px-3 py-2 bg-gray-50"
                  value={responsavelAuto || "Automático (via login)"}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Data de início</label>
                <input className="w-full rounded-md border px-3 py-2 bg-gray-50" value={dtInicio} readOnly />
              </div>
            </div>
          </div>
        </>
      )}

      {/* TRATATIVA — campos específicos */}
      {tipo === "TRATATIVA" && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Tratativa</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo de tratativa</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={tipoTratativa}
                onChange={(e) => setTipoTratativa(e.target.value)}
              >
                {TIPOS_TRATATIVA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Ação aplicada (obrigatório)</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Ex.: Advertência aplicada após reincidência..."
                value={acaoAplicada}
                onChange={(e) => setAcaoAplicada(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">Conclusão / Observação final (obrigatório)</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 min-h-[110px]"
                placeholder="Descreva o desfecho e o que ficou definido."
                value={conclusao}
                onChange={(e) => setConclusao(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">
                Evidências da tratativa realizada — múltiplos arquivos/PDF
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
                    <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
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

              <p className="text-xs text-gray-500 mt-2">
                Quando a tratativa nascer de um acompanhamento, esta tela deve herdar automaticamente todo o histórico e evidências do acompanhamento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AÇÕES */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          onClick={limparTudo}
        >
          Cancelar / Limpar
        </button>

        <button
          type="button"
          disabled={!prontoParaSalvar}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={() => {
            // ✅ próximo passo: salvar no Supabase
            // - acompanhamento: diesel_acompanhamentos + evento LANCAMENTO + uploads evidências
            // - tratativa: tratar como criação direta (ou vincular se já veio de acompanhamento)
            alert("Pronto para conectar com Supabase: salvar + eventos + evidências (multi-arquivo/PDF).");
          }}
        >
          {tipo === "ACOMPANHAMENTO" ? "Iniciar acompanhamento" : "Criar tratativa"}
        </button>
      </div>

      {/* NOTA GOVERNANÇA */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900">Governança / Próximo passo</h3>
        <p className="text-sm text-amber-900 mt-1">
          A UI já está no padrão do fluxo:
          <br />• Motorista + Linha/Cluster + Período
          <br />• Motivo padronizado
          <br />• Acompanhamento: orientação (checklist + texto), monitoramento (dias, meta KM/L), status/responsável/data automáticos, evidências (instrutor + orientação)
          <br />• Tratativa: tipo/ação/conclusão + evidências
          <br />
          <br />
          Agora é só ligar com as tabelas do Supabase (diesel_acompanhamentos, diesel_acompanhamento_eventos e integração com tratativas) e o upload para Storage.
        </p>
      </div>
    </div>
  );
}
