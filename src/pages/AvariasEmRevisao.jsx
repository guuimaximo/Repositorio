import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { FaUndo, FaEdit, FaSave, FaPlus, FaTrash } from 'react-icons/fa';


// ======================================================================
// ======================= MODAL DE EDIÇÃO TOTAL ========================
// ======================================================================
function EditarAvariaModal({ avaria, onClose, onAtualizarLista }) {
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Campos editáveis
  const [prefixo, setPrefixo] = useState('');
  const [motoristaId, setMotoristaId] = useState('');
  const [tipoOcorrencia, setTipoOcorrencia] = useState('');
  const [numeroAvaria, setNumeroAvaria] = useState('');
  const [dataAvaria, setDataAvaria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valorTotal, setValorTotal] = useState(0);

  // Evidências
  const [urlsEvidencias, setUrlsEvidencias] = useState([]);

  useEffect(() => {
    if (avaria) carregarItens();
  }, [avaria]);

  // CARREGA ITENS + DADOS DA AVARIA
  async function carregarItens() {
    setLoadingItens(true);

    const { data } = await supabase
      .from('cobrancas_avarias')
      .select('*')
      .eq('avaria_id', avaria.id);

    setItens(data || []);

    // Campos principais
    setPrefixo(avaria.prefixo || '');
    setMotoristaId(avaria.motoristaId || '');
    setTipoOcorrencia(avaria.tipoOcorrencia || '');
    setNumeroAvaria(avaria.numero_da_avaria || '');
    setDataAvaria(avaria.dataAvaria?.split("T")[0] || '');

    setDescricao(avaria.descricao || '');
    setObservacao(avaria.observacao_operacao || '');
    setValorTotal(avaria.valor_total_orcamento || 0);

    // URLs de fotos/vídeos
    let urls = [];
    if (Array.isArray(avaria.urls_evidencias)) urls = avaria.urls_evidencias;
    else if (typeof avaria.urls_evidencias === 'string')
      urls = avaria.urls_evidencias.split(',').map(u => u.trim());

    setUrlsEvidencias(urls.filter(Boolean));

    setLoadingItens(false);
  }

  const handleItemChange = (id, field, value) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const adicionarEvidencia = (url) => {
    if (!url) return;
    setUrlsEvidencias(prev => [...prev, url]);
  };

  const removerEvidencia = (idx) => {
    setUrlsEvidencias(prev => prev.filter((_, i) => i !== idx));
  };

  const adicionarItem = () => {
    setItens(prev => [
      ...prev,
      {
        id: Date.now(),
        descricao: '',
        qtd: 1,
        valorUnitario: 0,
        tipo: 'Peca',
        novo: true,
        avaria_id: avaria.id
      }
    ]);
  };

  const removerItem = async (id, novo) => {
    if (!novo) {
      await supabase.from('cobrancas_avarias').delete().eq('id', id);
    }
    setItens(prev => prev.filter(i => i.id !== id));
  };

  // SALVAR TUDO
  async function salvarAlteracoes(statusFinal = null) {

    // Atualiza / Insere itens
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
        await supabase.from('cobrancas_avarias')
          .update({
            descricao: item.descricao,
            qtd: item.qtd,
            valorUnitario: item.valorUnitario,
            tipo: item.tipo
          })
          .eq('id', item.id);
      }
    }

    // Atualiza tabela avarias completa
    const updateData = {
      prefixo,
      motoristaId,
      tipoOcorrencia,
      numero_da_avaria: numeroAvaria,
      dataAvaria,
      descricao,
      observacao_operacao: observacao,
      valor_total_orcamento: valorTotal,
      urls_evidencias: urlsEvidencias
    };

    if (statusFinal) updateData.status = statusFinal;

    await supabase.from('avarias').update(updateData).eq('id', avaria.id);

    onAtualizarLista();
    onClose();
  }


  if (!avaria) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold">Editar Avaria #{avaria.id}</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black text-xl">✕</button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">

          {/* ================== CAMPOS BÁSICOS ================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="text-sm text-gray-500">Prefixo</label>
              <input className="border p-2 rounded w-full"
                value={prefixo}
                onChange={(e) => setPrefixo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Motorista</label>
              <input className="border p-2 rounded w-full"
                value={motoristaId}
                onChange={(e) => setMotoristaId(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Tipo da Ocorrência</label>
              <input className="border p-2 rounded w-full"
                value={tipoOcorrencia}
                onChange={(e) => setTipoOcorrencia(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Nº da Avaria</label>
              <input className="border p-2 rounded w-full"
                value={numeroAvaria}
                onChange={(e) => setNumeroAvaria(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Data da Avaria</label>
              <input type="date" className="border p-2 rounded w-full"
                value={dataAvaria}
                onChange={(e) => setDataAvaria(e.target.value)}
              />
            </div>

          </div>

          {/* ================== DESCRIÇÃO ================== */}
          <div>
            <label className="text-sm text-gray-500">Descrição</label>
            <textarea
              className="border rounded p-2 w-full"
              rows={3}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>

          {/* ================== OBSERVAÇÃO ================== */}
          <div>
            <label className="text-sm text-gray-500">Observação / Motivo</label>
            <textarea
              className="border rounded p-2 w-full bg-yellow-50"
              rows={3}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>

          {/* ================== EVIDÊNCIAS ================== */}
          <div>
            <h3 className="font-semibold mb-2">Evidências</h3>

            <div className="flex gap-2 mb-2">
              <input
                id="novaEvidencia"
                className="border p-2 rounded w-full"
                placeholder="Cole a URL da imagem ou vídeo"
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                onClick={() => {
                  const url = document.getElementById("novaEvidencia").value;
                  adicionarEvidencia(url);
                  document.getElementById("novaEvidencia").value = "";
                }}
              >
                Adicionar
              </button>
            </div>

            {/* LISTA DE EVIDÊNCIAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {urlsEvidencias.map((url, index) => (
                <div key={index} className="relative border rounded overflow-hidden">
                  <button
                    onClick={() => removerEvidencia(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-2 text-xs"
                  >
                    X
                  </button>

                  {url.match(/\.(mp4|mov|webm)$/i) ? (
                    <video controls src={url} className="w-full h-32 object-cover" />
                  ) : (
                    <img src={url} className="w-full h-32 object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ================== ITENS DO ORÇAMENTO ================== */}
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
            ) : (
              itens.map(item => (
                <div key={item.id} className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded mb-1">

                  <input
                    className="border p-1 rounded"
                    value={item.descricao}
                    onChange={(e) => handleItemChange(item.id, 'descricao', e.target.value)}
                    placeholder="Descrição"
                  />

                  <input
                    className="border p-1 rounded text-center"
                    type="number"
                    value={item.qtd}
                    onChange={(e) => handleItemChange(item.id, 'qtd', e.target.value)}
                  />

                  <input
                    className="border p-1 rounded text-center"
                    type="number"
                    value={item.valorUnitario}
                    onChange={(e) => handleItemChange(item.id, 'valorUnitario', e.target.value)}
                  />

                  <select
                    className="border p-1 rounded"
                    value={item.tipo}
                    onChange={(e) => handleItemChange(item.id, 'tipo', e.target.value)}
                  >
                    <option value="Peca">Peça</option>
                    <option value="Servico">Serviço</option>
                  </select>

                  <button
                    onClick={() => removerItem(item.id, item.novo)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            )}

          </div>

          {/* ================== TOTAL ================== */}
          <div className="text-right text-xl font-bold">
            Total:
            <input
              type="number"
              className="border ml-2 p-2 rounded text-right w-40"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
            />
          </div>

        </div>

        {/* ================== BOTÕES ================== */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={() => salvarAlteracoes()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <FaSave /> Salvar
          </button>

          <button
            onClick={() => salvarAlteracoes('Pendente de Aprovação')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FaUndo /> Salvar e Reenviar
          </button>
        </div>

      </div>
    </div>
  );
}



// ======================================================================
// =========================== PÁGINA PRINCIPAL ===========================
// ======================================================================
export default function AvariasEmRevisao() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Reprovado')
      .order('aprovado_em', { ascending: false });

    setAvarias(data || []);
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
              <th className="py-2 px-3 text-left">Nº Avaria</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Reprovado por</th>
              <th className="py-2 px-3 text-left w-80">Motivo / Observação</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="8" className="text-center p-4 text-gray-600">Nenhuma pendência.</td></tr>
            ) : (
              avarias.map(a => (
                <tr key={a.id} className="border-t">

                  <td className="py-2 px-3">{new Date(a.dataAvaria).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{a.prefixo}</td>
                  <td className="py-2 px-3">{a.numero_da_avaria || '-'}</td>
                  <td className="py-2 px-3">{a.tipoOcorrencia}</td>

                  <td className="py-2 px-3 font-medium">
                    {(a.valor_total_orcamento || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>

                  <td className="py-2 px-3">{a.aprovado_por || '—'}</td>

                  <td className="py-2 px-3">
                    <p className="text-sm bg-yellow-50 border rounded p-2 min-h-[48px]">
                      {a.observacao_operacao || 'Sem observação.'}
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
