import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

export default function Tratar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)
  const [tipoAcao, setTipoAcao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [imagemTratativa, setImagemTratativa] = useState(null)

  useEffect(() => {
    buscarTratativa()
  }, [])

  async function buscarTratativa() {
    const { data } = await supabase.from('tratativas').select('*').eq('id', id).single()
    setTratativa(data)
  }

  async function handleSalvar(e) {
    e.preventDefault()

    let imagemUrl = tratativa.imagem_tratativa
    if (imagemTratativa) {
      const { data: upload } = await supabase.storage.from('tratativas').upload(`tratativas/${id}.jpg`, imagemTratativa, { upsert: true })
      imagemUrl = `${supabase.storageUrl}/object/public/tratativas/${id}.jpg`
    }

    const { error } = await supabase
      .from('tratativas')
      .update({
        tipo_acao: tipoAcao,
        descricao: observacao,
        imagem_tratativa: imagemUrl,
        status: 'Resolvido',
      })
      .eq('id', id)

    if (error) alert('❌ Erro ao salvar: ' + error.message)
    else {
      alert('✅ Tratativa atualizada com sucesso!')
      navigate('/central')
    }
  }

  if (!tratativa) return <p>Carregando...</p>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Navbar />
      <h1 className="text-2xl font-bold mb-4">Tratar Ocorrência</h1>

      <div className="bg-white p-6 rounded shadow mb-6">
        <p><b>Motorista:</b> {tratativa.motorista_nome}</p>
        <p><b>Ocorrência:</b> {tratativa.tipo_ocorrencia}</p>
        <p><b>Data:</b> {tratativa.data_ocorrido} — <b>Hora:</b> {tratativa.hora_ocorrido}</p>
        <p><b>Setor:</b> {tratativa.setor_origem}</p>
        <p><b>Status atual:</b> {tratativa.status}</p>
      </div>

      <form onSubmit={handleSalvar} className="bg-white p-6 rounded shadow grid grid-cols-2 gap-4">
        <div>
          <label>Tipo de Ação</label>
          <select value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione</option>
            <option>Advertência</option>
            <option>Orientação</option>
            <option>Suspensão</option>
            <option>Contato Pessoal</option>
            <option>Elogiado</option>
          </select>
        </div>

        <div>
          <label>Foto / Assinatura</label>
          <input type="file" accept="image/*" onChange={(e) => setImagemTratativa(e.target.files[0])} />
        </div>

        <div className="col-span-2">
          <label>Observações</label>
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="border rounded p-2 w-full" />
        </div>

        <div className="col-span-2 flex justify-end">
          <button className="bg-green-600 text-white px-6 py-2 rounded">Salvar Tratativa</button>
        </div>
      </form>
    </div>
  )
}
