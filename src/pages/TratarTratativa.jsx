import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'


export default function Tratar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)
  const [tiposAcao, setTiposAcao] = useState([])
  const [tipoAcao, setTipoAcao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [imagemTratativa, setImagemTratativa] = useState(null)

  useEffect(() => {
    buscarTratativa()
    buscarTiposAcao()
  }, [])

  async function buscarTratativa() {
    const { data } = await supabase.from('tratativas').select('*').eq('id', id).single()
    setTratativa(data)
  }

  async function buscarTiposAcao() {
    const { data } = await supabase.from('tipos_acao').select('*')
    setTiposAcao(data || [])
  }

  async function handleSalvar(e) {
    e.preventDefault()

    let imagemUrl = tratativa.imagem_tratativa
    if (imagemTratativa) {
      const { data: upload } = await supabase.storage.from('tratativas').upload(`tratadas/${id}-${Date.now()}.jpg`, imagemTratativa, { upsert: true })
      imagemUrl = `${supabase.storageUrl}/object/public/tratativas/${upload.path}`
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
      alert('✅ Tratativa encerrada com sucesso!')
      navigate('/central')
    }
  }

  if (!tratativa) return <p className="p-6">Carregando...</p>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Navbar />
      <h1 className="text-2xl font-bold mb-4">Tratar Ocorrência</h1>

      <div className="bg-white p-6 rounded shadow mb-6">
        <p><b>Motorista:</b> {tratativa.motorista_nome}</p>
        <p><b>Ocorrência:</b> {tratativa.tipo_ocorrencia}</p>
        <p><b>Data:</b> {tratativa.data_ocorrido} — <b>Hora:</b> {tratativa.hora_ocorrido}</p>
        <p><b>Setor:</b> {tratativa.setor_origem}</p>
        <p><b>Status:</b> {tratativa.status}</p>
      </div>

      <form onSubmit={handleSalvar} className="bg-white p-6 rounded shadow grid grid-cols-2 gap-4">
        <div>
          <label>Tipo de Ação</label>
          <select value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)} className="border rounded p-2 w-full">
            <option value="">Selecione...</option>
            {tiposAcao.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
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

        <div className="col-span-2 flex justify-between">
          <button type="button" onClick={() => navigate('/central')} className="bg-gray-400 text-white px-6 py-2 rounded">
            Voltar
          </button>
          <button className="bg-green-600 text-white px-6 py-2 rounded">
            Salvar Tratativa
          </button>
        </div>
      </form>
    </div>
  )
}
