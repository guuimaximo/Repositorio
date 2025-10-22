import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useNavigate } from 'react-router-dom'

export default function CentralResolucao() {
  const navigate = useNavigate()
  const [tratativas, setTratativas] = useState([])

  useEffect(() => {
    carregarTratativas()
  }, [])

  const carregarTratativas = async () => {
    const { data, error } = await supabase.from('tratativas').select('*')
    if (error) console.error('Erro ao carregar tratativas:', error)
    else setTratativas(data)
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

        <h1 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          🧰 Central de Resolução
        </h1>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Motorista</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Prioridade</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Responsável</th>
                <th className="p-2 border">Descrição</th>
                <th className="p-2 border">Imagem</th>
                <th className="p-2 border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tratativas.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-gray-500">{t.id}</td>
                  <td className="p-2 border">{t.motorista}</td>
                  <td className="p-2 border">{t.tipo_ocorrencia}</td>
                  <td className="p-2 border">{t.prioridade}</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        t.status?.toLowerCase() === 'resolvido'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-2 border">{t.responsavel || '-'}</td>
                  <td className="p-2 border">{t.descricao}</td>
                  <td className="p-2 border">
                    {t.imagem_url ? (
                      <a
                        href={t.imagem_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Ver imagem
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 border">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
