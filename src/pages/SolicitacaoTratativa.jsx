// src/pages/SolicitacaoTratativa.jsx
// Versão com Dropzone "Evidências (Fotos e Vídeos)" + múltiplos uploads

import { useState, useEffect, useRef } from 'react';
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

  // 🔹 Evidências (imagens/vídeos)
  const [files, setFiles] = useState([]);            // File[]
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const [tiposOcorrencia, setTiposOcorrencia] = useState([]);
  const [setores, setSetores] = useState([]);
  const [linhas, setLinhas] = useState([]);

  // Buscar listas dinâmicas
  useEffect(() => {
    async function carregarListas() {
      try {
        const [
          { data: tipos, error: e1 },
          { data: setoresData, error: e2 },
          { data: linhasData, error: e3 },
        ] = await Promise.all([
          supabase.from('tipos_ocorrencia').select('id, nome').order('nome'),
          supabase.from('setores').select('id, nome').order('nome'),
          supabase.from('linhas').select('id, codigo, nome').order('codigo'),
        ]);
        if (e1 || e2 || e3) console.error('Erro carregando listas:', e1 || e2 || e3);
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

  // ---------- Handlers Dropzone ----------
  const acceptMime = ['image/png', 'image/jpeg', 'video/mp4', 'video/quicktime'];
  const onPickFiles = (evt) => {
    const picked = Array.from(evt.target.files || []);
    addFiles(picked);
  };
  const onDrop = (evt) => {
    evt.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(evt.dataTransfer.files || []);
    addFiles(dropped);
  };
  const addFiles = (list) => {
    const filtered = list.filter(f => acceptMime.includes(f.type));
    if (filtered.length === 0) return;
    // Evita duplicados por nome+size
    const key = (f) => `${f.name}-${f.size}`;
    const existing = new Set(files.map(key));
    const merged = [...files, ...filtered.filter(f => !existing.has(key(f)))];
    setFiles(merged);
  };
  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  async function salvar() {
    if (!camposObrigatoriosPreenchidos) {
      alert('Preencha motorista, tipo de ocorrência, setor de origem e descrição.');
      return;
    }

    setLoading(true);
    try {
      // 🔺 Upload de TODAS as evidências (opcional)
      let evidenciasUrls = [];
      if (files.length > 0) {
        const folder = `tratativas/${Date.now()}_${(motorista.chapa || motorista.nome || 'sem_motorista')
          .toString()
          .replace(/\s+/g, '_')}`;

        for (const f of files) {
          const safeName = f.name.replace(/\s+/g, '_');
          const path = `${folder}/${safeName}`;
          const up = await supabase.storage.from('tratativas').upload(path, f, {
            cacheControl: '3600',
            upsert: false,
          });
          if (up.error) throw up.error;
          const { data: pub } = supabase.storage.from('tratativas').getPublicUrl(path);
          if (pub?.publicUrl) evidenciasUrls.push(pub.publicUrl);
        }
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
        // Compatibilidade: mantemos imagem_url = primeira evidência (se houver)
        imagem_url: evidenciasUrls[0] || null,
        // Se você criar a coluna `evidencias` (JSON ou text[]) na tabela, descomente abaixo:
        // evidencias: evidenciasUrls,
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
      setFiles([]);
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
              <option key={t.id} value={t.nome}>{t.nome}</option>
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
              <option key={s.id} value={s.nome}>{s.nome}</option>
            ))}
          </select>
        </div>

        {/* Linha (Opcional) */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Linha</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.linha}
            onChange={(e) => setForm({ ...form, linha: e.target.value })}
          >
            <option value="">Selecione</option>
            {linhas.map((l) => (
              <option key={l.id} value={l.codigo}>{l.nome}</option>
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

        {/* 🔹 Evidências (Fotos e Vídeos) — DROPZONE */}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 font-medium mb-2">
            Evidências (Fotos e Vídeos)
          </label>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={[
              'w-full rounded-lg border-2 border-dashed bg-gray-50 transition',
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-100'
            ].join(' ')}
            style={{ minHeight: 120 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-full w-full flex flex-col items-center justify-center py-8 cursor-pointer select-none">
              <p className="text-sm font-semibold text-gray-600">
                Clique para enviar <span className="font-normal">ou arraste e solte</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Imagens (PNG, JPG) ou Vídeos (MP4, MOV)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptMime.join(',')}
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
          </div>

          {/* Lista de arquivos selecionados (compacta) */}
          {files.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {files.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <div className="truncate">
                    <span className="font-medium">{f.name}</span>
                    <span className="ml-2 text-gray-500">({Math.round(f.size/1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="text-red-600 hover:underline"
                    title="Remover"
                  >
                    remover
                  </button>
                </div>
              ))}
            </div>
          )}
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
