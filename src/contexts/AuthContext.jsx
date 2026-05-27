import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const NOT_CONFIGURED = {
  error: { message: 'Authentication is not configured. Missing Supabase env vars.' },
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No client (missing env) — just resolve loading so the UI can render.
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Hydrate the initial session, then keep it in sync via the auth listener.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // All three return the Supabase result shape ({ data, error }) so callers
  // (AuthModal) can surface errors inline without try/catch.
  const signIn = async (email, password) => {
    if (!supabase) return NOT_CONFIGURED;
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email, password) => {
    if (!supabase) return NOT_CONFIGURED;
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    if (!supabase) return NOT_CONFIGURED;
    return supabase.auth.signOut();
  };

  const value = { user, session, signIn, signUp, signOut, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

export default AuthContext;
