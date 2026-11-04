import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase, initialRecovery } from '../lib/supabase';
import { acceptRecoveryLink } from '../lib/account';
import type { Household } from '../lib/householdApi';
import { appStorage } from '../lib/storage';
import {
  E2E_EMAIL,
  E2E_ENABLED,
  E2E_PASSWORD,
  E2E_SESSION,
} from '../lib/e2e';

const HOUSEHOLD_SELECTION_PREFIX = 'mealventory:selected-household:';

const householdSelectionKey = (userId: string) => `${HOUSEHOLD_SELECTION_PREFIX}${userId}`;

const AuthContext = createContext<{
  session: Session | null; ready: boolean; recovery: boolean; recoveryError: string;
  finishRecovery: () => void;
  household: Household | null; selectHousehold: (household: Household | null) => void;
  choosingHousehold: boolean;
  openHouseholdSelection: () => void;
  e2eMode: boolean;
  signInE2E: (email: string, password: string) => boolean;
  signOutE2E: () => void;
}>({
  session: null,
  ready: false,
  recovery: false,
  recoveryError: '',
  finishRecovery: () => {},
  household: null,
  selectHousehold: () => {},
  choosingHousehold: false,
  openHouseholdSelection: () => {},
  e2eMode: false,
  signInE2E: () => false,
  signOutE2E: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(E2E_ENABLED || !supabase);
  const [recovery, setRecovery] = useState(E2E_ENABLED ? false : initialRecovery);
  const [recoveryError, setRecoveryError] = useState('');
  const [household, setHousehold] = useState<Household | null>(null);
  // Keep the original household picker visible when opened from Settings.
  // This is UI state only: opening it must not clear the persisted kitchen.
  const [choosingHousehold, setChoosingHousehold] = useState(false);
  const openHouseholdSelection = useCallback(() => setChoosingHousehold(true), []);

  const selectHousehold = useCallback((next: Household | null) => {
    setHousehold(next);
    if (next) setChoosingHousehold(false);
    const userId = session?.user.id;
    if (E2E_ENABLED || !userId) return;
    const key = householdSelectionKey(userId);
    if (next) appStorage.setItem(key, JSON.stringify(next));
    else appStorage.removeItem(key);
  }, [session?.user.id]);
  useEffect(() => {
    if (E2E_ENABLED || !supabase) return;
    const client = supabase;
    let active = true;
    let userId: string | undefined;
    const handledLinks = new Set<string>();
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      const previousUserId = userId;
      if (previousUserId !== next?.user.id) {
        setChoosingHousehold(false);
        setHousehold(null);
        if (previousUserId) appStorage.removeItem(householdSelectionKey(previousUserId));
      }
      userId = next?.user.id;
      setSession(next); setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        setChoosingHousehold(false);
        setHousehold(null);
        setRecovery(false);
      }
    });
    void client.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      if (initialSession) {
        if (userId !== initialSession.user.id) setHousehold(null);
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
    if (Platform.OS !== 'web') refresh(AppState.currentState ?? 'unknown');
    const appSubscription = AppState.addEventListener('change', refresh);
    return () => { active = false; data.subscription.unsubscribe(); linkSubscription?.remove(); appSubscription.remove(); };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (E2E_ENABLED || !userId) return;

    const key = householdSelectionKey(userId);
    const saved = appStorage.getItem(key);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Household;
      if (!parsed?.id || !parsed?.name) throw new Error('Invalid saved household');
      setHousehold(parsed);
    } catch {
      appStorage.removeItem(key);
    }
  }, [session?.user.id]);

  const signInE2E = (email: string, password: string) => {
    if (!E2E_ENABLED) return false;
    const valid =
      email.trim().toLowerCase() === E2E_EMAIL &&
      password === E2E_PASSWORD;
    if (!valid) return false;
    setSession(E2E_SESSION);
    setChoosingHousehold(false);
    setHousehold(null);
    setRecovery(false);
    setRecoveryError('');
    setReady(true);
    return true;
  };

  const signOutE2E = () => {
    if (!E2E_ENABLED) return;
    setSession(null);
    setChoosingHousehold(false);
    setHousehold(null);
    setRecovery(false);
    setRecoveryError('');
    setReady(true);
  };

  return <AuthContext.Provider value={{
    session,
    ready,
    recovery,
    recoveryError,
    finishRecovery: () => { setRecovery(false); setRecoveryError(''); },
    household,
    selectHousehold,
    choosingHousehold,
    openHouseholdSelection,
    e2eMode: E2E_ENABLED,
    signInE2E,
    signOutE2E,
  }}>
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
