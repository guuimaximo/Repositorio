import React, { useMemo, useState, useEffect } from "react";
import {
  FaBolt, FaSearch, FaFilePdf, FaFilter, FaSync,
  FaCheckCircle, FaTimesCircle, FaClock, FaHistory,
  FaClipboardList, FaRoad, FaSave, FaTimes, FaPlay
} from "react-icons/fa";
import { supabase } from "../supabase";

// =============================================================================
// CONFIGURAÇÕES & HELPERS
// =============================================================================
function n(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

// Opções do Checklist Técnico
const CHECKLIST_ITENS = [
    { id: "faixa_verde", label: "Operação na Faixa Verde (RPM)" },
    { id: "antecipacao", label: "Antecipação de Parada/Trânsito" },
    { id: "troca_marcha", label: "Troca de Marchas no Tempo Correto" },
    { id: "uso_retarder", label: "Uso Correto do Freio Motor/Retarder" },
    { id: "marcha_lenta", label: "Evitou Marcha Lenta Excessiva" },
    { id: "topografia", label: "Aproveitamento de Inércia (Topografia)" }
];

// Níveis de Monitoramento
const NIVEIS = {
    1: { label: "Nível 1 (Leve)", dias: 5, color: "bg-blue-50 border-blue-200 text-blue-700" },
    2: { label: "Nível 2 (Médio)", dias: 10, color: "bg-amber-50 border-amber-200 text-amber-700" },
    3: { label: "Nível 3 (Crítico)", dias: 15, color: "bg-rose-50 border-rose-200 text-rose-700" }
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function DesempenhoDieselAcompanhamento() {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState([]);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ATIVOS"); 

  // Modais
  const [modalLancarOpen, setModalLancarOpen] = useState(false);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  
  // Histórico (Modal Consulta)
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Formulário (Modal Lançar)
  const [form, setForm] = useState({
      horaInicio: "", horaFim: "",
      kmInicio: "", kmFim: "",
      mediaTeste: "",
      nivel: 2, // Padrão
      obs: "",
      checklist: {} 
  });

  // ---------------------------------------------------------------------------
  // CARGA DE DADOS
  // ---------------------------------------------------------------------------
  async function carregarOrdens() {
    setLoading(true);
    try {
      let query = supabase
        .from("diesel_acompanhamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      
      const { data, error } = await query;
      if (error) throw error;
      setLista(data || []);
    } catch (e) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarOrdens(); }, []);

  // ---------------------------------------------------------------------------
  // AÇÃO 1: CONSULTAR ANÁLISE (Resumo + Histórico)
  // ---------------------------------------------------------------------------
  const handleConsultar = async (item) => {
      setItemSelecionado(item);
      setModalConsultaOpen(true);
      setLoadingHist(true);
      
      // Busca histórico de outras ordens desse mesmo motorista
      const { data } = await supabase
          .from("diesel_acompanhamentos")
          .select("*")
          .eq("motorista_chapa", item.motorista_chapa)
          .neq("id", item.id) // Não traz a atual
          .order("created_at", { ascending: false });
          
      setHistorico(data || []);
      setLoadingHist(false);
  };

  // ---------------------------------------------------------------------------
  // AÇÃO 2: LANÇAR ACOMPANHAMENTO (Checklist)
  // ---------------------------------------------------------------------------
  const handleLancar = (item) => {
      setItemSelecionado(item);
      // Limpa formulário
      setForm({
          horaInicio: "", horaFim: "",
          kmInicio: "", kmFim: "",
          mediaTeste: "",
          nivel: 2,
          obs: "",
          checklist: {}
      });
      setModalLancarOpen(true);
  };

  const toggleCheck = (id) => {
      setForm(prev => ({
          ...prev,
          checklist: { ...prev.checklist, [id]: !prev.checklist[id] }
      }));
  };

  const salvarIntervencao = async () => {
      // Validação Básica
      if (!form.horaInicio || !form.kmInicio || !form.mediaTeste) {
          alert("Por favor, preencha os dados da Viagem de Teste (Hora, KM e Média).");
          return;
      }

      const dias = NIVEIS[form.nivel].dias;
      const dtFim = new Date();
      dtFim.setDate(dtFim.getDate() + dias);

      try {
          const { error } = await supabase.from("diesel_acompanhamentos").update({
              // Muda Status: Começa a contar
              status: "EM_MONITORAMENTO",
              
              // Dados da Metodologia
              nivel: form.nivel,
              dias_monitoramento: dias,
              dt_inicio_monitoramento: new Date().toISOString(),
              dt_fim_previsao: dtFim.toISOString(),

              // Dados da Aula Prática
              intervencao_hora_inicio: form.horaInicio,
              intervencao_hora_fim: form.horaFim,
              intervencao_km_inicio: n(form.kmInicio),
              intervencao_km_fim: n(form.kmFim),
              intervencao_media_teste: n(form.mediaTeste),
              intervencao_checklist: form.checklist,
              intervencao_obs: form.obs

          }).eq("id", itemSelecionado.id);

          if (error) throw error;

          setModalLancarOpen(false);
          carregarOrdens(); // Recarrega a lista para sumir o botão
          alert("Acompanhamento iniciado com sucesso!");

      } catch (err) {
          alert("Erro ao salvar: " + err.message);
      }
  };

  // ---------------------------------------------------------------------------
  // FILTROS
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    return lista.filter((item) => {
        const q = busca.toLowerCase();
        const matchTexto = (item.motorista_nome || "").toLowerCase().includes(q) || (item.motorista_chapa || "").includes(q);
        
        let status = (item.status || "AG_ACOMPANHAMENTO").toUpperCase();
        if(status === "CONCLUIDO") status = "AG_ACOMPANHAMENTO"; // Legado do Python

        if (filtroStatus === "ATIVOS") return matchTexto && ["AG_ACOMPANHAMENTO", "EM_MONITORAMENTO"].includes(status);
        if (filtroStatus === "ENCERRADOS") return matchTexto && ["OK", "TRATATIVA", "REJEITADA"].includes(status);
        
        return matchTexto;
    });
  }, [lista, busca, filtroStatus]);

  const abrirPDF = (url) => { if(url) window.open(url, "_blank"); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-[#f8f9fa] font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <FaBolt className="text-yellow-500" /> Painel de Acompanhamento
            </h1>
            <p className="text-sm text-slate-500">Gestão de Ordens e Intervenções Técnicas</p>
        </div>
        <button onClick={carregarOrdens} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 text-sm font-bold">
            <FaSync /> Atualizar
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="flex gap-4 mb-6 items-center bg-white p-3 rounded-lg border shadow-sm">
          <div className="relative">
             <FaSearch className="absolute left-3 top-3 text-gray-400" />
             <input type="text" placeholder="Buscar Motorista..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 p-2 border rounded w-64 text-sm outline-none focus:border-blue-500" />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="p-2 border rounded text-sm bg-white outline-none focus:border-blue-500">
              <option value="ATIVOS">⚡ Em Aberto / Monitorando</option>
              <option value="ENCERRADOS">🏁 Encerrados (Histórico)</option>
              <option value="TODOS">Todos</option>
          </select>
          <div className="ml-auto text-xs text-gray-500 font-medium">
              Mostrando {listaFiltrada.length} registros
          </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Motorista</th>
                <th className="px-6 py-4 text-center">Foco</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listaFiltrada.map(item => {
                  const status = (item.status || "AG_ACOMPANHAMENTO").toUpperCase();
                  // Botão Lançar só aparece se ainda não começou
                  const showLancar = status === "AG_ACOMPANHAMENTO" || status === "CONCLUIDO"; 
                  const diasRestantes = item.dt_fim_previsao ? Math.ceil((new Date(item.dt_fim_previsao) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                            {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{item.motorista_nome}</div>
                            <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded w-fit mt-1">{item.motorista_chapa}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold border">{item.veiculo_foco || "Geral"}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            {showLancar ? (
                                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200 flex items-center justify-center gap-1">
                                    <FaClock /> AGUARDANDO INSTRUTOR
                                </span>
                            ) : status === "EM_MONITORAMENTO" ? (
                                <div className="flex flex-col items-center">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">
                                        EM MONITORAMENTO
                                    </span>
                                    <span className="text-[9px] text-gray-500 mt-1">Faltam {diasRestantes} dias</span>
                                </div>
                            ) : (
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">{status}</span>
                            )}
                        </td>
                        
                        {/* OS 3 BOTÕES */}
                        <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                                {/* 1. PDF */}
                                <button onClick={() => abrirPDF(item.arquivo_pdf_path)} className="p-2 text-rose-600 bg-white border border-rose-200 rounded hover:bg-rose-50 transition shadow-sm" title="Abrir Prontuário PDF">
                                    <FaFilePdf />
                                </button>

                                {/* 2. CONSULTAR */}
                                <button onClick={() => handleConsultar(item)} className="p-2 text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 transition shadow-sm" title="Consultar Histórico">
                                    <FaHistory />
                                </button>

                                {/* 3. LANÇAR (Condicional) */}
                                {showLancar && (
                                    <button onClick={() => handleLancar(item)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-sm transition">
                                        <FaPlay size={10} /> LANÇAR
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                  )
              })}
            </tbody>
        </table>
      </div>

      {/* --- MODAL DE CONSULTA (HISTÓRICO) --- */}
      {modalConsultaOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                <div className="flex justify-between items-center p-5 border-b bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FaHistory /> Histórico do Motorista</h3>
                    <button onClick={() => setModalConsultaOpen(false)}><FaTimes className="text-gray-400 hover:text-red-500" /></button>
                </div>
                
                <div className="p-6">
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-800 text-sm mb-2">Ordem Atual</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-blue-500 font-bold">Motorista:</span> {itemSelecionado.motorista_nome}</div>
                            <div><span className="text-blue-500 font-bold">KM/L Atual:</span> {n(itemSelecionado.kml_real).toFixed(2)}</div>
                            <div><span className="text-blue-500 font-bold">Desperdício:</span> {n(itemSelecionado.perda_litros).toFixed(0)} L</div>
                            <div><span className="text-blue-500 font-bold">Meta:</span> {n(itemSelecionado.kml_meta).toFixed(2)}</div>
                        </div>
                    </div>

                    <h4 className="font-bold text-slate-700 text-sm mb-3 border-b pb-1">Acompanhamentos Anteriores</h4>
                    {loadingHist ? <div className="text-center py-4"><FaSync className="animate-spin inline"/> Carregando...</div> : 
                     historico.length === 0 ? <div className="text-center py-4 text-gray-400 text-sm">Nenhum histórico anterior encontrado.</div> : (
                        <div className="space-y-3">
                            {historico.map(h => (
                                <div key={h.id} className="p-3 border rounded-lg flex justify-between items-center text-sm hover:bg-gray-50">
                                    <div>
                                        <div className="font-bold text-slate-700">{new Date(h.created_at).toLocaleDateString()}</div>
                                        <div className="text-xs text-gray-500">{h.veiculo_foco || "Geral"}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-xs px-2 py-0.5 rounded ${h.status === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{h.status}</div>
                                        <div className="text-xs text-gray-400 mt-1">Nível {h.nivel || "-"}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE LANÇAMENTO (CHECKLIST) --- */}
      {modalLancarOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                <div className="flex justify-between items-center p-5 border-b bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FaRoad /> Lançar Intervenção Técnica</h3>
                    <button onClick={() => setModalLancarOpen(false)}><FaTimes className="text-gray-400 hover:text-red-500" /></button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* SEÇÃO 1: DADOS DA VIAGEM */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><FaClock /> Dados da Viagem de Teste</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="text-xs font-bold text-gray-500">Hora Início</label><input type="time" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                            <div><label className="text-xs font-bold text-gray-500">Hora Fim</label><input type="time" value={form.horaFim} onChange={e => setForm({...form, horaFim: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                            <div><label className="text-xs font-bold text-gray-500">KM Início</label><input type="number" value={form.kmInicio} onChange={e => setForm({...form, kmInicio: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                            <div><label className="text-xs font-bold text-gray-500">KM Fim</label><input type="number" value={form.kmFim} onChange={e => setForm({...form, kmFim: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                        </div>
                        <div className="mt-3">
                            <label className="text-xs font-bold text-blue-600">MÉDIA REALIZADA NO TESTE (KM/L)</label>
                            <input type="number" step="0.01" value={form.mediaTeste} onChange={e => setForm({...form, mediaTeste: e.target.value})} className="w-full p-2 border border-blue-300 rounded text-sm font-bold text-blue-800 bg-blue-50" placeholder="Ex: 2.80"/>
                        </div>
                    </div>

                    {/* SEÇÃO 2: CHECKLIST TÉCNICO */}
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><FaClipboardList /> O que foi corrigido?</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {CHECKLIST_ITENS.map(chk => (
                                <label key={chk.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${form.checklist[chk.id] ? "bg-emerald-50 border-emerald-300" : "hover:bg-gray-50"}`}>
                                    <input type="checkbox" checked={!!form.checklist[chk.id]} onChange={() => toggleCheck(chk.id)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                    <span className="text-sm text-gray-700">{chk.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* SEÇÃO 3: NÍVEL (CONTRATO) */}
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-3">Definir Nível de Monitoramento</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3].map(n => (
                                <button key={n} onClick={() => setForm({...form, nivel: n})} 
                                    className={`p-3 rounded-lg border text-center transition ${form.nivel === n ? `ring-2 ring-offset-1 ${NIVEIS[n].color.replace('text', 'bg').replace('bg', 'text')}` : NIVEIS[n].color}`}>
                                    <div className="font-bold">{NIVEIS[n].label}</div>
                                    <div className="text-xs opacity-80">{NIVEIS[n].dias} Dias</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={salvarIntervencao} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex justify-center items-center gap-2 transition">
                        <FaSave /> SALVAR E INICIAR MONITORAMENTO
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
