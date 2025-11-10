import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { FaLock, FaUser } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", login)
      .eq("senha", senha)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Login ou senha incorretos!");
      return;
    }

    if (!data.ativo) {
      alert("Seu acesso ainda não foi aprovado. Aguarde o administrador liberar.");
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(data));
    navigate("/"); // Redireciona para o dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Acesso ao Sistema InovaQuatai
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-600 text-sm mb-1 block">Usuário</label>
            <div className="flex items-center border rounded-md px-3 py-2">
              <FaUser className="text-gray-400 mr-2" />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu login"
                className="w-full outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-600 text-sm mb-1 block">Senha</label>
            <div className="flex items-center border rounded-md px-3 py-2">
              <FaLock className="text-gray-400 mr-2" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium mt-2 transition-all"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Ainda não possui conta?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-600 font-medium cursor-pointer hover:underline"
          >
            Cadastre-se aqui
          </span>
        </p>
      </div>
    </div>
  );
}
