import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";

// Páginas
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Home from "./pages/Home";

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
        <Route
          path="/avarias"
          element={
            <div className="p-10 text-gray-700 text-lg">
        <Route path="/avarias" element={<Avarias />} /
            </div>
          }
        />

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
