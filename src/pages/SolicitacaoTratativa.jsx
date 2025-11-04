// src/pages/SolicitacaoTratativa.jsx
// Versão limpa com campo opcional "Linha", validações e tratamento de erros

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import CampoMotorista from '../components/CampoMotorista';

export default function SolicitacaoTratativa() {
  const [motorista, setMotorista] = useState({ chapa: '', nome: '' });
  const [form, setForm] = useState({
    tipo_ocorrencia: '',
    prioridade: 'Média',
    setor_origem: '',
    linha: '',
    descricao: '',
    data_ocorrida: '',
    hora_ocorrida: '',
  });
  const [imgFile, setImgFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [tiposOcorrencia, setTiposOcorrencia] = useState([]);
  const [setores, setSetores] = useState([]);
  const [linhas, setLinhas] = useState([]);

  // Buscar listas dinâmicas
  useEffect(() => {
    async function carregarListas() {
      try {
        const [{ data: tipos, error: e1 }, { data: setoresData, error: e2 }, { data: linhasData, error: e3 }] =
          await Promise.all([
            supabase.from('tipos_ocorrencia').select('id, nome').order('nome'),
            supabase.from('setores').select('id, nome').order('nome'),
            supabase.from('linhas').select('id, codigo').order('codigo'),
          ]);

        if (e1 || e2 || e3) {
          console.error('Erro carregando listas:', e1 || e2 || e3);
        }

        setTiposOcorrencia(Array.isArray(tipos) ? tipos : []);
        setSetores(Array.isArray(setoresData) ? setoresData : []);
        setLinhas(Array.isArray(linhasData) ? linhasData : []);
      } catch (err) {
        console.error('Falha geral ao carregar listas:', err);
      }
    }
    carregarListas();
  }, []);

  const camposObrigatoriosPreenchidos =
    (motorista.chapa || motorista.nome) &&
    form.tipo_ocorrencia &&
    form.setor_origem &&
    form.descricao;

  async function salvar() {
    if (!camposObrigatoriosPreenchidos) {
      alert('Preencha motorista, tipo de ocorrência, setor de origem e descrição.');
      return;
    }

    setLoading(true);
    try {
      // Upload de imagem (opcional)
      let imagem_url = null;
      if (imgFile) {
        const nome = `oc_${Date.now()}_${imgFile.name}`.replace(/\s+/g, '_');
        const up = await supabase.storage.from('tratativas').upload(nome, imgFile);
        if (up.error) throw up.error;

        const { data: pub } = supabase.storage.from('tratativas').getPublicUrl(nome);
        imagem_url = pub?.publicUrl || null;
      }

      const payload = {
        motorista_chapa: motorista.chapa || null,
        motorista_nome: motorista.nome || null,
        tipo_ocorrencia: form.tipo_ocorrencia,
        prioridade: form.prioridade,
        setor_origem: form.setor_origem,
        linha: form.linha || null,
        descricao: form.descricao,
        status: 'Pendente',
        imagem_url,
        data_ocorrido: form.data_ocorrida || null,
        hora_ocorrido: form.hora_ocorrida || null,
      };

      const { error } = await supabase.from('tratativas').insert(payload);
      if (error) throw error;

      alert('Solicitação registrada com sucesso!');
      // reset
      setMotorista({ chapa: '', nome: '' });
      setForm({
        tipo_ocorrencia: '',
        prioridade: 'Média',
        setor_origem: '',
        linha: '',
        descricao: '',
        data_ocorrida: '',
        hora_ocorrida: '',
      });
      setImgFile(null);
    } catch (e) {
      console.error(e);
      alert(`Erro: ${e.message || e.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Solicitar Tratativa</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <CampoMotorista value={motorista} onChange={setMotorista} />

        {/* Tipo de Ocorrência */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo de Ocorrência</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.tipo_ocorrencia}
            onChange={(e) => setForm({ ...form, tipo_ocorrencia: e.target.value })}
          >
            <option value="">Selecione...</option>
            {tiposOcorrencia.map((t) => (
              <option key={t.id} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Setor de Origem */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Setor de Origem</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.setor_origem}
            onChange={(e) => setForm({ ...form, setor_origem: e.target.value })}
          >
            <option value="">Selecione...</option>
            {setores.map((s) => (
              <option key={s.id} value={s.nome}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Linha (Opcional) */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Linha </label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.linha}
            onChange={(e) => setForm({ ...form, linha: e.target.value })}
          >
            <option value="">Selecione </option>
            {linhas.map((l) => (
              <option key={l.id} value={l.codigo}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Prioridade</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.prioridade}
            onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
          >
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
          </select>
        </div>

        {/* Data do ocorrido */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Data do ocorrido</label>
          <input
            type="date"
            className="w-full rounded-md border px-3 py-2"
            value={form.data_ocorrida}
            onChange={(e) => setForm({ ...form, data_ocorrida: e.target.value })}
          />
        </div>

        {/* Hora do ocorrido */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hora do ocorrido</label>
          <input
            type="time"
            className="w-full rounded-md border px-3 py-2"
            value={form.hora_ocorrida}
            onChange={(e) => setForm({ ...form, hora_ocorrida: e.target.value })}
          />
        </div>

        {/* Descrição */}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Descrição</label>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>

        {/* Imagem (opcional) */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Imagem (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImgFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={salvar}
          disabled={loading || !camposObrigatoriosPreenchidos}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          title={!camposObrigatoriosPreenchidos ? 'Preencha os campos obrigatórios' : 'Salvar'}
        >
          {loading ? 'Salvando…' : 'Criar'}
        </button>
      </div>
    </div>
  );
}
