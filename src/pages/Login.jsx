import React, { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha inválidos!");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
          Login
        </h2>

        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded mb-3 text-sm">
            {erro}
          </div>
        )}

        <label className="text-sm font-medium text-gray-700">E-mail</label>
        <input
          type="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />

        <label className="text-sm font-medium text-gray-700">Senha</label>
        <input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full p-2 mb-5 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
          Entrar
        </button>

        <p className="text-sm text-center mt-3">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-blue-600 hover:underline">
            Criar agora
          </Link>
        </p>
      </form>
    </div>
  );
}
