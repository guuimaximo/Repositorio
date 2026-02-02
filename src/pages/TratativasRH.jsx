import React, { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import TratativasLancarRH from "./TratativasLancarRH";
import TratativasConsultarRH from "./TratativasConsultarRH";

const ACOES_RH = new Set(["Advertência", "Suspensão"]);

function brDateTime(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR");
}
function norm(s) {
  return String(s || "").trim().toLowerCase();
}
function buildKey({ motorista_chapa, acao_aplicada, evidencia_base }) {
  return `${String(motorista_chapa || "").trim()}|${String(acao_aplicada || "").trim()}|${String(
    evidencia_base || ""
  ).trim()}`;
}

function CardResumo({ titulo, valor, cor }) {
  return (
    <div className={`${cor} rounded-lg shadow p-5 text-center`}>
      <h3 className="text-sm font-medium text-gray-600">{titulo}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{valor}</p>
    </div>
  );
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

export default function TratativasRH() {
  useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  // filtros
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(""); // "" | PENDENTE | CONCLUIDA
  const [acaoFiltro, setAcaoFiltro] = useState(""); // "" | Advertência | Suspensão

  // modal
  const [modalType, setModalType] = useState(null); // "LANCAR" | "CONSULTAR" | null
  const [sel, setSel] = useState(null);

  async function load() {
    setLoading(true);
    try {
      // 1) detalhes RH (tratador)
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

      // 2) agrupa por evidência-base
      const map = new Map();
      for (const d of detalhes) {
        const t = d.tratativas;
        const evidencia_base = d.imagem_tratativa || d.anexo_tratativa || "";
        const key = buildKey({
          motorista_chapa: t?.motorista_chapa,
          acao_aplicada: d.acao_aplicada,
          evidencia_base,
        });

        if (!map.has(key)) {
          map.set(key, {
            key,
            motorista_nome: t?.motorista_nome || "",
            motorista_chapa: t?.motorista_chapa || "",
            acao_aplicada: d.acao_aplicada,
            evidencia_base,
            last_created_at: d.created_at,
            itens: [],
          });
        }

        const g = map.get(key);
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
          descricao: t?.descricao || "",
          observacoes_tratador: d.observacoes || "",
          evidencia_conclusao_url: d.imagem_tratativa || null,
          anexo_tratador_url: d.anexo_tratativa || null,
          tratado_por_nome: d.tratado_por_nome || d.tratado_por_login || "—",
        });

        if (new Date(d.created_at).getTime() > new Date(g.last_created_at).getTime()) {
          g.last_created_at = d.created_at;
        }
      }

      let grouped = Array.from(map.values()).sort(
        (a, b) => new Date(b.last_created_at).getTime() - new Date(a.last_created_at).getTime()
      );

      // 3) status RH (consolidado)
      const keys = grouped.map((g) => g.key);
      const lancMap = new Map();
      if (keys.length) {
        const chunkSize = 200;
        for (let i = 0; i < keys.length; i += chunkSize) {
          const slice = keys.slice(i, i + chunkSize);
          const { data: rh, error: erh } = await supabase
            .from("tratativas_rh_lancamentos")
            .select("id, chave_consolidacao, status_rh, lancado_transnet, lancado_em, observacao_rh, evidencia_transnet_url")
            .in("chave_consolidacao", slice);

          if (erh) throw erh;
          (rh || []).forEach((r) => lancMap.set(r.chave_consolidacao, r));
        }
      }

      grouped = grouped.map((g) => {
        const rh = lancMap.get(g.key) || null;
        const rhLancado =
          Boolean(rh?.lancado_transnet) ||
          String(rh?.status_rh || "").toUpperCase().includes("CONCL");

        return {
          ...g,
          rh_id: rh?.id || null,
          rh_lancado: rhLancado,
          rh_status: rh?.status_rh || (rhLancado ? "CONCLUIDA" : "PENDENTE"),
          rh_obs: rh?.observacao_rh || "",
          rh_evid_url: rh?.evidencia_transnet_url || null,
          rh_lancado_em: rh?.lancado_em || null,
        };
      });

      setGroups(grouped);
    } catch (e) {
      alert(`Erro ao carregar RH: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = norm(busca);
    return groups.filter((g) => {
      if (status === "PENDENTE" && g.rh_lancado) return false;
      if (status === "CONCLUIDA" && !g.rh_lancado) return false;
      if (acaoFiltro && g.acao_aplicada !== acaoFiltro) return false;

      if (!q) return true;
      const blob = norm(
        [
          g.motorista_nome,
          g.motorista_chapa,
          g.acao_aplicada,
          ...g.itens.map((i) => `${i.tipo_ocorrencia} ${i.linha} ${i.descricao}`),
        ]
          .filter(Boolean)
          .join(" ")
      );
      return blob.includes(q);
    });
  }, [groups, busca, status, acaoFiltro]);

  const counts = useMemo(() => {
    let total = groups.length;
    let pend = 0,
      concl = 0,
      adv = 0,
      susp = 0;
    groups.forEach((g) => {
      if (g.rh_lancado) concl++;
      else pend++;
      if (g.acao_aplicada === "Advertência") adv++;
      if (g.acao_aplicada === "Suspensão") susp++;
    });
    return { total, pend, concl, adv, susp };
  }, [groups]);

  function limparFiltros() {
    setBusca("");
    setStatus("");
    setAcaoFiltro("");
  }

  function open(g) {
    setSel(g);
    setModalType(g.rh_lancado ? "CONSULTAR" : "LANCAR");
  }
  function close() {
    setSel(null);
    setModalType(null);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-700">Tratativas RH</h1>

      {/* Filtros (layout Central) */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar (motorista, chapa, ocorrência, linha...)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border rounded-md px-3 py-2"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONCLUIDA">Concluída</option>
          </select>

          <select
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todas as Ações</option>
            <option value="Advertência">Advertência</option>
            <option value="Suspensão">Suspensão</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            {loading ? "Carregando..." : `${filtered.length} registros`}
          </div>

          <div className="flex justify-end gap-2">
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

      {/* Cards (coloridos igual Central) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <CardResumo titulo="Total" valor={counts.total} cor="bg-blue-100 text-blue-700" />
        <CardResumo titulo="Pendentes" valor={counts.pend} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Concluídas" valor={counts.concl} cor="bg-green-100 text-green-700" />
        <CardResumo titulo="Advertências" valor={counts.adv} cor="bg-yellow-100 text-yellow-700" />
        <CardResumo titulo="Suspensões" valor={counts.susp} cor="bg-red-100 text-red-700" />
      </div>

      {/* Tabela (azul igual Central) */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Chapa</th>
              <th className="py-2 px-3 text-left">Ação</th>
              <th className="py-2 px-3 text-left">Tratativas</th>
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
                  Nenhuma tratativa RH encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.key} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">{brDateTime(g.last_created_at)}</td>
                  <td className="py-2 px-3 text-gray-700 font-medium">{g.motorista_nome || "—"}</td>
                  <td className="py-2 px-3 text-gray-700">{g.motorista_chapa || "—"}</td>
                  <td className="py-2 px-3">
                    <BadgeAcao acao={g.acao_aplicada} />
                  </td>
                  <td className="py-2 px-3 text-gray-700">
                    <b>{g.itens.length}</b> consolidada(s)
                  </td>
                  <td className="py-2 px-3">
                    {g.rh_lancado ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Concluída
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => open(g)}
                      className={[
                        "px-3 py-1 rounded-md text-sm text-white",
                        g.rh_lancado ? "bg-gray-500 hover:bg-gray-600" : "bg-emerald-600 hover:bg-emerald-700",
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

      {/* Modais separados */}
      {modalType === "LANCAR" && sel && (
        <TratativasLancarRH aberto={true} grupo={sel} onClose={close} onSaved={load} />
      )}
      {modalType === "CONSULTAR" && sel && (
        <TratativasConsultarRH aberto={true} grupo={sel} onClose={close} />
      )}
    </div>
  );
}
