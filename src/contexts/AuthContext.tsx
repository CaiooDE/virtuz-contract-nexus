import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTestAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthorizedDomain: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_DOMAIN = 'virtuzmidia.com.br';
const TEST_ACCOUNT_EMAIL = 'test.auth@virtuzmidia.com.br';
const TEST_ACCOUNT_PASSWORD = 'VirtuzTest123!';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthorizedDomain = user?.email?.endsWith(`@${ALLOWED_DOMAIN}`) ?? false;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          hd: ALLOWED_DOMAIN, // Hint for Google to pre-filter domain
        },
      },
    });

    if (error) {
      throw error;
    }
  };

  const signInWithTestAccount = async () => {
    const signInResult = await supabase.auth.signInWithPassword({
      email: TEST_ACCOUNT_EMAIL,
      password: TEST_ACCOUNT_PASSWORD,
    });

    if (!signInResult.error) {
      return;
    }

    const signUpResult = await supabase.auth.signUp({
      email: TEST_ACCOUNT_EMAIL,
      password: TEST_ACCOUNT_PASSWORD,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpResult.error) {
      throw signUpResult.error;
    }

    if (!signUpResult.data.session) {
      const retrySignIn = await supabase.auth.signInWithPassword({
        email: TEST_ACCOUNT_EMAIL,
        password: TEST_ACCOUNT_PASSWORD,
      });

      if (retrySignIn.error) {
        throw retrySignIn.error;
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading,
      signInWithGoogle,
      signInWithTestAccount,
      signOut,
      isAuthorizedDomain
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
