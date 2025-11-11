// src/routes/RequireLevel.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireLevel({ levels = [], children }) {
  const { user } = useAuth();

  // Se não estiver logado, quem decide é o RequireAuth, então aqui só tratamos nível
  if (!user) return children;

  const isAdmin = user?.nivel === "Administrador";
  if (isAdmin) return children; // admin vê tudo

  const allowed = levels.includes(user?.nivel);
  if (!allowed) {
    // Sem permissão → volta pro dashboard (em vez de jogar pro login)
    return <Navigate to="/" replace />;
  }
  return children;
}
