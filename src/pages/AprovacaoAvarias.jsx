import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FaCheckCircle, FaTimesCircle, FaEye, FaTimes, FaLock } from 'react-icons/fa';

// --- Modal de Login ---
function LoginModal({ onConfirm, onCancel }) {
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

    onConfirm(data.nome); // Retorna o nome do aprovador
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <FaLock /> Aprovação Restrita
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
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
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
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [aprovarPendente, setAprovarPendente] = useState(null);

  useEffect(() => {
    async function carregarItens() {
      if (!avaria) return;
      setLoadingItens(true);
      const { data } = await supabase
        .from('cobrancas_avarias')
        .select('*')
        .eq('avaria_id', avaria.id);
      setItensOrcamento(data || []);
      setLoadingItens(false);
    }
    carregarItens();
  }, [avaria]);

  const formatCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAprovarClick = () => {
    setAprovarPendente('Aprovado');
    setLoginModalOpen(true);
  };

  const handleReprovarClick = () => {
    setAprovarPendente('Reprovado');
    setLoginModalOpen(true);
  };

  async function confirmarAprovacao(nomeAprovador) {
    setLoginModalOpen(false);

    const dadosUpdate = {
      status: aprovarPendente,
      aprovado_por: nomeAprovador,
    };

    if (aprovarPendente === 'Aprovado') {
      dadosUpdate.status_cobranca = 'Pendente';
    }

    const { error } = await supabase
      .from('avarias')
      .update(dadosUpdate)
      .eq('id', avaria.id);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }

    alert(`Avaria ${aprovarPendente.toLowerCase()} por ${nomeAprovador}.`);
    onClose();
    onAtualizarStatus();
  }

  if (!avaria) return null;

  const pecas = itensOrcamento.filter(i => i.tipo === 'Peca');
  const servicos = itensOrcamento.filter(i => i.tipo === 'Servico');

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4 z-40">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Detalhes da Avaria</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prefixo</label>
              <p className="text-lg">{avaria.prefixo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Motorista</label>
              <p className="text-lg">{avaria.motoristaId || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data</label>
              <p className="text-lg">{new Date(avaria.dataAvaria).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Descrição</label>
            <p className="bg-gray-50 p-3 rounded border">{avaria.descricao}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Orçamento</h3>
            {loadingItens ? (
              <p>Carregando...</p>
            ) : (
              <>
                {pecas.map(p => (
                  <div key={p.id} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded mb-1">
                    <span>{p.descricao}</span>
                    <span>{p.qtd} x {formatCurrency(p.valorUnitario)}</span>
                    <span className="text-right font-medium">{formatCurrency(p.qtd * p.valorUnitario)}</span>
                  </div>
                ))}
                {servicos.map(s => (
                  <div key={s.id} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded mb-1">
                    <span>{s.descricao}</span>
                    <span>{s.qtd} x {formatCurrency(s.valorUnitario)}</span>
                    <span className="text-right font-medium">{formatCurrency(s.qtd * s.valorUnitario)}</span>
                  </div>
                ))}
              </>
            )}
            <div className="text-right font-bold text-xl mt-2 border-t pt-2">
              Total: {formatCurrency(avaria.valor_total_orcamento)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={handleReprovarClick}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center gap-2"
          >
            <FaTimesCircle /> Reprovar
          </button>
          <button
            onClick={handleAprovarClick}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FaCheckCircle /> Aprovar
          </button>
        </div>

        {loginModalOpen && (
          <LoginModal
            onConfirm={confirmarAprovacao}
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
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  async function carregarAvariasPendentes() {
    setLoading(true);
    const { data } = await supabase
      .from('avarias')
      .select('*')
      .eq('status', 'Pendente de Aprovação')
      .order('created_at', { ascending: false });
    setAvarias(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarAvariasPendentes();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Aprovação de Avarias</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-3 text-left">Lançamento</th>
              <th className="py-2 px-3 text-left">Prefixo</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Valor Total</th>
              <th className="py-2 px-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>
            ) : avarias.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-4 text-gray-600">Nenhuma avaria pendente.</td></tr>
            ) : (
              avarias.map(avaria => (
                <tr key={avaria.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3">{new Date(avaria.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3">{avaria.prefixo}</td>
                  <td className="py-2 px-3">{avaria.tipoOcorrencia}</td>
                  <td className="py-2 px-3 font-medium">
                    {(avaria.valor_total_orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelectedAvaria(avaria)}
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

      {selectedAvaria && (
        <DetalheAvariaModal
          avaria={selectedAvaria}
          onClose={() => setSelectedAvaria(null)}
          onAtualizarStatus={carregarAvariasPendentes}
        />
      )}
    </div>
  );
}
