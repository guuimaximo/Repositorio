// src/components/Sidebar.jsx
import { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome, FaClipboardList, FaTools, FaMoneyBill, FaChevronDown, FaChevronRight,
  FaPenSquare, FaListAlt, FaWrench, FaClipboardCheck, FaUndo, FaCogs,
  FaCheckDouble, FaScrewdriver, FaEye, FaUserCog, FaSignOutAlt
} from "react-icons/fa";
import logoInova from "../assets/logoInovaQuatai.png";
import { AuthContext } from "../context/AuthContext"; // ✅ Contexto de autenticação

export default function Sidebar() {
  const [tratativasOpen, setTratativasOpen] = useState(false);
  const [avariasOpen, setAvariasOpen] = useState(false);
  const [intervencoesOpen, setIntervencoesOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const { user, logout } = useContext(AuthContext); // ✅ Pega usuário e logout
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm("Deseja realmente sair?")) {
      logout();
      navigate("/login");
    }
  };

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

      <nav className="flex-1 p-3 overflow-y-auto">
        {/* 1️⃣ Início */}
        <NavLink to="/" className={navLinkClass}>
          <FaHome /> <span>Início</span>
        </NavLink>

        {/* 2️⃣ Tratativas */}
        <button
          onClick={() => setTratativasOpen(!tratativasOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
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
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
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
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
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
            <NavLink to="/sos-central" className={subNavLinkClass}>
              <FaEye /> <span>Central</span>
            </NavLink>
          </div>
        )}

        {/* 👑 5️⃣ Configurações (somente Administrador) */}
        {user?.nivel === "Administrador" && (
          <>
            <hr className="my-3 border-blue-500" />
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
            >
              <div className="flex items-center gap-3">
                <FaUserCog /> <span>Configurações</span>
              </div>
              {configOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
            </button>
            {configOpen && (
              <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
                <NavLink to="/usuarios" className={subNavLinkClass}>
                  <FaUserCog /> <span>Usuários</span>
                </NavLink>
              </div>
            )}
          </>
        )}
      </nav>

      {/* 🚪 Logout */}
      <div className="p-3 border-t border-blue-600">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm"
        >
          <FaSignOutAlt /> <span>Sair</span>
        </button>
      </div>

      {/* Rodapé */}
      <div className="p-3 text-xs text-center border-t border-blue-600 text-blue-200">
        © {new Date().getFullYear()} InovaQuatai
      </div>
    </aside>
  );
}
