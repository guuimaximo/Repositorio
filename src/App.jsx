import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Componentes e páginas
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SolicitacaoTratativa from './pages/SolicitacaoTratativa'
import CentralResolucao from './pages/CentralResolucao'

// ===================================================================
// Componente para proteger rotas (só acessa se estiver logado)
// ===================================================================
function Private({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) console.error('⚠️ Erro Supabase Auth:', error.message)
        setUser(data?.user || null)
      } catch (err) {
        console.error('💥 Erro inesperado:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ===================================================================
// App principal
// ===================================================================
export default function App() {
  // 🔍 Depuração de erros globais
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      console.error("💥 Erro global detectado:", msg, err)
    }
    window.onunhandledrejection = (e) => {
      console.error("🚨 Promessa rejeitada:", e.reason)
    }
    console.log("🚀 INOVEQUATAI iniciado com Supabase:", supabase)
  }, [])

  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <Private>
              <Navbar />
              <Dashboard />
            </Private>
          }
        />

        {/* Solicitação de Tratativas */}
        <Route
          path="/solicitacao"
          element={
            <Private>
              <Navbar />
              <SolicitacaoTratativa />
            </Private>
          }
        />

        {/* Central de Resolução */}
        <Route
          path="/resolucao"
          element={
            <Private>
              <Navbar />
              <CentralResolucao />
            </Private>
          }
        />

        {/* Rota padrão */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
