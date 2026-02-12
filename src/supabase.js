import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// ✅ Modo de emergência: se você setar VITE_SUPABASE_DISABLE_REFRESH="true" no Render,
// o app para de tentar refresh e evita loop/erro CORS infinito.
const DISABLE_REFRESH = String(import.meta.env.VITE_SUPABASE_DISABLE_REFRESH || "false").toLowerCase() === "true";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-inove-auth",     // ✅ evita conflito com outro client/projeto
    persistSession: true,
    autoRefreshToken: !DISABLE_REFRESH, // ✅ liga/desliga sem mudar código
    detectSessionInUrl: true,
    flowType: "pkce",                 // ✅ mais estável no browser
  },
});
