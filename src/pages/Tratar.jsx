import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Tratar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)
  const [tipoAcao, setTipoAcao] = useState('Orientação')
  const [descricao, setDescricao] = useState('')
  const [ranking, setRanking] = useState('')
  const [fotoEvidencia, setFotoEvidencia] = useState(null)
  const [fotoAssinatura, setFotoAssinatura] = useState(null)

  useEffect(() => {
    buscarTratativa()
  }, [])

  async function buscarTratativa() {
    const { data, error } = await supabase
      .from('tratativas')
      .select('*')
      .eq('id', id)
      .single()
    if (error) console.error(error)
    else setTratativa(data)
  }

  async function salvarTratamento() {
    let evidenciaUrl = null
    let assinaturaUrl = null

    if (fotoEvidencia) {
      const { data } = await supabase.storage
        .from('tratativas')
        .upload(`evidencias/${id}-evidencia.jpg`, fotoEvidencia, { upsert: true })
      evidenciaUrl = supabase.storage.from('tratativas').getPublicUrl(data.path).data.publicUrl
    }

    if (fotoAssinatura) {
      const { data } = await supabase.storage
        .from('tratativas')
        .upload(`assinaturas/${id}-assinatura.jpg`, fotoAssinatura, { upsert: true })
      assinaturaUrl = supabase.storage.from('tratativas').getPublicUrl(data.path).data.publicUrl
    }

    const { error } = await supabase.from('tratativas_detalhes').insert([
      {
        id_tratativa: id,
        tipo_acao: tipoAcao,
        descricao_acao: descricao,
        ranking_numero: ranking,
        imagem_evidencia_url: evidenciaUrl,
        imagem_assinatura_url: assinaturaUrl,
        criado_por: 'Guilherme Máximo',
      },
    ])

    if (!error) {
      await supabase
        .from('tratativas')
        .update({ status: 'Resolvido' })
        .eq('id', id)
      alert('Tratativa resolvida com sucesso!')
      navigate('/central')
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
  }

  if (!tratativa) return <p className="p-6">Carregando...</p>

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg shadow">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold mb-4 text-blue-700">Tratar Ocorrência</h1>

      <div className="space-y-2 text-gray-700 mb-6">
        <p><b>Motorista:</b> {tratativa.motorista_id}</p>
        <p><b>Ocorrência:</b> {tratativa.tipo_ocorrencia}</p>
        <p><b>Descrição:</b> {tratativa.descricao}</p>
        <p><b>Prioridade:</b> {tratativa.prioridade}</p>
        <p><b>Setor:</b> {tratativa.setor_origem}</p>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Tipo de Ação</label>
        <select
          value={tipoAcao}
          onChange={(e) => setTipoAcao(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option>Orientação</option>
          <option>Advertência</option>
          <option>Suspensão</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Descrição da Ação</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="border rounded p-2 w-full"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-1 font-medium">Foto da Evidência</label>
          <input type="file" onChange={(e) => setFotoEvidencia(e.target.files[0])} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Assinatura do Colaborador</label>
          <input type="file" onChange={(e) => setFotoAssinatura(e.target.files[0])} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Número do Ranking</label>
        <input
          type="number"
          value={ranking}
          onChange={(e) => setRanking(e.target.value)}
          className="border rounded p-2 w-full"
        />
      </div>

      <button
        onClick={salvarTratamento}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
      >
        Salvar Tratativa
      </button>
    </div>
  )
}
