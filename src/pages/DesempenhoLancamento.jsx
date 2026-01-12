// src/pages/DesempenhoLancamento.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";

const MOTIVOS = [
  "KM/L abaixo da meta",
  "Tendência de queda",
  "Comparativo com cluster",
  "Outro",
];

const DIAS_OPCOES = [7, 15, 30];

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
  const navigate = useNavigate();

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
  const [acaoRealizada, setAcaoRealizada] = useState(""); // advertido, orientado, tirado de escala, etc
  const [evidTratativa, setEvidTratativa] = useState([]); // multi + PDF

  // Histórico (por enquanto placeholder; depois liga no Supabase)
  const [historicoResumo] = useState([
    // Exemplo (trocar por fetch no Supabase depois)
    // { tipo: "ACOMPANHAMENTO", data: "2026-01-01", status: "OK", detalhe: "KM/L atingiu meta" },
  ]);

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  function addFiles(setter) {
    return (e) => {
      const list = filesToList(e.target.files);
      setter((prev) => {
        const merged = [...(prev || []), ...list];
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
    const evidOk = (evidAcomp || []).length > 0; // você pediu evidência no lançamento do acompanhamento
    return motivoOk && diasOk && kmlOk && evidOk;
  }, [baseOk, motivoFinal, dias, kmlInicial, evidAcomp]);

  const prontoTratativa = useMemo(() => {
    if (!baseOk) return false;
    const acaoOk = String(acaoRealizada || "").trim().length > 0;
    const evidOk = (evidTratativa || []).length > 0;
    return acaoOk && evidOk;
  }, [baseOk, acaoRealizada, evidTratativa]);

  const pronto = tipo === "ACOMPANHAMENTO" ? prontoAcompanhamento : prontoTratativa;

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
  }

  function handleAvancar() {
    if (tipo === "ACOMPANHAMENTO") {
      // ✅ por enquanto: só navega para a tela de Acompanhamento
      // depois: salvar no Supabase e aí navegar
      navigate("/desempenho-diesel#acompanhamento");
      return;
    }

    // TRATATIVA: por enquanto permanece aqui (depois: salvar e navegar para a tela de Tratativas)
    navigate("/desempenho-diesel#tratativas");
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Preencha os dados básicos e escolha o Tipo de Lançamento. O tipo define o próximo passo.
        </p>
      </div>

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

      {/* SEÇÃO — ACOMPANHAMENTO (apenas o que você pediu por enquanto) */}
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
                Evidências (instrutor / lançamento) — múltiplos arquivos + PDF
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

            {/* Histórico resumido (em baixo) */}
            <div className="md:col-span-3 pt-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Histórico (resumo rápido)
              </h3>

              {historicoResumo.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhum histórico encontrado (quando ligar no Supabase, aqui aparece se já foi acompanhamento ou tratativa e se melhorou/piorou).
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

      {/* SEÇÃO — TRATATIVA */}
      {tipo === "TRATATIVA" && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Tratativa</h2>

          {/* Histórico detalhado (placeholder por enquanto) */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Histórico do acompanhamento (detalhado + evidências)
            </h3>

            <div className="text-sm text-gray-500">
              Em breve: aqui vamos puxar do Supabase todos os eventos do acompanhamento + evidências (instrutor/orientação/checkpoints) e mostrar em detalhe antes de concluir a tratativa.
            </div>
          </div>

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
        >
          Limpar
        </button>

        <button
          type="button"
          disabled={!pronto}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={handleAvancar}
        >
          {tipo === "ACOMPANHAMENTO" ? "Iniciar acompanhamento" : "Ir para Tratativas"}
        </button>
      </div>
    </div>
  );
}
