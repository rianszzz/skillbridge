"use client";
import { createBrowserSupabase } from "./supabase";

const supabase = createBrowserSupabase();

export async function authHeaders(json = true): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Silakan masuk untuk melanjutkan.");
  return json ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { Authorization: `Bearer ${token}` };
}

export { supabase };
