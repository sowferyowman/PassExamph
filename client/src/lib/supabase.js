import { createClient } from "@supabase/supabase-js";

const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
    auth: { persistSession: true, detectSessionInUrl: true }
  })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Google sign-in is not configured yet.");
  return supabase;
}
