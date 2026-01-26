// src/pages/Login.jsx
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import logoInova from "../assets/logoInovaQuatai.png";
import { useAuth } from "../context/AuthContext";

const ALLOWED_REDIRECT_ORIGINS = new Set([
  "https://faroldemetas.onrender.com",
]);

function appendFromInove(urlStr) {
  const u = new URL(urlStr);
  if (!u.searchParams.get("from")) u.searchParams.set("from", "inove");
  return u.toString();
}

function isAllowedRedirect(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWED_REDIRECT_ORIGINS.has(u.origin);
  } catch {
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: doLogin } = useAuth();

  const [isCadastro, setIsCadastro] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ✅ redirect via query (?redirect=...)
  const redirectParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect");
  }, [location.search]);

  // ✅ fallback interno padrão
  const fallbackNext = location.state?.from?.pathname || "/";

  async function handleEntrar(e) {
    e.preventDefault();
    const loginTrim = loginInput.trim();
    const senhaTrim = senha.trim();
    if (!loginTrim || !senhaTrim) {
      alert("Informe login e senha.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .eq("login", loginTrim)
      .eq("senha", senhaTrim)
      .eq("ativo", true)
      .single();
    setLoading(false);

    if (error || !data) {
      alert("Login ou senha incorretos, ou conta inativa.");
      return;
    }

    if (data.nivel === "Pendente") {
      alert("Seu cadastro ainda está pendente de aprovação pelo administrador.");
      return;
    }

    doLogin(data);

    const nivel = String(data.nivel || "").trim().toLowerCase();
    const isGestorOuAdm = nivel === "gestor" || nivel === "administrador";

    // ✅ Se veio redirect do Farol: só devolve se Gestor/Adm
    if (redirectParam && isGestorOuAdm && isAllowedRedirect(redirectParam)) {
      const target = appendFromInove(redirectParam);
      window.location.replace(target);
      return;
    }

    // ✅ Se Gestor/Adm sem redirect -> vai para o Portal
    if (isGestorOuAdm) {
      navigate("/portal", { replace: true });
      return;
    }

    // ✅ Usuário comum -> INOVE normal
    navigate("/inove", { replace: true });
  }

  async function handleCadastro(e) {
    e.preventDefault();
    const nomeTrim = nome.trim();
    const loginTrim = loginInput.trim();
    const senhaTrim = senha.trim();

    if (!nomeTrim || !loginTrim || !senhaTrim) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("usuarios_aprovadores").insert([
      {
        nome: nomeTrim,
        login: loginTrim,
        senha: senhaTrim,
        email: null,
        ativo: false,
        nivel: "Pendente",
      },
    ]);
    setLoading(false);

    if (error) {
      alert("Erro ao cadastrar: " + error.message);
      return;
    }

    alert("Cadastro enviado! Aguarde aprovação do administrador.");
    setIsCadastro(false);
    setNome("");
    setLoginInput("");
    setSenha("");
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
                autoComplete="name"
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
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Senha
            </label>
            <div className="flex gap-2">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="px-3 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            {loading ? "Processando..." : isCadastro ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          {isCadastro ? (
            <button
              onClick={() => setIsCadastro(false)}
              className="text-blue-600 hover:underline"
              type="button"
            >
              Já possui conta? Faça login
            </button>
          ) : (
            <button
              onClick={() => setIsCadastro(true)}
              className="text-blue-600 hover:underline"
              type="button"
            >
              Não possui conta? Cadastre-se
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} InovaQuatai — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
