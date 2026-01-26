import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaClipboardList, FaCogs } from "react-icons/fa";

export default function InicioRapido() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800">Início Rápido</h1>

        <p className="text-gray-600 mt-2">
          Olá, <b>{user?.nome || "usuário"}</b>. Selecione um módulo para continuar.
        </p>

        <div className="mt-3 text-sm text-gray-500">
          Nível: <b>{user?.nivel || "-"}</b>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/central")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <FaClipboardList size={18} />
              <div>
                <div className="font-bold">Tratativas</div>
                <div className="text-xs opacity-90">Central / Solicitação</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/sos-central")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <FaCogs size={18} />
              <div>
                <div className="font-bold">Intervenções (SOS)</div>
                <div className="text-xs opacity-90">Central / Fechamento</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
