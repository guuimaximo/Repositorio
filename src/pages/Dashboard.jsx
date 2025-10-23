import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Painel InoveQuatai 🚍
      </h1>

      <p className="text-gray-600 mb-6">
        Bem-vindo à central de tratativas da Quatai! Aqui você pode acompanhar
        as solicitações, abrir novos registros e visualizar o status de cada
        tratativa em tempo real.
      </p>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/central"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Central de Tratativas
        </Link>

        <Link
          to="/solicitar"
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
        >
          Solicitar Nova Tratativa
        </Link>

        <Link
          to="/dashboard"
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          Atualizar Painel
        </Link>
      </div>
    </div>
  );
}
