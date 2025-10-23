import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

export default function SolicitacaoTratativa() {
  const [motoristas, setMotoristas] = useState([])
  const [linhas, setLinhas] = useState([])
  const [setores, setSetores] = useState([])
  const [prefixos, setPrefixos] = useState([])
  const [tiposOcorrencia, setTiposOcorrencia] = useState([])

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
  const [imagem, setImagem] = useState(null)

  useEffect(() => {
    buscarAuxiliares()
  }, [])

  async function buscarAuxiliares() {
    const [mot, lin, set, pre, tipo] = await Promise.all([
      supabase.from('motoristas').select('*'),
      supabase.from('linhas').select('*'),
      supabase.from('setores').select('*'),
      supabase.from('prefixos').select('*'),
      supabase.from('tipos_ocorrencia').select('*')
    ])
    setMotoristas(mot.data || [])
    setLinhas(lin.data || [])
    setSetores(set.data || [])
    setPrefixos(pre.data || [])
    setTiposOcorrencia(tipo.data || [])
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

    let imagemUrl = null
    if (imagem) {
      const { data: upload, error: upError } = await supabase.storage
        .from('tratativas')
        .upload(`solicitacoes/${Date.now()}-${imagem.name}`, imagem, { upsert: true })

      if (!upError) {
        imagemUrl = `${supabase.storageUrl}/object/public/tratativas/${upload.path}`
      }
    }

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
      imagem_url: imagemUrl,
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
          <select value={tipoOcorrencia} onChange={(e) => setTipoOcorrencia(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione...</option>
            {tiposOcorrencia.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
          </select>
        </div>

        <div>
          <label>Setor</label>
          <select value={setor} onChange={(e) => setSetor(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione...</option>
            {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
          </select>
        </div>

        <div>
          <label>Linha</label>
          <select value={linha} onChange={(e) => setLinha(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione...</option>
            {linhas.map(l => <option key={l.id} value={l.codigo}>{l.codigo}</option>)}
          </select>
        </div>

        <div>
          <label>Prefixo</label>
          <select value={prefixo} onChange={(e) => setPrefixo(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione...</option>
            {prefixos.map(p => <option key={p.id} value={p.codigo}>{p.codigo}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label>Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div className="col-span-2">
          <label>Imagem / Evidência</label>
          <input type="file" accept="image/*" onChange={(e) => setImagem(e.target.files[0])} />
        </div>

        <div className="col-span-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Salvar</button>
        </div>
      </form>
    </div>
  )
}
