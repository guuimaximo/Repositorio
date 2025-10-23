import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🚌</span>
          <h1 className="text-xl font-bold text-blue-700">InoveQuatai</h1>
        </div>

        <div className="flex items-center space-x-6 text-gray-700 font-medium">
          <Link
            to="/"
            className={`hover:text-blue-600 ${
              location.pathname === "/" ? "text-blue-700 underline" : ""
            }`}
          >
            Início
          </Link>
          <Link
            to="/solicitar"
            className={`hover:text-blue-600 ${
              location.pathname === "/solicitar" ? "text-blue-700 underline" : ""
            }`}
          >
            Solicitar Tratativa
          </Link>
          <Link
            to="/central"
            className={`hover:text-blue-600 ${
              location.pathname === "/central" ? "text-blue-700 underline" : ""
            }`}
          >
            Central de Tratativas
          </Link>
        </div>
      </div>
    </nav>
  );
}
