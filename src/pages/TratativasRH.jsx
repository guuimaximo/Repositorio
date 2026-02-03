// src/pages/TratativasRH.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

import TratativasLancarRH from "./TratativasLancarRH";
import TratativasConsultarRH from "./TratativasConsultarRH";

const ACOES_RH = new Set(["Advertência", "Suspensão"]);

const VIEW = {
  OPEN_ONLY: "open_only", // Pendentes RH
  ALL: "all", // Ver tudo
};

/* =========================
   Helpers
========================= */
function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function brDateTime(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR");
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function fileNameFromUrl(u) {
  try {
    const raw = String(u || "");
    const noHash = raw.split("#")[0];
    const noQuery = noHash.split("?")[0];
    const last = noQuery.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last || "");
  } catch {
    return "";
  }
}

function tailAfterSecondUnderscore(filename) {
  const name = String(filename || "").trim();
  if (!name) return "";
  const parts = name.split("_").filter(Boolean);
  if (parts.length >= 3) return parts.slice(2).join("_");
  return name;
}

function getConsolidationFileKey(evidUrl, anexoUrl) {
  const legacy = tailAfterSecondUnderscore(fileNameFromUrl(evidUrl));
  const oficial = tailAfterSecondUnderscore(fileNameFromUrl(anexoUrl));
  if (oficial) return oficial;
  if (legacy) return legacy;
  return "SEM_EVIDENCIA";
}

function BadgeAcao({ acao }) {
  const isSusp = acao === "Suspensão";
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
        isSusp ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800",
      ].join(" ")}
    >
      {acao || "—"}
    </span>
  );
}

function StatusPill({ lancado }) {
  return lancado ? (
    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
      Concluída
    </span>
  ) : (
    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
      Pendente
    </span>
  );
}

function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
    </div>
  );
}

