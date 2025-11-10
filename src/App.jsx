// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Páginas principais
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import LancarAvaria from "./pages/LancarAvaria";
import CobrancasAvarias from "./pages/CobrancasAvarias";
import AprovacaoAvarias from "./pages/AprovacaoAvarias";
import AvariasEmRevisao from "./pages/AvariasEmRevisao";

// 🆕 Intervenções (SOS)
import SolicitacaoSOS from "./pages/SolicitacaoSOS";
import SOSFechamento from "./pages/SOSFechamento";
import SOSTratamento from "./pages/SOSTratamento"; // ✅ Nova página (manutenção)

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Início */}
        <Route path="/" element={<Dashboard />} />

        {/* Tratativas */}
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />

        {/* Avarias */}
        <Route path="/lancar-avaria" element={<LancarAvaria />} />
        <Route path="/aprovar-avarias" element={<AprovacaoAvarias />} />
        <Route path="/cobrancas" element={<CobrancasAvarias />} />
        <Route path="/avarias-em-revisao" element={<AvariasEmRevisao />} />

        {/* 🆕 Intervenções (SOS) */}
        <Route path="/sos-solicitacao" element={<SolicitacaoSOS />} />
        <Route path="/sos-fechamento" element={<SOSFechamento />} />
        <Route path="/sos-tratamento" element={<SOSTratamento />} /> {/* ✅ Novo */}
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
