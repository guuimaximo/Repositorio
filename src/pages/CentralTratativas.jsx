// src/pages/CentralTratativas.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { FaSyncAlt, FaSearch, FaFilter } from 'react-icons/fa'

export default function CentralTratativas() {
  const [tratativas, setTratativas] = useState([])
  const [filtros, setFiltros] = useState({
    busca: '',
    motorista: '',
    tipo_ocorrencia: '',
    setor: '',
    tipo_acao: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  })
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    buscarTratativas()
  }, [filtros])

  async function buscarTratativas() {
    setCarregando(true)
    let query = supabase.from('tratativas').select('*').order('created_at', { ascending: false })

    if (filtros.busca) {
      query = query.or(`motorista_nome.ilike.%${filtros.busca}%,motorista_chapa.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`)
    }
    if (filtros.motorista) query = query.ilike('motorista_nome', `%${filtros.motorista}%`)
    if (filtros.tipo_ocorrencia) query = query.eq('tipo_ocorrencia', filtros.tipo_ocorrencia)
    if (filtros.setor) query = query.eq('setor_origem', filtros.setor)
    if (filtros.tipo_acao) query = query.eq('tipo_acao', filtros.tipo_acao)
    if (filtros.status) query = query.eq('status', filtros.status)
    if (filtros.dataInicio && filtros.dataFim)
      query = query.gte('data_ocorrido', filtros.dataInicio).lte('data_ocorrido', filtros.dataFim)

    const { data, error } = await query
    if (error) console.error(error)
    else setTratativas(data)
    setCarregando(false)
  }

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      motorista: '',
      tipo_ocorrencia: '',
      setor: '',
      tipo_acao: '',
      status: '',
      dataInicio: '',
      dataFim: ''
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Cabeçalho e filtros */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Central de Tratativas</h1>
        </div>

        {/* Painel de Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md border mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FaFilter className="text-blue-600" /> Filtros
          </h2>

          <div className="grid grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="🔍 Buscar (nome, chapa, descrição...)"
              className="border rounded-lg p-2 col-span-2"
              value={filtros.busca}
              onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
            />

            <input
              type="date"
              className="border rounded-lg p-2"
              value={filtros.dataInicio}
              onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
            <input
              type="date"
              className="border rounded-lg p-2"
              value={filtros.dataFim}
              onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })}
            />

            <select
              className="border rounded-lg p-2"
              value={filtros.setor}
              onChange={e => setFiltros({ ...filtros, setor: e.target.value })}
            >
              <option value="">Setor</option>
              <option>CCO</option>
              <option>Fiscalização</option>
              <option>Gerência</option>
              <option>Inspetoria</option>
              <option>Monitoramento</option>
              <option>Sac</option>
              <option>Telemetria</option>
              <option>Manutenção</option>
            </select>

            <select
              className="border rounded-lg p-2"
              value={filtros.status}
              onChange={e => setFiltros({ ...filtros, status: e.target.value })}
            >
              <option value="">Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Concluída">Concluída</option>
              <option value="Atrasada">Atrasada</option>
            </select>

            <button
              onClick={limparFiltros}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <FaSyncAlt /> Limpar
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-md text-blue-700 text-center shadow">
            <p className="text-sm">Total</p>
            <p className="text-2xl font-bold">{tratativas.length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-md text-yellow-700 text-center shadow">
            <p className="text-sm">Pendentes</p>
            <p className="text-2xl font-bold">{tratativas.filter(t => t.status === 'Pendente').length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-md text-green-700 text-center shadow">
            <p className="text-sm">Concluídas</p>
            <p className="text-2xl font-bold">{tratativas.filter(t => t.status === 'Concluída').length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-md text-red-700 text-center shadow">
            <p className="text-sm">Atrasadas</p>
            <p className="text-2xl font-bold">{tratativas.filter(t => t.status === 'Atrasada').length}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="p-3 text-left">Motorista</th>
                <th className="p-3 text-left">Ocorrência</th>
                <th className="p-3 text-left">Setor</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Carregando...
                  </td>
                </tr>
              ) : tratativas.length > 0 ? (
                tratativas.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-100">
                    <td className="p-3">{t.motorista_nome}</td>
                    <td className="p-3">{t.tipo_ocorrencia}</td>
                    <td className="p-3">{t.setor_origem}</td>
                    <td className="p-3 font-semibold">{t.status}</td>
                    <td className="p-3">{t.data_ocorrido}</td>
                    <td className="p-3">
                      <button
                        onClick={() => window.location.href = `/tratar/${t.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Tratar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    Nenhuma tratativa encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
