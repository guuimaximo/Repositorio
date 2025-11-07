import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { FaUndo, FaEye } from 'react-icons/fa';

export default function AvariasEmRevisao() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Reprovado')
      .order('aprovado_em', { ascending: false });
    if (!error) setAvarias(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function reverter(id) {
    if (!window.confirm('Deseja realmente reverter esta avaria para pendente de aprovação?')) return;
    const { error } = await supabase
      .from('avarias')
      .update({ status: 'Pendente de Aprovação', aprovado_por: null, aprovado_em: null })
      .eq('id', id);
    if (error) alert('Erro ao reverter: ' + error.message);
    else {
      alert('Avaria revertida para pendente de aprovação.');
      carregar();
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Pendências de Revisão</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-yellow-600 text-white">
            <tr><th className="py-2 px-3 text-left">Data</th><th className="py-2 px-3 text-left">Prefixo</th><th className="py-2 px-3 text-left">Tipo</th><th className="py-2 px-3 text-left">Valor</th><th className="py-2 px-3 text-left">Aprovado Por</th><th className="py-2 px-3 text-left">Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center p-4">Carregando...</td></tr> :
              avarias.length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-600">Nenhuma pendência encontrada.</td></tr> :
                avarias.map(a => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3">{new Date(a.dataAvaria).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 px-3">{a.prefixo}</td>
                    <td className="py-2 px-3">{a.tipoOcorrencia}</td>
                    <td className="py-2 px-3 font-medium">{(a.valor_total_orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="py-2 px-3">{a.aprovado_por || '—'}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => reverter(a.id)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm flex items-center gap-1">
                        <FaUndo /> Reverter
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
