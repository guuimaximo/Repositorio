import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

// Páginas antigas (mantidas)
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import Login from "./pages/Login";

// Novas páginas (atualização)
import Home from "./pages/Home"; // nova página principal
import Cadastro from "./pages/Cadastro"; // já está no seu projeto

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar global (só aparece fora do login) */}
      <Navbar />

      <Routes>
        {/* 🔹 NOVA PÁGINA INICIAL */}
        <Route path="/" element={<Home />} />

        {/* 🔹 ROTAS EXISTENTES — preservadas exatamente como estavam */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />

        {/* 🔹 LOGIN / CADASTRO */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* 🔹 MÓDULO FUTURO — COBRANÇA DE AVARIAS */}
        <Route
          path="/avarias"
          element={
            <div className="p-10 text-gray-700 text-lg">
              🚧 Módulo de <strong>Cobrança de Avarias</strong> em desenvolvimento.
            </div>
          }
        />

        {/* Fallback para rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
