// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

export const AuthContext = createContext(); // ✅ Exporta o contexto diretamente

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // Sessão expira após 1 hora de inatividade
  useEffect(() => {
    let timeout;
    function resetTimer() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setUser(null);
        localStorage.removeItem("user");
      }, 60 * 60 * 1000); // 1 hora
    }

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
