// src/pages/ConsultarTratativa.jsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ConsultarTratativa() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tratativa, setTratativa] = useState(null)

  useEffect(() => {
    buscar()
  }, [])

  async function buscar() {
    const { data, error } = await supabase.from('tratativas').select('*').eq('id', id).single()
    if (error) console.error(error)
    else setTratativa(data)
  }

  if (!tratativa)
    return (
      <div className="p-6 text-center text-gray-500">
        <Navbar />
        <p>Carregando tratativa...</p>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md border">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Consultar Tratativa - {tratativa.motorista_nome}
        </h1>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Campo titulo="Motorista" valor={`${tratativa.motorista_nome} (${tratativa.motorista_chapa})`} />
          <Campo titulo="Tipo de Ocorrência" valor={tratativa.tipo_ocorrencia} />
          <Campo titulo="Prioridade" valor={tratativa.prioridade} />
          <Campo titulo="Setor de Origem" valor={tratativa.setor_origem} />
          <Campo titulo="Tipo de Ação" valor={tratativa.tipo_acao} />
          <Campo titulo="Data do Ocorrido" valor={tratativa.data_ocorrido} />
          <Campo titulo="Hora" valor={tratativa.hora_ocorrida} />
          <Campo titulo="Status" valor={tratativa.status} />
        </div>

        <div className="mb-4">
          <p className="font-semibold text-gray-700 mb-1">Descrição</p>
          <textarea
            readOnly
            className="w-full border rounded-lg p-2 bg-gray-100"
            rows="4"
            value={tratativa.descricao || 'Sem descrição'}
          />
        </div>

        {tratativa.imagem_tratativa && (
          <div className="mb-4">
            <p className="font-semibold text-gray-700 mb-2">Imagem</p>
            <img
              src={tratativa.imagem_tratativa}
              alt="Imagem da tratativa"
              className="rounded-lg border w-64 h-auto"
            />
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}

function Campo({ titulo, valor }) {
  return (
    <div>
      <p className="font-semibold text-gray-700">{titulo}</p>
      <p className="bg-gray-100 border rounded-lg px-3 py-2">{valor || '-'}</p>
    </div>
  )
}
