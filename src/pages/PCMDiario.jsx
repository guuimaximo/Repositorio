import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { 
  FaDownload, FaSun, FaMoon, FaCheckCircle, 
  FaArrowLeft, FaTruckLoading, FaExclamationTriangle 
} from "react-icons/fa";

export default function PCMDiario() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados de Dados
  const [veiculos, setVeiculos] = useState([]);
  const [prefixos, setPrefixos] = useState([]);
  const [pcmInfo, setPcmInfo] = useState(null);
  
  // Estados de Interface
  const [loading, setLoading] = useState(true);
  const [turnoAtivo, setTurnoAtivo] = useState("DIA");
  const [form, setForm] = useState({ 
    frota: "", setor: "MANUTENÇÃO", descricao: "", categoria: "GNS" 
  });

  // 1. Carregar dados iniciais (Cabeçalho do PCM e Prefixos)
  const carregarDadosBase = useCallback(async () => {
    const [resPcm, resPrefixos] = await Promise.all([
      supabase.from("pcm_diario").select("*").eq("id", id).single(),
      supabase.from("prefixos").select("codigo").order("codigo")
    ]);
    
    if (resPcm.data) setPcmInfo(resPcm.data);
    if (resPrefixos.data) setPrefixos(resPrefixos.data);
  }, [id]);

  // 2. Buscar veículos vinculados a este PCM (Apenas os que não saíram)
  const buscarVeiculos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("veiculos_pcm")
      .select("*")
      .eq("pcm_id", id)
      .is("data_saida", null)
      .order("categoria", { ascending: true });

    if (!error) setVeiculos(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    carregarDadosBase();
    buscarVeiculos();
  }, [carregarDadosBase, buscarVeiculos]);

  // 3. Lógica de Lançamento
  async function lancarVeiculo() {
    if (!form.frota || !form.descricao) return alert("Preencha Frota e Descrição!");

    const payload = {
      pcm_id: id,
      ...form,
      lancado_no_turno: turnoAtivo,
      data_entrada: new Date().toISOString()
    };

    const { error } = await supabase.from("veiculos_pcm").insert([payload]);
    if (!error) {
      setForm({ ...form, frota: "", descricao: "" });
      buscarVeiculos();
    }
  }

  // 4. Lógica de Liberação (Baixa no sistema)
  async function liberarVeiculo(vId) {
    const { error } = await supabase
      .from("veiculos_pcm")
      .update({ data_saida: new Date().toISOString() })
      .eq("id", vId);

    if (!error) buscarVeiculos();
  }

  // Auxiliares de UI
  const calcularDias = (dataEntrada) => {
    const inicio = new Date(dataEntrada);
    const hoje = new Date();
    const diff = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getRowStyle = (cat) => {
    switch (cat) {
      case "GNS": return "bg-red-600 text-white border-red-700";
      case "NOITE": return "bg-white text-gray-800 border-gray-200";
      case "VENDA": return "bg-blue-600 text-white border-blue-700";
      case "PENDENTES": return "bg-gray-400 text-white border-gray-500";
      default: return "bg-white";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      {/* HEADER E RESUMO */}
      <div className="bg-white p-4 rounded-t-xl shadow-md flex flex-wrap justify-between items-center border-b-2 border-blue-500">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/pcm-inicio")} className="p-2 hover:bg-gray-100 rounded-full"><FaArrowLeft /></button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">PCM - {pcmInfo?.data_referencia}</h1>
            <p className="text-xs font-bold text-gray-400">Responsável: {pcmInfo?.criado_por}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button onClick={() => setTurnoAtivo("DIA")} className={`px-4 py-1 rounded-md flex items-center gap-2 font-bold text-sm ${turnoAtivo === "DIA" ? "bg-yellow-400 shadow" : ""}`}><FaSun /> DIA</button>
            <button onClick={() => setTurnoAtivo("NOITE")} className={`px-4 py-1 rounded-md flex items-center gap-2 font-bold text-sm ${turnoAtivo === "NOITE" ? "bg-gray-800 text-white shadow" : ""}`}><FaMoon /> NOITE</button>
          </div>
          <button className="bg-blue-700 text-white px-4 py-1 rounded-lg font-bold text-sm flex items-center gap-2"><FaDownload /> BAIXAR</button>
        </div>
      </div>

      {/* INPUT DE LANÇAMENTO */}
      <div className="bg-gray-800 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end shadow-inner">
        <div className="flex flex-col text-white">
          <label className="text-[10px] font-bold mb-1">VEÍCULO</label>
          <select className="p-2 rounded text-black text-sm" value={form.frota} onChange={e => setForm({...form, frota: e.target.value})}>
            <option value="">Selecione...</option>
            {prefixos.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
          </select>
        </div>
        <div className="flex flex-col text-white">
          <label className="text-[10px] font-bold mb-1">CATEGORIA</label>
          <select className="p-2 rounded text-black text-sm font-bold" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
            <option value="GNS">GNS (Vermelho)</option>
            <option value="NOITE">NOITE (Branco)</option>
            <option value="VENDA">VENDA (Azul)</option>
            <option value="PENDENTES">PENDENTES (Cinza)</option>
          </select>
        </div>
        <div className="md:col-span-2 flex flex-col text-white">
          <label className="text-[10px] font-bold mb-1">DESCRIÇÃO DO DEFEITO</label>
          <input className="p-2 rounded text-black text-sm" type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o problema..." />
        </div>
        <button onClick={lancarVeiculo} className="bg-green-600 hover:bg-green-500 text-white p-2 rounded font-black flex items-center justify-center gap-2"><FaTruckLoading /> LANÇAR</button>
      </div>

      {/* TABELA DE OPERAÇÃO */}
      <div className="bg-white shadow-xl rounded-b-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b">
              <th className="p-3 w-20">Frota</th>
              <th className="p-3 w-24">Dias</th>
              <th className="p-3">Descrição / Observação</th>
              <th className="p-3 w-32">Setor</th>
              <th className="p-3 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {veiculos.map((v) => (
              <tr key={v.id} className={`${getRowStyle(v.categoria)} border-b transition-all`}>
                <td className="p-3 text-xl font-black">{v.frota}</td>
                <td className="p-3">
                  <span className="flex items-center gap-1 font-bold">
                    <FaExclamationTriangle className={calcularDias(v.data_entrada) > 3 ? "text-yellow-400" : "opacity-20"} />
                    {calcularDias(v.data_entrada)} d
                  </span>
                </td>
                <td className="p-3 text-xs font-medium uppercase leading-tight">{v.descricao}</td>
                <td className="p-3 text-[10px] font-black">{v.setor}</td>
                <td className="p-3 text-center">
                  <button onClick={() => liberarVeiculo(v.id)} className="bg-green-500 hover:bg-green-400 text-white p-2 rounded-full shadow-lg"><FaCheckCircle size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
