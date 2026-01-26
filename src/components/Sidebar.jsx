// src/components/Sidebar.jsx
import { useState, useContext, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  FaChartBar,
  FaSearch,
  FaClipboardCheck as FaTratativasIcon,
  FaRobot,
  FaChartPie,
} from "react-icons/fa";
import logoInova from "../assets/logoInovaQuatai.png";
import { AuthContext } from "../context/AuthContext";

// ✅ Rotas Diesel
const DIESEL_ROUTES = {
  lancamento: "/desempenho-lancamento",
  resumo: "/desempenho-diesel-resumo",
  acompanhamento: "/desempenho-diesel-acompanhamento",
  tratativas: "/desempenho-diesel-tratativas",
  agente: "/desempenho-diesel-agente",
};

// ✅ Rotas PCM
const PCM_ROUTES = {
  inicio: "/pcm-inicio",
  diario: "/pcm-diario",
};

// ✅ Mapa de acesso por nível
// Regra: "/" (Início executivo) é APENAS Gestor/Adm.
// Para demais, use "/inicio-basico".
const ACCESS = {
  Administrador: "ALL",
  Gestor: [
    "/",
    "/inove",
    "/solicitar",
    "/central",
    "/tratativas-resumo", // ✅ NOVO (Gestor pode ver)
    "/lancar-avaria",
    "/avarias-em-revisao",
    "/aprovar-avarias",
    "/cobrancas",
    "/avarias-resumo",
    "/sos-solicitacao",
    "/sos-fechamento",
    "/sos-tratamento",
    "/sos-central",
    "/sos-dashboard",
    "/km-rodado",
    "/inicio-basico",
    PCM_ROUTES.inicio,
    PCM_ROUTES.diario,
    ...Object.values(DIESEL_ROUTES),
  ],

  // ❗ Tratativa NÃO vê resumo (somente Solicitação/Central, conforme você já tinha)
  Tratativa: ["/inicio-basico", "/solicitar", "/central", "/cobrancas"],

  Manutenção: [
    "/inicio-basico",
    "/solicitar",
    "/lancar-avaria",
    "/avarias-em-revisao",
    "/aprovar-avarias",
    "/sos-fechamento",
    "/sos-tratamento",
    "/sos-central",
    "/sos-dashboard",
    "/km-rodado",
    PCM_ROUTES.inicio,
    PCM_ROUTES.diario,
  ],
  CCO: ["/inicio-basico", "/solicitar", "/sos-solicitacao", "/sos-fechamento", "/sos-dashboard", "/km-rodado"],
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

  const isAdmin = user?.nivel === "Administrador";
  const isGestor = user?.nivel === "Gestor";
  const isManutencao = user?.nivel === "Manutenção";

  // ✅ Regra pedida:
  // - Gestor/Adm vê Início executivo ("/")
  // - Outros níveis vêem Início básico ("/inicio-basico")
  const showInicioExecutivo = isAdmin || isGestor;
  const showInicioBasico = !showInicioExecutivo;

  const links = useMemo(
    () => ({
      inicioExecutivo: { path: "/", label: "Início", icon: <FaHome /> },
      inicioBasico: { path: "/inicio-basico", label: "Início", icon: <FaHome /> },

      pcm: { path: PCM_ROUTES.inicio, label: "PCM - Manutenção", icon: <FaClipboardList /> },

      desempenhoDiesel: {
        label: "Desempenho Diesel",
        icon: <FaGasPump />,
        tabs: [
          { path: DIESEL_ROUTES.lancamento, label: "Lançamento", icon: <FaPenSquare /> },
          { path: DIESEL_ROUTES.resumo, label: "Resumo", icon: <FaChartBar /> },
          { path: DIESEL_ROUTES.acompanhamento, label: "Acompanhamento", icon: <FaSearch /> },
          { path: DIESEL_ROUTES.tratativas, label: "Tratativas", icon: <FaTratativasIcon /> },
          { path: DIESEL_ROUTES.agente, label: "Agente Diesel", icon: <FaRobot /> },
        ],
      },

      // ✅ Tratativas: ordem pedida (Resumo -> Solicitação -> Central)
      // ✅ Resumo só para Gestor/Adm
      tratativas: [
        { path: "/tratativas-resumo", label: "Resumo", icon: <FaChartPie />, onlyAdminGestor: true },
        { path: "/solicitar", label: "Solicitação", icon: <FaPenSquare /> },
        { path: "/central", label: "Central", icon: <FaListAlt /> },
      ],

      avarias: [
        { path: "/avarias-resumo", label: "Resumo", icon: <FaChartPie /> },
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

  const showDesempenhoDiesel = isAdmin || isGestor;
  const showPCM = isAdmin || isGestor || isManutencao;

  // ✅ Tratativas aparecem para quem tiver ao menos 1 item visível
  const showTratativas = links.tratativas.some((l) => {
    if (l.onlyAdminGestor) return isAdmin || isGestor;
    return canSee(user, l.path);
  });

  const showAvarias = links.avarias.some((l) => {
    if (l.path === "/avarias-resumo") return isAdmin || isGestor;
    return canSee(user, l.path);
  });

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
        {/* ✅ Início para Gestor/Adm ("/") */}
        {showInicioExecutivo && canSee(user, links.inicioExecutivo.path) && (
          <NavLink to={links.inicioExecutivo.path} className={navLinkClass}>
            {links.inicioExecutivo.icon} <span className="whitespace-nowrap">{links.inicioExecutivo.label}</span>
          </NavLink>
        )}

        {/* ✅ Início básico para demais ("/inicio-basico") */}
        {showInicioBasico && canSee(user, links.inicioBasico.path) && (
          <NavLink to={links.inicioBasico.path} className={navLinkClass}>
            {links.inicioBasico.icon} <span className="whitespace-nowrap">{links.inicioBasico.label}</span>
          </NavLink>
        )}

        {/* ✅ PCM */}
        {showPCM && canSee(user, links.pcm.path) && (
          <NavLink to={links.pcm.path} className={navLinkClass}>
            {links.pcm.icon} <span className="whitespace-nowrap">{links.pcm.label}</span>
          </NavLink>
        )}

        {/* ✅ Desempenho Diesel */}
        {showDesempenhoDiesel && (
          <>
            <button
              onClick={() => setDesempenhoDieselOpen(!desempenhoDieselOpen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-2 hover:bg-blue-600"
            >
              <div className="flex items-center gap-3 min-w-0">
                {links.desempenhoDiesel.icon}
                <span className="whitespace-nowrap truncate">{links.desempenhoDiesel.label}</span>
              </div>
              {desempenhoDieselOpen ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
            </button>

            {desempenhoDieselOpen && (
              <div className="pl-4 border-l-2 border-blue-500 ml-3 mb-2">
                {links.desempenhoDiesel.tabs.map((t) =>
                  canSee(user, t.path) ? (
                    <NavLink key={t.path} to={t.path} className={subNavLinkClass}>
                      {t.icon} <span className="whitespace-nowrap">{t.label}</span>
                    </NavLink>
                  ) : null
                )}
              </div>
            )}
          </>
        )}

        {/* ✅ Tratativas (Resumo -> Solicitação -> Central) */}
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
                {links.tratativas.map((link) => {
                  // ✅ Resumo somente Gestor/Adm
                  if (link.onlyAdminGestor && !(isAdmin || isGestor)) return null;

                  // ✅ Demais itens seguem ACCESS
                  if (!link.onlyAdminGestor && !canSee(user, link.path)) return null;

                  return (
                    <NavLink key={link.path} to={link.path} className={subNavLinkClass}>
                      {link.icon} <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ✅ Avarias */}
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
                {links.avarias.map((link) => {
                  if (link.path === "/avarias-resumo" && !(isAdmin || isGestor)) return null;

                  return canSee(user, link.path) || (link.path === "/avarias-resumo" && (isAdmin || isGestor)) ? (
                    <NavLink key={link.path} to={link.path} className={subNavLinkClass}>
                      {link.icon} <span>{link.label}</span>
                    </NavLink>
                  ) : null;
                })}
              </div>
            )}
          </>
        )}

        {/* ✅ Intervenções */}
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

        {/* ✅ Configurações */}
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
