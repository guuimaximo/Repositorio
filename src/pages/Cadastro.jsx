import React, { useState } from "react";
import { supabase } from "../supabase";
import { Link, useNavigate } from "react-router-dom";

export default function Cadastro() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleCadastro = async (e) => {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    const redirectUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://inovequatai.onrender.com";

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) {
      setErro(error.message);
    } else {
      setMensagem("✅ Conta criada! Verifique seu e-mail.");
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleCadastro}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
          Criar Conta
        </h2>

        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded mb-3 text-sm">
            {erro}
          </div>
        )}
        {mensagem && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded mb-3 text-sm">
            {mensagem}
          </div>
        )}

        <input
          type="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Confirme sua senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          className="w-full p-2 mb-5 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
          Cadastrar
        </button>

        <p className="text-sm text-center mt-3">
          Já possui conta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Faça login
          </Link>
        </p>
      </form>
    </div>
  );
}
