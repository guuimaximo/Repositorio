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
import { supabase } from "../supabase";

// =============================================================================
// HELPERS VISUAIS
// =============================================================================

// Formata números
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// Badge de Status da Ordem
function StatusBadge({ status }) {
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
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
      {s}
    </span>
  );
}

// Badge de Prioridade (Baseado no desperdício em Litros)
function PrioridadeBadge({ litros }) {
    if (litros >= 100) {
        return <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded uppercase tracking-wider ml-2 shadow-sm">Alta Prioridade</span>
    }
    if (litros >= 50) {
        return <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-wider ml-2 shadow-sm">Média</span>
    }
    return null; // Não mostra nada se for baixo
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
  const [dataInicio, setDataInicio] = useState(""); 
  
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
        .limit(1000);

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
  }, [dataInicio]);

  // ---------------------------------------------------------------------------
  // FILTRAGEM E TOTAIS
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    return lista.filter((item) => {
        const termo = busca.toLowerCase();
        const matchTexto = 
            (item.motorista_nome || "").toLowerCase().includes(termo) ||
            (item.motorista_chapa || "").includes(termo);

        const statusItem = (item.status || "").toUpperCase();
        const matchStatus = filtroStatus === "TODOS" 
            ? true 
            : statusItem === filtroStatus;

        return matchTexto && matchStatus;
    });
  }, [lista, busca, filtroStatus]);

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
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FaBolt className="text-yellow-500" />
            Ordens de Acompanhamento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão dos Prontuários Técnicos gerados pela IA. Distribua para os instrutores.
          </p>
        </div>
        <button
          onClick={carregarOrdens}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm font-medium text-sm"
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* 2. KPIs RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white px-5 py-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ordens na Lista</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{totalOrdens}</div>
              </div>
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><FaFilePdf /></div>
          </div>
          
          <div className="bg-white px-5 py-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Desperdício Mapeado</div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{totalPerda.toFixed(0)} L</div>
                  <div className="text-[10px] text-gray-400">Potencial de economia nesta lista</div>
              </div>
              <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center"><FaExclamationCircle /></div>
          </div>

          <div className="bg-white px-5 py-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status Geral</div>
                  <div className="text-sm font-medium text-slate-600 mt-1">Aguardando aplicação</div>
              </div>
              <div className="h-10 w-10 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center"><FaClock /></div>
          </div>
      </div>

      {/* 3. PAINEL DE FILTROS */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-sm border-b pb-2">
            <FaFilter /> Filtros Avançados
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
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
            </div>

            {/* Filtro Status */}
            <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Status da Ordem</label>
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                >
                    <option value="TODOS">Todos os Status</option>
                    <option value="CONCLUIDO">✅ Prontos</option>
                    <option value="PROCESSANDO">⏳ Gerando...</option>
                    <option value="PENDENTE">⏸️ Pendente</option>
                    <option value="ERRO">❌ Com Erro</option>
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
                <th className="px-6 py-4 w-40">Data Geração</th>
                <th className="px-6 py-4">Motorista</th>
                <th className="px-6 py-4 text-center">Foco (Veículo/Linha)</th>
                <th className="px-6 py-4 text-right">KM/L Real</th>
                <th className="px-6 py-4 text-right">Desperdício</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center w-32">Prontuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FaSync className="animate-spin text-2xl text-blue-500" /> 
                        <span>Carregando ordens...</span>
                    </div>
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400 bg-gray-50">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FaFilter className="text-2xl text-gray-300" />
                        <span>Nenhuma ordem encontrada com estes filtros.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-6 py-4 text-gray-500">
                      <div className="font-medium text-slate-700">{new Date(item.created_at).toLocaleDateString('pt-BR')}</div>
                      <div className="text-[11px] opacity-60 flex items-center gap-1">
                          <FaClock size={10} /> {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-base">{item.motorista_nome || "Nome não registrado"}</span>
                            <PrioridadeBadge litros={n(item.perda_litros)} />
                          </div>
                          <span className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-200 mt-1 w-fit">
                                {item.motorista_chapa}
                          </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-700 bg-gray-100 px-2 py-1 rounded">{item.veiculo_foco || "-"}</span>
                            <span className="text-[10px] text-slate-400 mt-1">Linha {item.linha_foco || "-"}</span>
                        </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                        <span className="font-mono font-bold text-slate-700 text-base border-b border-dotted border-slate-400">
                            {n(item.kml_real).toFixed(2)}
                        </span>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 shadow-sm whitespace-nowrap">
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
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm w-full justify-center ${
                            item.status === "CONCLUIDO" 
                            ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transform active:scale-95" 
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                        title={item.status === "CONCLUIDO" ? "Abrir PDF" : "Aguarde a geração"}
                      >
                        <FaFilePdf size={14} /> ABRIR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Rodapé da tabela */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 text-center">
            Mostrando {listaFiltrada.length} ordens de acompanhamento
        </div>
      </div>
    </div>
  );
}
