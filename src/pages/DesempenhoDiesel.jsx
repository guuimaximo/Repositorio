// src/pages/DesempenhoDiesel.jsx
import { useMemo, useState } from "react";

const TABS = ["Resumo", "Acompanhamento", "Tratativas", "Agente Diesel"];

export default function DesempenhoDiesel() {
  const [active, setActive] = useState("Resumo");

  const content = useMemo(() => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-2">{active}</h2>
        <p className="text-gray-600">
          Tela em construção. Este módulo será concluído em breve.
        </p>
      </div>
    );
  }, [active]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Desempenho Diesel</h1>
        <span className="text-sm text-gray-500">Em construção</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-2 mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition",
              active === t ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
}
