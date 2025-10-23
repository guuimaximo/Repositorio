import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CentralTratativas from "./pages/CentralTratativas";
import SolicitarTratativa from "./pages/SolicitacaoTratativa";
import TratarTratativa from "./pages/TratarTratativa";
import ConsultarTratativa from "./pages/ConsultarTratativa";
import Login from "./pages/Login";       // ✅ IMPORT CORRETO
import Cadastro from "./pages/Cadastro"; // ✅ IMPORT CORRETO
import Navbar from "./components/Navbar";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/central" element={<CentralTratativas />} />
        <Route path="/solicitar" element={<SolicitarTratativa />} />
        <Route path="/tratar/:id" element={<TratarTratativa />} />
        <Route path="/consultar/:id" element={<ConsultarTratativa />} />
        <Route path="/login" element={<Login />} />         {/* ✅ agora funciona */}
        <Route path="/cadastro" element={<Cadastro />} />   {/* ✅ nova rota */}
      </Routes>
    </Router>
  );
}

export default App;
