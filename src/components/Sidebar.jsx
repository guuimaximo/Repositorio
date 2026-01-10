// src/components/Sidebar.jsx
import { useState, useContext, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaTools,
  FaMoneyBill,
  FaChevronDown,
  FaChevronRight,
  FaPenSquare,
  FaListAlt,
  FaWrench,
  FaClipboardCheck,
  FaUndo,
  FaCogs,
  FaCheckDouble,
  FaScrewdriver,
  FaEye,
  FaUserCog,
  FaSignOutAlt,
  FaDownload,
  FaRoad,
  FaGasPump,
  FaChartBar,     // ✅ ícone para Resumo
  FaSearch,       // ✅ ícone para Acompanhamento
  FaClipboardCheck as FaTratativasIcon, // ✅ ícone para Tratativas
  FaRobot,        // ✅ ícone para Agente Diesel
} from "react-icons/fa";
import logoInova from "../assets/logoInovaQuatai.png";
import { AuthContext } from "../context/AuthContext";

// mapa de acesso por nível
const ACCESS = {
  Administrador: "ALL",
  Gestor: [
    "/",
    "/solicitar",
    "/central",
    "/lancar-avaria",
    "/avarias-em-revisao",
    "/aprovar-avarias",
    "/cobrancas",
    "/sos-solicitacao",
    "/sos-fechamento",
    "/sos-tratamento",
    "/sos-central",
    "/sos-dashboard",
    "/km-rodado",
  ],
  Tratativa: ["/", "/solicitar", "/central", "/cobrancas"],
  Manutenção: [
    "/",
    "/solicitar",
    "/lancar-avaria",
    "/avarias-em-revisao",
    "/aprovar-avarias",
    "/sos-fechamento",
    "/sos-tratamento",
    "/sos-central",
    "/sos-dashboard",
    "/km-rodado",
  ],
  CCO: ["/", "/solicitar", "/sos-solicitacao", "/sos-fechamento", "/sos-dashboard", "/km-rodado"],
};

// helper de acesso
function canSee(user, path) {
  if (!user?.nivel) return false;
  if (user.nivel === "Administrador") return true;
  if (user.nivel === "Gestor") return ACCESS.Gestor.includes(path);
  const allowed = ACCESS[user.nivel] || [];
  return allowed.includes(path);
}

