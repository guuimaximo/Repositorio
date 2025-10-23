import React from "react";
import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa"; // ✅ Nome certo
//import Home from "./pages/Login"; // se o login for a página inicial

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/central" element={<CentralTratativas />} />
      <Route path="/solicitar" element={<SolicitacaoTratativa />} /> {/* ✅ */}
      <Route path="/tratar/:id" element={<TratarTratativa />} />
      <Route path="/consultar/:id" element={<ConsultarTratativa />} />
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
