import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) setErr(error.message)
    else window.location.href = '/'
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={handleLogin} className="bg-white rounded-2xl border p-6 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-sky-600 mb-4">INOVEQUATAI</h1>
        <label className="text-sm">E-mail</label>
        <input className="w-full border rounded-md px-3 py-2 mb-3" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/>
        <label className="text-sm">Senha</label>
        <input className="w-full border rounded-md px-3 py-2 mb-3" type="password" value={senha} onChange={(e)=>setSenha(e.target.value)} required/>
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <button disabled={loading} className="w-full bg-sky-600 text-white rounded-md py-2">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
