import React from "react";
import { FaHome, FaBrain, FaFileInvoice, FaChartBar, FaCog } from "react-icons/fa";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menu = [
    { name: "Início", path: "/", icon: <FaHome /> },
    { name: "Tratativas", path: "/central-tratativas", icon: <FaBrain /> },
    { name: "Avarias", path: "/avarias", icon: <FaFileInvoice /> },
    { name: "Painel", path: "/dashboard", icon: <FaChartBar /> },
    { name: "Configurações", path: "/configuracoes", icon: <FaCog /> },
  ];

  return (
    <div className="h-screen w-60 bg-blue-700 text-white flex flex-col py-6 shadow-lg fixed">
      <h1 className="text-2xl font-bold mb-10 px-6 flex items-center gap-2">
        🚌 InoveQuatai
      </h1>

      <nav className="flex flex-col gap-2 px-3">
        {menu.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-blue-500 font-semibold"
                  : "hover:bg-blue-600 hover:pl-5"
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
