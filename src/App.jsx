import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Páginas
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import Login from "./pages/Login";
import LancarAvaria from "./pages/LancarAvaria"; // Nova página de Lançamento
import CobrancasAvarias from "./pages/CobrancasAvarias";
// A página 'Avarias.jsx' antiga não é mais usada

export default function App() {
  return (
    <Routes>
      {/* Rotas internas com Sidebar + Navbar */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />
        
        {/* Rotas de Avarias Atualizadas */}
        <Route path="/lancar-avaria" element={<LancarAvaria />} />
        <Route path="/cobrancas" element={<CobrancasAvarias />} />
      </Route>

      {/* Página de Login sem layout */}
      <Route path="/login" element={<Login />} />

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
