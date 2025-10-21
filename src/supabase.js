// src/supabase.js
import { createClient } from '@supabase/supabase-js'

// Pegando variáveis de ambiente Vite (Render usa import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verificação — útil para debugar (não expõe chave)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Erro: Variáveis do Supabase não foram carregadas corretamente.")
  console.log("VITE_SUPABASE_URL:", supabaseUrl)
  console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ Presente" : "❌ Ausente")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Teste de conexão
supabase.from('tratativas').select('*').limit(1)
  .then(() => console.log("✅ Conectado ao Supabase com sucesso"))
  .catch((err) => console.error("❌ Erro ao conectar ao Supabase:", err.message))
