import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Componentes e páginas
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tratativas from './pages/Tratativas'
import SolicitacaoTratativa from './pages/SolicitacaoTratativa'
import CentralResolucao from './pages/CentralResolucao'

// ===================================================================
// Componente para proteger rotas (apenas logados acessam)
// ===================================================================
function Private({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user || null)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ===================================================================
// Aplicação principal
// ===================================================================
export default function App() {
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

        {/* Tratativas (antiga aba principal de controle geral, se existir) */}
        <Route
          path="/tratativas"
          element={
            <Private>
              <Navbar />
              <Tratativas />
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

        {/* Central de Resolução (Setor que trata) */}
        <Route
          path="/resolucao"
          element={
            <Private>
              <Navbar />
              <CentralResolucao />
            </Private>
          }
        />

        {/* Rota padrão (caso não encontre) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
