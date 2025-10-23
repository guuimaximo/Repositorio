import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function Cadastro() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });
    if (error) setErro(error.message);
    else {
      setMensagem('Conta criada! Verifique seu e-mail para confirmar.');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleCadastro}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-green-700">Cadastro</h2>
        {erro && <p className="text-red-600 text-sm mb-3">{erro}</p>}
        {mensagem && <p className="text-green-600 text-sm mb-3">{mensagem}</p>}
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Criar conta
        </button>
        <p className="text-sm text-center mt-3">
          Já tem conta? <Link to="/login" className="text-blue-600">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
