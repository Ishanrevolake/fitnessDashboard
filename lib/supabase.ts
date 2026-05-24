"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const rememberKey = "alphaFitnessRememberSession";
const fallbackSupabaseUrl = "https://placeholder.supabase.co";
const fallbackSupabasePublishableKey = "placeholder-publishable-key";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError() {
  return "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
}

function getAuthStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    get length() {
      return window.localStorage.length + window.sessionStorage.length;
    },
    clear() {
      window.localStorage.clear();
      window.sessionStorage.clear();
    },
    getItem(key: string) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    key(index: number) {
      const localKey = window.localStorage.key(index);
      if (localKey) return localKey;
      return window.sessionStorage.key(index - window.localStorage.length);
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (window.localStorage.getItem(rememberKey) === "false") {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
        return;
      }

      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    },
  };
}

export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(rememberKey, String(remember));
}

export const supabase = createClient(supabaseUrl || fallbackSupabaseUrl, supabasePublishableKey || fallbackSupabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: getAuthStorage(),
  },
});
