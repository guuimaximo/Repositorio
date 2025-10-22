import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SolicitacaoTratativa from './pages/SolicitacaoTratativa'
import CentralResolucao from './pages/CentralResolucao'
import Tratativas from './pages/Tratativas'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/solicitacao" element={<SolicitacaoTratativa />} />
      <Route path="/central" element={<CentralResolucao />} />
      <Route path="/tratativas" element={<Tratativas />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
