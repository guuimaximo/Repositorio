import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import logoInova from "../assets/logoInovaQuatai.png";
import { FaLock, FaUser, FaUserPlus } from "react-icons/fa";

export default function Login() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- LOGIN EXISTENTE ---
  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", login)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Usuário ou senha incorretos, ou acesso ainda não liberado.");
      return;
    }

    // Salva sessão local e redireciona
    localStorage.setItem("usuarioLogado", JSON.stringify(data));
    navigate("/");
  }

  // --- SOLICITA CADASTRO ---
  async function handleCadastro() {
    if (!nome || !login || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("usuarios_aprovadores").insert([
      {
        nome,
        login,
        senha,
        ativo: false,
        nivel: "Pendente",
        criado_em: new Date().toISOString(),
      },
    ]);

    setLoading(false);

    if (error) {
      alert("Erro ao solicitar cadastro: " + error.message);
      return;
    }

    alert("Cadastro enviado para aprovação. Aguarde liberação de acesso.");
    setModoCadastro(false);
    setNome("");
    setLogin("");
    setSenha("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-800 to-blue-600 text-gray-800">
      <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md text-center">
        <img
          src={logoInova}
          alt="InovaQuatai"
          className="mx-auto mb-6 w-40 h-auto"
        />

        {!modoCadastro ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-gray-700">
              Acesso ao Sistema
            </h1>
            <div className="flex flex-col gap-3 text-left">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <FaUser /> Login
              </label>
              <input
                type="text"
                className="border rounded-md p-2 w-full"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Seu login"
              />

              <label className="text-sm text-gray-600 flex items-center gap-2">
                <FaLock /> Senha
              </label>
              <input
                type="password"
                className="border rounded-md p-2 w-full"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold transition"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Ainda não tem acesso?{" "}
              <button
                onClick={() => setModoCadastro(true)}
                className="text-blue-600 font-medium hover:underline"
              >
                Solicitar cadastro
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4 text-gray-700">
              Solicitar Cadastro
            </h1>

            <div className="flex flex-col gap-3 text-left">
              <label className="text-sm text-gray-600">Nome Completo</label>
              <input
                type="text"
                className="border rounded-md p-2 w-full"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
              />

              <label className="text-sm text-gray-600">Login</label>
              <input
                type="text"
                className="border rounded-md p-2 w-full"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: joaosilva"
              />

              <label className="text-sm text-gray-600">Senha</label>
              <input
                type="password"
                className="border rounded-md p-2 w-full"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Crie uma senha segura"
              />
            </div>

            <button
              onClick={handleCadastro}
              disabled={loading}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold transition"
            >
              {loading ? "Enviando..." : "Enviar Solicitação"}
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Já possui login?{" "}
              <button
                onClick={() => setModoCadastro(false)}
                className="text-blue-600 font-medium hover:underline"
              >
                Voltar para login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
