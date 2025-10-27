// src/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

// 1. Cria o Contexto
const AuthContext = createContext();

// 2. Cria o Provedor (que vai envolver o App)
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // Armazena o perfil (cargo/role)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para buscar o perfil do usuário logado
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role') // Estamos buscando o cargo (role)
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
      }
      setProfile(data || null);
    };

    // Verifica a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Ouve mudanças na autenticação (Login, Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          // Usuário logou: busca o perfil
          await fetchProfile(session.user.id);
        } else {
          // Usuário deslogou: limpa o perfil
          setProfile(null);
        }
      }
    );

    // Limpa a inscrição quando o componente desmontar
    return () => subscription.unsubscribe();
  }, []);

  // Função de Logout
  const logout = async () => {
    await supabase.auth.signOut();
    // O onAuthStateChange vai lidar com a limpeza dos estados
  };

  // Valor fornecido pelo context
  const value = {
    session,
    profile,
    loading,
    logout,
    isLoggedIn: !!session, // Um booleano útil
  };

  // Não renderiza o app até que a verificação inicial esteja completa
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 3. Cria o Hook (para usar o contexto nas páginas)
export const useAuth = () => {
  return useContext(AuthContext);
};
