// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// 🧭 Importação das páginas principais
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitarTratativa from "./pages/SolicitarTratativa";
import Home from "./pages/Home"; // caso ainda exista a tela inicial

// 🚀 Estrutura principal de rotas
export default function App() {
  return (
    <Routes>
      {/* Página inicial */}
      <Route path="/" element={<Home />} />

      {/* Painel geral / dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Central de tratativas */}
      <Route path="/central" element={<CentralTratativas />} />

      {/* Solicitar nova tratativa */}
      <Route path="/solicitar" element={<SolicitarTratativa />} />

      {/* Tratar tratativa existente */}
      <Route path="/tratar/:id" element={<TratarTratativa />} />

      {/* Consultar tratativa (modo leitura) */}
      <Route path="/consultar/:id" element={<ConsultarTratativa />} />

      {/* Rota fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center text-gray-600">
            Página não encontrada 🚧
          </div>
        }
      />
    </Routes>
  );
}
