"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(async (isCancelled?: () => boolean) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (isCancelled?.()) {
      return;
    }

    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let browserListenersAttached = false;

    async function loadInitialSession() {
      await syncSession(() => cancelled);

      if (cancelled) {
        return;
      }

      window.addEventListener("focus", syncSessionFromBrowser);
      window.addEventListener("pageshow", syncSessionFromBrowser);
      browserListenersAttached = true;
    }

    function syncSessionFromBrowser() {
      syncSession();
    }

    loadInitialSession();

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

    return () => {
      cancelled = true;
      if (browserListenersAttached) {
        window.removeEventListener("focus", syncSessionFromBrowser);
        window.removeEventListener("pageshow", syncSessionFromBrowser);
      }
      listener.subscription.unsubscribe();
    };

  }, [syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
