// src/pages/DesempenhoDiesel.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { key: "resumo", label: "Resumo" },
  { key: "acompanhamento", label: "Acompanhamento" },
  { key: "tratativas", label: "Tratativas" },
  { key: "agente", label: "Agente Diesel" },
];

export default function DesempenhoDiesel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState("resumo");

  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    const exists = TABS.some((t) => t.key === hash);
    setActive(exists ? hash : "resumo");
  }, [location.hash]);

  const title = useMemo(() => {
    const tab = TABS.find((t) => t.key === active);
    return tab?.label || "Resumo";
  }, [active]);

  const go = (key) => navigate(`/desempenho-diesel#${key}`);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel</h1>
        <p className="text-gray-600">Módulo em construção. Estamos finalizando esta tela.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={[
              "px-4 py-2 rounded-md border",
              active === t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="text-gray-700">
          Conteúdo desta aba ainda não foi implementado.
        </div>
      </div>
    </div>
  );
}
