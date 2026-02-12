import React, { useMemo, useState, useEffect } from "react";
import {
  FaBolt,
  FaSearch,
  FaFilePdf,
  FaFilter,
  FaCalendarAlt,
  FaSync,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

// =============================================================================
// HELPERS
// =============================================================================
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// Badge de Status da Ordem
function StatusBadge({ status }) {
  // Padronização dos status vindos do Banco
  const s = String(status || "").toUpperCase();

  if (s === "CONCLUIDO") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <FaCheckCircle /> PRONTO
      </span>
    );
  }
  if (s === "PENDENTE" || s === "PROCESSANDO") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <FaClock /> GERANDO...
      </span>
    );
  }
  if (s === "ERRO") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <FaTimesCircle /> FALHA
      </span>
    );
  }
  
  // Status desconhecido
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
      {s}
    </span>
  );
}

// Badge de Prioridade (Baseado no desperdício)
function PrioridadeBadge({ litros }) {
    if (litros >= 100) {
        return <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">Alta</span>
    }
    if (litros >= 50) {
        return <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Média</span>
    }
    return <span className="text-[10px] font-bold bg-slate-400 text-white px-2 py-0.5 rounded uppercase tracking-wider">Normal</span>
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function DesempenhoDieselAcompanhamento() {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState(null);

  // --- FILTROS ---
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [dataInicio, setDataInicio] = useState(""); // Data do input
  
  // ---------------------------------------------------------------------------
  // CARGA DE DADOS
  // ---------------------------------------------------------------------------
  async function carregarOrdens() {
    setLoading(true);
    setErro(null);
    try {
      let query = supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000); // Traz os últimos 1000 registros

      // Filtro de data no Banco (mais eficiente)
      if (dataInicio) {
        query = query.gte("created_at", dataInicio);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLista(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar ordens: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarOrdens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio]); // Recarrega se mudar a data no calendário

  // ---------------------------------------------------------------------------
  // FILTRAGEM LOCAL (Rápida)
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    return lista.filter((item) => {
        // 1. Filtro de Texto
        const termo = busca.toLowerCase();
        const matchTexto = 
            (item.motorista_nome || "").toLowerCase().includes(termo) ||
            (item.motorista_chapa || "").includes(termo);

        // 2. Filtro de Status
        const statusItem = (item.status || "").toUpperCase();
        const matchStatus = filtroStatus === "TODOS" 
            ? true 
            : statusItem === filtroStatus;

        return matchTexto && matchStatus;
    });
  }, [lista, busca, filtroStatus]);

  // ---------------------------------------------------------------------------
  // TOTAIS DOS FILTRADOS (KPI Dinâmico)
  // ---------------------------------------------------------------------------
  const totalOrdens = listaFiltrada.length;
  const totalPerda = listaFiltrada.reduce((acc, item) => acc + n(item.perda_litros), 0);

  // ---------------------------------------------------------------------------
  // AÇÕES
  // ---------------------------------------------------------------------------
  const abrirPDF = (url) => {
    if (!url) return alert("PDF ainda não foi gerado ou link indisponível.");
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FaBolt className="text-yellow-500" />
            Ordens de Acompanhamento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão dos Prontuários Técnicos gerados pela IA.
          </p>
        </div>
        <button
          onClick={carregarOrdens}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm font-medium text-sm"
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* 2. PAINEL DE FILTROS */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-sm">
            <FaFilter /> Filtros de Busca
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Busca Texto */}
            <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Motorista (Nome ou Chapa)</label>
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                    type="text"
                    placeholder="Digite para buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Filtro Status */}
            <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Status da Ordem</label>
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    <option value="TODOS">Todos</option>
                    <option value="CONCLUIDO">Prontos (Concluído)</option>
                    <option value="PROCESSANDO">Gerando...</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="ERRO">Com Erro</option>
                </select>
            </div>

            {/* Filtro Data */}
            <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Gerado a partir de</label>
                <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                    <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* 3. BARRA DE RESULTADOS (KPIs) */}
      <div className="flex flex-wrap gap-4">
          <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaFilePdf /></div>
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Ordens Listadas</div>
                  <div className="text-xl font-bold text-slate-800">{totalOrdens}</div>
              </div>
          </div>
          
          <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><FaExclamationCircle /></div>
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Desperdício Mapeado</div>
                  <div className="text-xl font-bold text-rose-600">{totalPerda.toFixed(0)} L</div>
              </div>
          </div>
      </div>

      {/* 4. TABELA DE RESULTADOS */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {erro && (
          <div className="p-4 bg-rose-50 text-rose-700 text-sm border-b border-rose-100 flex items-center gap-2">
            <FaExclamationCircle /> {erro}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b">
              <tr>
                <th className="px-6 py-4">Data Geração</th>
                <th className="px-6 py-4">Motorista</th>
                <th className="px-6 py-4 text-center">Foco</th>
                <th className="px-6 py-4 text-right">KM/L Real</th>
                <th className="px-6 py-4 text-right">Desperdício</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Prontuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                    <FaSync className="animate-spin inline mr-2" /> Carregando lista...
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                    Nenhuma ordem encontrada com estes filtros.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-gray-500">
                      <div className="font-medium text-slate-700">{new Date(item.created_at).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs opacity-60">{new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-800 text-base">{item.motorista_nome || "Nome não registrado"}</div>
                            <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                                {item.motorista_chapa}
                            </div>
                          </div>
                          {/* Badge de Prioridade ao lado do nome */}
                          <PrioridadeBadge litros={n(item.perda_litros)} />
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-600">{item.veiculo_foco || "-"}</span>
                            <span className="text-[10px] text-slate-400">{item.linha_foco || "-"}</span>
                        </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                        <span className="font-mono font-bold text-slate-700 text-base">
                            {n(item.kml_real).toFixed(2)}
                        </span>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100">
                        -{n(item.perda_litros).toFixed(0)} L
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => abrirPDF(item.arquivo_pdf_path)}
                        disabled={item.status !== "CONCLUIDO"}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                            item.status === "CONCLUIDO" 
                            ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        title="Baixar Prontuário PDF"
                      >
                        <FaFilePdf size={14} /> ABRIR PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
