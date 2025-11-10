// src/pages/SOSFechamento.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { FaCheckCircle, FaTimes, FaWrench } from 'react-icons/fa';

export default function SOSFechamento() {
  const [acionamentos, setAcionamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregarSOS() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sos_acionamentos')
      .select('*')
      .eq('status', 'Aberto')
      .order('created_at', { ascending: false });
    if (!error) setAcionamentos(data || []);
    setLoading(false);
  }

  useEffect(() => { carregarSOS(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Fechamento de SOS</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Número</th>
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Motorista</th>
              <th className="py-2 px-3 text-left">Linha</th>
              <th className="py-2 px-3 text-left">Local</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center p-4">Carregando...</td></tr>
            ) : acionamentos.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4 text-gray-600">Nenhum SOS em aberto.</td></tr>
            ) : (
              acionamentos.map(a => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3">{a.numero_sos}</td>
                  <td className="py-2 px-3">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{a.veiculo}</td>
                  <td className="py-2 px-3">{a.motorista_nome}</td>
                  <td className="py-2 px-3">{a.linha}</td>
                  <td className="py-2 px-3">{a.local_ocorrencia}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm flex items-center gap-1"
                    >
                      <FaWrench /> Fechar Etiqueta
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FechamentoModal
          sos={selected}
          onClose={() => setSelected(null)}
          onAtualizar={carregarSOS}
        />
      )}
    </div>
  );
}

// 🟨 Modal de Fechamento
function FechamentoModal({ sos, onClose, onAtualizar }) {
  const [form, setForm] = useState({
    avaliador: '',
    procedencia_socorrista: 'Procedente',
    criterio_parada: '',
    ocorrencia: '',
    carro_substituto: '',
    sr_numero: '',
  });
  const [saving, setSaving] = useState(false);

  const ocorrencias = [
    'SEGUIU VIAGEM',
    'RECOLHEU',
    'TROCA',
    'AVARIA',
    'IMPROCEDENTE'
  ];

  async function salvarFechamento() {
    setSaving(true);
    const { error } = await supabase
      .from('sos_acionamentos')
      .update({
        ...form,
        data_fechamento: new Date().toISOString(),
        status: 'Em Andamento'
      })
      .eq('id', sos.id);

    setSaving(false);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return;
    }

    alert('Fechamento registrado e enviado à manutenção!');
    onAtualizar();
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Fechamento do SOS #{sos.numero_sos}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500">Avaliador</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={form.avaliador}
                onChange={(e) => setForm({ ...form, avaliador: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500">Procedência</label>
              <select
                className="w-full border rounded p-2"
                value={form.procedencia_socorrista}
                onChange={(e) => setForm({ ...form, procedencia_socorrista: e.target.value })}
              >
                <option>Procedente</option>
                <option>Improcedente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500">Critério de parada</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={form.criterio_parada}
              onChange={(e) => setForm({ ...form, criterio_parada: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500">Ocorrência</label>
            <select
              className="w-full border rounded p-2"
              value={form.ocorrencia}
              onChange={(e) => setForm({ ...form, ocorrencia: e.target.value })}
            >
              <option value="">Selecione...</option>
              {ocorrencias.map((o, idx) => (
                <option key={idx} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500">Carro que entrou no lugar</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={form.carro_substituto}
                onChange={(e) => setForm({ ...form, carro_substituto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500">SR (Operação)</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={form.sr_numero}
                onChange={(e) => setForm({ ...form, sr_numero: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={salvarFechamento}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FaCheckCircle /> {saving ? 'Salvando...' : 'Confirmar Fechamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
