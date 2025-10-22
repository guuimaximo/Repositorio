import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) =>
    location.pathname === path
      ? 'text-quataiBlue font-semibold border-b-2 border-quataiBlue'
      : 'text-gray-600 hover:text-quataiBlue'

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <Link
          to="/"
          className="text-xl font-bold text-quataiBlue tracking-wide hover:opacity-80"
        >
          🚌 InoveQuatai
        </Link>

        <div className="flex space-x-6 text-sm">
          <Link to="/" className={isActive('/')}>
            Início
          </Link>
          <Link to="/solicitacao" className={isActive('/solicitacao')}>
            Solicitar Tratativa
          </Link>
          <Link to="/central" className={isActive('/central')}>
            Central de Tratativas
          </Link>
        </div>
      </div>
    </nav>
  )
}
