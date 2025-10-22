import React, { useState } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useNavigate } from 'react-router-dom'

export default function SolicitacaoTratativa() {
  const navigate = useNavigate()
  const [motorista, setMotorista] = useState('')
  const [tipo, setTipo] = useState('Telemetria')
  const [ocorrencia, setOcorrencia] = useState('Excesso de velocidade')
  const [prioridade, setPrioridade] = useState('Média')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState(null)
  const [loading, setLoading] = useState(false)

  const uploadImagem = async () => {
    if (!imagem) return null
    const nomeArquivo = `${Date.now()}_${imagem.name}`
    const { data, error } = await supabase.storage
      .from('tratativas')
      .upload(nomeArquivo, imagem)

    if (error) {
      console.error('Erro ao enviar imagem:', error)
      return null
    }

    const { data: url } = supabase.storage.from('tratativas').getPublicUrl(nomeArquivo)
    return url.publicUrl
  }

  const criarTratativa = async () => {
    if (!motorista || !descricao) {
      alert('Preencha todos os campos obrigatórios!')
      return
    }

    setLoading(true)
    const imagemUrl = await uploadImagem()

    const { error } = await supabase.from('tratativas').insert([
      {
        motorista,
        tipo,
        tipo_ocorrencia: ocorrencia,
        prioridade,
        descricao,
        imagem_url: imagemUrl,
        status: 'Pendente',
        responsavel: '-',
        created_at: new Date().toISOString(),
      },
    ])

    setLoading(false)
    if (error) {
      console.error('Erro ao criar tratativa:', error)
      alert('Erro ao criar tratativa!')
    } else {
      alert('Tratativa criada com sucesso!')
      navigate('/tratativas')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
        >
          ⬅️ Voltar
        </button>

        <h1 className="text-2xl font-bold mb-4 text-gray-800">Solicitar Tratativa</h1>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Motorista"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              className="border p-2 rounded"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="Telemetria">Telemetria</option>
              <option value="Operação">Operação</option>
              <option value="Manutenção">Manutenção</option>
            </select>

            <select
              value={ocorrencia}
              onChange={(e) => setOcorrencia(e.target.value)}
              className="border p-2 rounded"
            >
              <option>Excesso de velocidade</option>
              <option>Uso de celular</option>
              <option>Freada brusca</option>
              <option>Avaria no veículo</option>
            </select>

            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              className="border p-2 rounded"
            >
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </select>
          </div>

          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição da tratativa"
            className="w-full border p-2 rounded mb-4"
            rows="4"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagem(e.target.files[0])}
            className="mb-4"
          />

          <button
            onClick={criarTratativa}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {loading ? 'Enviando...' : 'Criar Tratativa'}
          </button>
        </div>
      </div>
    </div>
  )
}
