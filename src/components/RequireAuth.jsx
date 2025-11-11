// src/components/RequireAuth.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isSessionValid } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || !isSessionValid()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
