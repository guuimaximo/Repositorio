// src/pages/AprovacaoAvarias.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  FaCheckCircle, FaTimesCircle, FaEye, FaTimes, FaLock,
  FaEdit, FaSave, FaPlus, FaTrash
} from 'react-icons/fa';

// --- Modal de Login ---
function LoginModal({ onConfirm, onCancel, title = 'Aprovação Restrita' }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios_aprovadores')
      .select('*')
      .eq('login', login)
      .eq('senha', senha)
      .eq('ativo', true)
      .single();
    setLoading(false);

    if (error || !data) {
      alert('Login ou senha incorretos!');
      return;
    }

    // NOVO: devolve também o nível (para controlar exclusão)
    onConfirm({
      nome: data.nome,
      login: data.login,
      nivel: data.nivel,   // 'Administrador' (ex.)
      email: data.email,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <FaLock /> {title}
        </h2>
        <input
          type="text"
          placeholder="Login"
          className="w-full mb-3 p-2 border rounded"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 border rounded"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancelar
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modal Detalhes ---
function DetalheAvariaModal({ avaria, onClose, onAtualizarStatus }) {
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editorInfo, setEditorInfo] = useState(null); // {nome, login, nivel}
  const [descricao, setDescricao] = useState('');
  const [prefixo, setPrefixo] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [urlsEvidencias, setUrlsEvidencias] = useState([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginTitle, setLoginTitle] = useState('Aprovação Restrita');
  const [acaoPendente, setAcaoPendente] = useState(null); // 'approve' | 'reject' | 'edit' | 'delete'
  const [motivoReprovacao, setMotivoReprovacao] = useState('');

  useEffect(() => {
    if (!avaria) return;
    carregarItens();
  }, [avaria]);

  async function carregarItens() {
    setLoadingItens(true);
    const { data, error } = await supabase
      .from('cobrancas_avarias')
      .select('*')
      .eq('avaria_id', avaria.id);

    if (!error) {
      setItens(data || []);
      setDescricao(avaria.descricao || '');
      setPrefixo(avaria.prefixo || '');
      setValorTotal(avaria.valor_total_orcamento || 0);
      setObservacao(avaria.observacao_operacao || '');

      // Evidências: aceita array ou string
      let urls = [];
      if (Array.isArray(avaria.urls_evidencias)) {
        urls = avaria.urls_evidencias;
      } else if (typeof avaria.urls_evidencias === 'string') {
        urls = avaria.urls_evidencias.split(',').map((u) => u.trim());
      }
      setUrlsEvidencias((urls || []).filter(Boolean));
    } else {
      alert('Erro ao carregar itens: ' + error.message);
    }
    setLoadingItens(false);
  }

  const formatCurrency = (v) =>
    (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ---- LOGIN FLOW ----
  function solicitarLogin(acao, titulo) {
    setAcaoPendente(acao);
    setLoginTitle(titulo);
    setLoginModalOpen(true);
  }

  async function onLoginConfirm({ nome, login, nivel }) {
    setLoginModalOpen(false);

    if (acaoPendente === 'edit') {
      setEditorInfo({ nome, login, nivel });
      setEditMode(true);
      return;
    }

    if (acaoPendente === 'approve') {
      await confirmarAprovacao(nome);
      return;
    }

    if (acaoPendente === 'reject') {
      if (!motivoReprovacao || !motivoReprovacao.trim()) {
        alert('Informe o motivo da reprovação.');
        return;
      }
      await confirmarReprovacao(nome, motivoReprovacao.trim());
      return;
    }

    // NOVO: exclusão de avaria (somente Administrador)
    if (acaoPendente === 'delete') {
      const isAdmin =
        String(nivel || '').toLowerCase() === 'administrador' ||
        String(nivel || '').toLowerCase() === 'administrator';

      if (!isAdmin) {
        alert('❌ Sem permissão. Apenas usuários Administrador podem excluir.');
        return;
      }
      await confirmarExclusao(nome);
      return;
    }
  }

  // ---- ITENS: edição básica (salvos com botão "Salvar") ----
  const handleEditChange = (id, field, value) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  async function salvarAlteracoes() {
    for (const item of itens) {
      if (item.id && !item.__novo) {
        const { error } = await supabase
          .from('cobrancas_avarias')
          .update({
            descricao: item.descricao,
            qtd: item.qtd,
            valorUnitario: item.valorUnitario,
            tipo: item.tipo,
          })
          .eq('id', item.id);
        if (error) {
          alert('Erro ao salvar item: ' + error.message);
          return;
        }
      }
    }

    const { error: errAvaria } = await supabase
      .from('avarias')
      .update({
        prefixo,
        descricao,
        valor_total_orcamento: valorTotal,
        observacao_operacao: observacao,
      })
      .eq('id', avaria.id);

    if (errAvaria) {
      alert('Erro ao salvar avaria: ' + errAvaria.message);
      return;
    }

    alert('Alterações salvas!');
    setEditMode(false);
    onAtualizarStatus();
  }

  // ---- ADICIONAR ITENS (auto-insert) ----
  async function adicionarItem(tipo) {
    if (!editMode) {
      alert('Entre em modo de edição para adicionar itens.');
      return;
    }
    const novoItem = {
      avaria_id: avaria.id,
      descricao: '',
      qtd: 1,
      valorUnitario: 0,
      tipo, // 'Peca' | 'Servico'
    };

    const { data, error } = await supabase
      .from('cobrancas_avarias')
      .insert([novoItem])
      .select('*')
      .single();

    if (error) {
      alert('Erro ao adicionar item: ' + error.message);
      return;
    }

    setItens((prev) => [...prev, data]);
  }

  async function removerItem(id) {
    if (!editMode) {
      alert('Entre em modo de edição para remover itens.');
      return;
    }
    const { error } = await supabase.from('cobrancas_avarias').delete().eq('id', id);
    if (error) {
      alert('Erro ao remover item: ' + error.message);
      return;
    }
    setItens((prev) => prev.filter((i) => i.id !== id));
  }

  // ---- APROVAR / REPROVAR ----
  function handleAprovar() {
    solicitarLogin('approve', 'Confirmar Aprovação');
  }

  function handleReprovar() {
    const motivo = prompt('Informe o motivo da reprovação ou o que deve ser corrigido:');
    if (!motivo) return;
    setMotivoReprovacao(motivo);
    solicitarLogin('reject', 'Confirmar Reprovação');
  }

  async function confirmarAprovacao(nomeAprovador) {
    const updateData = {
      status: 'Aprovado',
      aprovado_por: nomeAprovador,
      aprovado_em: new Date().toISOString(),
      status_cobranca: 'Pendente',
    };

    const { error } = await supabase.from('avarias').update(updateData).eq('id', avaria.id);
    if (error) {
      alert('Erro ao aprovar: ' + error.message);
      return;
    }
    alert(`Avaria aprovada por ${nomeAprovador}.`);
    onClose();
    onAtualizarStatus();
  }

  async function confirmarReprovacao(nomeAprovador, motivo) {
    const updateData = {
      status: 'Reprovado',
      aprovado_por: nomeAprovador,
      aprovado_em: new Date().toISOString(),
      observacao_operacao: motivo,
    };

    const { error } = await supabase.from('avarias').update(updateData).eq('id', avaria.id);
    if (error) {
      alert('Erro ao reprovar: ' + error.message);
      return;
    }
    alert(`Avaria reprovada por ${nomeAprovador}.`);
    onClose();
    onAtualizarStatus();
  }

  // NOVO: excluir avaria (e itens vinculados) — somente Administrador
  async function confirmarExclusao(nomeAprovador) {
    const ok = window.confirm(
      `ATENÇÃO: isso irá EXCLUIR definitivamente a avaria e seus itens.\n\nConfirmar exclusão?`
    );
    if (!ok) return;

    // remove itens da avaria primeiro (caso não haja cascade)
    const { error: errItens } = await supabase
      .from('cobrancas_avarias')
      .delete()
      .eq('avaria_id', avaria.id);

    if (errItens) {
      alert('Erro ao excluir itens: ' + errItens.message);
      return;
    }

    const { error: errAvaria } = await supabase
      .from('avarias')
      .delete()
      .eq('id', avaria.id);

    if (errAvaria) {
      alert('Erro ao excluir avaria: ' + errAvaria.message);
      return;
    }

    alert(`🗑️ Avaria excluída por ${nomeAprovador}.`);
    onClose();
    onAtualizarStatus();
  }

  if (!avaria) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4 z-40">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Detalhes da Avaria #{avaria.id}</h2>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button
                onClick={() => solicitarLogin('edit', 'Entrar para Editar')}
                className="bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-yellow-600"
              >
                <FaEdit /> Editar
              </button>
            ) : (
              <button
                onClick={salvarAlteracoes}
                className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-blue-700"
              >
                <FaSave /> Salvar
              </button>
            )}

            {/* NOVO: Excluir Avaria (só Administrador via login) */}
            <button
              onClick={() => solicitarLogin('delete', 'Excluir Avaria (Administrador)')}
              className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-red-700"
              title="Excluir avaria (apenas Administrador)"
            >
              <FaTrash /> Excluir
            </button>

            <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Dados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Prefixo</label>
              {editMode ? (
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  value={prefixo}
                  onChange={(e) => setPrefixo(e.target.value)}
                />
              ) : (
                <p>{prefixo}</p>
              )}
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

          {/* Descrição */}
          <div>
            <label className="text-sm text-gray-500">Descrição</label>
            {editMode ? (
              <textarea
                className="w-full border p-2 rounded"
                rows="3"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            ) : (
              <p className="bg-gray-50 p-2 border rounded">{descricao || '—'}</p>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="text-sm text-gray-500">Observação / Motivo</label>
            {editMode ? (
              <textarea
                className="w-full border p-2 rounded bg-yellow-50"
                rows="3"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            ) : (
              <p className="bg-gray-50 p-2 border rounded min-h-[60px]">{observacao || '—'}</p>
            )}
          </div>

          {/* Evidências */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Evidências (Fotos e Vídeos)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {urlsEvidencias.length > 0 ? (
                urlsEvidencias.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border rounded-lg overflow-hidden hover:opacity-80"
                  >
                    {url.match(/\.(mp4|mov|webm)$/i) ? (
                      <video controls src={url} className="w-full h-32 object-cover" />
                    ) : (
                      <img src={url} alt={`Evidência ${index + 1}`} className="w-full h-32 object-cover" />
                    )}
                  </a>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma evidência anexada.</p>
              )}
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Itens do Orçamento</h3>
              {editMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => adicionarItem('Peca')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    title="Adicionar Peça"
                  >
                    <FaPlus /> Peça
                  </button>
                  <button
                    onClick={() => adicionarItem('Servico')}
                    className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm"
                    title="Adicionar Serviço"
                  >
                    <FaPlus /> Serviço
                  </button>
                </div>
              )}
            </div>

            {loadingItens ? (
              <p>Carregando...</p>
            ) : itens.length > 0 ? (
              itens.map((item) => (
                <div key={item.id} className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded mb-1">
                  {editMode ? (
                    <>
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
                        value={item.tipo || 'Peca'}
                        onChange={(e) => handleEditChange(item.id, 'tipo', e.target.value)}
                      >
                        <option value="Peca">Peça</option>
                        <option value="Servico">Serviço</option>
                      </select>
                      <button
                        onClick={() => removerItem(item.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        title="Excluir Item"
                      >
                        <FaTrash />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="col-span-2">{item.descricao}</span>
                      <span>{item.qtd} x {formatCurrency(item.valorUnitario)}</span>
                      <span className="text-right font-medium">
                        {formatCurrency((Number(item.qtd) || 0) * (Number(item.valorUnitario) || 0))}
                      </span>
                      <span className="text-xs text-gray-500 text-right">{item.tipo}</span>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p>Nenhum item encontrado.</p>
            )}
          </div>

          {/* Total */}
          <div className="text-right text-xl font-bold border-t pt-2">
            Total:{' '}
            {editMode ? (
              <input
                type="number"
                className="border p-1 rounded text-right w-40"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            ) : (
              formatCurrency(valorTotal)
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={handleReprovar}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center gap-1"
          >
            <FaTimesCircle /> Reprovar
          </button>
          <button
            onClick={handleAprovar}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-1"
          >
            <FaCheckCircle /> Aprovar
          </button>
        </div>

        {loginModalOpen && (
          <LoginModal
            title={loginTitle}
            onConfirm={onLoginConfirm}
            onCancel={() => setLoginModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// --- Página Principal ---
export default function AprovacaoAvarias() {
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Pendente de Aprovação')
      .order('created_at', { ascending: false });
    if (!error) setAvarias(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Aprovação de Avarias</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Data</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-4 text-gray-600">Nenhuma avaria pendente.</td></tr>
            ) : (
              avarias.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{a.prefixo}</td>
                  <td className="py-2 px-3">{a.tipoOcorrencia}</td>
                  <td className="py-2 px-3 font-medium">
                    {(a.valor_total_orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1"
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
        <DetalheAvariaModal
          avaria={selected}
          onClose={() => setSelected(null)}
          onAtualizarStatus={carregar}
        />
      )}
    </div>
  );
}
