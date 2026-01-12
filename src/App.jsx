// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import LancarAvaria from "./pages/LancarAvaria";
import CobrancasAvarias from "./pages/CobrancasAvarias";
import AprovacaoAvarias from "./pages/AprovacaoAvarias";
import AvariasEmRevisao from "./pages/AvariasEmRevisao";

// ✅ NOVO: Resumo Avarias (Interno x Externo)
import AvariasResumo from "./pages/AvariasResumo";

import SolicitacaoSOS from "./pages/SolicitacaoSOS";
import SOSFechamento from "./pages/SOSFechamento";
import SOSTratamento from "./pages/SOSTratamento";
import SOSCentral from "./pages/SOSCentral";
import SOSDashboard from "./pages/SOSDashboard";

import KMRodado from "./pages/KMRodado";

import Usuarios from "./pages/Usuarios";
import RequireAuth from "./routes/RequireAuth";

// ✅ NOVO
import DesempenhoDiesel from "./pages/DesempenhoDiesel";

// ✅ NOVO (governança)
import DesempenhoLancamento from "./pages/DesempenhoLancamento";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 🔓 Login público */}
        <Route path="/login" element={<Login />} />

        {/* 🔐 Área protegida */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* ✅ Desempenho Diesel (Admin) */}
          <Route path="/desempenho-diesel" element={<DesempenhoDiesel />} />

          {/* ✅ Desempenho Lançamento (Admin) */}
          <Route path="/desempenho-lancamento" element={<DesempenhoLancamento />} />

          {/* Tratativas */}
          <Route path="/central" element={<CentralTratativas />} />
          <Route path="/tratar/:id" element={<TratarTratativa />} />
          <Route path="/consultar/:id" element={<ConsultarTratativa />} />
          <Route path="/solicitar" element={<SolicitacaoTratativa />} />

          {/* Avarias */}
          <Route path="/lancar-avaria" element={<LancarAvaria />} />
          <Route path="/aprovar-avarias" element={<AprovacaoAvarias />} />
          <Route path="/cobrancas" element={<CobrancasAvarias />} />

          {/* ✅ NOVO: Resumo Avarias */}
          <Route path="/avarias-resumo" element={<AvariasResumo />} />

          <Route path="/avarias-em-revisao" element={<AvariasEmRevisao />} />

          {/* SOS */}
          <Route path="/sos-solicitacao" element={<SolicitacaoSOS />} />
          <Route path="/sos-fechamento" element={<SOSFechamento />} />
          <Route path="/sos-tratamento" element={<SOSTratamento />} />
          <Route path="/sos-central" element={<SOSCentral />} />
          <Route path="/sos-dashboard" element={<SOSDashboard />} />

          {/* KM Rodado */}
          <Route path="/km-rodado" element={<KMRodado />} />

          {/* ⚙️ Configurações — acesso direto */}
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>

        {/* 🚫 Redireciona rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
