import type { User } from "@supabase/supabase-js";
import { setRememberSession, supabase } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  businessName: string;
  role: UserRole;
};

export type UserRole = "admin" | "trainer" | "client";

export type SignUpInput = {
  name: string;
  email: string;
  businessName: string;
  password: string;
};

function normalizeRole(value: unknown): UserRole {
  if (value === "admin" || value === "trainer" || value === "client") return value;
  if (value === "user" || value === "normal") return "client";
  return "client";
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export function hasTrainerAccess(role: UserRole) {
  return role === "admin" || role === "trainer";
}

export function mapSupabaseUser(user: User): AuthUser {
  const email = user.email ?? "";
  const appRole = user.app_metadata?.role ?? user.app_metadata?.user_role;
  const userRole = user.user_metadata?.role ?? user.user_metadata?.user_role;
  const name = getStringMetadata(user.user_metadata, "name") || getStringMetadata(user.user_metadata, "full_name") || email.split("@")[0] || "Trainer";
  const businessName =
    getStringMetadata(user.user_metadata, "business_name") || getStringMetadata(user.user_metadata, "businessName") || "AlphaFitness";

  return {
    id: user.id,
    name,
    email,
    businessName,
    role: normalizeRole(appRole ?? userRole),
  };
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return mapSupabaseUser(user);
}

export async function signInUser(email: string, password: string, remember = true) {
  setRememberSession(remember);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message || "Email or password is incorrect.");
  }

  if (!data.user) {
    throw new Error("Unable to sign in. Please try again.");
  }

  return mapSupabaseUser(data.user);
}

export async function signUpUser(input: SignUpInput, remember = true) {
  setRememberSession(remember);

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        full_name: input.name.trim(),
        business_name: input.businessName.trim() || "AlphaFitness",
        role: "client",
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to create account.");
  }

  if (!data.user || !data.session) {
    throw new Error("Account created. Please check your email to confirm it, then sign in.");
  }

  return mapSupabaseUser(data.user);
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Unable to sign out.");
  }
}
