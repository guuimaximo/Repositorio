import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SolicitacaoTratativa from './pages/SolicitacaoTratativa'
import CentralResolucao from './pages/CentralResolucao'

function Private({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user || null)
      setLoading(false)
    }
    fetchUser()
  }, [])

  if (loading) return <div>Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Private>
              <Navbar />
              <Dashboard />
            </Private>
          }
        />
        <Route
          path="/solicitacao"
          element={
            <Private>
              <Navbar />
              <SolicitacaoTratativa />
            </Private>
          }
        />
        <Route
          path="/resolucao"
          element={
            <Private>
              <Navbar />
              <CentralResolucao />
            </Private>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
