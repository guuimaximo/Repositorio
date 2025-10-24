// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Navbar from './components/Navbar'

// === Páginas (lazy para carregar mais rápido; se preferir, pode voltar aos imports diretos) ===
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CentralTratativas = lazy(() => import('./pages/CentralTratativas'))
const TratarTratativa = lazy(() => import('./pages/TratarTratativa'))
const ConsultarTratativa = lazy(() => import('./pages/ConsultarTratativa'))
const SolicitacaoTratativa = lazy(() => import('./pages/SolicitacaoTratativa'))
const Login = lazy(() => import('./pages/Login'))

export default function App() {
  // ATENÇÃO: NÃO usar <BrowserRouter> aqui.
  // Ele já deve estar em src/main.jsx. Assim evitamos "You cannot render a <Router> inside another <Router>".

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar global: se quiser ocultar no /login, dá pra condicionar via useLocation() */}
      <Navbar />

      {/* Suspense exibe um fallback leve enquanto a página carrega (lazy) */}
      <Suspense fallback={<div className="p-6 text-gray-500">Carregando…</div>}>
        <Routes>
          {/* ROTAS ANTIGAS (mesmos paths) */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/central" element={<CentralTratativas />} />
          <Route path="/tratar/:id" element={<TratarTratativa />} />
          <Route path="/consultar/:id" element={<ConsultarTratativa />} />
          <Route path="/solicitar" element={<SolicitacaoTratativa />} />
          <Route path="/login" element={<Login />} />

          {/* Fallback para qualquer rota inválida */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
