// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  isSessionValid,
  touchActivity,
} from "../utils/auth";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  // Sincroniza user se o storage mudar em outra aba
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "user") setUser(getStoredUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Idle timeout por inatividade (1h)
  useEffect(() => {
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "visibilitychange"];
    const onActivity = () => {
      if (document.visibilityState === "visible") {
        touchActivity();
        setUser(getStoredUser());
      }
    };
    activityEvents.forEach((ev) => window.addEventListener(ev, onActivity));

    const timer = setInterval(() => {
      if (!isSessionValid()) {
        logout();
      }
    }, 30 * 1000); // checa a cada 30s

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(timer);
    };
  }, []);

  const login = (userData) => {
    const norm = {
      id: userData.id,
      nome: userData.nome,
      login: userData.login,
      email: userData.email || null,
      nivel: userData.nivel, // "Administrador", "Gestor", "CCO", "Manutenção", "Tratativa"
      ativo: userData.ativo,
    };
    const stored = setStoredUser(norm);
    setUser(stored);
  };

  const logout = () => {
    clearStoredUser();
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
