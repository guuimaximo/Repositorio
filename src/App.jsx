import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tratativas from './pages/Tratativas.jsx'
import { supabase } from './supabase'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'

function Private({ children }) {
  const [session, setSession] = useState()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (!data.session) navigate('/login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) navigate('/login')
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  if (loading) return <div className="p-6">Carregando...</div>
  if (!session) return null
  return children
}

export default function App() {
  return (
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
        path="/tratativas"
        element={
          <Private>
            <Navbar />
            <Tratativas />
          </Private>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
