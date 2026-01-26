import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase"; // ajuste se seu client for ../supabaseClient

const NIVEIS_PORTAL = new Set(["Gestor", "Administrador"]);

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Pegue quem está logado (no seu padrão atual)
      // Se você usa Supabase Auth:
      const { data: auth } = await supabase.auth.getUser();
      const authUserId = auth?.user?.id || null;

      // Se você NÃO usa auth.uid(), e sim login próprio,
      // você deve trocar para o identificador que você já salva no login:
      // ex: const userId = localStorage.getItem("usuario_id");

      if (!authUserId) {
        // sem login -> mande para sua tela de login
        navigate("/login", { replace: true });
        return;
      }

      // 2) Buscar o nível na sua tabela usuarios_aprovadores
      const { data: userRow, error } = await supabase
        .from("usuarios_aprovadores")
        .select("id, nivel, ativo, status_cadastro")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      // fallback (caso ainda não esteja migrado para auth_user_id)
      // -> você pode remover se não fizer sentido no seu INOVE:
      // if (!userRow) buscar por email/login.

      if (error || !userRow) {
        // não achou cadastro -> manda para INOVE padrão (ou onboarding)
        navigate("/inove", { replace: true });
        return;
      }

      // 3) Regra de permissão
      const nivel = String(userRow.nivel || "").trim();
      const podePortal = NIVEIS_PORTAL.has(nivel);

      navigate(podePortal ? "/portal" : "/inove", { replace: true });
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 shadow-sm text-slate-600">
        Carregando...
      </div>
    </div>
  );
}
