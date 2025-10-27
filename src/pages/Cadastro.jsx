// src/pages/Cadastro.jsx

import { useState } from 'react'
import { supabase } from '../supabase'
import { Link, useNavigate } from 'react-router-dom'

export default function Cadastro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  async function handleCadastro() {
    setLoading(true)
    setErr('')
    
    // Verifica se a senha tem pelo menos 6 caracteres (requisito Supabase)
    if (password.length < 6) {
      setErr('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // Você pode adicionar opções aqui se precisar
      // options: {
      //   emailRedirectTo: 'https://example.com/welcome',
      // }
    })

    if (error) {
      setErr(error.message)
    } else {
      // O Gatilho SQL cuidará de criar o 'profile' com role 'Analista'
      alert('Cadastro realizado! Um e-mail de confirmação foi enviado (se habilitado). Redirecionando para o Login.')
      navigate('/login')
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-md p-6 mt-10">
      <h1 className="text-2xl font-bold mb-3">Cadastro de Novo Usuário</h1>
      <p className="text-gray-600 mb-4">
        Crie sua conta. Você será registrado com o perfil padrão 'Analista'.
      </p>

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
          <label className="block text-sm text-gray-600 mb-1">Senha (mínimo 6 caracteres)</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button 
          onClick={handleCadastro} 
          disabled={loading}
          className="w-full mt-3 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Cadastrando...' : 'Criar Conta'}
        </button>
      </div>
      
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Já tem uma conta? Fazer Login
        </Link>
      </div>
    </div>
  )
}
