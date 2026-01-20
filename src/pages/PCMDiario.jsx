import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PCMDiario() {
  const { id } = useParams();
  const [veiculos, setVeiculos] = useState([]);
  const [prefixos, setPrefixos] = useState([]);
  const [form, setForm] = useState({ frota: "", setor: "MANUTENÇÃO", descricao: "", categoria: "GNS" });

  useEffect(() => {
    buscarDados();
    carregarPrefixos();
  }, [id]);

  async function carregarPrefixos() {
    const { data } = await supabase.from("prefixos").select("codigo").order("codigo");
    setPrefixos(data || []);
  }

  async function buscarDados() {
    const { data } = await supabase
      .from("veiculos_pcm")
      .select("*")
      .eq("pcm_id", id)
      .order("categoria", { ascending: true });
    setVeiculos(data || []);
  }

  async function lancarVeiculo() {
    if (!form.frota || !form.descricao) return alert("Preencha Frota e Descrição");
    
    const { error } = await supabase.from("veiculos_pcm").insert([{ 
      pcm_id: id, 
      ...form, 
      lancado_no_turno: 'DIA' 
    }]);

    if (!error) {
      setForm({ ...form, frota: "", descricao: "" });
      buscarDados();
    }
  }

  const getColor = (cat) => {
    if (cat === "GNS") return "bg-red-600 text-white";
    if (cat === "NOITE") return "bg-white text-black border-b";
    if (cat === "VENDA") return "bg-blue-600 text-white";
    return "bg-gray-400 text-white"; // PENDENTES
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">PCM - Diário (Lançamentos)</h1>

      {/* CABEÇALHO DE LANÇAMENTO */}
      <div className="bg-gray-200 p-4 rounded-t-lg grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs font-bold uppercase">Frota</label>
          <select className="w-full p-2 rounded border" value={form.frota} onChange={e => setForm({...form, frota: e.target.value})}>
            <option value="">Selecione...</option>
            {prefixos.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase">Categoria</label>
          <select className="w-full p-2 rounded border" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
            <option value="GNS">GNS (Vermelho)</option>
            <option value="NOITE">NOITE (Branco)</option>
            <option value="VENDA">VENDA (Azul)</option>
            <option value="PENDENTES">PENDENTES (Cinza)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold uppercase">Descrição do Defeito</label>
          <input className="w-full p-2 rounded border" type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
        </div>
        <button onClick={lancarVeiculo} className="bg-blue-700 text-white p-2 rounded font-bold hover:bg-blue-800">LANÇAR</button>
      </div>

      {/* TABELA CONSOLIDADA */}
      <div className="bg-white shadow-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-white uppercase text-xs">
            <tr>
              <th className="p-3">Frota</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {veiculos.map((v) => (
              <tr key={v.id} className={`${getColor(v.categoria)} border-b border-gray-300`}>
                <td className="p-3 font-bold">{v.frota}</td>
                <td className="p-3 uppercase">{v.descricao}</td>
                <td className="p-3 text-xs">{v.setor}</td>
                <td className="p-3 font-bold">{v.categoria}</td>
                <td className="p-3 text-center">
                  <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs">LIBERAR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