export default function TratativasRH() {
  useContext(AuthContext);

  // Filtros
  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    acao: "",
    dataInicio: getTodayStr(), // 2026-02-03
    dataFim: "",
  });

  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSel, setGrupoSel] = useState(null);

  // ✅ Botão topo (default: Pendentes)
  const [viewMode, setViewMode] = useState(VIEW.OPEN_ONLY);

  // ✅ Ordenação da tabela
  const [sort, setSort] = useState({
    key: "default", // default | ultima_data | motorista_nome | motorista_chapa | acao_aplicada | qtd_tratativas | status
    dir: "asc", // asc | desc
  });

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tratativas_detalhes")
        .select(
          `
          id, created_at, tratativa_id, acao_aplicada, observacoes, imagem_tratativa, anexo_tratativa, 
          tratado_por_login, tratado_por_nome,
          tratativas:tratativa_id (
            id, created_at, status, motorista_nome, motorista_chapa, tipo_ocorrencia,
            prioridade, setor_origem, linha, descricao, data_ocorrido, hora_ocorrido
          )
        `
        )
        .in("acao_aplicada", Array.from(ACOES_RH))
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw error;

      const detalhes = (data || []).filter((d) => d?.tratativas?.id);
      const tratativaIds = Array.from(new Set(detalhes.map((d) => d.tratativa_id))).filter(Boolean);

      const rhMap = new Map();
      if (tratativaIds.length > 0) {
        const { data: rh, error: erh } = await supabase
          .from("tratativas_rh")
          .select("id, tratativa_id, status_rh, lancado_transnet, evidencia_transnet_url, observacao_rh, lancado_em, created_at")
          .in("tratativa_id", tratativaIds);

        if (erh) throw erh;
        (rh || []).forEach((r) => rhMap.set(r.tratativa_id, r));
      }

      const groupsMap = new Map();

      for (const d of detalhes) {
        const t = d.tratativas;
        const rh = rhMap.get(d.tratativa_id) || null;
        const fileKey = getConsolidationFileKey(d.imagem_tratativa, d.anexo_tratativa);

        const motoristaChapa = String(t?.motorista_chapa || "").trim();
        const acao = d.acao_aplicada || "—";
        const key = `${motoristaChapa}||${acao}||${fileKey}`;

        const rhLancado =
          Boolean(rh?.lancado_transnet) ||
          String(rh?.status_rh || "").toUpperCase().includes("CONCL");

        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            motorista_nome: t?.motorista_nome || "",
            motorista_chapa: motoristaChapa || "",
            acao_aplicada: acao,
            arquivo_key: fileKey,
            qtd_tratativas: 0,
            ultima_data: d.created_at || t?.created_at || null,
            evidencia_conclusao_urls: new Set(),
            anexo_tratador_urls: new Set(),
            rh_lancado: rhLancado,
            rh_obs: rh?.observacao_rh || "",
            rh_evid_url: rh?.evidencia_transnet_url || null,
            rh_lancado_em: rh?.lancado_em || null,
            tratativa_ids: new Set(),
            itens: [],
          });
        }

        const g = groupsMap.get(key);
        g.qtd_tratativas += 1;
        g.tratativa_ids.add(d.tratativa_id);

        const currentDate = d.created_at || t?.created_at || null;
        if (currentDate && (!g.ultima_data || new Date(currentDate) > new Date(g.ultima_data))) {
          g.ultima_data = currentDate;
        }

        if (d.imagem_tratativa) g.evidencia_conclusao_urls.add(d.imagem_tratativa);
        if (d.anexo_tratativa) g.anexo_tratador_urls.add(d.anexo_tratativa);

        if (rhLancado) {
          g.rh_lancado = true;
          if (rh?.observacao_rh) g.rh_obs = rh.observacao_rh;
          if (rh?.evidencia_transnet_url) g.rh_evid_url = rh.evidencia_transnet_url;
          if (rh?.lancado_em) g.rh_lancado_em = rh.lancado_em;
        }

        g.itens.push({
          detalhe_id: d.id,
          detalhe_created_at: d.created_at,
          tratativa_id: d.tratativa_id,
          tipo_ocorrencia: t?.tipo_ocorrencia || "",
          linha: t?.linha || "",
          prioridade: t?.prioridade || "",
          setor_origem: t?.setor_origem || "",
          data_ocorrido: t?.data_ocorrido || null,
          hora_ocorrido: t?.hora_ocorrido || "",
          observacoes_tratador: d.observacoes || "",
          tratado_por_nome: d.tratado_por_nome || d.tratado_por_login || "—",
          evidencia_conclusao_url: d.imagem_tratativa || null,
          anexo_tratador_url: d.anexo_tratativa || null,
        });
      }

      const mergedGroups = Array.from(groupsMap.values()).map((g) => ({
        ...g,
        evidencia_conclusao_urls: Array.from(g.evidencia_conclusao_urls),
        anexo_tratador_urls: Array.from(g.anexo_tratador_urls),
        tratativa_ids: Array.from(g.tratativa_ids),
        itens: (g.itens || []).sort((a, b) => new Date(b.detalhe_created_at) - new Date(a.detalhe_created_at)),
      }));

      // Ordenação padrão inicial (mais recente primeiro)
      mergedGroups.sort((a, b) => new Date(b.ultima_data || 0) - new Date(a.ultima_data || 0));
      setGrupos(mergedGroups);
    } catch (e) {
      alert(`Erro ao carregar RH: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== 1. Filtragem ======
  const filtered = useMemo(() => {
    const q = norm(filtros.busca);
    const di = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
    const df = filtros.dataFim ? new Date(filtros.dataFim) : null;

    if (df) {
      df.setDate(df.getDate() + 1);
      df.setMilliseconds(-1);
    }

    // Filtra primeiro pelo ViewMode (Botões do Topo)
    let list = grupos;
    if (viewMode === VIEW.OPEN_ONLY) {
      list = list.filter((g) => !g.rh_lancado);
    }

    return list.filter((g) => {
      // Filtro de Status (Dropdown)
      if (filtros.status === "PENDENTE" && g.rh_lancado) return false;
      if (filtros.status === "CONCLUIDA" && !g.rh_lancado) return false;

      // Filtro de Ação
      if (filtros.acao && g.acao_aplicada !== filtros.acao) return false;

      // Filtro de Data
      if (g.ultima_data) {
        const dt = new Date(g.ultima_data);
        if (di && dt < di) return false;
        if (df && dt > df) return false;
      }

      // Busca textual
      if (!q) return true;
      const blob = norm(
        [
          g.motorista_nome,
          g.motorista_chapa,
          g.acao_aplicada,
          g.arquivo_key,
          ...(g.itens || []).map((i) => i.tipo_ocorrencia),
          ...(g.itens || []).map((i) => i.linha),
          ...(g.itens || []).map((i) => i.setor_origem),
        ]
          .filter(Boolean)
          .join(" ")
      );
      return blob.includes(q);
    });
  }, [grupos, filtros, viewMode]);

  // ====== 2. Ordenação ======
  function stringComparator(getter, dir, a, b) {
    const va = norm(getter(a)).toLowerCase();
    const vb = norm(getter(b)).toLowerCase();
    const r = va.localeCompare(vb, "pt-BR");
    return dir === "asc" ? r : -r;
  }

  const sortedGroups = useMemo(() => {
    const rows = [...filtered];

    if (sort.key === "default") {
        // Default: Mais recentes primeiro
        return rows.sort((a, b) => new Date(b.ultima_data || 0) - new Date(a.ultima_data || 0));
    }

    rows.sort((a, b) => {
        if (sort.key === "ultima_data") {
            const da = a.ultima_data ? new Date(a.ultima_data).getTime() : 0;
            const db = b.ultima_data ? new Date(b.ultima_data).getTime() : 0;
            const r = da - db;
            return sort.dir === "asc" ? r : -r;
        }
        if (sort.key === "motorista_nome") {
            return stringComparator(x => x.motorista_nome, sort.dir, a, b);
        }
        if (sort.key === "motorista_chapa") {
            return stringComparator(x => x.motorista_chapa, sort.dir, a, b);
        }
        if (sort.key === "acao_aplicada") {
            return stringComparator(x => x.acao_aplicada, sort.dir, a, b);
        }
        if (sort.key === "qtd_tratativas") {
            const r = (a.qtd_tratativas || 0) - (b.qtd_tratativas || 0);
            return sort.dir === "asc" ? r : -r;
        }
        if (sort.key === "status") {
            // false (pendente) < true (concluida)
            const sa = a.rh_lancado ? 1 : 0;
            const sb = b.rh_lancado ? 1 : 0;
            const r = sa - sb;
            return sort.dir === "asc" ? r : -r;
        }
        return 0;
    });

    return rows;
  }, [filtered, sort]);

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: "default", dir: "asc" }; // terceira volta ao padrão
    });
  }

  function SortIcon({ colKey }) {
    if (sort.key !== colKey) return <span className="ml-1 text-white/70">↕</span>;
    if (sort.key === "default") return <span className="ml-1 text-white/70">↕</span>;
    return <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>;
  }

  // ====== 3. Contadores ======
  const counts = useMemo(() => {
    let pend = 0;
    let concl = 0;
    let adv = 0;
    let susp = 0;

    // Calcula baseado no filtered (respeita datas e busca, mas ignora o toggle de viewMode apenas para o Total Global ser mais informativo, ou usamos filtered direto?)
    // Vamos usar filtered direto para refletir o que está na tela
    sortedGroups.forEach((g) => {
      if (g.rh_lancado) concl += 1;
      else pend += 1;

      if (g.acao_aplicada === "Advertência") adv += 1;
      if (g.acao_aplicada === "Suspensão") susp += 1;
    });

    return { pend, concl, adv, susp, total: sortedGroups.length };
  }, [sortedGroups]);

  function limparFiltros() {
    setFiltros({
      busca: "",
      status: "",
      acao: "",
      dataInicio: "",
      dataFim: "",
    });
  }

  function openGroup(g) {
    setGrupoSel(g);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setGrupoSel(null);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-700">Tratativas RH</h1>

        {/* ✅ Botões simples no canto (Igual Central) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(VIEW.ALL)}
            className={[
              "px-3 py-2 rounded-md text-sm border",
              viewMode === VIEW.ALL
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
            ].join(" ")}
          >
            VER TUDO
          </button>

          <button
            onClick={() => setViewMode(VIEW.OPEN_ONLY)}
            className={[
              "px-3 py-2 rounded-md text-sm border",
              viewMode === VIEW.OPEN_ONLY
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
            ].join(" ")}
          >
            PENDENTES DO RH
          </button>
        </div>
      </div>

      {/* 🔍 Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2 col-span-2"
          />

          <input
            type="date"
            title="Data Início"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            type="date"
            title="Data Fim"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border rounded-md px-3 py-2"
          />

          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>

          <select
            value={filtros.acao}
            onChange={(e) => setFiltros({ ...filtros, acao: e.target.value })}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Ação</option>
            <option value="Advertência">Advertência</option>
            <option value="Suspensão">Suspensão</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-3">
          <div className="text-sm text-gray-600">
            {loading ? "Carregando..." : `${sortedGroups.length} registros (Filtrados)`}
          </div>

          <div className="flex gap-2">
            <button
              onClick={limparFiltros}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Limpar
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
        
        {/* Aviso de Ordenação */}
        <div className="mt-4 text-xs text-gray-500">
            Ordenação padrão: <b>Mais recentes</b>. Clique no cabeçalho da tabela para ordenar.
        </div>
      </div>

      {/* 🧾 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <CardResumo titulo="Total na Tela" valor={counts.total} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes RH" valor={counts.pend} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Concluídas RH" valor={counts.concl} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Advertências" valor={counts.adv} cor="bg-yellow-50 text-yellow-700" />
        <CardResumo titulo="Suspensões" valor={counts.susp} cor="bg-red-50 text-red-700" />
      </div>

      {/* 📋 Lista */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th 
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => toggleSort("ultima_data")}
              >
                Data <SortIcon colKey="ultima_data" />
              </th>
              
              <th 
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => toggleSort("motorista_nome")}
              >
                Motorista <SortIcon colKey="motorista_nome" />
              </th>

              <th 
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => toggleSort("motorista_chapa")}
              >
                Chapa <SortIcon colKey="motorista_chapa" />
              </th>

              <th 
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => toggleSort("acao_aplicada")}
              >
                Ação <SortIcon colKey="acao_aplicada" />
              </th>

              <th 
                className="py-2 px-3 text-center cursor-pointer select-none"
                onClick={() => toggleSort("qtd_tratativas")}
              >
                Qtd. <SortIcon colKey="qtd_tratativas" />
              </th>

              <th 
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                Status RH <SortIcon colKey="status" />
              </th>

              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : sortedGroups.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  Nenhuma tratativa RH encontrada neste período.
                </td>
              </tr>
            ) : (
              sortedGroups.map((g) => (
                <tr key={g.key} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">{brDateTime(g.ultima_data)}</td>
                  <td className="py-2 px-3 text-gray-700 font-medium">{g.motorista_nome || "—"}</td>
                  <td className="py-2 px-3 text-gray-700">{g.motorista_chapa || "—"}</td>
                  <td className="py-2 px-3">
                    <BadgeAcao acao={g.acao_aplicada} />
                  </td>
                  <td className="py-2 px-3 text-center font-semibold">{g.qtd_tratativas}</td>
                  <td className="py-2 px-3">
                    <StatusPill lancado={g.rh_lancado} />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => openGroup(g)}
                      className={[
                        "px-3 py-1 rounded-md text-sm font-semibold text-white",
                        g.rh_lancado ? "bg-gray-600 hover:bg-gray-700" : "bg-emerald-600 hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {g.rh_lancado ? "Consultar" : "Lançar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && grupoSel && !grupoSel.rh_lancado && (
        <TratativasLancarRH
          aberto={modalOpen}
          grupo={grupoSel}
          onClose={closeModal}
          onSaved={async () => {
            closeModal();
            await load();
          }}
        />
      )}

      {modalOpen && grupoSel && grupoSel.rh_lancado && (
        <TratativasConsultarRH aberto={modalOpen} grupo={grupoSel} onClose={closeModal} />
      )}
    </div>
  );
}
