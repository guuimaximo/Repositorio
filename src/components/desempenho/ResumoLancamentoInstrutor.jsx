import React, { useMemo } from "react";
import { FaCheck, FaTimes, FaQuestionCircle, FaClock } from "react-icons/fa";

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalizeStatus(s) {
  const st = String(s || "").toUpperCase().trim();
  if (!st) return "AGUARDANDO_INSTRUTOR";
  if (st === "AGUARDANDO INSTRUTOR") return "AGUARDANDO_INSTRUTOR";
  if (st === "CONCLUIDO") return "CONCLUIDO";
  if (st === "AG_ACOMPANHAMENTO") return "AGUARDANDO_INSTRUTOR";
  return st;
}

function fmtBool(val) {
  if (val === true) return { label: "SIM", cls: "bg-emerald-50 border-emerald-200 text-emerald-700", Icon: FaCheck };
  if (val === false) return { label: "NÃO", cls: "bg-rose-50 border-rose-200 text-rose-700", Icon: FaTimes };
  return { label: "—", cls: "bg-gray-50 border-gray-200 text-gray-500", Icon: FaClock };
}

function fmtTec(val) {
  const v = String(val || "").toUpperCase();
  if (v === "SIM") return { label: "SIM", cls: "bg-emerald-50 border-emerald-200 text-emerald-700", Icon: FaCheck };
  if (v === "NAO" || v === "NÃO") return { label: "NÃO", cls: "bg-rose-50 border-rose-200 text-rose-700", Icon: FaTimes };
  if (v === "DUVIDAS" || v === "DÚVIDAS") return { label: "DÚVIDAS", cls: "bg-amber-50 border-amber-200 text-amber-700", Icon: FaQuestionCircle };
  return { label: "—", cls: "bg-gray-50 border-gray-200 text-gray-500", Icon: FaClock };
}

const CONDUCAO_LABELS = [
  { id: "mecanica", titulo: "Mecânica" },
  { id: "eficiencia_rpm", titulo: "Eficiência (RPM)" },
  { id: "inerciaparada", titulo: "Inércia/Parada" },
  { id: "suavidade", titulo: "Suavidade" },
  { id: "seguranca", titulo: "Segurança" },
  { id: "postura", titulo: "Postura" },
  { id: "documentacao", titulo: "Documentação" },
];

const TECNICA_LABELS = [
  { id: "freio_motor", titulo: "Freio Motor" },
  { id: "regeneracao_dpf", titulo: "Regeneração (DPF)" },
  { id: "acelerador_cenarios", titulo: "Acelerador por Cenário" },
];

function extractChecklist(raw) {
  // Suporta tanto o formato antigo quanto o novo:
  // - novo: { versao, conducao: {...}, tecnica: {...} }
  // - antigo: { ... } (caso venha flat)
  if (!raw || typeof raw !== "object") return { conducao: {}, tecnica: {}, versao: null };

  const versao = raw.versao || null;

  const conducao = raw.conducao && typeof raw.conducao === "object" ? raw.conducao : {};
  const tecnica = raw.tecnica && typeof raw.tecnica === "object" ? raw.tecnica : {};

  return { versao, conducao, tecnica };
}

