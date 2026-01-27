// src/pages/PCMResumo.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "../components/tatico/Layout";
import { supabase } from "../supabase";
import {
  FaSearch,
  FaTimes,
  FaCar,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaChartLine,
  FaRedo,
} from "react-icons/fa";

/* =========================
   HELPERS (datas / números)
========================= */

function toISODate(d) {
  // d: Date
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function startOfMonthISO(iso) {
  const [y, m] = iso.split("-").map((x) => parseInt(x, 10));
  const d = new Date(y, m - 1, 1);
  return toISODate(d);
}

function endOfMonthISO(iso) {
  const [y, m] = iso.split("-").map((x) => parseInt(x, 10));
  const d = new Date(y, m, 0); // último dia do mês
  return toISODate(d);
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function fmtBRDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso || "-";
  }
}

function fmtBRDateTime(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  } catch {
    return iso || "-";
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(n, dec = 2) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Number(v.toFixed(dec));
}

function daysDiff(d1, d2) {
  // d2 - d1 (em dias inteiros)
  try {
    const a = new Date(d1).getTime();
    const b = new Date(d2).getTime();
    return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function monthKeyFromISODate(isoDate) {
  // isoDate: YYYY-MM-DD
  return String(isoDate || "").slice(0, 7);
}

/* =========================
   CHIP (filtros rápidos)
========================= */

function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-black border transition-all ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-800 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================
   MINI BARRA (aging)
========================= */

function AgingBar({ buckets }) {
  const total =
    (buckets["0-1"] || 0) +
    (buckets["2-3"] || 0) +
    (buckets["4-7"] || 0) +
    (buckets["8-15"] || 0) +
    (buckets["16+"] || 0);

  const parts = [
    { k: "0-1", label: "0–1" },
    { k: "2-3", label: "2–3" },
    { k: "4-7", label: "4–7" },
    { k: "8-15", label: "8–15" },
    { k: "16+", label: "16+" },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase">
        <span>Aging (dias parado) — abertos</span>
        <span>Total: {total}</span>
      </div>

      <div className="mt-2 w-full h-3 rounded-full overflow-hidden border bg-gray-100 flex">
        {parts.map((p) => {
          const v = buckets[p.k] || 0;
          const w = total ? (v / total) * 100 : 0;
          return (
            <div
              key={p.k}
              style={{ width: `${w}%` }}
              className="h-full bg-gray-900/80"
              title={`${p.label}: ${v}`}
            />
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2">
        {parts.map((p) => (
          <div
            key={p.k}
            className="bg-white border rounded-lg p-2 text-center"
          >
            <div className="text-[10px] font-black text-gray-500 uppercase">
              {p.label}
            </div>
            <div className="text-base font-black">{buckets[p.k] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   MODAL: DETALHE FROTA
========================= */

function FrotaDetalheModal({ open, onClose, frota, rows, periodo }) {
  if (!open) return null;

  const sorted = [...(rows || [])].sort((a, b) => {
    const ta = new Date(a.data_entrada || 0).getTime();
    const tb = new Date(b.data_entrada || 0).getTime();
    return ta - tb;
  });

  // monta "ciclos" (entrada -> saída)
  const ciclos = sorted.map((r) => {
    const dtIn = r.data_entrada;
    const dtOut = r.data_saida || null;
    const dias = dtIn
      ? daysDiff(
          dtIn,
          dtOut ? dtOut : new Date().toISOString()
        )
      : 0;
    return { ...r, _dias: dias };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Detalhe da frota (reincidência)
            </div>
            <div className="text-xl font-black text-gray-900 flex items-center gap-2">
              <FaCar />
              {frota || "-"}
              <span className="ml-2 text-xs font-black px-2 py-1 rounded-full bg-gray-100">
                Período: {fmtBRDate(periodo?.inicio)} → {fmtBRDate(periodo?.fim)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Fechar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 text-white rounded-xl p-4">
              <div className="text-[10px] font-black text-gray-300 uppercase">
                Entradas no período
              </div>
              <div className="text-3xl font-black mt-1">{sorted.length}</div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-[10px] font-black text-gray-500 uppercase">
                Última entrada
              </div>
              <div className="text-base font-black mt-1">
                {fmtBRDateTime(sorted?.[sorted.length - 1]?.data_entrada)}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-[10px] font-black text-gray-500 uppercase">
                Última saída
              </div>
              <div className="text-base font-black mt-1">
                {fmtBRDateTime(sorted?.[sorted.length - 1]?.data_saida) || "—"}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-[10px] font-black text-gray-500 uppercase">
                Status atual
              </div>
              <div className="text-base font-black mt-1">
                {sorted?.[sorted.length - 1]?.data_saida ? (
                  <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-800 text-xs font-black">
                    Fechado
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black">
                    Em aberto
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-black text-gray-500 uppercase mb-2">
              Linha do tempo (entradas/saídas) + descrições
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b font-black">
                    <th className="p-3 border-r whitespace-nowrap">Data Ref</th>
                    <th className="p-3 border-r whitespace-nowrap">Entrada</th>
                    <th className="p-3 border-r whitespace-nowrap">Saída</th>
                    <th className="p-3 border-r text-center whitespace-nowrap">
                      Dias
                    </th>
                    <th className="p-3 border-r whitespace-nowrap">Categoria</th>
                    <th className="p-3 border-r whitespace-nowrap">Setor</th>
                    <th className="p-3 border-r whitespace-nowrap">O.S</th>
                    <th className="p-3 border-r w-[520px]">Descrição</th>
                    <th className="p-3 whitespace-nowrap">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {ciclos.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3 border-r font-black text-[11px]">
                        {fmtBRDate(r.data_referencia)}
                      </td>
                      <td className="p-3 border-r">{fmtBRDateTime(r.data_entrada)}</td>
                      <td className="p-3 border-r">{fmtBRDateTime(r.data_saida)}</td>
                      <td className="p-3 border-r text-center font-black">
                        {r._dias}
                      </td>
                      <td className="p-3 border-r text-[11px] font-black">
                        {r.categoria || "-"}
                      </td>
                      <td className="p-3 border-r text-[11px] font-black">
                        {r.setor || "-"}
                      </td>
                      <td className="p-3 border-r font-black">
                        {r.ordem_servico || "-"}
                      </td>
                      <td className="p-3 border-r text-[11px] font-semibold uppercase">
                        {r.descricao || "-"}
                      </td>
                      <td className="p-3 text-[11px] font-semibold uppercase">
                        {r.observacao || "-"}
                      </td>
                    </tr>
                  ))}
                  {ciclos.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-500 font-bold">
                        Sem registros para esta frota.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-[11px] text-gray-500 font-semibold">
              Observação: este detalhe considera as entradas dentro do período selecionado (por data_entrada).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PAGE: PCMResumo
========================= */

const QUICK_PERIODS = [
  { key: "MES_ATUAL", label: "Mês atual" },
  { key: "ULT_30", label: "Últimos 30 dias" },
  { key: "INTERVALO", label: "Intervalo" },
];

export default function PCMResumo() {
  // período
  const hojeISO = useMemo(() => toISODate(new Date()), []);
  const mesAtualIni = useMemo(() => startOfMonthISO(hojeISO), [hojeISO]);
  const mesAtualFim = useMemo(() => endOfMonthISO(hojeISO), [hojeISO]);

  const [periodMode, setPeriodMode] = useState("MES_ATUAL");
  const [inicio, setInicio] = useState(mesAtualIni);
  const [fim, setFim] = useState(mesAtualFim);

  // dados
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // série mensal (média GNS/dia por mês)
  const [serieMensal, setSerieMensal] = useState([]);

  // base do período
  const [diasPCM, setDiasPCM] = useState([]); // pcm_diario do período (datas)
  const [veiculosPeriodo, setVeiculosPeriodo] = useState([]); // veiculos_pcm no período

  // reincidência
  const [reincidencias, setReincidencias] = useState([]); // tabela
  const [reincQuery, setReincQuery] = useState("");

  // top 5
  const [topParado, setTopParado] = useState([]);
  const [topReinc, setTopReinc] = useState([]);

  // detalhe frota
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFrota, setModalFrota] = useState(null);
  const [modalRows, setModalRows] = useState([]);

  const periodoAtual = useMemo(() => ({ inicio, fim }), [inicio, fim]);

  // aplica modo de período
  useEffect(() => {
    if (periodMode === "MES_ATUAL") {
      setInicio(mesAtualIni);
      setFim(mesAtualFim);
    } else if (periodMode === "ULT_30") {
      const ini = addDaysISO(hojeISO, -29);
      setInicio(ini);
      setFim(hojeISO);
    }
    // INTERVALO mantém o que já está
  }, [periodMode, hojeISO, mesAtualIni, mesAtualFim]);

  // =========================
  // FETCHERS
  // =========================

  const carregarSerieMensal = useCallback(async () => {
    // série com: mes, dias_com_pcm, total_gns, media_gns_dia
    // Vamos fazer em 2 queries e consolidar em JS (mais robusto no supabase-js).
    // (1) dias com PCM por mês
    const { data: pcms, error: e1 } = await supabase
      .from("pcm_diario")
      .select("data_referencia")
      .order("data_referencia", { ascending: true });

    if (e1) throw e1;

    const diasPorMes = new Map();
    (pcms || []).forEach((p) => {
      const mk = monthKeyFromISODate(p.data_referencia);
      diasPorMes.set(mk, (diasPorMes.get(mk) || 0) + 1);
    });

    // (2) GNS por mês (por data_entrada, fallback data_referencia se precisar)
    // Aqui usamos veiculos_pcm + join “manual”: buscamos data_entrada, pcm_id, categoria
    const { data: veics, error: e2 } = await supabase
      .from("veiculos_pcm")
      .select("categoria, data_entrada, pcm_id")
      .eq("categoria", "GNS");

    if (e2) throw e2;

    // Precisamos do data_referencia do pcm_id se data_entrada não existir
    const needsPcm = (veics || []).some((v) => !v.data_entrada);
    let pcmMap = new Map();

    if (needsPcm) {
      const pcmIds = Array.from(
        new Set((veics || []).map((v) => v.pcm_id).filter(Boolean))
      );

      // chunk para não estourar URL/headers
      const chunkSize = 500;
      for (let i = 0; i < pcmIds.length; i += chunkSize) {
        const chunk = pcmIds.slice(i, i + chunkSize);
        const { data: pcmChunk, error: e3 } = await supabase
          .from("pcm_diario")
          .select("id, data_referencia")
          .in("id", chunk);

        if (e3) throw e3;
        (pcmChunk || []).forEach((p) => pcmMap.set(p.id, p.data_referencia));
      }
    }

    const gnsPorMes = new Map();
    (veics || []).forEach((v) => {
      const dt = v.data_entrada
        ? toISODate(new Date(v.data_entrada))
        : pcmMap.get(v.pcm_id);
      const mk = monthKeyFromISODate(dt);
      if (!mk) return;
      gnsPorMes.set(mk, (gnsPorMes.get(mk) || 0) + 1);
    });

    // consolidar meses presentes em diasPorMes (PCM existente)
    const meses = Array.from(diasPorMes.keys()).sort();
    const out = meses
      .map((mk) => {
        const dias = diasPorMes.get(mk) || 0;
        const total = gnsPorMes.get(mk) || 0;
        const media = dias ? safeNum(total / dias, 2) : 0;
        return { mes: mk, dias_com_pcm: dias, total_gns: total, media_gns_dia: media };
      })
      .reverse(); // últimos meses primeiro

    // opcional: limitar para 18 meses pra não ficar gigante
    setSerieMensal(out.slice(0, 18));
  }, []);

  const carregarPeriodo = useCallback(async () => {
    // Período inclusivo: inicio..fim
    // 1) Dias com PCM no período
    const { data: pcms, error: e1 } = await supabase
      .from("pcm_diario")
      .select("id, data_referencia, criado_por")
      .gte("data_referencia", inicio)
      .lte("data_referencia", fim)
      .order("data_referencia", { ascending: true });

    if (e1) throw e1;

    setDiasPCM(pcms || []);

    // 2) Veículos do período: por data_entrada dentro do período
    // Para garantir: buscamos por data_entrada, mas alguns podem ser nulos.
    // Então fazemos:
    // (a) linhas com data_entrada no período
    // (b) linhas sem data_entrada cujo pcm_diario.data_referencia está no período (join via pcm_id)
    // Para (b), simplificamos: puxar por pcm_id in pcmsIds.
    const pcmIds = (pcms || []).map((p) => p.id);
    const [qA, qB] = await Promise.all([
      supabase
        .from("veiculos_pcm")
        .select(
          "id, pcm_id, frota, setor, categoria, ordem_servico, descricao, observacao, data_entrada, data_saida, lancado_por, lancado_no_turno"
        )
        .gte("data_entrada", `${inicio}T00:00:00`)
        .lte("data_entrada", `${fim}T23:59:59`),
      pcmIds.length
        ? supabase
            .from("veiculos_pcm")
            .select(
              "id, pcm_id, frota, setor, categoria, ordem_servico, descricao, observacao, data_entrada, data_saida, lancado_por, lancado_no_turno"
            )
            .is("data_entrada", null)
            .in("pcm_id", pcmIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (qA.error) throw qA.error;
    if (qB.error) throw qB.error;

    const all = [...(qA.data || []), ...(qB.data || [])];

    // map pcm_id -> data_referencia (para exibir no modal)
    const pcmIdToRef = new Map((pcms || []).map((p) => [p.id, p.data_referencia]));

    const normalized = all.map((v) => ({
      ...v,
      data_referencia: pcmIdToRef.get(v.pcm_id) || null,
    }));

    setVeiculosPeriodo(normalized);

    // 3) Reincidências no período (por frota com 2+ entradas)
    // Definição de "entrada": linha existente no período (normalized).
    const byFrota = new Map();
    normalized.forEach((v) => {
      const f = String(v.frota || "").trim();
      if (!f) return;

      // se quiser ignorar herança: descomente a linha abaixo
      // if (String(v.lancado_por || "").includes("Virada PCM")) return;

      const arr = byFrota.get(f) || [];
      arr.push(v);
      byFrota.set(f, arr);
    });

    const reinc = [];
    byFrota.forEach((arr, frota) => {
      const entradas = arr.length;
      if (entradas < 2) return;

      const sorted = [...arr].sort((a, b) => new Date(a.data_entrada || 0) - new Date(b.data_entrada || 0));
      const ultimaEntrada = sorted[sorted.length - 1]?.data_entrada || null;

      // dias parado acumulado no período (somatório de cada ciclo)
      const diasParadoTotal = sorted.reduce((acc, r) => {
        const dtIn = r.data_entrada || (r.data_referencia ? `${r.data_referencia}T00:00:00` : null);
        const dtOut = r.data_saida || new Date().toISOString();
        if (!dtIn) return acc;
        return acc + daysDiff(dtIn, dtOut);
      }, 0);

      // top descrições (as 3 primeiras)
      const descricoes = sorted
        .map((x) => (x.descricao ? String(x.descricao).trim().toUpperCase() : ""))
        .filter(Boolean);

      reinc.push({
        frota,
        entradas,
        ultimaEntrada,
        diasParadoTotal,
        descricoesPreview: descricoes.slice(0, 3),
      });
    });

    reinc.sort((a, b) => {
      // prioridade: mais entradas, depois mais dias parado
      if (b.entradas !== a.entradas) return b.entradas - a.entradas;
      return b.diasParadoTotal - a.diasParadoTotal;
    });

    setReincidencias(reinc);

    // 4) Top 5 por dias parado (acumulado)
    const topPar = [...reinc]
      .sort((a, b) => b.diasParadoTotal - a.diasParadoTotal)
      .slice(0, 5);
    setTopParado(topPar);

    // 5) Top 5 por reincidência (entradas)
    const topRe = [...reinc].sort((a, b) => b.entradas - a.entradas).slice(0, 5);
    setTopReinc(topRe);
  }, [inicio, fim]);

  const recarregarTudo = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      await Promise.all([carregarSerieMensal(), carregarPeriodo()]);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.message || "Erro ao carregar resumo do PCM.");
    } finally {
      setLoading(false);
    }
  }, [carregarSerieMensal, carregarPeriodo]);

  useEffect(() => {
    recarregarTudo();
  }, [recarregarTudo]);

  // =========================
  // KPI / DERIVADOS
  // =========================

  const kpis = useMemo(() => {
    const diasComPCM = (diasPCM || []).length;

    const totalPeriodo = (veiculosPeriodo || []).length;
    const totalAbertos = (veiculosPeriodo || []).filter((v) => !v.data_saida).length;

    const totalGNS = (veiculosPeriodo || []).filter((v) => v.categoria === "GNS").length;
    const pctGNS = totalPeriodo ? safeNum((totalGNS / totalPeriodo) * 100, 1) : 0;

    const mediaGNSDia = diasComPCM ? safeNum(totalGNS / diasComPCM, 2) : 0;

    const frotasReincidentes = (reincidencias || []).length;

    // aging buckets (apenas abertos)
    const buckets = { "0-1": 0, "2-3": 0, "4-7": 0, "8-15": 0, "16+": 0 };
    const now = new Date().toISOString();
    (veiculosPeriodo || [])
      .filter((v) => !v.data_saida)
      .forEach((v) => {
        const dtIn = v.data_entrada || (v.data_referencia ? `${v.data_referencia}T00:00:00` : null);
        const dias = dtIn ? daysDiff(dtIn, now) : 0;
        if (dias <= 1) buckets["0-1"] += 1;
        else if (dias <= 3) buckets["2-3"] += 1;
        else if (dias <= 7) buckets["4-7"] += 1;
        else if (dias <= 15) buckets["8-15"] += 1;
        else buckets["16+"] += 1;
      });

    // Pareto setor/categoria (para melhoria)
    const bySetor = {};
    const byCategoria = {};
    (veiculosPeriodo || []).forEach((v) => {
      const s = v.setor || "—";
      const c = v.categoria || "—";
      bySetor[s] = (bySetor[s] || 0) + 1;
      byCategoria[c] = (byCategoria[c] || 0) + 1;
    });

    const setores = Object.entries(bySetor)
      .map(([k, v]) => ({ setor: k, total: v, pct: totalPeriodo ? safeNum((v / totalPeriodo) * 100, 1) : 0 }))
      .sort((a, b) => b.total - a.total);

    const categorias = Object.entries(byCategoria)
      .map(([k, v]) => ({ categoria: k, total: v, pct: totalPeriodo ? safeNum((v / totalPeriodo) * 100, 1) : 0 }))
      .sort((a, b) => b.total - a.total);

    return {
      diasComPCM,
      totalPeriodo,
      totalAbertos,
      totalGNS,
      pctGNS,
      mediaGNSDia,
      frotasReincidentes,
      aging: buckets,
      setores,
      categorias,
    };
  }, [diasPCM, veiculosPeriodo, reincidencias]);

  const serieParaTabela = useMemo(() => {
    // já vem com meses recentes primeiro, ok.
    return serieMensal || [];
  }, [serieMensal]);

  const reincFiltradas = useMemo(() => {
    const q = reincQuery.trim().toLowerCase();
    if (!q) return reincidencias || [];
    return (reincidencias || []).filter((r) => String(r.frota).toLowerCase().includes(q));
  }, [reincidencias, reincQuery]);

  // =========================
  // AÇÕES
  // =========================

  const abrirDetalheFrota = useCallback(
    (frota) => {
      const rows = (veiculosPeriodo || []).filter(
        (v) => String(v.frota || "").trim() === String(frota || "").trim()
      );
      setModalFrota(frota);
      setModalRows(rows);
      setModalOpen(true);
    },
    [veiculosPeriodo]
  );

  const fecharModal = useCallback(() => {
    setModalOpen(false);
    setModalFrota(null);
    setModalRows([]);
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* HEADER */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase">
                PCM • Resumo tático
              </div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <FaChartLine />
                PCMResumo
              </h1>
              <div className="text-xs text-gray-600 font-semibold mt-1 flex items-center gap-2">
                <FaCalendarAlt />
                Período:{" "}
                <span className="font-black">
                  {fmtBRDate(inicio)} → {fmtBRDate(fim)}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <div className="flex flex-wrap gap-2">
                {QUICK_PERIODS.map((p) => (
                  <Chip
                    key={p.key}
                    active={periodMode === p.key}
                    onClick={() => setPeriodMode(p.key)}
                    title="Trocar período"
                  >
                    {p.label}
                  </Chip>
                ))}
              </div>

              {periodMode === "INTERVALO" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    className="border rounded-lg px-3 py-2 text-xs font-black"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                  />
                  <input
                    type="date"
                    className="border rounded-lg px-3 py-2 text-xs font-black"
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                  />
                </div>
              )}

              <button
                onClick={recarregarTudo}
                className="px-4 py-2 rounded-lg font-black text-xs bg-gray-900 text-white hover:bg-black flex items-center gap-2"
                title="Recarregar"
              >
                <FaRedo />
                Atualizar
              </button>
            </div>
          </div>

          {errMsg ? (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-bold flex items-center gap-2">
              <FaExclamationTriangle />
              {errMsg}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 text-sm font-bold text-gray-500">
              Carregando resumo…
            </div>
          ) : null}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Dias com PCM
            </div>
            <div className="text-3xl font-black mt-1">{kpis.diasComPCM}</div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Registros no período
            </div>
            <div className="text-3xl font-black mt-1">{kpis.totalPeriodo}</div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Em aberto
            </div>
            <div className="text-3xl font-black mt-1 text-red-600">
              {kpis.totalAbertos}
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Total GNS
            </div>
            <div className="text-3xl font-black mt-1">{kpis.totalGNS}</div>
            <div className="text-[10px] font-black text-gray-500 uppercase mt-1">
              {kpis.pctGNS}% do período
            </div>
          </div>

          <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-300 uppercase">
              Média GNS/dia
            </div>
            <div className="text-4xl font-black mt-1">{kpis.mediaGNSDia}</div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Frotas reincidentes
            </div>
            <div className="text-3xl font-black mt-1">{kpis.frotasReincidentes}</div>
          </div>
        </div>

        {/* Aging + Pareto */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="bg-white border rounded-2xl p-4 shadow-sm lg:col-span-2">
            <AgingBar buckets={kpis.aging} />
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Pareto rápido (Setor)
            </div>
            <div className="mt-2 space-y-2">
              {(kpis.setores || []).slice(0, 6).map((s) => (
                <div
                  key={s.setor}
                  className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2"
                >
                  <div className="text-xs font-black">{s.setor}</div>
                  <div className="text-xs font-black text-gray-700">
                    {s.total} <span className="text-[10px] text-gray-500">({s.pct}%)</span>
                  </div>
                </div>
              ))}
              {(kpis.setores || []).length === 0 ? (
                <div className="text-sm font-bold text-gray-500">
                  Sem dados no período.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Série mensal: média GNS/dia */}
        <div className="bg-white border rounded-2xl p-4 shadow-sm mt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase">
                Média de GNS por dia (mês a mês)
              </div>
              <div className="text-lg font-black text-gray-900">
                Histórico (até 18 meses)
              </div>
            </div>
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Base: total GNS / dias com PCM no mês
            </div>
          </div>

          <div className="mt-3 overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b font-black">
                  <th className="p-3 border-r whitespace-nowrap">Mês</th>
                  <th className="p-3 border-r text-center whitespace-nowrap">Dias PCM</th>
                  <th className="p-3 border-r text-center whitespace-nowrap">Total GNS</th>
                  <th className="p-3 text-center whitespace-nowrap">Média GNS/dia</th>
                </tr>
              </thead>
              <tbody>
                {serieParaTabela.map((r) => (
                  <tr key={r.mes} className="border-b">
                    <td className="p-3 border-r font-black">{r.mes}</td>
                    <td className="p-3 border-r text-center font-black">{r.dias_com_pcm}</td>
                    <td className="p-3 border-r text-center font-black">{r.total_gns}</td>
                    <td className="p-3 text-center font-black">
                      <span className="px-2 py-1 rounded-full bg-gray-900 text-white text-xs font-black">
                        {r.media_gns_dia}
                      </span>
                    </td>
                  </tr>
                ))}
                {serieParaTabela.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500 font-bold">
                      Sem histórico suficiente.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP 5s */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Top 5 — dias parado (reincidentes)
            </div>
            <div className="mt-3 overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b font-black">
                    <th className="p-3 border-r">Frota</th>
                    <th className="p-3 border-r text-center">Entradas</th>
                    <th className="p-3 text-center">Dias parado (soma)</th>
                  </tr>
                </thead>
                <tbody>
                  {topParado.map((r) => (
                    <tr
                      key={r.frota}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => abrirDetalheFrota(r.frota)}
                      title="Clique para ver detalhes"
                    >
                      <td className="p-3 border-r font-black">{r.frota}</td>
                      <td className="p-3 border-r text-center font-black">{r.entradas}</td>
                      <td className="p-3 text-center font-black">{r.diasParadoTotal}</td>
                    </tr>
                  ))}
                  {topParado.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-500 font-bold">
                        Nenhuma reincidência no período.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Top 5 — reincidência (entradas)
            </div>
            <div className="mt-3 overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b font-black">
                    <th className="p-3 border-r">Frota</th>
                    <th className="p-3 border-r text-center">Entradas</th>
                    <th className="p-3 text-center">Última entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {topReinc.map((r) => (
                    <tr
                      key={r.frota}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => abrirDetalheFrota(r.frota)}
                      title="Clique para ver detalhes"
                    >
                      <td className="p-3 border-r font-black">{r.frota}</td>
                      <td className="p-3 border-r text-center font-black">{r.entradas}</td>
                      <td className="p-3 text-center font-black">
                        {fmtBRDateTime(r.ultimaEntrada)}
                      </td>
                    </tr>
                  ))}
                  {topReinc.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-500 font-bold">
                        Nenhuma reincidência no período.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* REINCIDÊNCIAS (tabela + search) */}
        <div className="bg-white border rounded-2xl p-4 shadow-sm mt-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase">
                Reincidências no período
              </div>
              <div className="text-lg font-black text-gray-900">
                Clique na frota para ver descrições e ciclos
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FaSearch className="text-gray-500" />
              <input
                className="w-full md:w-[320px] border rounded-lg px-3 py-2 text-sm font-semibold"
                value={reincQuery}
                onChange={(e) => setReincQuery(e.target.value)}
                placeholder="Buscar frota…"
              />
              {reincQuery ? (
                <button
                  onClick={() => setReincQuery("")}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  title="Limpar"
                >
                  <FaTimes />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b font-black">
                  <th className="p-3 border-r whitespace-nowrap">Frota</th>
                  <th className="p-3 border-r text-center whitespace-nowrap">Entradas</th>
                  <th className="p-3 border-r text-center whitespace-nowrap">Dias parado (soma)</th>
                  <th className="p-3 border-r whitespace-nowrap">Última entrada</th>
                  <th className="p-3 whitespace-nowrap">Preview descrições (últimas)</th>
                </tr>
              </thead>

              <tbody>
                {reincFiltradas.map((r) => (
                  <tr
                    key={r.frota}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => abrirDetalheFrota(r.frota)}
                    title="Clique para abrir detalhes"
                  >
                    <td className="p-3 border-r font-black">{r.frota}</td>
                    <td className="p-3 border-r text-center font-black">
                      <span className="px-2 py-1 rounded-full bg-gray-900 text-white text-xs font-black">
                        {r.entradas}
                      </span>
                    </td>
                    <td className="p-3 border-r text-center font-black">
                      {r.diasParadoTotal}
                    </td>
                    <td className="p-3 border-r font-black text-[11px]">
                      {fmtBRDateTime(r.ultimaEntrada)}
                    </td>
                    <td className="p-3 text-[11px] font-semibold uppercase">
                      {(r.descricoesPreview || []).join(" • ") || "—"}
                    </td>
                  </tr>
                ))}

                {(!reincFiltradas.length && !loading) ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500 font-bold">
                      Nenhuma reincidência encontrada no período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-gray-600 font-semibold">
            Regra usada: frota com <span className="font-black">2+ entradas</span> no período selecionado (base por data_entrada; fallback por data_referencia quando data_entrada é nula).
          </div>
        </div>

        {/* MODAL */}
        <FrotaDetalheModal
          open={modalOpen}
          onClose={fecharModal}
          frota={modalFrota}
          rows={modalRows}
          periodo={periodoAtual}
        />
      </div>
    </Layout>
  );
}
