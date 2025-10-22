import React, { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
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

    if (error) setMessage(error.message)
    else setMessage('📩 Verifique seu e-mail para o link de acesso.')

    setLoading(false)
  }

  return (
    <div className="login-container">
      <h2>INOVEQUATAI - Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="seuemail@grupocsc.com.br"
          value={email}
          onChange={(e) => setEmail(e
