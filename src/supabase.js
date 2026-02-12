import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase ENV ausente:", {
    hasUrl: !!SUPABASE_URL,
    hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY,
  });
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
