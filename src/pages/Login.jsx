// src/pages/Login.jsx
// (Modificado para usar Email e Senha)

import { useState } from 'react'
import { supabase } from '../supabase'
import { Link, useNavigate, useLocation } from 'react-router-dom' // Adicionado useLocation

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') 
  const [loading, setLoading] = useState(false) 
  const [err, setErr] = useState('')
  const navigate = useNavigate() 
  const location = useLocation() // Para saber para onde redirecionar após login

  // Pega a página de origem (se houver) para redirecionar após o login
  const from = location.state?.from?.pathname || "/";

  async function handleLogin() {
    setLoading(true)
    setErr('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setErr('E-mail ou senha inválidos.') 
    } else {
      // Redireciona para a página de origem ou para a home
      navigate(from, { replace: true }); 
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-md p-6 mt-10">
      <h1 className="text-2xl font-bold mb-3">Acesso</h1>
      <p className="text-gray-600 mb-4">Informe seu e-mail e senha para acessar.</p>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">E-mail</label>
          <input
            type="email"
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seunome@grupocsc.com.br"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Senha</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}

        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full mt-3 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>

      <div className="mt-4 text-center">
        <Link to="/cadastro" className="text-sm text-blue-600 hover:underline">
          Não tem uma conta? Cadastre-se
        </Link>
      </div>
    </div>
  )
}
