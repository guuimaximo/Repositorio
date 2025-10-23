// src/pages/SolicitacaoTratativa.jsx
import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import CampoMotorista from '../components/CampoMotorista'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function SolicitacaoTratativa() {
  const navigate = useNavigate()
  const [linhas, setLinhas] = useState([])
  const [prefixos, setPrefixos] = useState([])
  const [setores, setSetores] = useState([])
  const [tipos, setTipos] = useState([])

  const [form, setForm] = useState({
    motorista_chapa: '',
    motorista_nome: '',
    tipo_ocorrencia: '',
    setor_origem: '',
    linha: '',
    prefixo: '',
    prioridade: 'Média',
    data_ocorrido: '',
    hora_ocorrido: '',
    descricao: ''
  })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    (async () => {
      const [l1, p1, s1, t1] = await Promise.all([
        supabase.from('linhas').select('codigo').order('codigo'),
        supabase.from('prefixos').select('codigo').order('codigo'),
        supabase.from('setores').select('nome').order('nome'),
        supabase.from('tipos_ocorrencia').select('nome').order('nome')
      ])
      setLinhas(l1.data || [])
      setPrefixos(p1.data || [])
      setSetores(s1.data || [])
      setTipos(t1.data || [])
    })()
  }, [])

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function uploadEvidenciaInicial() {
    if (!arquivo) return { publicUrl: null }
    const ext = arquivo.name.split('.').pop()
    const path = `solicitacoes/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('tratativas').upload(path, arquivo, {
      cacheControl: '3600',
      upsert: true
    })
    if (upErr) return { error: upErr }
    const { data: pub } = supabase.storage.from('tratativas').getPublicUrl(path)
    return { publicUrl: pub?.publicUrl || null }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.motorista_chapa || !form.motorista_nome) {
      alert('Selecione um motorista (nome ou chapa).')
      return
    }
    if (!form.tipo_ocorrencia) {
      alert('Selecione o tipo de ocorrência.')
      return
    }
    setSalvando(true)
    try {
      let imagem_solicitacao = null
      if (arquivo) {
        const up = await uploadEvidenciaInicial()
        if (up.error) throw up.error
        imagem_solicitacao = up.publicUrl
      }
      const payload = {
        ...form,
        status: 'Pendente',
        imagem_solicitacao,
        // retrocompatibilidade (se existir coluna antiga)
        imagem_url: imagem_solicitacao ?? null
      }
      const { error } = await supabase.from('tratativas').insert([payload])
      if (error) throw error
      alert('✅ Tratativa criada com sucesso!')
      navigate('/central')
    } catch (err) {
      console.error(err)
      alert('❌ Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Nova Solicitação de Tratativa</h1>

        <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoMotorista
            onSelect={(m) => {
              update('motorista_chapa', m.chapa)
              update('motorista_nome', m.nome)
            }}
          />

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Ocorrência</label>
            <select
              className="w-full border rounded p-2"
              value={form.tipo_ocorrencia}
              onChange={(e) => update('tipo_ocorrencia', e.target.value)}
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => (
                <option key={t.nome} value={t.nome}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Setor de Origem</label>
            <select
              className="w-full border rounded p-2"
              value={form.setor_origem}
              onChange={(e) => update('setor_origem', e.target.value)}
            >
              <option value="">Selecione...</option>
              {setores.map((s) => (
                <option key={s.nome} value={s.nome}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prioridade</label>
            <select
              className="w-full border rounded p-2"
              value={form.prioridade}
              onChange={(e) => update('prioridade', e.target.value)}
            >
              <option>Baixa</option>
              <option>Média</option>
              <option>Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Linha</label>
            <select
              className="w-full border rounded p-2"
              value={form.linha}
              onChange={(e) => update('linha', e.target.value)}
            >
              <option value="">Selecione...</option>
              {linhas.map((l) => (
                <option key={l.codigo} value={l.codigo}>{l.codigo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prefixo</label>
            <select
              className="w-full border rounded p-2"
              value={form.prefixo}
              onChange={(e) => update('prefixo', e.target.value)}
            >
              <option value="">Selecione...</option>
              {prefixos.map((p) => (
                <option key={p.codigo} value={p.codigo}>{p.codigo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data do ocorrido</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={form.data_ocorrido}
              onChange={(e) => update('data_ocorrido', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hora do ocorrido</label>
            <input
              type="time"
              className="w-full border rounded p-2"
              value={form.hora_ocorrido}
              onChange={(e) => update('hora_ocorrido', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={form.descricao}
              onChange={(e) => update('descricao', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Evidência (foto/print)</label>
            <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
          </div>

          <div className="md:col-span-2 flex gap-3 justify-between">
            <button type="button" onClick={() => navigate('/')} className="px-4 py-2 rounded bg-gray-200">
              Voltar
            </button>
            <button disabled={salvando} className="px-5 py-2 rounded bg-blue-600 text-white">
              {salvando ? 'Salvando...' : 'Criar tratativa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
