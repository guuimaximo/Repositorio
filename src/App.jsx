import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'

function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>🚀 InoveQuatai carregou!</h1>
      <Link to="/teste">Ir para teste</Link>
    </div>
  )
}

function Teste() {
  return (
    <div style={{ padding: 40 }}>
      <h2>✅ Página de teste aberta com sucesso!</h2>
      <Link to="/">Voltar</Link>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teste" element={<Teste />} />
      </Routes>
    </Router>
  )
}
