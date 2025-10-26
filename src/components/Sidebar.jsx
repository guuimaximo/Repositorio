import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  FaHome, 
  FaClipboardList, 
  FaTools, 
  FaMoneyBill, 
  FaSignOutAlt, 
  FaChevronDown, 
  FaChevronRight,
  FaPenSquare, // Ícone para Solicitação
  FaListAlt,   // Ícone para Central
  FaWrench     // Ícone para Lançamento
} from "react-icons/fa";

export default function Sidebar() {
  // Estados para controlar os menus expansíveis
  const [tratativasOpen, setTratativasOpen] = useState(false);
  const [avariasOpen, setAvariasOpen] = useState(false);

  // Estilos reutilizáveis (do seu código original)
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 ${
      isActive ? "bg-blue-500" : "hover:bg-blue-600"
    }`;
  
  // Estilo para os sub-itens
  const subNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ml-4 transition-all duration-200 text-sm ${
      isActive ? "bg-blue-500" : "hover:bg-blue-600"
    }`;

  return (
    <aside className="w-60 bg-blue-700 text-white flex flex-col">
      <div className="p-4 text-center font-bold text-xl border-b border-blue-600">
        INOVEQUATAI
      </div>
      <nav className="flex-1 p-3">
        
        {/* 1. Início (Link normal) */}
        <NavLink to="/" className={navLinkClass}>
          <FaHome />
          <span>Início</span>
        </NavLink>

        {/* 2. Tratativas (Botão Expansível) */}
        <button
          onClick={() => setTratativasOpen(!tratativasOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 hover:bg-blue-600"
        >
          <div className="flex items-center gap-3">
            <FaClipboardList />
            <span>Tratativas</span>
          </div>
          {tratativasOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
        </button>

        {/* Sub-menu Tratativas */}
        {tratativasOpen && (
          <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
            <NavLink to="/solicitar" className={subNavLinkClass}>
              <FaPenSquare />
              <span>Solicitação</span>
            </NavLink>
            <NavLink to="/central" className={subNavLinkClass}>
              <FaListAlt />
              <span>Central</span>
            </NavLink>
          </div>
        )}

        {/* 3. Avarias (Botão Expansível) */}
        <button
          onClick={() => setAvariasOpen(!avariasOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 hover:bg-blue-600"
        >
          <div className="flex items-center gap-3">
            <FaTools />
            <span>Avarias</span>
          </div>
          {avariasOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
        </button>

        {/* Sub-menu Avarias */}
        {avariasOpen && (
          <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
            <NavLink to="/lancar-avaria" className={subNavLinkClass}>
              <FaWrench />
              <span>Lançamento</span>
            </NavLink>
            <NavLink to="/cobrancas" className={subNavLinkClass}>
              <FaMoneyBill />
              <span>Cobranças</span>
            </NavLink>
          </div>
        )}

      </nav>
      <div className="p-4 border-t border-blue-600">
        <button className="flex items-center gap-2 text-sm hover:text-red-300">
          <FaSignOutAlt /> Sair
        </button>
      </div>
    </aside>
  );
}
