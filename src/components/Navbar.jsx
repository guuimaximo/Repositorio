import React from 'react'
import logoInova from '../assets/logoInovaQuatai.png'

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md px-6 py-3 flex items-center justify-between">
      {/* Logo e nome */}
      <div className="flex items-center gap-3">
        <img 
          src={logoInova} 
          alt="Logo InovaQuatai" 
          className="h-10 w-auto object-contain" 
        />
        <span className="font-semibold text-xl text-gray-800">
          InovaQuatai
        </span>
      </div>

      {/* Itens de menu (exemplo, pode mudar depois) */}
      <div className="flex items-center gap-6 text-gray-700">
        <a href="/dashboard" className="hover:text-blue-600 transition">Dashboard</a>
        <a href="/centraltratativas" className="hover:text-blue-600 transition">Tratativas</a>
        <a href="/login" className="hover:text-blue-600 transition">Sair</a>
      </div>
    </nav>
  )
}
