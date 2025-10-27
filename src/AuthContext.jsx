// src/AuthContext.jsx
// (Com try...catch...finally para garantir o fim do loading)

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Começa como true

  useEffect(() => {
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
      }
      setProfile(data || null); // Define como null se não encontrar
    };

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null); // Limpa perfil se não houver sessão
        }
      } catch (error) {
        console.error("Falha ao verificar a sessão (Verifique as chaves Supabase no .env):", error);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false); // Garante que o loading termine
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    profile,
    loading,
    logout,
    isLoggedIn: !!session,
  };

  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            Carregando sessão...
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
