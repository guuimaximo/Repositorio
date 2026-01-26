// src/pages/TratativasResumo.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";

/**
 * RESUMO DE TRATATIVAS (Padrão "CentralTratativas")
 * - Filtros em objeto + applyCommonFilters
 * - Contadores via head:true / count:exact (não sofrem limite)
 * - KPIs + rankings (motoristas, ocorrências, ações aplicadas)
 * - Exportação: 1 Excel único com JOIN tratativas + tratativas_detalhes (1 aba)
 *
 * Observação:
 * - Export padrão em "DETALHE" (período por tratativas_detalhes.created_at) para análises de ação aplicada.
 * - Você pode trocar para "TRATATIVA" se preferir (período por tratativas.created_at).
 */

function endDateExclusive(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function toBRDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return String(iso);
  }
}

function toBRDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return String(iso);
  }
}

function normStr(v) {
  return String(v ?? "").trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function isPendente(status) {
  return lower(status).includes("pendente");
}

function isConcluida(status) {
  const s = lower(status);
  return s.includes("conclu") || s.includes("resolvid");
}

function daysBetween(isoA, isoB) {
  try {
    const a = new Date(isoA);
    const b = new Date(isoB);
    const diff = b.getTime() - a.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function buildUnifiedRows(tratativas, detalhes) {
  const detByTrat = new Map();
  for (const d of detalhes) {
    const key = d?.tratativa_id;
    if (!key) continue;
    if (!detByTrat.has(key)) detByTrat.set(key, []);
    detByTrat.get(key).push(d);
  }

  const rows = [];
  for (const t of tratativas) {
    const dets = detByTrat.get(t.id) || [null]; // LEFT JOIN
    for (const d of dets) {
      rows.push({
        // ====== TRATATIVA (pai) ======
        tratativa_id: t.id,
        tratativa_created_at: toBRDateTime(t.created_at),
        motorista_nome: t.motorista_nome || "",
        motorista_chapa: t.motorista_chapa || "",
        tipo_ocorrencia: t.tipo_ocorrencia || "",
        descricao: t.descricao || "",
        prioridade: t.prioridade || "",
        setor_origem: t.setor_origem || "",
        status: t.status || "",
        linha: t.linha || "",
        prefixo: t.prefixo || "",
        responsavel: t.responsavel || "",
        ultima_acao_aplicada: t.ultima_acao_aplicada || "",
        ultima_acao_at: toBRDateTime(t.ultima_acao_at),

        // ====== DETALHE (filho) ======
        detalhe_id: d?.id || "",
        detalhe_created_at: toBRDateTime(d?.created_at),
        acao_aplicada: d?.acao_aplicada || "",
        observacoes: d?.observacoes || "",
        tratado_por_nome: d?.tratado_por_nome || "",
      });
    }
  }
  return rows;
}

function Card({ title, value, tone = "blue", sub = null }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    gray: "bg-gray-50 text-gray-700 border-gray-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className={`border ${tones[tone] || tones.blue} rounded-lg shadow p-5`}>
      <div className="text-sm font-semibold text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

export default function TratativasResumo() {
  const [loading, setLoading] = useState(false);

  // Filtros "padrão Central"
  const [filtros, setFiltros] = useState({
    busca: "",
    dataInicio: "",
    dataFim: "",
    setor: "",
    status: "",
    prioridade: "",
    acaoAplicada: "", // vem de tratativas_detalhes.acao_aplicada (filtro no front)
    modoPeriodo: "DETALHE", // "DETALHE" (padrão) ou "TRATATIVA"
  });

  // Listas brutas (para resumo/tabla/rankings)
  const [tratativas, setTratativas] = useState([]);
  const [detalhes, setDetalhes] = useState([]);

  // Contadores reais (banco)
  const [totalCount, setTotalCount] = useState(0);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [concluidasCount, setConcluidasCount] = useState(0);
  const [atrasadasCount, setAtrasadasCount] = useState(0);

  // --- Helpers para aplicar filtros em query da tratativas ---
  function applyCommonFiltersTratativas(query) {
    const f = filtros;

    if (f.busca) {
      query = query.or(
        `motorista_nome.ilike.%${f.busca}%,motorista_chapa.ilike.%${f.busca}%,descricao.ilike.%${f.busca}%`
      );
    }
    if (f.setor) query = query.eq("setor_origem", f.setor);
    if (f.status) query = query.ilike("status", `%${f.status}%`);
    if (f.prioridade) query = query.eq("prioridade", f.prioridade);

    // Período por TRATATIVA (created_at)
    if (f.modoPeriodo === "TRATATIVA") {
      if (f.dataInicio) query = query.gte("created_at", f.dataInicio);
      if (f.dataFim) query = query.lt("created_at", endDateExclusive(f.dataFim));
    }

    return query;
  }

  // --- Query de detalhes por período (quando modo DETALHE) ---
  function applyPeriodDetalhes(query) {
    const f = filtros;
    if (f.modoPeriodo !== "DETALHE") return query;

    if (f.dataInicio) query = query.gte("created_at", f.dataInicio);
    if (f.dataFim) query = query.lt("created_at", endDateExclusive(f.dataFim));
    return query;
  }

  async function carregarTratativasBase() {
    let q = supabase.from("tratativas").select("*").limit(100000);
    q = applyCommonFiltersTratativas(q);

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar tratativas:", error);
      return [];
    }
    return data || [];
  }

  async function carregarDetalhesPorTratativaIds(ids) {
    if (!ids?.length) return [];
    const { data, error } = await supabase
      .from("tratativas_detalhes")
      .select("*")
      .in("tratativa_id", ids)
      .limit(200000)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar detalhes (por ids):", error);
      return [];
    }
    return data || [];
  }

  async function carregarDetalhesPorPeriodo() {
    let q = supabase.from("tratativas_detalhes").select("*").limit(200000);
    q = applyPeriodDetalhes(q);

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar detalhes (por período):", error);
      return [];
    }
    return data || [];
  }

  async function carregarContadores() {
    // Calcula atrasadas: pendente e criada há mais de 10 dias
    const date10DaysAgo = new Date();
    date10DaysAgo.setDate(date10DaysAgo.getDate() - 10);
    const date10DaysAgoISO = date10DaysAgo.toISOString();

    // Total
    let qTotal = supabase.from("tratativas").select("id", { count: "exact", head: true });
    qTotal = applyCommonFiltersTratativas(qTotal);
    const { count: total, error: e1 } = await qTotal;
    if (e1) console.error("Erro count total:", e1);

    // Pendentes
    let qPend = supabase
      .from("tratativas")
      .select("id", { count: "exact", head: true })
      .ilike("status", "%pendente%");
    qPend = applyCommonFiltersTratativas(qPend);
    const { count: pend, error: e2 } = await qPend;
    if (e2) console.error("Erro count pendentes:", e2);

    // Concluídas
    let qConc = supabase
      .from("tratativas")
      .select("id", { count: "exact", head: true })
      .or("status.ilike.%conclu%,status.ilike.%resolvid%");
    qConc = applyCommonFiltersTratativas(qConc);
    const { count: conc, error: e3 } = await qConc;
    if (e3) console.error("Erro count concluidas:", e3);

    // Atrasadas (>10d) — pendente e antiga
    let qAtr = supabase
      .from("tratativas")
      .select("id", { count: "exact", head: true })
      .ilike("status", "%pendente%")
      .lt("created_at", date10DaysAgoISO);
    qAtr = applyCommonFiltersTratativas(qAtr);
    const { count: atr, error: e4 } = await qAtr;
    if (e4) console.error("Erro count atrasadas:", e4);

    setTotalCount(total || 0);
    setPendentesCount(pend || 0);
    setConcluidasCount(conc || 0);
    setAtrasadasCount(atr || 0);
  }

  async function aplicar() {
    setLoading(true);
    try {
      // 1) Sempre carrega tratativas base com filtros (exceto período do modo DETALHE, que filtra detalhes)
      const tData = await carregarTratativasBase();

      // 2) Carrega detalhes conforme modo de período
      let dData = [];
      if (filtros.modoPeriodo === "TRATATIVA") {
        const ids = tData.map((t) => t.id);
        dData = await carregarDetalhesPorTratativaIds(ids);
      } else {
        // DETALHE: detalhes filtrados por período e depois busca os pais
        dData = await carregarDetalhesPorPeriodo();
        const ids = [...new Set((dData || []).map((d) => d.tratativa_id).filter(Boolean))];

        if (ids.length > 0) {
          // Busca apenas tratativas relacionadas aos detalhes do período,
          // mas mantendo os mesmos filtros gerais (busca/setor/status/prioridade) se quiser consistência.
          // Aqui aplicamos filtros gerais também:
          let qParents = supabase.from("tratativas").select("*").in("id", ids).limit(100000);
          qParents = applyCommonFiltersTratativas(qParents);
          const { data: parents, error } = await qParents.order("created_at", { ascending: false });
          if (error) console.error("Erro ao carregar pais (DETALHE):", error);
          // Se filtros gerais matarem alguns pais, ainda pode ter detalhes sem pai -> vamos preservar no Excel, mas no resumo fica coerente.
          // Para o resumo, vamos usar somente pais retornados.
          setTratativas(parents || []);
          setDetalhes(dData || []);
        } else {
          setTratativas([]);
          setDetalhes([]);
        }
      }

      if (filtros.modoPeriodo === "TRATATIVA") {
        setTratativas(tData || []);
        setDetalhes(dData || []);
      }

      // 3) Contadores sempre por tratativas (filtros comuns)
      await carregarContadores();
    } catch (e) {
      console.error("Erro ao aplicar filtros (Resumo Tratativas):", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    aplicar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limparFiltros() {
    setFiltros({
      busca: "",
      dataInicio: "",
      dataFim: "",
      setor: "",
      status: "",
      prioridade: "",
      acaoAplicada: "",
      modoPeriodo: "DETALHE",
    });
    setTimeout(() => aplicar(), 0);
  }

  // ====== Filtro de "ação aplicada" (front) ======
  const detalhesFiltrados = useMemo(() => {
    const f = filtros;
    if (!f.acaoAplicada) return detalhes || [];
    const alvo = lower(f.acaoAplicada);
    return (detalhes || []).filter((d) => lower(d?.acao_aplicada) === alvo);
  }, [detalhes, filtros.acaoAplicada]);

  // Map detalhes por tratativa para análises rápidas
  const detByTrat = useMemo(() => {
    const m = new Map();
    for (const d of detalhesFiltrados) {
      const k = d?.tratativa_id;
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    }
    return m;
  }, [detalhesFiltrados]);

  // Lista "visual" (tratativas) já pode ser filtrada também por acaoAplicada (se o usuário escolher)
  const tratativasVisuais = useMemo(() => {
    if (!filtros.acaoAplicada) return tratativas || [];
    // Mostra apenas tratativas que tenham pelo menos um detalhe com a ação escolhida (no recorte atual)
    return (tratativas || []).filter((t) => (detByTrat.get(t.id) || []).length > 0);
  }, [tratativas, filtros.acaoAplicada, detByTrat]);

  // ====== KPIs derivados ======
  const kpis = useMemo(() => {
    const t = tratativasVisuais || [];
    const total = t.length;

    const pend = t.filter((x) => isPendente(x.status)).length;
    const conc = t.filter((x) => isConcluida(x.status)).length;

    // atrasadas local (pelo dataset visual): pendente e >10 dias
    const now = new Date().toISOString();
    const atras = t.filter((x) => isPendente(x.status) && daysBetween(x.created_at, now) > 10).length;

    // ações registradas (no recorte atual de detalhes)
    const acoes = (detalhesFiltrados || []).length;

    // motoristas distintos
    const motoristas = new Set(t.map((x) => normStr(x.motorista_chapa) || normStr(x.motorista_nome)).filter(Boolean)).size;

    // tratativas sem detalhe (no recorte atual de detalhes)
    let semDetalhe = 0;
    for (const item of t) {
      const dets = detByTrat.get(item.id) || [];
      if (dets.length === 0) semDetalhe += 1;
    }

    return {
      total,
      pend,
      conc,
      atras,
      acoes,
      motoristas,
      semDetalhe,
    };
  }, [tratativasVisuais, detalhesFiltrados, detByTrat]);

  // ====== Rankings ======
  const rankingMotoristas = useMemo(() => {
    const map = new Map();
    for (const t of tratativasVisuais) {
      const key = normStr(t.motorista_chapa) || normStr(t.motorista_nome) || "SEM_MOTORISTA";
      if (!map.has(key)) {
        map.set(key, {
          motorista_chapa: t.motorista_chapa || "",
          motorista_nome: t.motorista_nome || "",
          total: 0,
          pendentes: 0,
          concluidas: 0,
          ultima_acao: "",
        });
      }
      const obj = map.get(key);
      obj.total += 1;
      if (isPendente(t.status)) obj.pendentes += 1;
      if (isConcluida(t.status)) obj.concluidas += 1;
      obj.ultima_acao = t.ultima_acao_aplicada || obj.ultima_acao;
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [tratativasVisuais]);

  const rankingOcorrencias = useMemo(() => {
    const map = new Map();
    for (const t of tratativasVisuais) {
      const key = normStr(t.tipo_ocorrencia) || "SEM_OCORRENCIA";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([tipo, qtde]) => ({ tipo, qtde }))
      .sort((a, b) => b.qtde - a.qtde)
      .slice(0, 12);
  }, [tratativasVisuais]);

  const rankingAcoes = useMemo(() => {
    const map = new Map();
    for (const d of detalhesFiltrados || []) {
      const key = normStr(d.acao_aplicada) || "SEM_ACAO";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([acao, qtde]) => ({ acao, qtde }))
      .sort((a, b) => b.qtde - a.qtde)
      .slice(0, 12);
  }, [detalhesFiltrados]);

  // Opções de ações (para filtro)
  const acoesDisponiveis = useMemo(() => {
    const s = new Set((detalhes || []).map((d) => normStr(d.acao_aplicada)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [detalhes]);

  // Opções de prioridades (se existir variação)
  const prioridadesDisponiveis = useMemo(() => {
    const s = new Set((tratativas || []).map((t) => normStr(t.prioridade)).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [tratativas]);

  async function baixarExcelUnificado() {
    const f = filtros;

    if (!f.dataInicio || !f.dataFim) {
      alert("Informe Data Início e Data Fim para exportar.");
      return;
    }

    setLoading(true);
    try {
      // Export padrão: DETALHE (período por tratativas_detalhes.created_at)
      // Se você quiser TRATATIVA, troque o modo abaixo.
      const mode = f.modoPeriodo || "DETALHE";

      const dataFimExclusiva = endDateExclusive(f.dataFim);

      let tData = [];
      let dData = [];

      if (mode === "TRATATIVA") {
        // 1) Tratativas no período (created_at)
        let qT = supabase.from("tratativas").select("*").limit(100000);

        // Força período por TRATATIVA
        const savedMode = filtros.modoPeriodo;
        // aplica filtros comuns + período
        qT = qT.gte("created_at", f.dataInicio).lt("created_at", dataFimExclusiva);

        // Demais filtros iguais da tela
        if (f.busca) {
          qT = qT.or(
            `motorista_nome.ilike.%${f.busca}%,motorista_chapa.ilike.%${f.busca}%,descricao.ilike.%${f.busca}%`
          );
        }
        if (f.setor) qT = qT.eq("setor_origem", f.setor);
        if (f.status) qT = qT.ilike("status", `%${f.status}%`);
        if (f.prioridade) qT = qT.eq("prioridade", f.prioridade);

        const { data: tt, error: eT } = await qT.order("created_at", { ascending: false });
        if (eT) throw eT;
        tData = tt || [];

        const ids = tData.map((t) => t.id);
        if (ids.length > 0) {
          const { data: dd, error: eD } = await supabase
            .from("tratativas_detalhes")
            .select("*")
            .in("tratativa_id", ids)
            .limit(200000)
            .order("created_at", { ascending: false });
          if (eD) throw eD;
          dData = dd || [];
        } else {
          dData = [];
        }

        // restaura (não necessário, só segurança sem side effects)
        filtros.modoPeriodo = savedMode;
      } else {
        // DETALHE
        // 1) Detalhes no período
        let qD = supabase.from("tratativas_detalhes").select("*").limit(200000);
        qD = qD.gte("created_at", f.dataInicio).lt("created_at", dataFimExclusiva);
        const { data: dd, error: eD } = await qD.order("created_at", { ascending: false });
        if (eD) throw eD;
        dData = dd || [];

        // Filtro por acaoAplicada (se selecionado) já no export
        if (f.acaoAplicada) {
          const alvo = lower(f.acaoAplicada);
          dData = dData.filter((d) => lower(d?.acao_aplicada) === alvo);
        }

        const ids = [...new Set(dData.map((d) => d.tratativa_id).filter(Boolean))];

        if (ids.length > 0) {
          let qT = supabase.from("tratativas").select("*").in("id", ids).limit(100000);

          // aplica filtros comuns (busca/setor/status/prioridade) para coerência
          if (f.busca) {
            qT = qT.or(
              `motorista_nome.ilike.%${f.busca}%,motorista_chapa.ilike.%${f.busca}%,descricao.ilike.%${f.busca}%`
            );
          }
          if (f.setor) qT = qT.eq("setor_origem", f.setor);
          if (f.status) qT = qT.ilike("status", `%${f.status}%`);
          if (f.prioridade) qT = qT.eq("prioridade", f.prioridade);

          const { data: tt, error: eT } = await qT.order("created_at", { ascending: false });
          if (eT) throw eT;
          tData = tt || [];
        } else {
          tData = [];
        }
      }

      // Se tiver detalhes com pai faltando, preserva no Excel (pai "vazio")
      const parentMap = new Map(tData.map((t) => [t.id, t]));
      const missingParents = new Set(
        (dData || [])
          .map((d) => d.tratativa_id)
          .filter((id) => id && !parentMap.has(id))
      );
      for (const id of missingParents) {
        tData.push({ id });
      }

      const rows = buildUnifiedRows(tData, dData);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Tratativas_Unificadas");

      const fileName = `tratativas_unificadas_${f.dataInicio}_a_${f.dataFim}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error("Erro ao exportar Excel unificado:", e);
      alert("Erro ao exportar Excel. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resumo de Tratativas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visão executiva com cards, rankings e exportação unificada (Tratativas + Detalhes).
          </p>
        </div>

        <button
          onClick={baixarExcelUnificado}
          disabled={loading}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
        >
          {loading ? "Gerando Excel..." : "Baixar Excel (Unificado)"}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Buscar (nome, chapa, descrição...)"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <select
            value={filtros.modoPeriodo}
            onChange={(e) => setFiltros({ ...filtros, modoPeriodo: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="DETALHE">Período por Detalhe (ações)</option>
            <option value="TRATATIVA">Período por Abertura (tratativa)</option>
          </select>

          <select
            value={filtros.setor}
            onChange={(e) => setFiltros({ ...filtros, setor: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Setores</option>
            <option value="Telemetria">Telemetria</option>
            <option value="CCO">CCO</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="SAC">SAC</option>
          </select>

          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Resolvido">Resolvido</option>
            <option value="Concluída">Concluída</option>
          </select>

          <select
            value={filtros.acaoAplicada}
            onChange={(e) => setFiltros({ ...filtros, acaoAplicada: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white md:col-span-2"
          >
            <option value="">Todas as Ações (Detalhes)</option>
            {acoesDisponiveis.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={filtros.prioridade}
            onChange={(e) => setFiltros({ ...filtros, prioridade: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white md:col-span-2"
          >
            <option value="">Todas as Prioridades</option>
            {prioridadesDisponiveis.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end mt-3 gap-2">
          <button
            onClick={limparFiltros}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Limpar
          </button>
          <button
            onClick={aplicar}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        <Card title="Total (Visual)" value={kpis.total} tone="blue" sub="Dataset já inclui filtro de ação (se aplicado)" />
        <Card title="Pendentes (Visual)" value={kpis.pend} tone="yellow" />
        <Card title="Concluídas (Visual)" value={kpis.conc} tone="green" />
        <Card title="Atrasadas (Visual)" value={kpis.atras} tone="red" sub="Pendente e >10 dias (cálculo local)" />
        <Card title="Ações (Detalhes)" value={kpis.acoes} tone="purple" sub="No recorte atual (inclui filtro de ação)" />
        <Card title="Motoristas" value={kpis.motoristas} tone="gray" sub="Distintos (no dataset visual)" />
        <Card title="Sem Detalhe" value={kpis.semDetalhe} tone="gray" sub="Tratativas sem histórico (no recorte)" />
      </div>

      {/* Contadores de banco (reais) */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Contadores (Banco)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Total" value={totalCount} tone="blue" />
          <Card title="Pendentes" value={pendentesCount} tone="yellow" />
          <Card title="Concluídas" value={concluidasCount} tone="green" />
          <Card title="Atrasadas (>10d)" value={atrasadasCount} tone="red" />
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Observação: esses contadores respeitam os filtros comuns (busca/setor/status/prioridade e, se modo = TRATATIVA, período).
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Motoristas */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Top Motoristas (Tratativas)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-2 px-3 text-left">Motorista</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Pend.</th>
                  <th className="py-2 px-3 text-right">Conc.</th>
                </tr>
              </thead>
              <tbody>
                {rankingMotoristas.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-3 px-3 text-gray-500">
                      Sem dados no recorte atual.
                    </td>
                  </tr>
                ) : (
                  rankingMotoristas.map((m) => (
                    <tr key={(m.motorista_chapa || m.motorista_nome) + "_" + m.total} className="border-t">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-800">{m.motorista_nome || "-"}</div>
                        <div className="text-xs text-gray-500">{m.motorista_chapa || ""}</div>
                        {m.ultima_acao ? (
                          <div className="mt-1">
                            <Badge tone="blue">{m.ultima_acao}</Badge>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{m.total}</td>
                      <td className="py-2 px-3 text-right">{m.pendentes}</td>
                      <td className="py-2 px-3 text-right">{m.concluidas}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ocorrências */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Top Ocorrências</h3>
          <div className="space-y-2">
            {rankingOcorrencias.length === 0 ? (
              <div className="text-sm text-gray-500">Sem dados no recorte atual.</div>
            ) : (
              rankingOcorrencias.map((o) => (
                <div key={o.tipo} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="text-sm text-gray-800">{o.tipo}</div>
                  <Badge tone="purple">{o.qtde}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ações aplicadas */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Top Ações Aplicadas (Detalhes)</h3>
          <div className="space-y-2">
            {rankingAcoes.length === 0 ? (
              <div className="text-sm text-gray-500">Sem ações no recorte atual.</div>
            ) : (
              rankingAcoes.map((a) => (
                <div key={a.acao} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="text-sm text-gray-800">{a.acao}</div>
                  <Badge tone="blue">{a.qtde}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela (lista filtrada) */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Lista (Tratativas no recorte)</h2>
          <div className="text-xs text-gray-600 mt-1">
            Se você aplicar "Ação (Detalhes)", a lista mostra apenas tratativas que possuem essa ação no recorte atual.
          </div>
        </div>

        <table className="min-w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Abertura</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Ocorrência</th>
              <th className="py-2 px-3 text-left">Prioridade</th>
              <th className="py-2 px-3 text-left">Setor</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Última Ação</th>
              <th className="py-2 px-3 text-left">Histórico</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : tratativasVisuais.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-500">
                  Nenhum registro no recorte atual.
                </td>
              </tr>
            ) : (
              tratativasVisuais.slice(0, 2000).map((t) => {
                const dets = detByTrat.get(t.id) || [];
                return (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700">{toBRDate(t.created_at)}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-900">{t.motorista_nome || "-"}</div>
                      <div className="text-xs text-gray-500">{t.motorista_chapa || ""}</div>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{t.tipo_ocorrencia || "-"}</td>
                    <td className="py-2 px-3 text-gray-700">{t.prioridade || "-"}</td>
                    <td className="py-2 px-3 text-gray-700">{t.setor_origem || "-"}</td>
                    <td className="py-2 px-3">
                      {isPendente(t.status) ? (
                        <Badge tone="yellow">Pendente</Badge>
                      ) : isConcluida(t.status) ? (
                        <Badge tone="green">Resolvido</Badge>
                      ) : (
                        <Badge tone="gray">{t.status || "-"}</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-700">
                      {t.ultima_acao_aplicada ? <Badge tone="blue">{t.ultima_acao_aplicada}</Badge> : "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-700">
                      {dets.length === 0 ? (
                        <span className="text-xs text-gray-500">Sem histórico</span>
                      ) : (
                        <span className="text-xs text-gray-700">
                          {dets.length} registro(s) —{" "}
                          <span className="text-gray-500">último: {toBRDate(dets[0]?.created_at)}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {tratativasVisuais.length > 2000 ? (
          <div className="p-3 text-xs text-gray-600">
            Mostrando 2.000 linhas por performance. O Excel exporta o dataset completo do período.
          </div>
        ) : null}
      </div>
    </div>
  );
}