export default function Sidebar() {
  const [desempenhoDieselOpen, setDesempenhoDieselOpen] = useState(false);
  const [tratativasOpen, setTratativasOpen] = useState(false);
  const [avariasOpen, setAvariasOpen] = useState(false);
  const [intervencoesOpen, setIntervencoesOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.nivel === "Administrador";

  const links = useMemo(
    () => ({
      inicio: { path: "/", label: "Início", icon: <FaHome /> },

      // ✅ Desempenho Diesel (Admin only) - agora em uma linha e com ícones em subitens
      desempenhoDiesel: {
        base: "/desempenho-diesel",
        label: "Desempenho Diesel",
        icon: <FaGasPump />,
        tabs: [
          { hash: "#resumo", label: "Resumo", icon: <FaChartBar /> },
          { hash: "#acompanhamento", label: "Acompanhamento", icon: <FaSearch /> },
          { hash: "#tratativas", label: "Tratativas", icon: <FaTratativasIcon /> },
          { hash: "#agente", label: "Agente Diesel", icon: <FaRobot /> },
        ],
      },

      tratativas: [
        { path: "/solicitar", label: "Solicitação", icon: <FaPenSquare /> },
        { path: "/central", label: "Central", icon: <FaListAlt /> },
      ],

      avarias: [
        { path: "/lancar-avaria", label: "Lançamento", icon: <FaWrench /> },
        { path: "/avarias-em-revisao", label: "Pendências de Revisão", icon: <FaUndo /> },
        { path: "/aprovar-avarias", label: "Aprovações", icon: <FaClipboardCheck /> },
        { path: "/cobrancas", label: "Cobranças", icon: <FaMoneyBill /> },
      ],

      sos: [
        { path: "/sos-solicitacao", label: "Solicitação", icon: <FaPenSquare /> },
        { path: "/sos-fechamento", label: "Fechamento", icon: <FaCheckDouble /> },
        { path: "/sos-tratamento", label: "Manutenção", icon: <FaScrewdriver /> },
        { path: "/sos-central", label: "Central", icon: <FaEye /> },
        { path: "/sos-dashboard", label: "Dashboard (Excel)", icon: <FaDownload /> },
        { path: "/km-rodado", label: "KM Rodado (Dia)", icon: <FaRoad /> },
      ],

      configuracoes: [{ path: "/usuarios", label: "Usuários", icon: <FaUserCog /> }],
    }),
    []
  );

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

  // ✅ hash-active (porque NavLink não marca ativo por hash)
  const subHashClass = (hash) => {
    const active = location.pathname === links.desempenhoDiesel.base && location.hash === hash;
    return `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ml-4 transition-all duration-200 text-sm ${
      active ? "bg-blue-500" : "hover:bg-blue-600"
    }`;
  };

  // ✅ mantém admin-only
  const showDesempenhoDiesel = isAdmin;

  const showTratativas = links.tratativas.some((l) => canSee(user, l.path));
  const showAvarias = links.avarias.some((l) => canSee(user, l.path));
  const showSOS = links.sos.some((l) => canSee(user, l.path));
  const showConfig = isAdmin;

  return (
    <aside className="w-72 bg-blue-700 text-white flex flex-col">
      <div className="p-4 border-b border-blue-600 flex flex-col items-center">
        <img src={logoInova} alt="Logo InovaQuatai" className="h-10 w-auto mb-3" />
        {user && (
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Olá, {user.nome?.split(" ")[0]} 👋</p>
            <p className="text-xs text-blue-200">Seja bem-vindo!</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {canSee(user, links.inicio.path) && (
          <NavLink to={links.inicio.path} className={navLinkClass}>
            {links.inicio.icon} <span className="whitespace-nowrap">{links.inicio.label}</span>
          </NavLink>
        )}

        {/* ✅ Desempenho Diesel (Admin only) */}
        {showDesempenhoDiesel && (
          <>
            <button
              onClick={() => setDesempenhoDieselOpen(!desempenhoDieselOpen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
            >
              <div className="flex items-center gap-3 min-w-0">
                {links.desempenhoDiesel.icon}
                {/* ✅ garante 1 linha */}
                <span className="whitespace-nowrap truncate">{links.desempenhoDiesel.label}</span>
              </div>
              {desempenhoDieselOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
            </button>

            {desempenhoDieselOpen && (
              <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
                {links.desempenhoDiesel.tabs.map((t) => (
                  <NavLink
                    key={t.hash}
                    to={`${links.desempenhoDiesel.base}${t.hash}`}
                    className={() => subHashClass(t.hash)}
                  >
                    {t.icon} <span className="whitespace-nowrap">{t.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

        {showTratativas && (
          <>
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
              <div className="pl-4 border-l-2 border-blue-500 ml-4 mb-2">
                {links.tratativas.map((link) =>
                  canSee(user, link.path) ? (
                    <NavLink key={link.path} to={link.path} className={subNavLinkClass}>
                      {link.icon} <span>{link.label}</span>
                    </NavLink>
                  ) : null
                )}
              </div>
            )}
          </>
        )}

        {showAvarias && (
          <>
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
                {links.avarias.map((link) =>
                  canSee(user, link.path) ? (
                    <NavLink key={link.path} to={link.path} className={subNavLinkClass}>
                      {link.icon} <span>{link.label}</span>
                    </NavLink>
                  ) : null
                )}
              </div>
            )}
          </>
        )}

        {showSOS && (
          <>
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
                {links.sos.map((link) =>
                  canSee(user, link.path) ? (
                    <NavLink key={link.path} to={link.path} className={subNavLinkClass}>
                      {link.icon} <span>{link.label}</span>
                    </NavLink>
                  ) : null
                )}
              </div>
            )}
          </>
        )}

        {showConfig && (
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

      <div className="p-3 border-t border-blue-600">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm"
        >
          <FaSignOutAlt /> <span>Sair</span>
        </button>
      </div>

      <div className="p-3 text-xs text-center border-t border-blue-600 text-blue-200">
        © {new Date().getFullYear()} InovaQuatai
      </div>
    </aside>
  );
}
