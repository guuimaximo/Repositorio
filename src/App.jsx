import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CentralTratativas from './pages/CentralTratativas'
import SolicitarTratativa from './pages/SolicitacaoTratativa'
import TratarTratativa from './pages/TratarTratativa'
import ConsultarTratativa from './pages/ConsultarTratativa'
import Login from './pages/Login'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar" element={<SolicitarTratativa />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
      </Routes>
    </Router>
  )
}
