import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function CentralResolucao() {
  const [tratativas, setTratativas] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const navigate = useNavigate()

  useEffect(() => {
    buscarTratativas()
  }, [])

  async function buscarTratativas() {
    const { data, error } = await supabase
      .from('tratativas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Erro ao buscar tratativas:', error)
    else setTratativas(data)
  }

  function getStatusClass(status) {
    if (!status) return 'text-gray-500'
    const s = status.toLowerCase()
    if (s === 'pendente') return 'text-yellow-600 font-semibold'
    if (s === 'resolvido' || s === 'concluído' || s === 'concluída')
      return 'text-green-600 font-semibold'
    if (s === 'atrasado' || s === 'atrasada') return 'text-red-600 font-semibold'
    return 'text-gray-700'
  }

  // Contadores de status
  const totalPendentes = tratativas.filter(
    (t) => t.status?.toLowerCase() === 'pendente'
  ).length
  const totalResolvidas = tratativas.filter(
    (t) => t.status?.toLowerCase() === 'resolvido'
  ).length

  // Aplicar filtro
  const tratativasFiltradas =
    filtroStatus === 'Todas'
      ? tratativas
      : tratativas.filter((t) =>
          filtroStatus === 'Pendentes'
            ? t.status?.toLowerCase() === 'pendente'
            : t.status?.toLowerCase() === 'resolvido'
        )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
            🧩 Central de Tratativas
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-gray-700 flex items-center gap-1"
          >
            ← Voltar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setFiltroStatus('Todas')}
            className={`px-4 py-2 rounded-lg font-medium border ${
              filtroStatus === 'Todas'
                ? 'bg-blue-600 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            Todas ({tratativas.length})
          </button>

          <button
            onClick={() => setFiltroStatus('Pendentes')}
            className={`px-4 py-2 rounded-lg font-medium border ${
              filtroStatus === 'Pendentes'
                ? 'bg-yellow-500 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            Pendentes ({totalPendentes})
          </button>

          <button
            onClick={() => setFiltroStatus('Resolvidas')}
            className={`px-4 py-2 rounded-lg font-medium border ${
              filtroStatus === 'Resolvidas'
                ? 'bg-green-600 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            Resolvidas ({totalResolvidas})
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm text-gray-700">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="p-3 text-left">Motorista</th>
                <th className="p-3 text-left">Ocorrência</th>
                <th className="p-3 text-left">Prioridade</th>
                <th className="p-3 text-left">Setor</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Imagem</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>

            <tbody>
              {tratativasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    Nenhuma tratativa encontrada.
                  </td>
                </tr>
              ) : (
                tratativasFiltradas.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b ${
                      t.status?.toLowerCase() === 'resolvido'
                        ? 'bg-green-50'
                        : 'bg-white'
                    } hover:bg-gray-50 transition`}
                  >
                    <td className="p-3">{t.motorista_id || '-'}</td>
                    <td className="p-3">{t.tipo_ocorrencia || '-'}</td>
                    <td className="p-3">{t.prioridade || '-'}</td>
                    <td className="p-3">{t.setor_origem || '-'}</td>
                    <td className={`p-3 ${getStatusClass(t.status)}`}>
                      {t.status || 'Pendente'}
                    </td>
                    <td className="p-3">
                      {t.imagem_url ? (
                        <a
                          href={t.imagem_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={t.imagem_url}
                            alt="evidência"
                            className="w-16 h-16 object-cover rounded border hover:scale-105 transition-transform"
                          />
                        </a>
                      ) : (
                        <span className="italic text-gray-400">Sem imagem</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => navigate(`/tratar/${t.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                      >
                        Tratar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
