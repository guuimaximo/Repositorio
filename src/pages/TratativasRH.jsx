// src/pages/TratativasRH.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

import TratativasLancarRH from "./TratativasLancarRH";
import TratativasConsultarRH from "./TratativasConsultarRH";

const ACOES_RH = new Set(["Advertência", "Suspensão"]);

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

  // ✅ NOVO: Filtros de data (padrão inicio = Hoje)
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

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tratativas_detalhes")
        .select(
          `
          id,
          created_at,
          tratativa_id,
          acao_aplicada,
          observacoes,
          imagem_tratativa, 
          anexo_tratativa, 
          tratado_por_login,
          tratado_por_nome,
          tratativas:tratativa_id (
            id,
            created_at,
            status,
            motorista_nome,
            motorista_chapa,
            tipo_ocorrencia,
            prioridade,
            setor_origem,
            linha,
            descricao,
            data_ocorrido,
            hora_ocorrido
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
          .select(
            "id, tratativa_id, status_rh, lancado_transnet, evidencia_transnet_url, observacao_rh, lancado_em, created_at"
          )
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

  const filtered = useMemo(() => {
    const q = norm(filtros.busca);
    const di = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
    const df = filtros.dataFim ? new Date(filtros.dataFim) : null;

    // Ajuste fim do dia para dataFim
    if (df) {
      df.setDate(df.getDate() + 1);
      df.setMilliseconds(-1);
    }

    return grupos.filter((g) => {
      // 1. Filtro de Status
      if (filtros.status === "PENDENTE" && g.rh_lancado) return false;
      if (filtros.status === "CONCLUIDA" && !g.rh_lancado) return false;

      // 2. Filtro de Ação
      if (filtros.acao && g.acao_aplicada !== filtros.acao) return false;

      // 3. ✅ Filtro de Data (baseado na ultima_data do grupo)
      if (g.ultima_data) {
        const dt = new Date(g.ultima_data);
        if (di && dt < di) return false;
        if (df && dt > df) return false;
      }

      // 4. Busca textual
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
  }, [grupos, filtros]);

  const counts = useMemo(() => {
    let pend = 0;
    let concl = 0;
    let adv = 0;
    let susp = 0;

    // Calcula baseado no filtered para refletir as datas
    filtered.forEach((g) => {
      if (g.rh_lancado) concl += 1;
      else pend += 1;

      if (g.acao_aplicada === "Advertência") adv += 1;
      if (g.acao_aplicada === "Suspensão") susp += 1;
    });

    return { pend, concl, adv, susp, total: filtered.length };
  }, [filtered]);

  function limparFiltros() {
    setFiltros({
      busca: "",
      status: "",
      acao: "",
      dataInicio: "", // Limpa tudo
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
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Tratativas RH</h1>

      {/* 🔍 Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>

        {/* Grid ajustado para caber datas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="border rounded-md px-3 py-2 col-span-2"
          />

          {/* ✅ Inputs de Data */}
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
            {loading ? "Carregando..." : `${filtered.length} registros (Filtrados)`}
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
      </div>

      {/* 🧾 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <CardResumo titulo="Total" valor={counts.total} cor="bg-blue-100 text-blue-700" />
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
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Chapa</th>
              <th className="py-2 px-3 text-left">Ação</th>
              <th className="py-2 px-3 text-center">Qtd.</th>
              <th className="py-2 px-3 text-left">Status RH</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  Nenhuma tratativa RH encontrada neste período.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
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
