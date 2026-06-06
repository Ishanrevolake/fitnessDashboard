"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  mapSupabaseUser,
  mapSupabaseUserWithProfile,
  signInUser,
  signOutUser,
  signUpUser,
  type AuthUser,
  type SignUpInput,
} from "@/lib/auth-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<AuthUser>;
  signUp: (input: SignUpInput, remember?: boolean) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      mapSupabaseUserWithProfile(session.user)
        .then((nextUser) => {
          if (active) setUser(nextUser);
        })
        .catch(() => {
          if (active) setUser(mapSupabaseUser(session.user));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password, remember = true) {
        const nextUser = await signInUser(email, password, remember);
        setUser(nextUser);
        return nextUser;
      },
      async signUp(input, remember = true) {
        const nextUser = await signUpUser(input, remember);
        setUser(nextUser);
        return nextUser;
      },
      async signOut() {
        await signOutUser();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
