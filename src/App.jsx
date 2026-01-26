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
import AvariasResumo from "./pages/AvariasResumo";

import SolicitacaoSOS from "./pages/SolicitacaoSOS";
import SOSFechamento from "./pages/SOSFechamento";
import SOSTratamento from "./pages/SOSTratamento";
import SOSCentral from "./pages/SOSCentral";
import SOSDashboard from "./pages/SOSDashboard";

import KMRodado from "./pages/KMRodado";

import PCMInicio from "./pages/PCMInicio";
import PCMDiario from "./pages/PCMDiario";

import Usuarios from "./pages/Usuarios";
import RequireAuth from "./routes/RequireAuth";

import DesempenhoLancamento from "./pages/DesempenhoLancamento";
import DesempenhoDieselResumo from "./pages/DesempenhoDieselResumo";
import DesempenhoDieselAcompanhamento from "./pages/DesempenhoDieselAcompanhamento";
import DesempenhoDieselTratativas from "./pages/DesempenhoDieselTratativas";
import DesempenhoDieselAgente from "./pages/DesempenhoDieselAgente";
import DesempenhoDieselCheckpoint from "./pages/DesempenhoDieselCheckpoint";

// ✅ NOVO: Portal
import PortalSistemas from "./pages/PortalSistemas";

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
          {/* ✅ NOVO: Portal como raiz */}
          <Route path="/" element={<PortalSistemas />} />

          {/* ✅ INOVE direto (caso queira link fixo para entrar no Inove) */}
          <Route path="/inove" element={<Dashboard />} />

          {/* ✅ Desempenho Diesel */}
          <Route path="/desempenho-lancamento" element={<DesempenhoLancamento />} />
          <Route path="/desempenho-diesel-resumo" element={<DesempenhoDieselResumo />} />
          <Route path="/desempenho-diesel-acompanhamento" element={<DesempenhoDieselAcompanhamento />} />
          <Route path="/desempenho-diesel-tratativas" element={<DesempenhoDieselTratativas />} />
          <Route path="/desempenho-diesel-agente" element={<DesempenhoDieselAgente />} />

          <Route
            path="/desempenho-diesel-checkpoint/:id"
            element={<DesempenhoDieselCheckpoint />}
          />

          <Route path="/desempenho-diesel" element={<Navigate to="/desempenho-diesel-resumo" replace />} />

          {/* ✅ PCM */}
          <Route path="/pcm-inicio" element={<PCMInicio />} />
          <Route path="/pcm-diario/:id" element={<PCMDiario />} />

          {/* Tratativas */}
          <Route path="/central" element={<CentralTratativas />} />
          <Route path="/tratar/:id" element={<TratarTratativa />} />
          <Route path="/consultar/:id" element={<ConsultarTratativa />} />
          <Route path="/solicitar" element={<SolicitacaoTratativa />} />

          {/* Avarias */}
          <Route path="/lancar-avaria" element={<LancarAvaria />} />
          <Route path="/aprovar-avarias" element={<AprovacaoAvarias />} />
          <Route path="/cobrancas" element={<CobrancasAvarias />} />
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

          {/* ⚙️ Configurações */}
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>

        {/* 🚫 Redireciona rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
