// src/pages/TratativasResumo.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";

function toISODateOnly(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toISODateOnly(d);
}

function normStr(v) {
  return String(v ?? "").trim();
}

function ilikeContains(hay, needle) {
  return normStr(hay).toLowerCase().includes(normStr(needle).toLowerCase());
}

function countBy(arr, keyFn) {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function sortMapDesc(m) {
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Badge({ children, tone = "gray" }) {
  const cls =
    {
      gray: "bg-gray-100 text-gray-700 border-gray-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-green-50 text-green-700 border-green-200",
      yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
      red: "bg-red-50 text-red-700 border-red-200",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
    }[tone] || "bg-gray-100 text-gray-700 border-gray-200";

  return <span className={`inline-flex items-center px-2 py-1 text-xs border rounded ${cls}`}>{children}</span>;
}

function Card({ title, children, right = null }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="font-semibold text-gray-800">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ListItemButton({ label, value, onClick, active = false, sub = null }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition ${
        active ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
        {sub ? <div className="text-xs text-gray-500 truncate">{sub}</div> : null}
      </div>
      <div className="shrink-0">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">{value}</span>
      </div>
    </button>
  );
}

export default function TratativasResumo() {
  const [filtros, setFiltros] = useState({
    dataInicio: "", // yyyy-mm-dd
    dataFim: "", // yyyy-mm-dd
    busca: "",
    setor: "",
    status: "", // opcional
  });

  const [loading, setLoading] = useState(false);
  const [tratativas, setTratativas] = useState([]);
  const [detalhes, setDetalhes] = useState([]);

  // Drill-down state
  const [selOcorrencia, setSelOcorrencia] = useState(""); // tipo_ocorrencia
  const [selMotorista, setSelMotorista] = useState(""); // motorista_id ou motorista_chapa/nome (usaremos chave composta)
  const [selAcao, setSelAcao] = useState(""); // acao_aplicada

  // default período: mês atual (pode trocar)
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFiltros((f) => ({
      ...f,
      dataInicio: toISODateOnly(start),
      dataFim: toISODateOnly(end),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetDrill() {
    setSelOcorrencia("");
    setSelMotorista("");
    setSelAcao("");
  }

  async function carregar() {
    setLoading(true);
    try {
      resetDrill();

      // ===== Tratativas (recorte) =====
      let q = supabase.from("tratativas").select(
        `
          id,
          motorista_id,
          motorista_nome,
          motorista_chapa,
          tipo_ocorrencia,
          setor_origem,
          prioridade,
          status,
          descricao,
          created_at
        `
      );

      if (filtros.busca) {
        const b = filtros.busca.trim();
        q = q.or(
          `motorista_nome.ilike.%${b}%,motorista_chapa.ilike.%${b}%,descricao.ilike.%${b}%,tipo_ocorrencia.ilike.%${b}%`
        );
      }
      if (filtros.setor) q = q.eq("setor_origem", filtros.setor);
      if (filtros.status) q = q.ilike("status", `%${filtros.status}%`);

      // período (created_at)
      if (filtros.dataInicio) q = q.gte("created_at", filtros.dataInicio);
      if (filtros.dataFim) q = q.lt("created_at", addDays(filtros.dataFim, 1));

      const { data: tData, error: tErr } = await q.order("created_at", { ascending: false }).limit(100000);
      if (tErr) throw tErr;

      const listTrat = tData || [];
      setTratativas(listTrat);

      // ===== Detalhes (somente IDs do recorte) =====
      const ids = listTrat.map((x) => x.id).filter(Boolean);
      if (!ids.length) {
        setDetalhes([]);
        return;
      }

      // Supabase tem limite para IN gigante; chunk seguro:
      const CHUNK = 500;
      const allDet = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        const { data: dData, error: dErr } = await supabase
          .from("tratativas_detalhes")
          .select(
            `
              id,
              created_at,
              tratativa_id,
              acao_aplicada,
              observacoes,
              tratado_por_login,
              tratado_por_nome
            `
          )
          .in("tratativa_id", part)
          .order("created_at", { ascending: false });

        if (dErr) throw dErr;
        allDet.push(...(dData || []));
      }

      setDetalhes(allDet);
    } catch (e) {
      console.error("Erro ao carregar resumo de tratativas:", e);
      alert("Erro ao carregar Resumo de Tratativas. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }

  // Recarrega quando período muda manualmente via botão
  async function aplicar() {
    await carregar();
  }

  // ====== dataset base para cálculo (drill) ======
  const tratById = useMemo(() => {
    const m = new Map();
    for (const t of tratativas) m.set(t.id, t);
    return m;
  }, [tratativas]);

  // Join lógico: detalhes com lookup da tratativa
  const detalhesJoin = useMemo(() => {
    return (detalhes || []).map((d) => {
      const t = tratById.get(d.tratativa_id);
      return {
        ...d,
        t_id: t?.id ?? d.tratativa_id,
        motorista_nome: t?.motorista_nome ?? "",
        motorista_chapa: t?.motorista_chapa ?? "",
        motorista_id: t?.motorista_id ?? "",
        tipo_ocorrencia: t?.tipo_ocorrencia ?? "",
        setor_origem: t?.setor_origem ?? "",
        prioridade: t?.prioridade ?? "",
        status: t?.status ?? "",
        tratativa_created_at: t?.created_at ?? "",
      };
    });
  }, [detalhes, tratById]);

  // Filtro drill aplicado em sequência (Ocorrência -> Motorista -> Ação)
  const recorteDrill = useMemo(() => {
    let baseTrat = [...tratativas];
    let baseDet = [...detalhesJoin];

    if (selOcorrencia) {
      baseTrat = baseTrat.filter((t) => normStr(t.tipo_ocorrencia) === normStr(selOcorrencia));
      const ids = new Set(baseTrat.map((t) => t.id));
      baseDet = baseDet.filter((d) => ids.has(d.tratativa_id));
    }

    if (selMotorista) {
      // chave composta: chapa|nome (pra não depender de motorista_id nulo)
      baseTrat = baseTrat.filter((t) => `${normStr(t.motorista_chapa)}|${normStr(t.motorista_nome)}` === selMotorista);
      const ids = new Set(baseTrat.map((t) => t.id));
      baseDet = baseDet.filter((d) => ids.has(d.tratativa_id));
    }

    if (selAcao) {
      baseDet = baseDet.filter((d) => normStr(d.acao_aplicada) === normStr(selAcao));
      const ids = new Set(baseDet.map((d) => d.tratativa_id));
      baseTrat = baseTrat.filter((t) => ids.has(t.id));
    }

    return { baseTrat, baseDet };
  }, [tratativas, detalhesJoin, selOcorrencia, selMotorista, selAcao]);

  // ====== TOP LISTS (cliques) ======
  const topOcorrencias = useMemo(() => {
    const m = countBy(recorteDrill.baseTrat, (t) => normStr(t.tipo_ocorrencia) || "Sem ocorrência");
    return sortMapDesc(m).slice(0, 12);
  }, [recorteDrill.baseTrat]);

  const topMotoristas = useMemo(() => {
    const key = (t) => `${normStr(t.motorista_chapa)}|${normStr(t.motorista_nome)}`.trim() || "Sem motorista";
    const m = countBy(recorteDrill.baseTrat, (t) => key(t));
    const rows = sortMapDesc(m)
      .slice(0, 12)
      .map(([k, total]) => {
        const [chapa, nome] = k.split("|");
        const pend = recorteDrill.baseTrat.filter(
          (t) => `${normStr(t.motorista_chapa)}|${normStr(t.motorista_nome)}` === k && ilikeContains(t.status, "pend")
        ).length;

        const conc = recorteDrill.baseTrat.filter(
          (t) =>
            `${normStr(t.motorista_chapa)}|${normStr(t.motorista_nome)}` === k &&
            (ilikeContains(t.status, "conclu") || ilikeContains(t.status, "resolvid"))
        ).length;

        return { k, chapa, nome, total, pend, conc };
      });

    return rows;
  }, [recorteDrill.baseTrat]);

  const topAcoes = useMemo(() => {
    const m = countBy(recorteDrill.baseDet, (d) => normStr(d.acao_aplicada) || "Não aplicada");
    return sortMapDesc(m).slice(0, 12);
  }, [recorteDrill.baseDet]);

  // ====== painel BI (conteúdo do clique) ======
  const painel = useMemo(() => {
    // quando clicar em ocorrência: queremos ações + motoristas
    // quando clicar em motorista: queremos ocorrências + ações
    const actions = sortMapDesc(countBy(recorteDrill.baseDet, (d) => normStr(d.acao_aplicada) || "Não aplicada")).slice(
      0,
      20
    );

    const drivers = sortMapDesc(
      countBy(recorteDrill.baseTrat, (t) => `${normStr(t.motorista_chapa)}|${normStr(t.motorista_nome)}`)
    )
      .slice(0, 20)
      .map(([k, v]) => {
        const [chapa, nome] = k.split("|");
        return { k, chapa, nome, total: v };
      });

    const occs = sortMapDesc(countBy(recorteDrill.baseTrat, (t) => normStr(t.tipo_ocorrencia) || "Sem ocorrência")).slice(
      0,
      20
    );

    return { actions, drivers, occs };
  }, [recorteDrill.baseDet, recorteDrill.baseTrat]);

  // ====== EXCEL (um arquivo, 3 abas) ======
  function baixarExcelUnificado() {
    const { baseTrat } = recorteDrill;

    // Detalhes reais das tratativas filtradas
    const ids = new Set(baseTrat.map((t) => t.id));
    const detFiltrado = detalhesJoin.filter((d) => ids.has(d.tratativa_id));

    // Aba Tratativas
    const sheetTrat = baseTrat.map((t) => ({
      id: t.id,
      created_at: t.created_at,
      motorista_chapa: t.motorista_chapa,
      motorista_nome: t.motorista_nome,
      tipo_ocorrencia: t.tipo_ocorrencia,
      setor_origem: t.setor_origem,
      prioridade: t.prioridade,
      status: t.status,
      descricao: t.descricao,
    }));

    // Aba Detalhes
    const sheetDet = detFiltrado.map((d) => ({
      id: d.id,
      created_at: d.created_at,
      tratativa_id: d.tratativa_id,
      acao_aplicada: d.acao_aplicada,
      observacoes: d.observacoes,
      tratado_por_login: d.tratado_por_login,
      tratado_por_nome: d.tratado_por_nome,
    }));

    // Aba Unificado (1 linha por detalhe; se não tiver detalhe, 1 linha com ação vazia)
    const detByTrat = new Map();
    for (const d of detFiltrado) {
      if (!detByTrat.has(d.tratativa_id)) detByTrat.set(d.tratativa_id, []);
      detByTrat.get(d.tratativa_id).push(d);
    }

    const sheetUni = [];
    for (const t of baseTrat) {
      const list = detByTrat.get(t.id) || [];
      if (!list.length) {
        sheetUni.push({
          tratativa_id: t.id,
          tratativa_created_at: t.created_at,
          motorista_chapa: t.motorista_chapa,
          motorista_nome: t.motorista_nome,
          tipo_ocorrencia: t.tipo_ocorrencia,
          setor_origem: t.setor_origem,
          prioridade: t.prioridade,
          status: t.status,
          descricao: t.descricao,
          detalhe_id: "",
          detalhe_created_at: "",
          acao_aplicada: "",
          observacoes: "",
          tratado_por_login: "",
          tratado_por_nome: "",
        });
      } else {
        for (const d of list) {
          sheetUni.push({
            tratativa_id: t.id,
            tratativa_created_at: t.created_at,
            motorista_chapa: t.motorista_chapa,
            motorista_nome: t.motorista_nome,
            tipo_ocorrencia: t.tipo_ocorrencia,
            setor_origem: t.setor_origem,
            prioridade: t.prioridade,
            status: t.status,
            descricao: t.descricao,
            detalhe_id: d.id,
            detalhe_created_at: d.created_at,
            acao_aplicada: d.acao_aplicada,
            observacoes: d.observacoes,
            tratado_por_login: d.tratado_por_login,
            tratado_por_nome: d.tratado_por_nome,
          });
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetTrat), "Tratativas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetDet), "Detalhes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetUni), "Unificado");

    const nome = `tratativas_resumo_${filtros.dataInicio || "inicio"}_${filtros.dataFim || "fim"}.xlsx`;
    XLSX.writeFile(wb, nome);
  }

  const headerChips = useMemo(() => {
    const chips = [];
    if (selOcorrencia) chips.push({ k: "oc", label: `Ocorrência: ${selOcorrencia}`, tone: "purple" });
    if (selMotorista) {
      const [chapa, nome] = selMotorista.split("|");
      chips.push({ k: "mo", label: `Motorista: ${nome} (${chapa})`, tone: "blue" });
    }
    if (selAcao) chips.push({ k: "ac", label: `Ação: ${selAcao}`, tone: "green" });
    return chips;
  }, [selOcorrencia, selMotorista, selAcao]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resumo de Tratativas</h1>
          <p className="text-sm text-gray-500">
            Clique nos TOPs para abrir o drill-down (tipo BI). Exporta um único Excel com as tabelas unificadas.
          </p>
        </div>

        <button
          onClick={baixarExcelUnificado}
          disabled={loading || tratativas.length === 0}
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          Baixar Excel (Unificado)
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Busca (motorista, ocorrência, descrição...)"
            value={filtros.busca}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            className="border rounded-md px-3 py-2"
          />
          <select
            value={filtros.setor}
            onChange={(e) => setFiltros((f) => ({ ...f, setor: e.target.value }))}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Setores</option>
            <option value="Telemetria">Telemetria</option>
            <option value="CCO">CCO</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="SAC">SAC</option>
            <option value="Inspetoria">Inspetoria</option>
          </select>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Resolvido">Resolvido</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <div className="flex flex-wrap gap-2">
            {headerChips.map((c) => (
              <Badge key={c.k} tone={c.tone}>
                {c.label}
              </Badge>
            ))}
            {(selOcorrencia || selMotorista || selAcao) && (
              <button onClick={resetDrill} className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50">
                Limpar Drill-down
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={aplicar}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? "Carregando..." : "Aplicar"}
            </button>
          </div>
        </div>
      </div>

      {/* TOPs (sem lista) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Motoristas */}
        <Card
          title="Top Motoristas (Tratativas)"
          right={<Badge tone="blue">{recorteDrill.baseTrat.length} tratativas</Badge>}
        >
          <div className="space-y-2">
            {topMotoristas.length === 0 ? (
              <div className="text-sm text-gray-500">Sem dados no recorte.</div>
            ) : (
              topMotoristas.map((m) => (
                <div key={m.k} className="flex flex-col gap-2">
                  <ListItemButton
                    label={m.nome || "Sem nome"}
                    sub={m.chapa ? `Chapa ${m.chapa}` : "Chapa -"}
                    value={`Total ${m.total} | Pend ${m.pend} | Conc ${m.conc}`}
                    active={selMotorista === m.k}
                    onClick={() => {
                      setSelMotorista((cur) => (cur === m.k ? "" : m.k));
                      // se clicar motorista, mantém ocorrência se já estiver selecionada (BI)
                      setSelAcao("");
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top Ocorrências */}
        <Card title="Top Ocorrências" right={<Badge tone="purple">{topOcorrencias.reduce((a, b) => a + b[1], 0)}</Badge>}>
          <div className="space-y-2">
            {topOcorrencias.length === 0 ? (
              <div className="text-sm text-gray-500">Sem dados no recorte.</div>
            ) : (
              topOcorrencias.map(([label, qtd]) => (
                <ListItemButton
                  key={label}
                  label={label}
                  value={qtd}
                  active={selOcorrencia === label}
                  onClick={() => {
                    setSelOcorrencia((cur) => (cur === label ? "" : label));
                    setSelMotorista("");
                    setSelAcao("");
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Top Ações */}
        <Card title="Top Ações Aplicadas (Detalhes)" right={<Badge tone="green">{recorteDrill.baseDet.length} ações</Badge>}>
          <div className="space-y-2">
            {topAcoes.length === 0 ? (
              <div className="text-sm text-gray-500">
                Sem ações no recorte. (Ainda não há registros em <b>tratativas_detalhes</b> para este período/filtro.)
              </div>
            ) : (
              topAcoes.map(([label, qtd]) => (
                <ListItemButton
                  key={label}
                  label={label}
                  value={qtd}
                  active={selAcao === label}
                  onClick={() => {
                    setSelAcao((cur) => (cur === label ? "" : label));
                  }}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Painel Drill-down (tipo BI) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Drill-down: Ações (no recorte atual)"
          right={<Badge tone="green">{painel.actions.reduce((a, b) => a + b[1], 0)}</Badge>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {painel.actions.length === 0 ? (
              <div className="text-sm text-gray-500">Sem ações para o recorte atual.</div>
            ) : (
              painel.actions.map(([acao, qtd]) => (
                <ListItemButton
                  key={acao}
                  label={acao}
                  value={qtd}
                  active={selAcao === acao}
                  onClick={() => setSelAcao((cur) => (cur === acao ? "" : acao))}
                />
              ))
            )}
          </div>
        </Card>

        <Card
          title="Drill-down: Motoristas (no recorte atual)"
          right={<Badge tone="blue">{painel.drivers.reduce((a, b) => a + b.total, 0)}</Badge>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {painel.drivers.length === 0 ? (
              <div className="text-sm text-gray-500">Sem motoristas no recorte atual.</div>
            ) : (
              painel.drivers.map((m) => (
                <ListItemButton
                  key={m.k}
                  label={m.nome || "Sem nome"}
                  sub={m.chapa ? `Chapa ${m.chapa}` : "Chapa -"}
                  value={m.total}
                  active={selMotorista === m.k}
                  onClick={() => {
                    setSelMotorista((cur) => (cur === m.k ? "" : m.k));
                    setSelAcao("");
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Quando seleciona motorista, faz sentido mostrar Ocorrências dele */}
        <Card title="Drill-down: Ocorrências (no recorte atual)" right={<Badge tone="purple">{painel.occs.length}</Badge>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {painel.occs.length === 0 ? (
              <div className="text-sm text-gray-500">Sem ocorrências no recorte atual.</div>
            ) : (
              painel.occs.map(([occ, qtd]) => (
                <ListItemButton
                  key={occ}
                  label={occ}
                  value={qtd}
                  active={selOcorrencia === occ}
                  onClick={() => {
                    setSelOcorrencia((cur) => (cur === occ ? "" : occ));
                    setSelAcao("");
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* KPIs do recorte atual */}
        <Card title="KPIs do recorte atual">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Tratativas</div>
              <div className="text-2xl font-bold text-gray-800">{recorteDrill.baseTrat.length}</div>
            </div>
            <div className="p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Ações (Detalhes)</div>
              <div className="text-2xl font-bold text-gray-800">{recorteDrill.baseDet.length}</div>
            </div>
            <div className="p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Pendentes</div>
              <div className="text-2xl font-bold text-yellow-700">
                {recorteDrill.baseTrat.filter((t) => ilikeContains(t.status, "pend")).length}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Concluídas/Resolvidas</div>
              <div className="text-2xl font-bold text-green-700">
                {
                  recorteDrill.baseTrat.filter(
                    (t) => ilikeContains(t.status, "conclu") || ilikeContains(t.status, "resolvid")
                  ).length
                }
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Observação: “Top Ações” vem de <b>tratativas_detalhes</b>. Se você quiser que “Orientação/Advertência/Suspensão”
            apareçam mesmo sem detalhes, dá para usar a coluna <b>tipo_acao</b> da tabela <b>tratativas</b>.
          </div>
        </Card>
      </div>
    </div>
  );
}
