import React from 'react'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex flex-col items-center justify-center text-center pt-28 px-6">
        <img
          src="https://i.ibb.co/BCKR0M2/bus-terminal.png" // imagem ilustrativa (neutra e leve)
          alt="Frota Quatai"
          className="w-72 mb-8 drop-shadow-lg"
        />

        <h1 className="text-3xl font-bold text-quataiBlue mb-2">
          Bem-vindo ao Sistema de Tratativas
        </h1>

        <p className="text-gray-600 max-w-md mb-6">
          Aqui você pode registrar solicitações de tratativas, acompanhar o
          andamento e acessar a central de resolução de ocorrências entre
          Manutenção e Operação.
        </p>

        <a
          href="/solicitacao"
          className="bg-quataiBlue text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          Nova Solicitação
        </a>
      </div>
    </div>
  )
}
