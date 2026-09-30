import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase, initialRecovery } from '../lib/supabase';
import { acceptRecoveryLink } from '../lib/account';
import type { Household } from '../lib/householdApi';

const AuthContext = createContext<{
  session: Session | null; ready: boolean; recovery: boolean; recoveryError: string;
  finishRecovery: () => void;
  household: Household | null; selectHousehold: (household: Household | null) => void;
}>({ session: null, ready: false, recovery: false, recoveryError: '', finishRecovery: () => {}, household: null, selectHousehold: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovery, setRecovery] = useState(initialRecovery);
  const [recoveryError, setRecoveryError] = useState('');
  const [household, selectHousehold] = useState<Household | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let userId: string | undefined;
    const handledLinks = new Set<string>();
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (userId !== next?.user.id) selectHousehold(null);
      userId = next?.user.id;
      setSession(next); setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        selectHousehold(null);
        setRecovery(false);
      }
    });
    void client.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      if (initialSession) {
        if (userId !== initialSession.user.id) selectHousehold(null);
        userId = initialSession.user.id;
        setSession(initialSession);
      }
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    async function handleURL(url: string | null) {
      if (!url || !active || handledLinks.has(url)) return;
      handledLinks.add(url);
      try {
        if (await acceptRecoveryLink(client, url) && active) {
          setRecoveryError(''); setRecovery(true);
        }
      } catch {
        if (active) { setRecovery(true); setRecoveryError('Recovery link failed. Request a new email and open its latest link.'); }
      }
    }
    // Supabase processes browser callbacks; native links need explicit exchange.
    const linkSubscription = Platform.OS !== 'web'
      ? Linking.addEventListener('url', ({ url }) => { void handleURL(url); }) : null;
    if (Platform.OS !== 'web') void Linking.getInitialURL().then(handleURL);
    const refresh = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const appSubscription = AppState.addEventListener('change', refresh);
    return () => { active = false; data.subscription.unsubscribe(); linkSubscription?.remove(); appSubscription.remove(); };
  }, []);
  return <AuthContext.Provider value={{ session, ready, recovery, recoveryError,
    finishRecovery: () => { setRecovery(false); setRecoveryError(''); }, household, selectHousehold }}>
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
