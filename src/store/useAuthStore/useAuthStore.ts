import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AuthStore = {
  user: User | null;
  session: Session | null;
  /** True while the initial session check is in flight. */
  loading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /**
   * Subscribe to Supabase auth state changes.
   * Call once on app mount; returns an unsubscribe function.
   */
  initialize: () => () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  signIn: async (email, password) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
  },

  signUp: async (email, password) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message });
    else
      set({
        error: 'Check your email to confirm your account, then sign in.',
      });
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    if (!supabase) {
      set({ loading: false });
      return () => {};
    }

    // Populate from any existing session immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });

    return () => subscription.unsubscribe();
  },
}));
