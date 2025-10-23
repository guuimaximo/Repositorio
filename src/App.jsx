import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'

// Páginas
import Dashboard from './pages/Dashboard'
import CentralTratativas from './pages/CentralTratativas'
import TratarTratativa from './pages/TratarTratativa'
import ConsultarTratativa from './pages/ConsultarTratativa'
import SolicitacaoTratativa from './pages/SolicitacaoTratativa'
import Login from './pages/Login'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
