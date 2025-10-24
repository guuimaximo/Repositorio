import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import TratarTratativa from "./pages/TratarTratativa";
import SolicitarTratativa from "./pages/SolicitacaoTratativa";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* PÁGINA INICIAL */}
        <Route path="/" element={<Home />} />

        {/* MÓDULO DE TRATATIVAS */}
        <Route path="/central-tratativas" element={<CentralTratativas />} />
        <Route path="/consultar-tratativa/:id" element={<ConsultarTratativa />} />
        <Route path="/tratar-tratativa/:id" element={<TratarTratativa />} />
        <Route path="/solicitar-tratativa" element={<SolicitarTratativa />} />

        {/* MÓDULO DE COBRANÇA DE AVARIAS (em breve) */}
        <Route path="/avarias" element={<h1 className='p-10'>🚧 Módulo de Avarias em construção</h1>} />

        {/* DASHBOARD */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* LOGIN / CADASTRO */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
      </Routes>
    </Router>
  );
}
