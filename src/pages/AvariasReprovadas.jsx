// src/pages/AvariasReprovadas.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { FaEye, FaUndo, FaTimes } from 'react-icons/fa';

// --- Modal de Detalhes ---
function ModalDetalhesReprovada({ avaria, onClose, onReverter }) {
  if (!avaria) return null;

  const formatCurrency = (v) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Detalhes da Avaria Reprovada</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prefixo</label>
              <p className="text-lg text-gray-800">{avaria.prefixo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tipo de Ocorrência</label>
              <p className="text-lg text-gray-800">{avaria.tipoOcorrencia}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data da Avaria</label>
              <p className="text-lg text-gray-800">
                {new Date(avaria.dataAvaria).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Descrição</label>
            <p className="bg-gray-50 p-3 rounded border text-gray-800">
              {avaria.descricao || 'Sem descrição.'}
            </p>
          </div>

          <div className="flex justify-between text-sm text-gray-600 border-t pt-2">
            <p><strong>Reprovado por:</strong> {avaria.aprovado_por || '—'}</p>
            <p><strong>Data:</strong> {avaria.aprovado_em ? new Date(avaria.aprovado_em).toLocaleString('pt-BR') : '—'}</p>
          </div>

          <div className="text-right text-xl font-bold border-t pt-3">
            Valor Total: {formatCurrency(avaria.valor_total_orcamento)}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={() => onReverter(avaria.id)}
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
          >
            <FaUndo /> Reverter para Pendente
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Página Principal ---
export default function AvariasReprovadas() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregarReprovadas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Reprovado')
      .order('aprovado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar avarias reprovadas:', error);
      alert('Erro ao carregar avarias reprovadas.');
    } else {
      setAvarias(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarReprovadas();
  }, []);

  async function reverterParaPendente(id) {
    if (!window.confirm('Deseja realmente reverter esta avaria para pendente?')) return;

    const { error } = await supabase
      .from('avarias')
      .update({ status: 'Pendente de Aprovação', aprovado_por: null, aprovado_em: null })
      .eq('id', id);

    if (error) {
      alert('Falha ao reverter: ' + error.message);
      return;
    }

    alert('Avaria revertida para pendente com sucesso!');
    setSelected(null);
    carregarReprovadas();
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Avarias Reprovadas</h1>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Reprovado por</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="6" className="text-center p-4 text-gray-600">Nenhuma avaria reprovada.</td></tr>
            ) : (
              avarias.map((avaria) => (
                <tr key={avaria.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3">{new Date(avaria.dataAvaria).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{avaria.prefixo}</td>
                  <td className="py-2 px-3">{avaria.tipoOcorrencia}</td>
                  <td className="py-2 px-3 font-medium text-gray-800">
                    {(avaria.valor_total_orcamento || 0).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL'
                    })}
                  </td>
                  <td className="py-2 px-3">{avaria.aprovado_por || '—'}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelected(avaria)}
                      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      <FaEye /> Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ModalDetalhesReprovada
          avaria={selected}
          onClose={() => setSelected(null)}
          onReverter={reverterParaPendente}
        />
      )}
    </div>
  );
}
