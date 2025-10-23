import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

export default function SolicitacaoTratativa() {
  const [motoristas, setMotoristas] = useState([])
  const [chapa, setChapa] = useState('')
  const [nome, setNome] = useState('')
  const [tipoOcorrencia, setTipoOcorrencia] = useState('')
  const [dataOcorrido, setDataOcorrido] = useState('')
  const [horaOcorrido, setHoraOcorrido] = useState('')
  const [prioridade, setPrioridade] = useState('Média')
  const [setor, setSetor] = useState('')
  const [linha, setLinha] = useState('')
  const [prefixo, setPrefixo] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    buscarMotoristas()
  }, [])

  async function buscarMotoristas() {
    const { data } = await supabase.from('motoristas').select('*')
    setMotoristas(data || [])
  }

  const handleChapaChange = (e) => {
    const value = e.target.value
    setChapa(value)
    const m = motoristas.find(m => m.chapa === value)
    if (m) setNome(m.nome)
  }

  const handleNomeChange = (e) => {
    const value = e.target.value.toLowerCase()
    setNome(value)
    const m = motoristas.find(m => m.nome.toLowerCase() === value)
    if (m) setChapa(m.chapa)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const novaTratativa = {
      motorista_id: chapa,
      motorista_nome: nome,
      tipo_ocorrencia: tipoOcorrencia,
      data_ocorrido: dataOcorrido,
      hora_ocorrido: horaOcorrido,
      prioridade,
      setor_origem: setor,
      linha,
      prefixo,
      descricao,
      status: 'Pendente'
    }

    const { error } = await supabase.from('tratativas').insert([novaTratativa])
    if (error) alert('❌ Erro ao criar tratativa: ' + error.message)
    else alert('✅ Tratativa criada com sucesso!')
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Navbar />
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Nova Solicitação de Tratativa</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 bg-white p-6 rounded shadow">
        <div>
          <label>Chapa</label>
          <input value={chapa} onChange={handleChapaChange} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Motorista</label>
          <input value={nome} onChange={handleNomeChange} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Data do ocorrido</label>
          <input type="date" value={dataOcorrido} onChange={(e) => setDataOcorrido(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Hora do ocorrido</label>
          <input type="time" value={horaOcorrido} onChange={(e) => setHoraOcorrido(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Tipo de Ocorrência</label>
          <input value={tipoOcorrencia} onChange={(e) => setTipoOcorrencia(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Setor</label>
          <input value={setor} onChange={(e) => setSetor(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Linha</label>
          <input value={linha} onChange={(e) => setLinha(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div>
          <label>Prefixo</label>
          <input value={prefixo} onChange={(e) => setPrefixo(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div className="col-span-2">
          <label>Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div className="col-span-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Salvar</button>
        </div>
      </form>
    </div>
  )
}
