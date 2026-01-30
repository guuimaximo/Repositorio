// src/pages/Login.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import logoInova from "../assets/logoInovaQuatai.png"; 
import { useAuth } from "../context/AuthContext";
import { 
  User, Lock, LogIn, UserPlus, Eye, EyeOff, 
  Briefcase, Mail, Check, X, Loader2, ChevronDown 
} from "lucide-react";

const NIVEIS_PORTAL = new Set(["Gestor", "Administrador"]);
const SETORES = [
  "Manutenção", "Recursos humanos", "Departamento Pessoal", 
  "SESMT", "Operação", "Ouvidoria"
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appendFromInove(url) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get("from")) u.searchParams.set("from", "inove");
    return u.toString();
  } catch {
    if (String(url || "").includes("?")) return `${url}&from=inove`;
    return `${url}?from=inove`;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: doLogin } = useAuth();

  const [isCadastro, setIsCadastro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados do Formulário
  const [loginInput, setLoginInput] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState("");

  // Estado de Força da Senha
  const [passwordMetrics, setPasswordMetrics] = useState({
    score: 0, hasUpper: false, hasNumber: false, hasSpecial: false, minChar: false
  });

  const redirectParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get("redirect");
    return raw ? decodeURIComponent(raw) : null;
  }, [location.search]);

  const nextPathState = location.state?.from?.pathname || null;

  function decideDefaultNext(nivel) {
    if (NIVEIS_PORTAL.has(nivel)) return "/portal";
    return "/inove";
  }

  useEffect(() => {
    if (!isCadastro) return;
    const s = senha;
    const metrics = {
      hasUpper: /[A-Z]/.test(s),
      hasNumber: /[0-9]/.test(s),
      hasSpecial: /[!@#$%^&*]/.test(s),
      minChar: s.length >= 8
    };
    const score = Object.values(metrics).filter(Boolean).length;
    setPasswordMetrics({ ...metrics, score });
  }, [senha, isCadastro]);

  async function handleEntrar(e) {
    e.preventDefault();
    const inputTrim = loginInput.trim();
    const senhaTrim = senha.trim();

    if (!inputTrim || !senhaTrim) {
      alert("Informe seu usuário/e-mail e senha.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios_aprovadores")
      .select("*")
      .or(`login.eq.${inputTrim},email.eq.${inputTrim}`)
      .eq("senha", senhaTrim)
      .eq("ativo", true)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert("Erro ao tentar fazer login. Tente novamente.");
      return;
    }

    if (!data) {
      alert("Credenciais incorretas ou conta inativa.");
      return;
    }

    const nivel = String(data.nivel || "").trim();

    if (nivel === "Pendente") {
      alert("Seu cadastro ainda está em análise pelo administrador.");
      return;
    }

    doLogin(data);

    try {
      localStorage.setItem("inove_login", data.login);
      localStorage.setItem("inove_nivel", nivel);
      localStorage.setItem("inove_nome", data.nome || "");
    } catch {}

    const isGestorAdm = NIVEIS_PORTAL.has(nivel);

    if (redirectParam && isGestorAdm) {
      window.location.href = appendFromInove(redirectParam);
      return;
    }

    navigate(nextPathState || decideDefaultNext(nivel), { replace: true });
  }

  async function handleCadastro(e) {
    e.preventDefault();
    const nomeTrim = nome.trim();
    const loginTrim = loginInput.trim();
    const senhaTrim = senha.trim();
    const emailTrim = email.trim();
    
    if (!nomeTrim || !loginTrim || !senhaTrim || !setor || !emailTrim) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!EMAIL_REGEX.test(emailTrim)) {
      alert("Insira um e-mail válido.");
      return;
    }

    if (passwordMetrics.score < 3) {
      alert("Senha muito fraca. Reforce com letras maiúsculas, números e símbolos.");
      return;
    }

    setLoading(true);

    const { data: existingUser, error: checkError } = await supabase
      .from("usuarios_aprovadores")
      .select("id")
      .or(`login.eq.${loginTrim},email.eq.${emailTrim}`)
      .maybeSingle();

    if (checkError) {
      setLoading(false);
      alert("Erro ao verificar dados.");
      return;
    }

    if (existingUser) {
      setLoading(false);
      alert("Este Usuário ou E-mail já estão cadastrados.");
      return;
    }
    
    const { error } = await supabase.from("usuarios_aprovadores").insert([
      {
        nome: nomeTrim,
        login: loginTrim,
        senha: senhaTrim,
        email: emailTrim,
        setor: setor,
        ativo: false,
        nivel: "Pendente",
        criado_em: new Date().toISOString()
      },
    ]);
    
    setLoading(false);

    if (error) {
      if (error.message.includes('column "setor"')) {
        alert("Erro técnico: Coluna 'setor' ausente no banco.");
      } else {
        alert("Erro ao cadastrar: " + error.message);
      }
      return;
    }

    alert("Cadastro solicitado! Aguarde a aprovação.");
    setIsCadastro(false);
    resetForm();
  }

  function resetForm() {
    setNome("");
    setLoginInput("");
    setSenha("");
    setEmail("");
    setSetor("");
    setPasswordMetrics({ score: 0 });
  }

  const PasswordCheck = ({ label, met }) => (
    <div className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600 font-medium" : "text-slate-400"}`}>
      {met ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* --- LADO ESQUERDO: Branding (Desktop) --- */}
      <div className="hidden lg:flex lg:w-5/12 bg-blue-900 relative overflow-hidden flex-col items-center justify-center text-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-950 opacity-90 z-0" />
        <div className="relative z-10 flex flex-col items-center">
          
          {/* ✅ LOGO DESKTOP: Removido filtros para garantir visibilidade */}
          <img
            src={logoInova}
            alt="Logo Portal Inove"
            className="w-48 mb-8 drop-shadow-xl" 
          />
          
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">PORTAL INOVE</h2>
          <p className="text-blue-100 max-w-sm text-lg leading-relaxed">
            “O papel da liderança no Grupo CSC é motivar e capacitar pessoas, entendendo a individualidade de cada um, com disciplina e comprometimento, gerando resiliência e coragem para influenciar, quebrar barreiras, melhorar processos e entregar resultados com foco na segurança, na satisfação do cliente e na otimização de custos”
          </p>
        </div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* --- LADO DIREITO: Formulário --- */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          
          {/* ✅ LOGO MOBILE: Restaurada exatamente como no código antigo */}
          <div className="lg:hidden text-center">
            <img 
              src={logoInova} 
              alt="Logo InovaQuatai" 
              className="mx-auto mb-4 w-32 h-auto" 
            />
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isCadastro ? "Criar nova conta" : "Acesse sua conta"}
            </h1>
            <p className="mt-2 text-slate-500">
              {isCadastro 
                ? "Preencha todos os dados abaixo para solicitar acesso." 
                : "Entre com suas credenciais para continuar."}
            </p>
          </div>

          <form onSubmit={isCadastro ? handleCadastro : handleEntrar} className="space-y-5">
            
            {isCadastro && (
              <>
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Nome Completo *"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                      type="email"
                      placeholder="Email Corporativo *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <select
                      value={setor}
                      onChange={(e) => setSetor(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all appearance-none ${!setor ? 'text-slate-400' : 'text-slate-900'}`}
                    >
                      <option value="" disabled>Selecione seu Setor *</option>
                      {SETORES.map((s) => (
                        <option key={s} value={s} className="text-slate-900">{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <LogIn className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder={isCadastro ? "Usuário (Login) *" : "Usuário ou E-mail *"}
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                  autoComplete="username"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Senha *"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-blue-600 transition p-1"
                >
                  {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {isCadastro && senha.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-1 h-1.5 mb-2">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all duration-500 ${
                          passwordMetrics.score >= step
                            ? passwordMetrics.score < 3 ? "bg-orange-400" : "bg-green-500"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PasswordCheck label="8+ Caracteres" met={passwordMetrics.minChar} />
                    <PasswordCheck label="Maiúscula" met={passwordMetrics.hasUpper} />
                    <PasswordCheck label="Número" met={passwordMetrics.hasNumber} />
                    <PasswordCheck label="Símbolo (!@#)" met={passwordMetrics.hasSpecial} />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : isCadastro ? (
                <> <UserPlus size={22} /> Solicitar Cadastro </>
              ) : (
                <> <LogIn size={22} /> Entrar no Sistema </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-600">
              {isCadastro ? "Já possui cadastro?" : "Não tem uma conta?"}{" "}
              <button
                onClick={() => {
                  setIsCadastro(!isCadastro);
                  resetForm();
                }}
                className="text-blue-600 font-bold hover:text-blue-800 hover:underline transition-colors"
              >
                {isCadastro ? "Fazer Login" : "Cadastre-se aqui"}
              </button>
            </p>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} PORTAL INOVE — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
