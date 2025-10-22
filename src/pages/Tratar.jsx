import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Tratar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)
  const [historico, setHistorico] = useState([])
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

    if (error) {
      console.error(error)
      return
    }

    setTratativa(data)
    buscarHistorico(data.motorista_id)
  }

  async function buscarHistorico(motoristaId) {
    const { data, error } = await supabase
      .from('tratativas_detalhes')
      .select('*, tratativas(motorista_id)')
      .eq('tratativas.motorista_id', motoristaId)

    if (error) console.error('Erro ao carregar histórico:', error)
    else setHistorico(data)
  }

  function calcularPontuacao() {
    let pontos = 0
    historico.forEach((h) => {
      if (h.tipo_acao === 'Orientação') pontos -= 1
      if (h.tipo_acao === 'Advertência') pontos -= 3
      if (h.tipo_acao === 'Suspensão') pontos -= 5
    })
    return pontos
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

  const pontuacaoAtual = calcularPontuacao()

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        Tratar Ocorrência - {tratativa.tipo_ocorrencia}
      </h1>

      {/* Dados principais */}
      <div className="grid grid-cols-2 gap-4 text-gray-700 mb-6">
        <p><b>Motorista:</b> {tratativa.motorista_id}</p>
        <p><b>Setor:</b> {tratativa.setor_origem}</p>
        <p><b>Prioridade:</b> {tratativa.prioridade}</p>
        <p><b>Status:</b> {tratativa.status}</p>
      </div>

      {/* Histórico de Ações */}
      <div className="mb-6 bg-gray-50 border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Histórico de Ações do Motorista
        </h2>

        {historico.length === 0 ? (
          <p className="text-gray-500 italic">Nenhuma ação registrada.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Data</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Descrição</th>
                <th className="p-2">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b hover:bg-gray-100">
                  <td className="p-2">{new Date(h.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td className="p-2">{h.tipo_acao}</td>
                  <td className="p-2">{h.descricao_acao}</td>
                  <td className="p-2 text-center">{h.ranking_numero || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-3 text-right font-medium text-sm">
          <span className="text-gray-600">Pontuação atual: </span>
          <span
            className={`${
              pontuacaoAtual <= -5
                ? 'text-red-600'
                : pontuacaoAtual <= -3
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {pontuacaoAtual} pts
          </span>
        </div>
      </div>

      {/* Nova ação */}
      <h2 className="text-lg font-semibold mb-3 text-gray-800">
        Registrar Nova Ação
      </h2>

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
