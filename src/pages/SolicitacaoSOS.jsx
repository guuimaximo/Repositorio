import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import CampoMotorista from '../components/CampoMotorista';

export default function SolicitacaoSOS() {
  const [form, setForm] = useState({
    numero_sos: '',
    plantonista: '',
    prefixo: '',
    motorista_chapa: '',
    motorista_nome: '',
    reclamacao: '',
    local: '',
    linha: '',
    tabela: '',
  });

  const [linhas, setLinhas] = useState([]);
  const [prefixos, setPrefixos] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [motorista, setMotorista] = useState({ chapa: '', nome: '' });
  const [loading, setLoading] = useState(false);

  // Data e hora atuais
  const [dataHora, setDataHora] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setDataHora({
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Carrega dados e próximo número SOS
  useEffect(() => {
    async function carregarDados() {
      try {
        // Prefixos, Linhas e Tabelas
        const [{ data: pref }, { data: lin }, { data: tab }] = await Promise.all([
          supabase.from('prefixos').select('id, nome').order('nome'),
          supabase.from('linhas').select('id, codigo, descricao').order('codigo'),
          supabase.from('tabelas_sos').select('id, nome').order('nome'),
        ]);

        setPrefixos(pref || []);
        setLinhas(lin || []);
        setTabelas(tab || []);

        // Número sequencial do SOS
        const { data: ultimo } = await supabase
          .from('intervencoes_sos')
          .select('numero_sos')
          .order('numero_sos', { ascending: false })
          .limit(1)
          .single();

        setForm((prev) => ({
          ...prev,
          numero_sos: ultimo ? ultimo.numero_sos + 1 : 1,
        }));
      } catch (err) {
        console.error('Erro ao carregar listas:', err);
      }
    }
    carregarDados();
  }, []);

  async function salvarSOS() {
    if (!form.plantonista || !form.prefixo || !motorista.chapa || !form.reclamacao) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        numero_sos: form.numero_sos,
        plantonista: form.plantonista,
        data_sos: new Date().toISOString().split('T')[0],
        hora_sos: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
        prefixo: form.prefixo,
        motorista_chapa: motorista.chapa,
        motorista_nome: motorista.nome,
        reclamacao: form.reclamacao,
        local: form.local,
        linha: form.linha,
        tabela: form.tabela,
      };

      const { error } = await supabase.from('intervencoes_sos').insert(payload);
      if (error) throw error;

      alert(`SOS #${form.numero_sos} criado com sucesso!`);
      resetarFormulario();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar SOS: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetarFormulario() {
    setMotorista({ chapa: '', nome: '' });
    setForm({
      numero_sos: form.numero_sos + 1,
      plantonista: '',
      prefixo: '',
      motorista_chapa: '',
      motorista_nome: '',
      reclamacao: '',
      local: '',
      linha: '',
      tabela: '',
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">Nova Solicitação de SOS</h1>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        {/* Número do SOS */}
        <div className="text-right text-gray-700 font-semibold">
          <span className="text-sm text-gray-500 mr-1">Nº SOS:</span>
          <span className="text-xl font-bold text-blue-700">{form.numero_sos}</span>
        </div>

        {/* Linha superior */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Plantonista</label>
            <input
              type="text"
              value={form.plantonista}
              onChange={(e) => setForm({ ...form, plantonista: e.target.value })}
              className="border p-2 rounded w-full"
              placeholder="Nome do plantonista"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Data</label>
            <input type="text" value={dataHora.data} readOnly className="border p-2 rounded w-full bg-gray-100" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hora</label>
            <input type="text" value={dataHora.hora} readOnly className="border p-2 rounded w-full bg-gray-100" />
          </div>
        </div>

        {/* Campos principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prefixo */}
          <div>
            <label className="text-sm text-gray-600">Prefixo</label>
            <select
              className="border p-2 rounded w-full"
              value={form.prefixo}
              onChange={(e) => setForm({ ...form, prefixo: e.target.value })}
            >
              <option value="">Selecione</option>
              {prefixos.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Motorista */}
          <div>
            <label className="text-sm text-gray-600">Motorista</label>
            <CampoMotorista value={motorista} onChange={setMotorista} />
          </div>

          {/* Reclamação */}
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Reclamação</label>
            <textarea
              value={form.reclamacao}
              onChange={(e) => setForm({ ...form, reclamacao: e.target.value })}
              className="border p-2 rounded w-full"
              rows="3"
              placeholder="Descreva a reclamação"
            />
          </div>

          {/* Local */}
          <div>
            <label className="text-sm text-gray-600">Local</label>
            <input
              type="text"
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              className="border p-2 rounded w-full"
              placeholder="Informe o local"
            />
          </div>

          {/* Linha */}
          <div>
            <label className="text-sm text-gray-600">Linha</label>
            <select
              className="border p-2 rounded w-full"
              value={form.linha}
              onChange={(e) => setForm({ ...form, linha: e.target.value })}
            >
              <option value="">Selecione</option>
              {linhas.map((l) => (
                <option key={l.id} value={l.codigo}>
                  {l.codigo} - {l.descricao}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela */}
          <div>
            <label className="text-sm text-gray-600">Tabela</label>
            <select
              className="border p-2 rounded w-full"
              value={form.tabela}
              onChange={(e) => setForm({ ...form, tabela: e.target.value })}
            >
              <option value="">Selecione</option>
              {tabelas.map((t) => (
                <option key={t.id} value={t.nome}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão */}
        <div className="text-right pt-4">
          <button
            onClick={salvarSOS}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar Solicitação'}
          </button>
        </div>
      </div>
    </div>
  );
}
