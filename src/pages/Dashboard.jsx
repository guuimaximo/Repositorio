import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const [tratativas, setTratativas] = useState([])

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tratativas')
        .select('*')
        .order('created_at', { ascending: true })
      setTratativas(data || [])
    })()
  }, [])

  // contadores
  const contagem = useMemo(() => {
    const total = tratativas.length
    let pend = 0, conc = 0, atr = 0
    tratativas.forEach(t => {
      const s = (t.status || '').toLowerCase()
      if (s === 'pendente') pend++
      else if (s === 'concluída' || s === 'concluida' || s === 'resolvido') conc++
      else if (s === 'atrasada') atr++
    })
    return { total, pend, conc, atr }
  }, [tratativas])

  // pizza por prioridade
  const porPrioridade = useMemo(() => {
    const mapa = {}
    tratativas.forEach(t => {
      const p = (t.prioridade || 'Sem prioridade')
      mapa[p] = (mapa[p] || 0) + 1
    })
    return Object.entries(mapa).map(([name, value]) => ({ name, value }))
  }, [tratativas])

  // linha por data
  const evolucao = useMemo(() => {
    const mapa = {}
    tratativas.forEach(t => {
      const d = new Date(t.created_at)
      const key = d.toLocaleDateString('pt-BR')
      mapa[key] = (mapa[key] || 0) + 1
    })
    return Object.entries(mapa).map(([data, qtd]) => ({ data, qtd }))
  }, [tratativas])

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Painel de Tratativas</h1>
      <p className="text-gray-600 mb-8">
        Acompanhe os principais indicadores e tendências das tratativas registradas no sistema.
      </p>

      {/* cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <CardIndicador titulo="Total" valor={contagem.total} borda="border-blue-600" cor="text-blue-700" />
        <CardIndicador titulo="Pendentes" valor={contagem.pend} borda="border-yellow-500" cor="text-yellow-600" />
        <CardIndicador titulo="Concluídas" valor={contagem.conc} borda="border-green-600" cor="text-green-600" />
        <CardIndicador titulo="Atrasadas" valor={contagem.atr} borda="border-red-600" cor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pizza */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Distribuição por Prioridade</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={porPrioridade} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} label>
                {porPrioridade.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Linha */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Evolução das Aberturas de Tratativas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="qtd" name="Tratativas Abertas" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function CardIndicador({ titulo, valor, borda, cor }) {
  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border-l-4 ${borda}`}>
      <h3 className="text-gray-500 text-sm">{titulo}</h3>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  )
}
