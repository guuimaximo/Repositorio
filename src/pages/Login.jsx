// src/pages/Login.jsx (PROJETO INOVE)
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

  // --- FUNÇÃO DE ENVIO PARA O FAROL ---
  const enviarParaFarol = (dadosUsuario, urlDestino) => {
    // 🔥 CORREÇÃO: Garante que NUNCA vá sem nome
    const nomeFinal = dadosUsuario.nome || dadosUsuario.login || "Colaborador";
    console.log("Enviando usuário para Farol:", nomeFinal);

    const pacote = {
      id: dadosUsuario.id,
      nome: nomeFinal, 
      email: dadosUsuario.email,
      nivel: dadosUsuario.nivel,
      login: dadosUsuario.login
    };
    
    const dadosString = encodeURIComponent(JSON.stringify(pacote));
    const urlBase = appendFromInove(urlDestino);
    const separator = urlBase.includes("?") ? "&" : "?";
    
    // Redireciona
    window.location.href = `${urlBase}${separator}userData=${dadosString}`;
  };

  // --- AUTO-REDIRECT (Gatilho Automático) ---
  useEffect(() => {
    const verificarSessaoAtiva = async () => {
      // Se tem um pedido de redirect e um login salvo
      const storedLogin = localStorage.getItem("inove_login");
      
      if (redirectParam && storedLogin) {
        console.log("Detectado redirect + login salvo. Buscando dados frescos...");
        
        // Busca os dados no banco para garantir que o Nome vá atualizado
        const { data } = await supabase
          .from("usuarios_aprovadores")
          .select("*")
          .eq("login", storedLogin)
          .eq("ativo", true)
          .maybeSingle();

        if (data) {
           // Atualiza o cache local por precaução
           localStorage.setItem("inove_nome", data.nome || "");
           localStorage.setItem("inove_nivel", data.nivel || "");
           
           // Envia para o Farol
           enviarParaFarol(data, redirectParam);
        }
      }
    };

    verificarSessaoAtiva();
  }, [redirectParam]);

  // Monitor de Senha
  useEffect(() => {
    if (!isCadastro) return;
    const s = senha;
    const metrics = {
      hasUpper: /[A-Z]/.test(s),
      hasNumber: /[0-9]/.test(s),
      hasSpecial: /[!@#$%^&*]/.test(s),
      minChar: s.length >= 8
    };
    setPasswordMetrics({ ...metrics, score: Object.values(metrics).filter(Boolean).length });
  }, [senha, isCadastro]);

  // --- LOGIN MANUAL ---
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
      alert("Erro de conexão. Tente novamente.");
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

    // ✅ Se tem redirect, envia os dados (Login Manual)
    if (redirectParam && isGestorAdm) {
      enviarParaFarol(data, redirectParam);
      return;
    }

    navigate(nextPathState || decideDefaultNext(nivel), { replace: true });
  }

  // --- CADASTRO ---
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
      alert("Senha muito fraca.");
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
      {/* Branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-blue-900 relative overflow-hidden flex-col items-center justify-center text-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-950 opacity-90 z-0" />
        <div className="relative z-10 flex flex-col items-center">
          <img src={logoInova} alt="Logo Portal Inove" className="w-48 mb-8 drop-shadow-xl" />
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">PORTAL INOVE</h2>
          <p className="text-blue-100 max-w-sm text-lg leading-relaxed">
            “O papel da liderança no Grupo CSC é motivar e capacitar pessoas, entendendo a individualidade de cada um, com disciplina e comprometimento, gerando resiliência e coragem para influenciar, quebrar barreiras, melhorar processos e entregar resultados com foco na segurança, na satisfação do cliente e na otimização de custos”
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center">
            <img src={logoInova} alt="Logo InovaQuatai" className="mx-auto mb-4 w-32 h-auto" />
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isCadastro ? "Criar nova conta" : "Acesse sua conta"}
            </h1>
            {redirectParam && (
               <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 font-medium animate-pulse">
                  Por favor, faça login para validar seu acesso ao Farol.
               </div>
            )}
          </div>

          <form onSubmit={isCadastro ? handleCadastro : handleEntrar} className="space-y-5">
            {/* Campos de Login */}
            {!isCadastro && (
                <>
                  <div className="relative group">
                    <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Usuário ou E-mail"
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white border rounded-xl"
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-3 text-slate-400">
                      {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </>
            )}

            {/* Campos de Cadastro (Simplificado aqui, mas mantenha o código original se precisar) */}
            {isCadastro && (
                <div className="space-y-4">
                   <input type="text" placeholder="Nome *" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-3 border rounded-xl" />
                   <input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl" />
                   {/* ... outros campos ... */}
                   <input type="text" placeholder="Usuário *" value={loginInput} onChange={e => setLoginInput(e.target.value)} className="w-full p-3 border rounded-xl" />
                   <input type="password" placeholder="Senha *" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-3 border rounded-xl" />
                   <select value={setor} onChange={e => setSetor(e.target.value)} className="w-full p-3 border rounded-xl">
                      <option value="">Setor *</option>
                      {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={22} /> : (isCadastro ? "Solicitar Cadastro" : "Entrar no Sistema")}
            </button>
          </form>

          <div className="mt-8 text-center">
             <button onClick={() => { setIsCadastro(!isCadastro); resetForm(); }} className="text-blue-600 font-bold hover:underline">
               {isCadastro ? "Fazer Login" : "Cadastre-se aqui"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
