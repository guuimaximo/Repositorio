import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function Dashboard() {
  const [tratativas, setTratativas] = useState([])

  useEffect(() => {
    buscarTratativas()
  }, [])

  async function buscarTratativas() {
    const { data, error } = await supabase.from('tratativas').select('*')
    if (error) console.error('Erro ao buscar tratativas:', error)
    else setTratativas(data)
  }

  // Quantidade por status
  const statusCount = tratativas.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  // Quantidade por prioridade
  const prioridadeCount = tratativas.reduce((acc, t) => {
    acc[t.prioridade] = (acc[t.prioridade] || 0) + 1
    return acc
  }, {})

  // Evolução por data (contagem de tratativas abertas por dia)
  const tratativasPorDia = tratativas.reduce((acc, t) => {
    const data = new Date(t.created_at).toLocaleDateString('pt-BR')
    acc[data] = (acc[data] || 0) + 1
    return acc
  }, {})

  const dataEvolucao = Object.entries(tratativasPorDia).map(([data, qtd]) => ({
    data,
    qtd,
  }))

  const cores = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444']

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Painel de Tratativas
        </h1>
        <p className="text-gray-600 mb-8">
          Acompanhe os principais indicadores e tendências das tratativas
          registradas no sistema.
        </p>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h2 className="text-gray-500 text-sm">Total de Tratativas</h2>
            <p className="text-2xl font-bold text-blue-700">
              {tratativas.length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <h2 className="text-gray-500 text-sm">Pendentes</h2>
            <p className="text-2xl font-bold text-yellow-600">
              {statusCount['Pendente'] || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-600">
            <h2 className="text-gray-500 text-sm">Concluídas</h2>
            <p className="text-2xl font-bold text-green-600">
              {statusCount['Concluída'] || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-red-600">
            <h2 className="text-gray-500 text-sm">Atrasadas</h2>
            <p className="text-2xl font-bold text-red-600">
              {statusCount['Atrasada'] || 0}
            </p>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-2 gap-8">
          {/* Gráfico de Pizza - Prioridades */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Distribuição por Prioridade
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(prioridadeCount).map(([name, value]) => ({
                    name,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(prioridadeCount).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={cores[index % cores.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Linha - Evolução */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Evolução das Aberturas de Tratativas
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dataEvolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="qtd"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Tratativas Abertas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
