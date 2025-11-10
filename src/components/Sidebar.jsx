// src/components/Sidebar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  FaHome, FaClipboardList, FaTools, FaMoneyBill, FaSignOutAlt, 
  FaChevronDown, FaChevronRight, FaPenSquare, FaListAlt,   
  FaWrench, FaClipboardCheck, FaUndo, FaCogs, FaCheckDouble, FaScrewdriver
} from "react-icons/fa";
import logoInova from "../assets/logoInovaQuatai.png";

export default function Sidebar() {
  const [tratativasOpen, setTratativasOpen] = useState(false);
  const [avariasOpen, setAvariasOpen] = useState(false);
  const [intervencoesOpen, setIntervencoesOpen] = useState(false); // 👈 Novo grupo SOS

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 ${
      isActive ? "bg-blue-500" : "hover:bg-blue-600"
    }`;

  const subNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ml-4 transition-all duration-200 text-sm ${
      isActive ? "bg-blue-500" : "hover:bg-blue-600"
    }`;

  return (
    <aside className="w-60 bg-blue-700 text-white flex flex-col">
      {/* Cabeçalho */}
      <div className="p-4 flex items-center justify-center gap-2 border-b border-blue-600">
        <img src={logoInova} alt="Logo InovaQuatai" className="h-8 w-auto" />
        <span className="font-bold text-xl tracking-tight">INOVAQUATAI</span>
      </div>

      <nav className="flex-1 p-3">
        {/* 1️⃣ Início */}
        <NavLink to="/" className={navLinkClass}>
          <FaHome /> <span>Início</span>
        </NavLink>

        {/* 2️⃣ Tratativas */}
        <button
          onClick={() => setTratativasOpen(!tratativasOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 hover:bg-blue-600"
        >
          <div className="flex items-center gap-3">
            <FaClipboardList /> <span>Tratativas</span>
          </div>
          {tratativasOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
        </button>

        {tratativasOpen && (
          <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
            <NavLink to="/solicitar" className={subNavLinkClass}>
              <FaPenSquare /> <span>Solicitação</span>
            </NavLink>
            <NavLink to="/central" className={subNavLinkClass}>
              <FaListAlt /> <span>Central</span>
            </NavLink>
          </div>
        )}

        {/* 3️⃣ Avarias */}
        <button
          onClick={() => setAvariasOpen(!avariasOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 hover:bg-blue-600"
        >
          <div className="flex items-center gap-3">
            <FaTools /> <span>Avarias</span>
          </div>
          {avariasOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
        </button>

        {avariasOpen && (
          <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
            <NavLink to="/lancar-avaria" className={subNavLinkClass}>
              <FaWrench /> <span>Lançamento</span>
            </NavLink>
            <NavLink to="/avarias-em-revisao" className={subNavLinkClass}>
              <FaUndo /> <span>Pendências de Revisão</span>
            </NavLink>
            <NavLink to="/aprovar-avarias" className={subNavLinkClass}>
              <FaClipboardCheck /> <span>Aprovações</span>
            </NavLink>
            <NavLink to="/cobrancas" className={subNavLinkClass}>
              <FaMoneyBill /> <span>Cobranças</span>
            </NavLink>
          </div>
        )}

        {/* 4️⃣ Intervenções (SOS) */}
        <button
          onClick={() => setIntervencoesOpen(!intervencoesOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 hover:bg-blue-600"
        >
          <div className="flex items-center gap-3">
            <FaCogs /> <span>Intervenções</span>
          </div>
          {intervencoesOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
        </button>

        {intervencoesOpen && (
          <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
            <NavLink to="/sos-solicitacao" className={subNavLinkClass}>
              <FaPenSquare /> <span>Solicitação</span>
            </NavLink>
            <NavLink to="/sos-fechamento" className={subNavLinkClass}>
              <FaCheckDouble /> <span>Fechamento</span>
            </NavLink>
            <NavLink to="/sos-tratamento" className={subNavLinkClass}>
              <FaScrewdriver /> <span>Manutenção</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Rodapé */}
      <div className="p-3 text-xs text-center border-t border-blue-600 text-blue-200">
        © {new Date().getFullYear()} InovaQuatai
      </div>
    </aside>
  );
}
