import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  FaBolt,
  FaSearch,
  FaFilePdf,
  FaFilter,
  FaCalendarAlt,
  FaSync,
  FaExclamationCircle,
  FaCheckCircle
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

// =============================================================================
// HELPERS
// =============================================================================
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function StatusBadge({ status }) {
  // O Python salva como "CONCLUIDO" quando gera o PDF.
  // Aqui podemos interpretar isso como "Pronto para Aplicação".
  if (status === "CONCLUIDO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <FaCheckCircle /> PRONTO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function DesempenhoDieselAcompanhamento() {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState(""); // Filtra pela data de geração da ordem

  // ---------------------------------------------------------------------------
  // CARGA DE DADOS (Conectado à tabela diesel_acompanhamentos)
  // ---------------------------------------------------------------------------
  async function carregarOrdens() {
    setLoading(true);
    setErro(null);
    try {
      // Busca na tabela onde o Python salvou os resultados
      let query = supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500); // Limite de segurança

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
  }, [dataInicio]); // Recarrega se mudar a data de início

  // ---------------------------------------------------------------------------
  // FILTRAGEM LOCAL (Busca texto)
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    if (!busca) return lista;
    const q = busca.toLowerCase();
    return lista.filter(
      (item) =>
        (item.motorista_nome || "").toLowerCase().includes(q) ||
        (item.motorista_chapa || "").includes(q)
    );
  }, [lista, busca]);

  // ---------------------------------------------------------------------------
  // TOTAIS (KPIs do Painel)
  // ---------------------------------------------------------------------------
  const totalOrdens = listaFiltrada.length;
  const totalPerdaIdentificada = listaFiltrada.reduce((acc, item) => acc + n(item.perda_litros), 0);

  // ---------------------------------------------------------------------------
  // AÇÕES
  // ---------------------------------------------------------------------------
  const abrirPDF = (url) => {
    if (!url) return alert("URL do PDF não disponível.");
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FaBolt className="text-yellow-500" />
            Gestão de Ordens de Acompanhamento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lista de prontuários gerados pela IA. Distribua para os instrutores aplicarem.
          </p>
        </div>
        <button
          onClick={carregarOrdens}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm font-medium text-sm"
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Atualizar Lista
        </button>
      </div>

      {/* 2. KPIs RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordens Emitidas</p>
            <p className="text-2xl font-bold text-slate-800">{totalOrdens}</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <FaFilePdf size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potencial de Economia</p>
            <p className="text-2xl font-bold text-rose-600">{totalPerdaIdentificada.toFixed(0)} L</p>
            <p className="text-xs text-rose-400 mt-1">Desperdício mapeado</p>
          </div>
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <FaExclamationCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status da Aplicação</p>
            <p className="text-2xl font-bold text-emerald-600">0%</p>
            <p className="text-xs text-slate-400 mt-1">Em desenvolvimento</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <FaCheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 mb-1 block">Buscar Motorista</label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nome ou Chapa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Gerado a partir de</label>
          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="h-10 w-px bg-gray-200 hidden md:block mx-2"></div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 pb-2">
          <FaFilter /> Mostrando {listaFiltrada.length} registros
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
                <th className="px-6 py-4 text-center">Tecnologia</th>
                <th className="px-6 py-4 text-right">KM/L Real</th>
                <th className="px-6 py-4 text-right">Desperdício</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                    <FaSync className="animate-spin inline mr-2" /> Carregando ordens...
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
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')} <br/>
                      <span className="text-xs opacity-60">{new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{item.motorista_nome || "Nome não reg."}</div>
                      <div className="text-xs text-slate-400 font-mono bg-slate-100 inline-block px-1 rounded mt-1">
                        {item.motorista_chapa}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {/* Se tiver vehicle_foco salvo, exibe, senão tenta extrair do metadata */}
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                            {item.veiculo_foco || "N/A"}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                      {n(item.kml_real).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded">
                        -{n(item.perda_litros).toFixed(0)} L
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => abrirPDF(item.arquivo_pdf_path)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                        title="Baixar Prontuário PDF"
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
      </div>
    </div>
  );
}
