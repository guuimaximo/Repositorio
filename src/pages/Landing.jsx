import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

const NIVEIS_PORTAL = new Set(["gestor", "administrador"]);

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      // ✅ login salvo (mesma lógica do Portal)
      const loginSalvo =
        localStorage.getItem("inove_login") ||
        sessionStorage.getItem("inove_login") ||
        localStorage.getItem("login") ||
        sessionStorage.getItem("login") ||
        "";

      if (!loginSalvo) {
        navigate("/login" + location.search, { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("usuarios_aprovadores")
        .select("nivel, ativo")
        .eq("login", loginSalvo)
        .eq("ativo", true)
        .maybeSingle();

      if (error || !data) {
        navigate("/login" + location.search, { replace: true });
        return;
      }

      const nivel = String(data.nivel || "").trim().toLowerCase();

      if (NIVEIS_PORTAL.has(nivel)) {
        navigate("/portal", { replace: true });
      } else {
        navigate("/inove", { replace: true });
      }
    })();
  }, [navigate, location.search]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 shadow-sm text-slate-600">
        Carregando...
      </div>
    </div>
  );
}
