// src/pages/Tratar.jsx
import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function Tratar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)
  const [acoes, setAcoes] = useState([])
  const [tipoAcao, setTipoAcao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('tratativas').select('*').eq('id', id).single(),
        supabase.from('tipos_acao').select('nome').order('nome')
      ])
      setTratativa(t || null)
      setAcoes(a || [])
    })()
  }, [id])

  async function uploadFotoTratativa() {
    if (!arquivo) return { publicUrl: null }
    const ext = arquivo.name.split('.').pop()
    const path = `tratadas/${id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('tratativas').upload(path, arquivo, {
      cacheControl: '3600',
      upsert: true
    })
    if (upErr) return { error: upErr }
    const { data: pub } = supabase.storage.from('tratativas').getPublicUrl(path)
    return { publicUrl: pub?.publicUrl || null }
  }

  async function salvar(e) {
    e.preventDefault()
    if (!tipoAcao) {
      alert('Selecione o tipo de ação.')
      return
    }
    setSalvando(true)
    try {
      let imagem_tratativa = tratativa?.imagem_tratativa || null
      if (arquivo) {
        const up = await uploadFotoTratativa()
        if (up.error) throw up.error
        imagem_tratativa = up.publicUrl
      }
      const payload = {
        tipo_acao: tipoAcao,
        descricao: observacao || tratativa?.descricao || null,
        imagem_tratativa,
        status: 'Resolvido'
      }
      const { error } = await supabase.from('tratativas').update(payload).eq('id', id)
      if (error) throw error
      alert('✅ Tratativa resolvida com sucesso!')
      navigate('/central')
    } catch (err) {
      console.error(err)
      alert('❌ Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (!tratativa) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Tratar Ocorrência</h1>
          <button onClick={() => navigate('/central')} className="px-4 py-2 rounded bg-gray-200">Voltar</button>
        </div>

        <div className="bg-white p-6 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <p><b>Motorista:</b> {tratativa.motorista_nome} — <span className="text-gray-600">{tratativa.motorista_chapa}</span></p>
          <p><b>Ocorrência:</b> {tratativa.tipo_ocorrencia}</p>
          <p><b>Setor:</b> {tratativa.setor_origem}</p>
          <p><b>Status:</b> {tratativa.status}</p>
          <p><b>Data/Hora:</b> {tratativa.data_ocorrido || '-'} {tratativa.hora_ocorrido ? `— ${tratativa.hora_ocorrido}` : ''}</p>
          <p><b>Linha / Prefixo:</b> {tratativa.linha || '-'} {tratativa.prefixo ? `— ${tratativa.prefixo}` : ''}</p>

          {tratativa.imagem_solicitacao && (
            <div className="md:col-span-2">
              <b>Evidência inicial:</b><br />
              <img src={tratativa.imagem_solicitacao} alt="Evidência" className="mt-2 max-h-48 rounded border" />
            </div>
          )}

          {tratativa.imagem_tratativa && (
            <div className="md:col-span-2">
              <b>Foto tratativa (atual):</b><br />
              <img src={tratativa.imagem_tratativa} alt="Tratativa" className="mt-2 max-h-48 rounded border" />
            </div>
          )}
        </div>

        <form onSubmit={salvar} className="bg-white p-6 rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Ação</label>
            <select
              className="w-full border rounded p-2"
              value={tipoAcao}
              onChange={(e) => setTipoAcao(e.target.value)}
            >
              <option value="">Selecione...</option>
              {acoes.map((a) => (
                <option key={a.nome} value={a.nome}>{a.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Foto/Assinatura do colaborador</label>
            <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Observações / Descrição</label>
            <textarea
              rows={3}
              className="w-full border rounded p-2"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex justify-between">
            <button type="button" onClick={() => navigate('/central')} className="px-4 py-2 rounded bg-gray-200">
              Voltar
            </button>
            <button disabled={salvando} className="px-5 py-2 rounded bg-green-600 text-white">
              {salvando ? 'Salvando...' : 'Salvar e marcar como Resolvido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
