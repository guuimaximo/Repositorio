// src/pages/DesempenhoLancamento.jsx
import { useMemo, useState } from "react";
import CampoMotorista from "../components/CampoMotorista";
import CampoPrefixo from "../components/CampoPrefixo";

export default function DesempenhoLancamento() {
  // Reaproveita os componentes existentes (motoristas / prefixos)
  const [motorista, setMotorista] = useState({ chapa: "", nome: "" });
  const [prefixo, setPrefixo] = useState("");

  // Somente UI por enquanto (governança: não quebra build / não depende de tabelas novas)
  const [tipo, setTipo] = useState("ACOMPANHAMENTO"); // ACOMPANHAMENTO | TRATATIVA
  const [motivo, setMotivo] = useState("");
  const [dias, setDias] = useState(7);

  const prontoParaAvancar = useMemo(() => {
    return (motorista?.chapa || motorista?.nome) && prefixo && motivo.trim().length > 0;
  }, [motorista, prefixo, motivo]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel — Lançamento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Tela em conclusão: estrutura pronta (motorista/prefixo/tipo). A gravação + histórico será
          conectada no próximo passo.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">📌 Dados do Lançamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista" />

          <CampoPrefixo value={prefixo} onChange={setPrefixo} label="Prefixo" />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="ACOMPANHAMENTO">Acompanhamento</option>
              <option value="TRATATIVA">Tratativa</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Motivo / Contexto</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: KM/L abaixo da meta, reincidência, alerta do ranking..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Dias de monitoramento</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-md border px-3 py-2"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value || 7))}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            onClick={() => {
              setMotorista({ chapa: "", nome: "" });
              setPrefixo("");
              setTipo("ACOMPANHAMENTO");
              setMotivo("");
              setDias(7);
            }}
          >
            Limpar
          </button>

          <button
            type="button"
            disabled={!prontoParaAvancar}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={() => alert("Em conclusão: no próximo passo vamos salvar e gerar histórico.")}
          >
            Avançar
          </button>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900">⚠ Em conclusão</h3>
        <p className="text-sm text-amber-900 mt-1">
          Esta página está criada para não quebrar o deploy. Na próxima etapa, vamos:
          <br />• salvar no Supabase (tabelas do Desempenho Diesel)
          <br />• anexar evidências (multi-arquivo/PDF)
          <br />• gerar o histórico de eventos (lançamento, orientação, checkpoints, melhora/escala)
        </p>
      </div>
    </div>
  );
}
