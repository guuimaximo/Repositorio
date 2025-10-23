import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  async function enviar() {
    setErr('')
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/', // voltar pro app
      },
    })
    if (error) setErr(error.message)
    else setOk(true)
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-3">Acesso</h1>
      <p className="text-gray-600 mb-4">Informe seu e-mail corporativo para receber o link de acesso.</p>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <label className="block text-sm text-gray-600 mb-1">E-mail</label>
        <input
          className="w-full rounded-md border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seunome@grupocsc.com.br"
        />
        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
        {ok ? (
          <div className="text-green-700 mt-3">Verifique sua caixa de entrada.</div>
        ) : (
          <button onClick={enviar} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Enviar link
          </button>
        )}
      </div>
    </div>
  )
}
