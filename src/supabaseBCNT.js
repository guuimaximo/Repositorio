// src/supabaseBCNT.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPA_BASE_BCNT_URL;
const anon = import.meta.env.VITE_SUPA_BASE_BCNT_ANON_KEY;

export const supabaseBCNT = createClient(url, anon);
