import { NavLink } from "react-router-dom";
import { FaHome, FaClipboardList, FaTools, FaMoneyBill, FaSignOutAlt } from "react-icons/fa";

export default function Sidebar() {
  const links = [
    { to: "/", icon: <FaHome />, label: "Início" },
    { to: "/central", icon: <FaClipboardList />, label: "Tratativas" },
    { to: "/avarias", icon: <FaTools />, label: "Avarias" },
    { to: "/cobrancas", icon: <FaMoneyBill />, label: "Cobranças" },
  ];

  return (
    <aside className="w-60 bg-blue-700 text-white flex flex-col">
      <div className="p-4 text-center font-bold text-xl border-b border-blue-600">
        INOVEQUATAI
      </div>
      <nav className="flex-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-all duration-200 ${
                isActive ? "bg-blue-500" : "hover:bg-blue-600"
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-600">
        <button className="flex items-center gap-2 text-sm hover:text-red-300">
          <FaSignOutAlt /> Sair
        </button>
      </div>
    </aside>
  );
}
