import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

// Auth state for Supabase mode (phone OTP). In mock mode this provider short-circuits
// to a synthetic always-signed-in admin so the app renders without a backend.
const AuthCtx = createContext(null);

const STAFF_ROLES = new Set(['admin', 'accountant', 'dispatch', 'cskh']);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // load the signed-in user's profile (for name + role gating)
  const loadProfile = useCallback(async (sess) => {
    if (!sess?.user) { setProfile(null); return; }
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, role, phone, email')
      .eq('id', sess.user.id)
      .single();
    if (error) { console.error('loadProfile failed:', error); setProfile(null); return; }
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session);
      } catch (e) {
        console.error('auth init failed:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    // Keep `loading` true while the post-login profile resolves, so the Gate doesn't
    // briefly flash "no access" before role is known.
    // NB: do NOT await Supabase calls directly inside onAuthStateChange — supabase-js holds
    // an auth lock during the callback and a nested query (loadProfile) deadlocks. Defer it.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setLoading(true);
      setTimeout(async () => {
        await loadProfile(sess);
        if (active) setLoading(false);
      }, 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // shouldCreateUser:false — this is a staff console; never auto-create accounts from a
  // login attempt by an arbitrary phone number.
  const sendOtp = useCallback((phone) => supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } }), []);
  const verifyOtp = useCallback((phone, token) => supabase.auth.verifyOtp({ phone, token, type: 'sms' }), []);
  const signOut = useCallback(() => supabase.auth.signOut(), []);

  // Mock mode: pretend we're the seeded admin.
  const mock = !isSupabaseConfigured;
  const value = mock
    ? {
        mode: 'mock', loading: false, session: { user: { id: 'mock' } },
        profile: { full_name: 'Trần Quản Lý', role: 'admin' },
        role: 'admin', isStaff: true,
        sendOtp: async () => ({ data: {}, error: null }), verifyOtp: async () => ({ data: {}, error: null }), signOut: async () => ({ error: null }),
      }
    : {
        mode: 'supabase', loading, session, profile,
        role: profile?.role || null,
        isStaff: STAFF_ROLES.has(profile?.role),
        sendOtp, verifyOtp, signOut,
      };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
