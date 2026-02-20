import React from "react";
import { FaChartLine, FaCheckCircle, FaExclamationTriangle, FaGasPump, FaRoad } from "react-icons/fa";

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function ResumoAnalise({ item }) {
  if (!item) return null;

  const kmlMeta = n(item.kml_meta);
  const kmlFinal = n(item.kml_final_realizado);
  const evolucao = n(item.evolucao_pct);
  const desperdicio = n(item.desperdicio_final_litros);
  const isAtas = item.status === "ATAS";

  return (
    <div className="p-4 rounded-xl border bg-white space-y-6">
      {/* Cabeçalho da Análise */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 uppercase">
            <FaChartLine className="text-indigo-600" /> Resultado do Monitoramento
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Período avaliado: {item.dt_inicio_monitoramento || "—"} até {item.dt_fim_previsao || "—"}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border font-bold text-xs flex items-center gap-2 ${
          isAtas ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {isAtas ? <FaExclamationTriangle size={14} /> : <FaCheckCircle size={14} />}
          {isAtas ? "ABAIXO DA META (ATAS)" : "META ATINGIDA (ENCERRADO)"}
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Meta (KM/L)</div>
          <div className="text-lg font-black text-slate-700">{kmlMeta.toFixed(2)}</div>
        </div>

        <div className="p-4 rounded-lg border bg-blue-50 border-blue-100">
          <div className="text-[10px] font-bold text-blue-600 uppercase">Realizado (KM/L)</div>
          <div className="text-lg font-black text-blue-800">{kmlFinal.toFixed(2)}</div>
        </div>

        <div className={`p-4 rounded-lg border ${evolucao > 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
          <div className={`text-[10px] font-bold uppercase ${evolucao > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            Evolução
          </div>
          <div className={`text-lg font-black ${evolucao > 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {evolucao > 0 ? "+" : ""}{evolucao.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-amber-50 border-amber-100">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Desperdício (L)</div>
          <div className="text-lg font-black text-amber-800">{desperdicio.toFixed(1)} L</div>
        </div>
      </div>

      {/* Log e Observações */}
      <div className="p-4 rounded-lg border bg-gray-50">
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">
          Parecer do Instrutor & Log do Sistema
        </div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
          {item.intervencao_obs || "Nenhum log registrado."}
        </div>
      </div>
    </div>
  );
}
