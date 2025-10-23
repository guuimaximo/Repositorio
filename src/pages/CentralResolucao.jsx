import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useNavigate } from 'react-router-dom'

export default function CentralResolucao() {
  const [tratativas, setTratativas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const navigate = useNavigate()

  useEffect(() => {
    buscarTratativas()
  }, [])

  async function buscarTratativas() {
    const { data } = await supabase.from('tratativas').select('*').order('created_at', { ascending: false })
    setTratativas(data || [])
  }

  const filtradas = tratativas.filter(t => {
    if (filtro === 'pendentes') return t.status === 'Pendente'
    if (filtro === 'resolvidas') return t.status === 'Resolvido'
    return true
  })

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Navbar />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Central de Tratativas</h1>
        <div>
          <button onClick={() => setFiltro('todas')} className="mx-1 px-4 py-1 border rounded">Todas</button>
          <button onClick={() => setFiltro('pendentes')} className="mx-1 px-4 py-1 border rounded text-yellow-700">Pendentes</button>
          <button onClick={() => setFiltro('resolvidas')} className="mx-1 px-4 py-1 border rounded text-green-700">Resolvidas</button>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-blue-700 text-white">
          <tr>
            <th>Motorista</th>
            <th>Ocorrência</th>
            <th>Prioridade</th>
            <th>Setor</th>
            <th>Status</th>
            <th>Imagem</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map(t => (
            <tr key={t.id} className="border-b">
              <td>{t.motorista_nome}</td>
              <td>{t.tipo_ocorrencia}</td>
              <td>{t.prioridade}</td>
              <td>{t.setor_origem}</td>
              <td>{t.status}</td>
              <td>
                {t.imagem_url ? (
                  <a href={t.imagem_url} target="_blank">
                    <img src={t.imagem_url} alt="evidência" className="w-16 h-16 object-cover rounded" />
                  </a>
                ) : (
                  <i className="text-gray-400">Sem imagem</i>
                )}
              </td>
              <td>
                <button
                  onClick={() => navigate(`/tratar/${t.id}`)}
                  className="bg-blue-600 text-white px-4 py-1 rounded"
                >
                  Tratar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
