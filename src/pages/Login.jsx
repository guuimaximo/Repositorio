import { useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", usuario)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();
    setLoading(false);

    if (error || !data) {
      alert("Usuário ou senha incorretos.");
      return;
    }

    login(data); // ✅ Salva no contexto e redireciona
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Acesso ao Sistema
        </h1>

        <input
          type="text"
          placeholder="Usuário"
          className="w-full mb-3 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-6 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Novo usuário? Solicite acesso enviando um e-mail para{" "}
          <a
            href="mailto:guilhermemaximocsc@gmail.com"
            className="text-blue-600 underline"
          >
            guilhermemaximocsc@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
