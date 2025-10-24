import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Sempre renderiza o Sidebar, pois este Layout só é usado em rotas protegidas */}
      <Sidebar /> 
      
      <div className="flex-1 flex flex-col">
        
        {/* Sempre renderiza a Navbar */}
        <Navbar />

        <main className="flex-1 p-4">
          <Outlet /> {/* Onde as páginas (Dashboard, Avarias, etc.) aparecem */}
        </main>
      </div>
    </div>
  );
}
