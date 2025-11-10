// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import logoInova from "../assets/logoInovaQuatai.png";
import { useAuth } from "../context/AuthContext"; // ✅ usa o contexto de autenticação

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ função de login do contexto

  const [isCadastro, setIsCadastro] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 LOGIN
  async function handleEntrar(e) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", loginInput)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Login ou senha incorretos ou conta inativa.");
      return;
    }

    // ✅ salva no AuthContext e no localStorage
    login(data);
    navigate("/");
  }

  // 🆕 CADASTRO
  async function handleCadastro(e) {
    e.preventDefault();
    if (!nome || !loginInput || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("usuarios_aprovadores").insert([
      {
        nome,
        login: loginInput,
        senha,
        ativo: false,
        nivel: "Pendente",
      },
    ]);

    setLoading(false);
    if (error) {
      alert("Erro ao cadastrar: " + error.message);
    } else {
      alert("Cadastro enviado! Aguarde aprovação do administrador.");
      setIsCadastro(false);
      setNome("");
      setLoginInput("");
      setSenha("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-center">
        <img
          src={logoInova}
          alt="Logo InovaQuatai"
          className="mx-auto mb-4 w-32 h-auto"
        />
        <h1 className="text-2xl font-bold text-gray-700 mb-6">
          {isCadastro ? "Cadastro de Usuário" : "Acesso ao Sistema"}
        </h1>

        <form
          onSubmit={isCadastro ? handleCadastro : handleEntrar}
          className="space-y-4 text-left"
        >
          {isCadastro && (
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Login
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            {loading
              ? "Processando..."
              : isCadastro
              ? "Cadastrar"
              : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          {isCadastro ? (
            <button
              onClick={() => setIsCadastro(false)}
              className="text-blue-600 hover:underline"
            >
              Já possui conta? Faça login
            </button>
          ) : (
            <button
              onClick={() => setIsCadastro(true)}
              className="text-blue-600 hover:underline"
            >
              Não possui conta? Cadastre-se
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} InovaQuatai — Todos os direitos
          reservados.
        </p>
      </div>
    </div>
  );
}
