// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import CobrancasAvarias from "./pages/CobrancasAvarias";
import LancarAvaria from "./pages/LancarAvaria";
import AvariasEmRevisao from "./pages/AvariasEmRevisao";
import AprovacaoAvarias from "./pages/AprovacaoAvarias";
import SolicitacaoSOS from "./pages/SolicitacaoSOS";
import SOSFechamento from "./pages/SOSFechamento";
import SOSTratamento from "./pages/SOSTratamento";
import SOSCentral from "./pages/SOSCentral";
import Usuarios from "./pages/Usuarios";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          {/* Dashboard → todos */}
          <Route path="/" element={<Dashboard />} />

          {/* Tratativas */}
          <Route
            path="/solicitar"
            element={
              <ProtectedRoute niveisPermitidos={["CCO", "Manutenção", "Tratativa", "Gestor"]}>
                <SolicitacaoTratativa />
              </ProtectedRoute>
            }
          />
          <Route
            path="/central"
            element={
              <ProtectedRoute niveisPermitidos={["Tratativa", "Gestor"]}>
                <CentralTratativas />
              </ProtectedRoute>
            }
          />

          {/* Avarias */}
          <Route
            path="/lancar-avaria"
            element={
              <ProtectedRoute niveisPermitidos={["Manutenção"]}>
                <LancarAvaria />
              </ProtectedRoute>
            }
          />
          <Route
            path="/avarias-em-revisao"
            element={
              <ProtectedRoute niveisPermitidos={["Manutenção"]}>
                <AvariasEmRevisao />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aprovar-avarias"
            element={
              <ProtectedRoute niveisPermitidos={["Gestor"]}>
                <AprovacaoAvarias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cobrancas"
            element={
              <ProtectedRoute niveisPermitidos={["Tratativa", "Gestor"]}>
                <CobrancasAvarias />
              </ProtectedRoute>
            }
          />

          {/* SOS */}
          <Route
            path="/sos-solicitacao"
            element={
              <ProtectedRoute niveisPermitidos={["CCO", "Manutenção"]}>
                <SolicitacaoSOS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos-fechamento"
            element={
              <ProtectedRoute niveisPermitidos={["CCO", "Manutenção"]}>
                <SOSFechamento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos-tratamento"
            element={
              <ProtectedRoute niveisPermitidos={["Manutenção"]}>
                <SOSTratamento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos-central"
            element={
              <ProtectedRoute niveisPermitidos={["Manutenção"]}>
                <SOSCentral />
              </ProtectedRoute>
            }
          />

          {/* Configuração de Usuários → apenas Admin */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute niveisPermitidos={["Administrador"]}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
