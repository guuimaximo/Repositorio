import React, { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!email.endsWith('@grupocsc.com.br')) {
      setMessage('⚠️ Use apenas e-mails @grupocsc.com.br')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setMessage(`❌ Erro: ${error.message}`)
    } else {
      setMessage('📩 Verifique seu e-mail corporativo para o link de acesso.')
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-4 text-blue-600">
          INOVEQUATAI
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Faça login com seu e-mail corporativo
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="seuemail@grupocsc.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded-md mb-4"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            {loading ? 'Enviando...' : 'Entrar'}
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-gray-700 mt-4">{message}</p>
        )}
      </div>
    </div>
  )
}
