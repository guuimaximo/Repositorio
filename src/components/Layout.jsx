// src/components/Layout.jsx

import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../AuthContext"; // 1. Importar o hook de autenticação

export default function Layout() {
  const { isLoggedIn, loading } = useAuth(); // 2. Obter status do login
  const location = useLocation();

  // 3. Mostrar "Carregando..." enquanto o AuthContext verifica a sessão
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        Carregando sessão...
      </div>
    );
  }

  // 4. Se não estiver logado, redireciona para /login
  if (!isLoggedIn) {
    // Guarda a página que o usuário tentou acessar, para redirecionar de volta após o login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 5. Se estiver logado, mostra a Sidebar e o conteúdo da página
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
