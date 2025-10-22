import React from 'react'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white text-center">
      <Navbar />

      <div className="flex flex-col items-center justify-center h-screen -mt-20">
        <h1 className="text-3xl font-bold text-blue-700 mb-4">
          🚀 InoveQuatai carregou corretamente!
        </h1>

        <p className="text-gray-700 text-lg mb-6">
          Se você está vendo esta mensagem, o React está funcionando.
        </p>

        <a
          href="/solicitacao"
          className="bg-blue-700 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-800 transition"
        >
          Nova Solicitação de Tratativa
        </a>
      </div>
    </div>
  )
}
