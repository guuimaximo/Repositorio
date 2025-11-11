// src/components/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, niveisPermitidos = [] }) {
  const { user } = useContext(AuthContext);

  // Se não estiver logado → volta pro login
  if (!user) return <Navigate to="/login" replace />;

  // Se o nível não tiver permissão → volta para o dashboard
  if (!niveisPermitidos.includes(user.nivel) && user.nivel !== "Administrador") {
    alert("Acesso não autorizado para seu nível de usuário.");
    return <Navigate to="/" replace />;
  }

  return children;
}
