// src/pages/InicioBasico.jsx
import React, { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ExternalLink, ShieldAlert } from "lucide-react";

const FAROL_URL = "https://faroldemetas.onrender.com/?from=inove";

// Rotas recomendadas por nível (ajuste se quiser)
function getHomeByNivel(nivel) {
  const n = String(nivel || "").toLowerCase();
  if (n === "cco") return "/sos-dashboard";
  if (n === "manutenção" || n === "manutencao") return "/pcm-inicio";
  if (n === "tratativa") return "/central";
  return "/inove"; // fallback
}

export default function InicioBasico() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const firstName = useMemo(() => {
    const nome = user?.nome || "";
    return nome ? nome.split(" ")[0] : "";
  }, [user?.nome]);

  const nivel = user?.nivel || "";

  const abrirFarol = () => {
    // Aqui fica bloqueado (visível só como info).
    // Se quiser esconder total, é só remover o bloco do card.
    window.location.href = FAROL_URL;
  };

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Bem-vindo{firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Seu nível de acesso: <span className="font-semibold">{nivel || "—"}</span>
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <ShieldAlert className="w-4 h-4" />
              Acesso conforme perfil cadastrado
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Acesso principal (rota sugerida) */}
            <button
              onClick={() => navigate(getHomeByNivel(nivel), { replace: true })}
              className="group text-left bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-extrabold text-slate-900">Entrar no seu módulo</div>
                <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Acesso rápido para a área disponível no seu perfil.
              </p>
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">
                Continuar
              </div>
            </button>

            {/* Farol (restrito) */}
            <div className="text-left bg-white border border-slate-200 rounded-2xl p-5 opacity-80">
              <div className="flex items-center justify-between">
                <div className="text-base font-extrabold text-slate-900">Farol Tático</div>
                <ExternalLink className="w-5 h-5 text-slate-300" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Disponível apenas para <span className="font-semibold">Gestor/Administrador</span>.
              </p>

              {/* Se quiser nem permitir clique, mantenha como está (sem onClick).
                  Se quiser permitir e deixar o Farol bloquear, troque para um botão e chame abrirFarol(). */}
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Acesso restrito
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Dica: use o menu lateral para navegar pelos módulos liberados para o seu nível.
          </div>
        </div>
      </div>
    </div>
  );
}
