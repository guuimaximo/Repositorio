import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Páginas
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import SolicitacaoTratativa from "./pages/SolicitacaoTratativa";
import Avarias from "./pages/Avarias";
import CobrancasAvarias from "./pages/CobrancasAvarias";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      {/* Rotas protegidas com Sidebar e Navbar */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/solicitar" element={<SolicitacaoTratativa />} />
        <Route path="/avarias" element={<Avarias />} />
        <Route path="/cobrancas" element={<CobrancasAvarias />} />
      </Route>

      {/* Login sem layout */}
      <Route path="/login" element={<Login />} />

      {/* Rota padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
