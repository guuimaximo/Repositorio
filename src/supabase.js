import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const DISABLE_REFRESH =
  String(import.meta.env.VITE_SUPABASE_DISABLE_REFRESH || "false").toLowerCase() === "true";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ENV Supabase ausente no FRONT:", {
    hasUrl: !!supabaseUrl,
    hasAnon: !!supabaseAnonKey,
  });
  throw new Error("ENV do Supabase ausente (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-inove-auth",
    persistSession: true,
    autoRefreshToken: !DISABLE_REFRESH, // ✅ evita loop quando Supabase cair
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
