import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  // Verifica se a rota atual é a página inicial ("/")
  const isDashboard = location.pathname === '/';

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex items-center justify-end">
      {/* Logo removido. "justify-between" alterado para "justify-end" */}

      {/* Itens de menu */}
      <div className="flex items-center gap-6 text-gray-700">
        
        {/* Mostra "Dashboard" e "Tratativas" apenas se NÃO estiver na página inicial */}
        {!isDashboard && (
          <>
            <Link to="/" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link to="/central" className="hover:text-blue-600 transition">
              Tratativas
            </Link>
          </>
        )}

        {/* Link "Sair" (usando Link em vez de <a>) */}
        <Link to="/login" className="hover:text-blue-600 transition">
          Sair
        </Link>
      </div>
    </nav>
  );
}
