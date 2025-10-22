import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function Dashboard() {
  const [dadosTipo, setDadosTipo] = useState([])
  const [dadosPrioridade, setDadosPrioridade] = useState([])
  const [totais, setTotais] = useState({ abertas: 0, resolvidas: 0, pendentes: 0 })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    const { data, error } = await supabase.from('tratativas').select('*')
    if (error) return console.error(error)

    const abertas = data.length
    const resolvidas = data.filter((t) => t.status === 'Resolvida').length
    const pendentes = data.filter((t) => t.status === 'Pendente').length

    setTotais({ abertas, resolvidas, pendentes })

    // agrupamento por tipo
    const tipos = {}
    data.forEach((t) => {
      tipos[t.tipo] = (tipos[t.tipo] || 0) + 1
    })
    setDadosTipo(Object.entries(tipos).map(([tipo, qtd]) => ({ tipo, qtd })))

    // agrupamento por prioridade
    const prioridades = {}
    data.forEach((t) => {
      prioridades[t.prioridade] = (prioridades[t.prioridade] || 0) + 1
    })
    setDadosPrioridade(
      Object.entries(prioridades).map(([prioridade, qtd]) => ({ prioridade, qtd }))
    )
  }

  const cores = ['#007BFF', '#FFB703', '#06D6A0', '#EF476F']

  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      {/* Banner principal */}
      <div
        className="banner"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1532614338840-ab30cf10ed36)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '16px',
          padding: '60px',
          color: '#fff',
          textShadow: '2px 2px 8px #000',
          marginBottom: '30px',
        }}
      >
        <h1>🚀 INOVEQUATAI</h1>
        <h3>Gestão Inteligente de Tratativas e Comunicação</h3>
        <p>Unindo operação e manutenção para resultados melhores a cada dia.</p>
      </div>

      {/* Cards resumo */}
      <div
        className="cards"
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            background: '#007BFF',
            color: '#fff',
            borderRadius: '12px',
            padding: '20px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          }}
        >
          <h2>{totais.abertas}</h2>
          <p>Total de Tratativas</p>
        </div>
        <div
          style={{
            background: '#06D6A0',
            color: '#fff',
            borderRadius: '12px',
            padding: '20px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          }}
        >
          <h2>{totais.resolvidas}</h2>
          <p>Resolvidas</p>
        </div>
        <div
          style={{
            background: '#FFB703',
            color: '#fff',
            borderRadius: '12px',
            padding: '20px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          }}
        >
          <h2>{totais.pendentes}</h2>
          <p>Pendentes</p>
        </div>
      </div>

      {/* Gráficos */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-around',
          gap: '40px',
        }}
      >
        {/* Gráfico por Tipo */}
        <div style={{ width: '45%', height: 300, background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h3>Tratativas por Tipo</h3>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={dadosTipo}
                dataKey="qtd"
                nameKey="tipo"
                outerRadius={100}
                label
              >
                {dadosTipo.map((_, i) => (
                  <Cell key={i} fill={cores[i % cores.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico por Prioridade */}
        <div style={{ width: '45%', height: 300, background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h3>Tratativas por Prioridade</h3>
          <ResponsiveContainer>
            <BarChart data={dadosPrioridade}>
              <XAxis dataKey="prioridade" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qtd" fill="#007BFF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Links de acesso */}
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Link to="/solicitacao" style={{ marginRight: '20px' }}>
          📤 Abrir nova tratativa
        </Link>
        <Link to="/central">🧰 Central de Resolução</Link>
      </div>
    </div>
  )
}
