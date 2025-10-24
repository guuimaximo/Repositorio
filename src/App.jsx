import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Dashboard from './pages/Dashboard';
import CentralTratativas from './pages/CentralTratativas';
import TratarTratativa from './pages/TratarTratativa';
import ConsultarTratativa from './pages/ConsultarTratativa';
import SolicitacaoTratativa from './pages/SolicitacaoTratativa';
import Login from './pages/Login';
import Avarias from './pages/Avarias';
import CobrancasAvarias from './pages/CobrancasAvarias';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Página inicial (Painel principal) */}
        <Route path="/" element={<Dashboard />} />

        {/* Módulo de Tratativas */}
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />

        {/* Módulo de Avarias */}
        <Route path="/avarias" element={<Avarias />} />
        
        {/* Módulo de Cobranças */}
        <Route path="/cobrancas" element={<CobrancasAvarias />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Rota padrão */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
