// src/components/Layout.jsx

import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../AuthContext"; // Importar o hook de autenticação

export default function Layout() {
  const { isLoggedIn, loading } = useAuth(); // Obter status do login
  const location = useLocation();

  // Mostrar "Carregando..." enquanto o AuthContext verifica a sessão
  // (Este estado é gerenciado dentro do AuthProvider agora)
  // if (loading) { ... } // Não é mais necessário aqui

  // Se não estiver logado, redireciona para /login
  if (!isLoggedIn) {
    // Guarda a página que o usuário tentou acessar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver logado, mostra a Sidebar e o conteúdo
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