export default function ResumoLancamentoInstrutor({ item }) {
  const st = normalizeStatus(item?.status);

  const temLancamento = useMemo(() => {
    // regra: apareceu lançamento se tiver qualquer um desses sinais
    if (item?.intervencao_hora_inicio) return true;
    if (item?.intervencao_media_teste != null && String(item.intervencao_media_teste) !== "") return true;
    if (item?.instrutor_login || item?.instrutor_nome) return true;
    if (item?.dt_inicio_monitoramento || item?.dt_fim_previsao) return true;
    if (item?.intervencao_checklist) return true;
    return false;
  }, [item]);

  if (!temLancamento) {
    return (
      <div className="p-4 rounded-lg border bg-gray-50 text-sm text-gray-500">
        Ainda não há lançamento do instrutor para esta ordem.
      </div>
    );
  }

  const checklist = extractChecklist(item?.intervencao_checklist);
  const provaKmIni = item?.intervencao_km_inicio != null ? n(item.intervencao_km_inicio) : null;
  const provaKmFim = item?.intervencao_km_fim != null ? n(item.intervencao_km_fim) : null;

  return (
    <div className="p-4 rounded-lg border bg-white space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-700 uppercase">Resumo do lançamento do instrutor</div>
          <div className="text-[12px] text-slate-500">
            Status atual: <span className="font-bold">{st}</span>
            {checklist.versao ? <span className="ml-2 font-mono text-[11px] text-slate-400">({checklist.versao})</span> : null}
          </div>
        </div>

        <div className="text-right text-[12px] text-slate-600">
          <div className="font-bold">{item?.instrutor_nome || "—"}</div>
          <div className="text-slate-400 font-mono">{item?.instrutor_login || "—"}</div>
        </div>
      </div>

      {/* Prova */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded border bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500">Hora Início</div>
          <div className="text-sm font-extrabold text-slate-800">{item?.intervencao_hora_inicio || "—"}</div>
        </div>
        <div className="p-3 rounded border bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500">Hora Fim</div>
          <div className="text-sm font-extrabold text-slate-800">{item?.intervencao_hora_fim || "—"}</div>
        </div>
        <div className="p-3 rounded border bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500">KM Início</div>
          <div className="text-sm font-extrabold text-slate-800">{provaKmIni != null ? provaKmIni.toFixed(0) : "—"}</div>
        </div>
        <div className="p-3 rounded border bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500">KM Fim</div>
          <div className="text-sm font-extrabold text-slate-800">{provaKmFim != null ? provaKmFim.toFixed(0) : "—"}</div>
        </div>

        <div className="p-3 rounded border bg-blue-50 border-blue-200 col-span-2 md:col-span-2">
          <div className="text-[10px] font-bold text-blue-700">Média do Teste (KM/L)</div>
          <div className="text-lg font-extrabold text-blue-800">
            {item?.intervencao_media_teste != null && String(item.intervencao_media_teste) !== ""
              ? n(item.intervencao_media_teste).toFixed(2)
              : "—"}
          </div>
        </div>

        <div className="p-3 rounded border bg-gray-50 col-span-2 md:col-span-2">
          <div className="text-[10px] font-bold text-slate-500">Período Monitoramento</div>
          <div className="text-sm font-extrabold text-slate-800">
            {item?.dt_inicio_monitoramento || "—"} → {item?.dt_fim_previsao || "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Nível {item?.nivel ?? "—"} • {item?.dias_monitoramento ?? "—"} dias
          </div>
        </div>
      </div>

      {/* Checklist Condução */}
      <div>
        <div className="text-xs font-extrabold text-slate-700 mb-2 uppercase">Checklist de Condução</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CONDUCAO_LABELS.map((c) => {
            const val = checklist.conducao?.[c.id];
            const badge = fmtBool(val);
            const Icon = badge.Icon;
            return (
              <div key={c.id} className="p-3 rounded border bg-white flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-700">{c.titulo}</div>
                <div className={`px-2 py-1 rounded border text-[11px] font-extrabold inline-flex items-center gap-2 ${badge.cls}`}>
                  <Icon /> {badge.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avaliação Técnica */}
      <div>
        <div className="text-xs font-extrabold text-slate-700 mb-2 uppercase">Avaliação Técnica (Sistemas)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TECNICA_LABELS.map((t) => {
            const val = checklist.tecnica?.[t.id];
            const badge = fmtTec(val);
            const Icon = badge.Icon;
            return (
              <div key={t.id} className="p-3 rounded border bg-white flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-700">{t.titulo}</div>
                <div className={`px-2 py-1 rounded border text-[11px] font-extrabold inline-flex items-center gap-2 ${badge.cls}`}>
                  <Icon /> {badge.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Observação */}
      <div className="p-3 rounded border bg-gray-50">
        <div className="text-[10px] font-bold text-slate-500 uppercase">Observação do Instrutor</div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap">{item?.intervencao_obs || "—"}</div>
      </div>
    </div>
  );
}
