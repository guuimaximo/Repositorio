import { useState } from "react";
import { supabase } from "../supabase";
import { FaUser, FaLock, FaEnvelope, FaSignInAlt, FaUserPlus } from "react-icons/fa";

export default function Login() {
  const [modo, setModo] = useState("login"); // 'login' ou 'cadastro'
  const [form, setForm] = useState({ login: "", senha: "", nome: "", email: "" });
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", form.login)
      .eq("senha", form.senha)
      .eq("ativo", true)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Usuário não encontrado ou não autorizado.");
      return;
    }

    // Armazena usuário logado localmente
    localStorage.setItem("usuarioLogado", JSON.stringify(data));
    window.location.href = "/";
  }

  async function handleCadastro() {
    if (!form.nome || !form.login || !form.senha || !form.email) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("usuarios_aprovadores").insert([
      {
        nome: form.nome,
        login: form.login,
        senha: form.senha,
        email: form.email,
        nivel: "Operador",
        ativo: false,
        status_cadastro: "Pendente",
        criado_por: "AutoCadastro",
      },
    ]);
    setLoading(false);

    if (error) {
      alert("Erro ao cadastrar: " + error.message);
      return;
    }

    // envia e-mail notificando Guilherme
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_default",
        template_id: "template_novo_usuario",
        user_id: "user_default",
        template_params: {
          to_email: "guilhermemaximocsc@gmail.com",
          user_nome: form.nome,
          user_login: form.login,
          user_email: form.email,
        },
      }),
    }).catch(() => {});

    alert("Cadastro enviado! Aguarde aprovação do administrador.");
    setForm({ login: "", senha: "", nome: "", email: "" });
    setModo("login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {modo === "login" ? "Acesso ao Sistema" : "Cadastro de Novo Usuário"}
        </h1>

        {modo === "cadastro" && (
          <input
            type="text"
            placeholder="Nome Completo"
            className="border rounded-md px-3 py-2 w-full mb-3"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center border rounded-md px-3 py-2">
            <FaUser className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Usuário"
              className="flex-1 outline-none"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
            />
          </div>

          <div className="flex items-center border rounded-md px-3 py-2">
            <FaLock className="text-gray-500 mr-2" />
            <input
              type="password"
              placeholder="Senha"
              className="flex-1 outline-none"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>

          {modo === "cadastro" && (
            <div className="flex items-center border rounded-md px-3 py-2">
              <FaEnvelope className="text-gray-500 mr-2" />
              <input
                type="email"
                placeholder="E-mail"
                className="flex-1 outline-none"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          )}
        </div>

        <button
          onClick={modo === "login" ? handleLogin : handleCadastro}
          disabled={loading}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold flex items-center justify-center gap-2"
        >
          {modo === "login" ? (
            <>
              <FaSignInAlt /> {loading ? "Entrando..." : "Entrar"}
            </>
          ) : (
            <>
              <FaUserPlus /> {loading ? "Enviando..." : "Cadastrar"}
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-600 mt-4">
          {modo === "login" ? (
            <>
              Não tem conta?{" "}
              <span
                className="text-blue-600 cursor-pointer hover:underline"
                onClick={() => setModo("cadastro")}
              >
                Cadastre-se
              </span>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <span
                className="text-blue-600 cursor-pointer hover:underline"
                onClick={() => setModo("login")}
              >
                Fazer Login
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
