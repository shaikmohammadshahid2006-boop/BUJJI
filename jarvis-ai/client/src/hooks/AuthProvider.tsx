import { useState, useEffect, createContext, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types/auth';

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        const localUser = localStorage.getItem('jarvis_mock_user');
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
          } catch {
            setUser(null);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
      } catch (err) {
        console.error('Session retrieval error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event: any, session: any) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const mockProfile: UserProfile = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        display_name: email.split('@')[0] || 'Commander',
        voice_enabled: true,
        auto_speak: true,
      };
      setUser(mockProfile);
      localStorage.setItem('jarvis_mock_user', JSON.stringify(mockProfile));
      localStorage.setItem('jarvis_auth_token', 'mock_jwt_token_for_sandbox');
      return {};
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isSupabaseConfigured) {
      const mockProfile: UserProfile = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        display_name: displayName || email.split('@')[0] || 'Commander',
        voice_enabled: true,
        auto_speak: true,
      };
      setUser(mockProfile);
      localStorage.setItem('jarvis_mock_user', JSON.stringify(mockProfile));
      localStorage.setItem('jarvis_auth_token', 'mock_jwt_token_for_sandbox');
      return {};
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Signup failed' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('jarvis_mock_user');
    localStorage.removeItem('jarvis_auth_token');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update(updates).eq('id', user.id);
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
    } else {
      localStorage.setItem('jarvis_mock_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
