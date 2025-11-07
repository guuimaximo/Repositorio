import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { FaUndo, FaEdit, FaSave, FaPlus, FaTrash } from 'react-icons/fa';

// --- Modal de Edição Completa ---
function EditarAvariaModal({ avaria, onClose, onAtualizarLista }) {
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [prefixo, setPrefixo] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (avaria) carregarItens();
  }, [avaria]);

  async function carregarItens() {
    setLoadingItens(true);
    const { data, error } = await supabase
      .from('cobrancas_avarias')
      .select('*')
      .eq('avaria_id', avaria.id);
    if (!error && data) {
      setItens(data);
      setDescricao(avaria.descricao || '');
      setPrefixo(avaria.prefixo || '');
      setValorTotal(avaria.valor_total_orcamento || 0);
      setObservacao(avaria.observacao_operacao || '');
    }
    setLoadingItens(false);
  }

  const handleEditChange = (id, field, value) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const formatCurrency = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ➕ Adicionar novo item
  const adicionarItem = () => {
    const novo = {
      id: Date.now(),
      descricao: '',
      qtd: 1,
      valorUnitario: 0,
      tipo: 'Peca',
      avaria_id: avaria.id,
      novo: true
    };
    setItens(prev => [...prev, novo]);
  };

  // 🗑️ Remover item
  const removerItem = async (id, novo) => {
    if (!novo) {
      await supabase.from('cobrancas_avarias').delete().eq('id', id);
    }
    setItens(prev => prev.filter(i => i.id !== id));
  };

  // 💾 Atualiza todos os itens e avaria
  async function salvarAlteracoes(statusFinal = null) {
    for (const item of itens) {
      if (item.novo) {
        await supabase.from('cobrancas_avarias').insert([{
          descricao: item.descricao,
          qtd: item.qtd,
          valorUnitario: item.valorUnitario,
          tipo: item.tipo,
          avaria_id: avaria.id
        }]);
      } else {
        await supabase.from('cobrancas_avarias').update({
          descricao: item.descricao,
          qtd: item.qtd,
          valorUnitario: item.valorUnitario,
          tipo: item.tipo
        }).eq('id', item.id);
      }
    }

    const updateData = {
      prefixo,
      descricao,
      valor_total_orcamento: valorTotal,
      observacao_operacao: observacao
    };
    if (statusFinal) updateData.status = statusFinal;

    const { error } = await supabase.from('avarias').update(updateData).eq('id', avaria.id);
    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return;
    }

    alert(statusFinal
      ? 'Correções salvas e avaria reenviada para aprovação!'
      : 'Correções salvas com sucesso!');
    onAtualizarLista();
    onClose();
  }

  if (!avaria) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4 z-40">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Editar Avaria #{avaria.id}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Prefixo</label>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={prefixo}
                onChange={(e) => setPrefixo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Motorista</label>
              <p>{avaria.motoristaId || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Data</label>
              <p>{new Date(avaria.dataAvaria).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Descrição</label>
            <textarea
              className="w-full border p-2 rounded"
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">Observação / Motivo de Reprovação</label>
            <textarea
              className="w-full border p-2 rounded bg-yellow-50"
              rows="3"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          {/* Itens */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">Itens do Orçamento</h3>
              <button
                onClick={adicionarItem}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
              >
                <FaPlus /> Adicionar Item
              </button>
            </div>
            {loadingItens ? (
              <p>Carregando...</p>
            ) : itens.length > 0 ? (
              itens.map(item => (
                <div key={item.id} className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded mb-1">
                  <input
                    className="border p-1 rounded"
                    value={item.descricao || ''}
                    onChange={(e) => handleEditChange(item.id, 'descricao', e.target.value)}
                    placeholder="Descrição"
                  />
                  <input
                    className="border p-1 rounded text-center"
                    type="number"
                    value={item.qtd || 0}
                    onChange={(e) => handleEditChange(item.id, 'qtd', e.target.value)}
                    placeholder="Qtd"
                  />
                  <input
                    className="border p-1 rounded text-center"
                    type="number"
                    value={item.valorUnitario || 0}
                    onChange={(e) => handleEditChange(item.id, 'valorUnitario', e.target.value)}
                    placeholder="Valor Unitário"
                  />
                  <select
                    className="border p-1 rounded"
                    value={item.tipo || ''}
                    onChange={(e) => handleEditChange(item.id, 'tipo', e.target.value)}
                  >
                    <option value="Peca">Peça</option>
                    <option value="Servico">Serviço</option>
                  </select>
                  <button
                    onClick={() => removerItem(item.id, item.novo)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    title="Excluir Item"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum item encontrado.</p>
            )}
          </div>

          <div className="text-right text-xl font-bold border-t pt-2">
            Total:
            <input
              type="number"
              className="border p-1 rounded text-right ml-2 w-40"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
            />{' '}
            ({formatCurrency(valorTotal)})
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={() => salvarAlteracoes()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-1"
          >
            <FaSave /> Salvar Correções
          </button>
          <button
            onClick={() => salvarAlteracoes('Pendente de Aprovação')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-1"
          >
            <FaUndo /> Salvar e Reenviar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Página Principal ---
export default function AvariasEmRevisao() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Pendências de Revisão</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-yellow-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Reprovado por</th>
              <th className="py-2 px-3 text-left w-80">Motivo / Observação</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4 text-gray-600">Nenhuma pendência encontrada.</td></tr>
            ) : (
              avarias.map(a => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3">{new Date(a.dataAvaria).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{a.prefixo}</td>
                  <td className="py-2 px-3">{a.tipoOcorrencia}</td>
                  <td className="py-2 px-3 font-medium">
                    {(a.valor_total_orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="py-2 px-3">{a.aprovado_por || '—'}</td>
                  <td className="py-2 px-3">
                    <p className="text-sm bg-yellow-50 border rounded p-2 min-h-[48px] text-gray-800">
                      {a.observacao_operacao || 'Sem observação registrada.'}
                    </p>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm flex items-center gap-1"
                    >
                      <FaEdit /> Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <EditarAvariaModal
          avaria={selected}
          onClose={() => setSelected(null)}
          onAtualizarLista={carregar}
        />
      )}
    </div>
  );
}
