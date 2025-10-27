// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Páginas
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro"; // 1. Importar Cadastro
import LancarAvaria from "./pages/LancarAvaria"; 
import CobrancasAvarias from "./pages/CobrancasAvarias";
import AprovacaoAvarias from "./pages/AprovacaoAvarias"; 

export default function App() {
  return (
    <Routes>
      {/* Rotas internas (protegidas) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />
        <Route path="/lancar-avaria" element={<LancarAvaria />} />
        <Route path="/aprovar-avarias" element={<AprovacaoAvarias />} />
        <Route path="/cobrancas" element={<CobrancasAvarias />} />
      </Route>

      {/* Rotas públicas (sem layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} /> {/* 2. Adicionar Rota */}

      {/* Redirecionamento padrão (vamos ajustar isso no Layout) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
