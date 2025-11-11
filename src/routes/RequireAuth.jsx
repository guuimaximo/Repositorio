// src/routes/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // leva ao login, mas guarda de onde veio
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
