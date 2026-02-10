// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase B (normal) = INOVE (onde fica public.relatorios_gerados)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ Supabase A (BNCT) = base externa (se você precisar em outras telas)
const BNCT_URL = import.meta.env.VITE_SUPA_BASE_BNCT_URL;
const BNCT_ANON_KEY = import.meta.env.VITE_SUPA_BASE_BNCT_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // não quebra build, mas deixa claro no console
  console.warn("⚠️ Supabase B (normal) não configurado: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

if (!BNCT_URL || !BNCT_ANON_KEY) {
  console.warn("⚠️ Supabase A (BNCT) não configurado: VITE_SUPA_BASE_BNCT_URL / VITE_SUPA_BASE_BNCT_ANON_KEY");
}

// ✅ B (normal)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ A (BNCT)
export const supabaseBnct = createClient(BNCT_URL, BNCT_ANON_KEY);
