import React from 'react'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex flex-col items-center justify-center text-center pt-28 px-6">
        <img
          src="https://i.ibb.co/sHkTcf6/frota-itaqua.png" // ✅ use este link da imagem ou substitua pelo seu
          alt="Frota Quatai Itaqua"
          className="w-full max-w-4xl mb-8 rounded-2xl shadow-lg"
        />

        <h1 className="text-4xl font-bold text-quataiBlue mb-3">
          Sistema de Tratativas – InoveQuatai
        </h1>

        <p className="text-gray-600 max-w-2xl mb-6">
          Bem-vindo ao painel de tratativas entre os setores de Operação e
          Manutenção.  
          Aqui você pode registrar solicitações, acompanhar o andamento e
          resolver ocorrências que impactam a frota em tempo real.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/solicitacao"
            className="bg-quataiBlue text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition"
          >
            📝 Nova Solicitação
          </a>
          <a
            href="/central"
            className="bg-white border border-quataiBlue text-quataiBlue px-6 py-3 rounded-lg shadow-md hover:bg-blue-50 transition"
          >
            ⚙️ Central de Tratativas
          </a>
          <a
            href="/tratativas"
            className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg shadow-md hover:bg-gray-200 transition"
          >
            📋 Todas as Tratativas
          </a>
        </div>
      </div>
    </div>
  )
}
