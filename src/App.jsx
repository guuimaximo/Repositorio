import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "/components/Navbar.jsx";

// Páginas
import Dashboard from "/pages/Dashboard.jsx";
import CentralTratativas from "/pages/CentralTratativas.jsx";
import TratarTratativa from "/pages/TratarTratativa.jsx";
import ConsultarTratativa from "/pages/ConsultarTratativa.jsx";
import SolicitacaoTratativa from "/pages/SolicitacaoTratativa.jsx";
import Login from "/pages/Login.jsx";
import Cadastro from "/pages/Cadastro.jsx";
import Home from "/pages/Home.jsx";
import Avarias from "/pages/Avarias.jsx"; // 1. Adicionada a importação

export default function App() {
  const location = useLocation();

  // 🔹 Páginas que DEVEM exibir o Navbar (somente tratativas)
  const mostrarNavbar = ["/central", "/tratar", "/consultar", "/solicitar"].some(
    (path) => location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Só mostra o Navbar nas telas de tratativas */}
      {mostrarNavbar && <Navbar />}

      <Routes>
        {/* HOME (Sidebar) */}
        <Route path="/" element={<Home />} />

        {/* DASHBOARD e módulos principais */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 2. Rota de Avarias corrigida */}
        <Route path="/avarias" element={<Avarias />} />

        {/* TRATATIVAS */}
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />

        {/* LOGIN / CADASTRO */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

