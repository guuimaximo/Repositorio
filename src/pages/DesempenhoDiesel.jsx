// src/pages/DesempenhoDiesel.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Layout from "../components/tatico/Layout";

import DesempenhoDieselResumo from "./DesempenhoDieselResumo";
import DesempenhoDieselAcompanhamento from "./DesempenhoDieselAcompanhamento";
import DesempenhoDieselTratativas from "./DesempenhoDieselTratativas";
import DesempenhoDieselAgente from "./DesempenhoDieselAgente";

export default function DesempenhoDiesel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("resumo");

  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    setActiveTab(hash || "resumo");
  }, [location.hash]);

  const tabs = [
    { key: "resumo", label: "Resumo" },
    { key: "acompanhamento", label: "Acompanhamento" },
    { key: "tratativas", label: "Tratativas" },
    { key: "agente-diesel", label: "Agente Diesel" },
  ];

  const onTab = (key) => {
    setActiveTab(key);
    navigate(`/desempenho-diesel#${key}`, { replace: true });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "resumo":
        return <DesempenhoDieselResumo />;
      case "acompanhamento":
        return <DesempenhoDieselAcompanhamento />;
      case "tratativas":
        return <DesempenhoDieselTratativas />;
      case "agente-diesel":
        return <DesempenhoDieselAgente />;
      default:
        return <DesempenhoDieselResumo />;
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Desempenho Diesel</h1>
          <p className="text-gray-600">Módulo em construção. Conteúdo em conclusão.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTab(t.key)}
                  className={[
                    "rounded-md px-4 py-2 text-sm font-medium border transition",
                    active
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {renderTab()}
      </div>
    </Layout>
  );
}
