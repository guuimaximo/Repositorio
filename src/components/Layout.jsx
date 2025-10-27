// src/components/Layout.jsx

import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
// import { useAuth } from "../AuthContext"; // Importação não necessária no momento

export default function Layout() {
  // const { isLoggedIn, loading } = useAuth(); // Verificação não necessária no momento
  const location = useLocation();

  // Redirecionamento removido
  // if (!isLoggedIn) {
  //   return <Navigate to="/login" state={{ from: location }} replace />;
  // }

  // Sempre mostra a Sidebar e o conteúdo
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
