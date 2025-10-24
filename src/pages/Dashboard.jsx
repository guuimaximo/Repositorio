import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'

export default function Dashboard() {
  const [total, setTotal] = useState(0)
  const [pendentes, setPendentes] = useState(0)
  const [concluidas, setConcluidas] = useState(0)
  const [atrasadas, setAtrasadas] = useState(0)
  const [grafico, setGrafico] = useState([])
  const [topMotorista, setTopMotorista] = useState(null)
  const [topOcorrencia, setTopOcorrencia] = useState(null)
  const [rankingMotoristas, setRankingMotoristas] = useState([])

  // --- Contadores gerais ---
  async function carregarResumo() {
    const { count: totalCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })

    const { count: pendCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%pendente%')

    const { count: concCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .or('status.ilike.%concluída%,status.ilike.%resolvido%')

    const { count: atrCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%atrasad%')

    setTotal(totalCount || 0)
    setPendentes(pendCount || 0)
    setConcluidas(concCount || 0)
    setAtrasadas(atrCount || 0)
  }

  // --- Gráfico dos últimos 30 dias ---
  async function carregarGrafico() {
    const hoje = new Date()
    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(hoje.getDate() - 30)

    const { data, error } = await supabase
      .from('tratativas')
      .select('created_at')
      .gte('created_at', trintaDiasAtras.toISOString())
      .order('created_at', { ascending: true })

    if (error || !data) return

    const agrupado = data.reduce((acc, t) => {
      const dia = new Date(t.created_at).toLocaleDateString('pt-BR')
      acc[dia] = (acc[dia] || 0) + 1
      return acc
    }, {})

    const dias = []
    for (let i = 30; i >= 0; i--) {
      const d = new Date()
      d.setDate(hoje.getDate() - i)
      const label = d.toLocaleDateString('pt-BR')
      dias.push({
        data: label,
        quantidade: agrupado[label] || 0,
      })
    }

    setGrafico(dias)
  }

  // --- Motorista com mais tratativas ---
  async function carregarTopMotorista() {
    const { data, error } = await supabase
      .from('tratativas')
      .select('motorista_nome')
      .not('motorista_nome', 'is', null)

    if (error || !data || data.length === 0) return

    const contagem = data.reduce((acc, t) => {
      const nome = t.motorista_nome?.trim() || 'Sem nome'
      acc[nome] = (acc[nome] || 0) + 1
      return acc
    }, {})

    const ordenado = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, total]) => ({ nome, total }))

    setTopMotorista(ordenado[0])
    setRankingMotoristas(ordenado.slice(0, 5))
  }

  // --- Ocorrência mais comum ---
  async function carregarTopOcorrencia() {
    const { data, error } = await supabase
      .from('tratativas')
      .select('tipo_ocorrencia')
      .not('tipo_ocorrencia', 'is', null)

    if (error || !data || data.length === 0) return

    const contagem = data.reduce((acc, t) => {
      const tipo = t.tipo_ocorrencia?.trim() || 'Não informado'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {})

    const [tipo, total] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]
    setTopOcorrencia({ tipo, total })
  }

  useEffect(() => {
    carregarResumo()
    carregarGrafico()
    carregarTopMotorista()
    carregarTopOcorrencia()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Tratativas</h1>

      {/* 🔹 Resumo principal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-2xl font-bold text-blue-600">{total}</p>
        </div>
        <div className="bg-yellow-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
        </div>
        <div className="bg-green-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Concluídas</p>
          <p className="text-2xl font-bold text-green-600">{concluidas}</p>
        </div>
        <div className="bg-red-100 text-center rounded-lg p-4">
          <p className="text-gray-600 text-sm">Atrasadas</p>
          <p className="text-2xl font-bold text-red-600">{atrasadas}</p>
        </div>
      </div>

      {/* 🔹 Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm mb-1">Motorista com mais tratativas</p>
          {topMotorista ? (
            <>
              <p className="text-xl font-bold text-blue-700">{topMotorista.nome}</p>
              <p className="text-gray-500 text-sm">
                {topMotorista.total} tratativas registradas
              </p>
            </>
          ) : (
            <p className="text-gray-400">Carregando...</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm mb-1">Ocorrência mais comum</p>
          {topOcorrencia ? (
            <>
              <p className="text-xl font-bold text-green-700">{topOcorrencia.tipo}</p>
              <p className="text-gray-500 text-sm">
                {topOcorrencia.total} registros
              </p>
            </>
          ) : (
            <p className="text-gray-400">Carregando...</p>
          )}
        </div>
      </div>

      {/* 🔹 Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evolução 30 dias */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">
            Evolução (últimos 30 dias)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={grafico}>
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="quantidade"
                stroke="#2563eb"
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 motoristas */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">
            Top 5 motoristas com mais tratativas
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rankingMotoristas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
