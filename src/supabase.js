import { createClient } from '@supabase/supabase-js'

// === CONFIGURAÇÃO INOVEQUATAI ===
const supabaseUrl = "https://wboelthngddvkgvrwkbuu.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib2VsdGhuZ2RkdmtncnZ3a2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODQxMzcsImV4cCI6MjA3NjU2MDEzN30.A3ylU8Tkx20VOD3EjOr3K7ir0J_jZrCfBNlzAOtODXg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
