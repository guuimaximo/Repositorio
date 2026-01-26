import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, LayoutGrid } from "lucide-react";

function Card({ title, desc, tone = "blue", onClick, href, buttonText = "Acessar" }) {
  const toneCls = {
    blue: "border-blue-200 bg-blue-50/40 hover:bg-blue-50",
    indigo: "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50",
  }[tone];

  return (
    <div className={`rounded-2xl border ${toneCls} p-6 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{desc}</p>
        </div>
        <div className="text-slate-400">
          <LayoutGrid size={20} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onClick}
          className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98] bg-slate-900 text-white hover:bg-slate-950"
        >
          {buttonText} <ArrowRight size={16} />
        </button>

        {href ? (
          <a
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            Abrir em nova aba <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function PortalSistemas() {
  const navigate = useNavigate();

  // Ajuste para a URL real do Farol Tático (deploy)
  const FAROL_URL = "https://SEU-FAROL-TATICO.onrender.com";

  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Portal de Sistemas</h1>
          <p className="text-sm text-slate-600 mt-1">
            Selecione o sistema que deseja acessar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="INOVE"
            desc="Avarias, Cobranças, Tratativas, SOS, PCM e módulos operacionais."
            tone="blue"
            buttonText="Entrar no INOVE"
            onClick={() => navigate("/inove")}
          />

          <Card
            title="Farol Tático"
            desc="Agenda Tática, Banco de Atas, Projetos e Central de Ações."
            tone="indigo"
            buttonText="Abrir Farol Tático"
            onClick={() => window.open(FAROL_URL, "_blank", "noopener,noreferrer")}
            href={FAROL_URL}
          />
        </div>
      </div>
    </div>
  );
}
