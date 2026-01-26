// src/pages/Login.jsx
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import logoInova from "../assets/logoInovaQuatai.png";
import { useAuth } from "../context/AuthContext";

const NIVEIS_PORTAL = new Set(["Gestor", "Administrador"]);

function appendFromInove(url) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get("from")) u.searchParams.set("from", "inove");
    return u.toString();
  } catch {
    // fallback simples (se vier algo não-URL)
    if (String(url || "").includes("?")) return `${url}&from=inove`;
    return `${url}?from=inove`;
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

  // ✅ redirect vem por querystring: /login?redirect=https%3A%2F%2Ffaroldemetas.onrender.com%2F
  const redirectParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get("redirect");
    return raw ? decodeURIComponent(raw) : null;
  }, [location.search]);

  // fallback antigo (quando RequireAuth manda state.from)
  const nextPathState = location.state?.from?.pathname || null;

  // Decide destino padrão (sem redirect)
  function decideDefaultNext(nivel) {
    if (NIVEIS_PORTAL.has(nivel)) return "/portal";
    return "/inove";
  }

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

    const nivel = String(data.nivel || "").trim();

    if (nivel === "Pendente") {
      alert("Seu cadastro ainda está pendente de aprovação pelo administrador.");
      return;
    }

    // ✅ Persiste sessão via AuthContext
    doLogin(data);

    // ✅ ESSENCIAL: PortalSistemas depende disso hoje
    try {
      localStorage.setItem("inove_login", data.login || loginTrim);
      localStorage.setItem("inove_nivel", nivel);
      localStorage.setItem("inove_nome", data.nome || "");
    } catch {
      // ignore
    }

    const isGestorAdm = NIVEIS_PORTAL.has(nivel);

    // ✅ 1) Se veio redirect e é Gestor/Adm -> volta pro Farol com from=inove
    if (redirectParam && isGestorAdm) {
      window.location.href = appendFromInove(redirectParam);
      return;
    }

    // ✅ 2) Se não é Gestor/Adm e veio redirect -> IGNORA (bloqueio pelo nível)
    // cai no fluxo normal do INOVE
    const defaultNext = decideDefaultNext(nivel);

    // ✅ 3) Se veio do RequireAuth (state.from), respeita (ex.: voltou pra página interna)
    const next = nextPathState || defaultNext;

    navigate(next, { replace: true });
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
