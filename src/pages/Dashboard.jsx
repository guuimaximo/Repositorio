import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [total, setTotal] = useState(0)
  const [pendentes, setPendentes] = useState(0)
  const [concluidas, setConcluidas] = useState(0)
  const [atrasadas, setAtrasadas] = useState(0)
  const [grafico, setGrafico] = useState([])

  // --- Contadores reais (sem limite 1000) ---
  async function carregarResumo() {
    // Total
    const { count: totalCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
    // Pendentes
    const { count: pendCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%pendente%')
    // Concluídas (Concluída ou Resolvido)
    const { count: concCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .or('status.ilike.%concluída%,status.ilike.%resolvido%')
    // Atrasadas
    const { count: atrCount } = await supabase
      .from('tratativas')
      .select('id', { count: 'exact', head: true })
      .ilike('status', '%atrasad%')

    setTotal(totalCount || 0)
    setPendentes(pendCount || 0)
    setConcluidas(concCount || 0)
    setAtrasadas(atrCount || 0)
  }

  // --- Gráfico de evolução (por data de criação) ---
  async function carregarGrafico() {
    const { data, error } = await supabase
      .from('tratativas')
      .select('created_at')
      .order('created_at', { ascending: true })

    if (error || !data) return

    // Agrupar por dia
    const agrupado = data.reduce((acc, t) => {
      const dia = new Date(t.created_at).toLocaleDateString('pt-BR')
      acc[dia] = (acc[dia] || 0) + 1
      return acc
    }, {})

    const graficoFormatado = Object.entries(agrupado).map(([dia, qtd]) => ({
      data: dia,
      quantidade: qtd,
    }))

    setGrafico(graficoFormatado)
  }

  useEffect(() => {
    carregarResumo()
    carregarGrafico()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Tratativas</h1>

      {/* 🔹 Cards de Resumo */}
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

      {/* 🔹 Gráfico de evolução */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">
          Evolução das Aberturas de Tratativas
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
    </div>
  )
}
