import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Home, Leaf, LogOut, RefreshCw, Users } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { backendConfigured, Household, householdRequest, Member } from '../lib/householdApi';

const green = '#087F5B';
type Page = 'home' | 'create' | 'join';
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

function Action({ title, onPress, disabled, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && { opacity: .5 }]}>
    <Text style={[styles.buttonText, secondary && { color: green }]}>{title}</Text>
    {!secondary && <ArrowRight color="white" size={18} />}
  </Pressable>;
}

export function HouseholdScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const generation = useRef(0);
  const memberRequest = useRef(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selected, setSelected] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      const changedUser = sessionRef.current?.user.id !== next?.user.id;
      sessionRef.current = next;
      setSession(next);
      if (changedUser) {
        generation.current++;
        memberRequest.current++;
        setHouseholds([]); setSelected(null); setMembers([]); setPage('home');
        setError(''); setNotice(''); setBusy(false); setLoading(false);
      }
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => { generation.current++; data.subscription.unsubscribe(); subscription.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);

  async function accessToken() {
    if (!supabase) throw new Error('Sign-in is not configured yet.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Please sign in again.');
    return data.session.access_token;
  }

  async function refreshHouseholds() {
    const current = generation.current;
    setLoading(true); setError('');
    try {
      const rows = await householdRequest<Household[]>('/me', await accessToken());
      if (current !== generation.current) return;
      setHouseholds(rows);
      setSelected(previous => rows.find(row => row.id === previous?.id) || rows[0] || null);
    } catch (e) { if (current === generation.current) setError(message(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => { if (session?.user.id) void refreshHouseholds(); }, [session?.user.id]);

  async function refreshMembers() {
    if (!selected) return;
    const current = ++memberRequest.current;
    const ownerGeneration = generation.current;
    setMemberLoading(true); setMemberError(''); setMembers([]);
    try {
      const rows = await householdRequest<Member[]>(`/${selected.id}/members`, await accessToken());
      if (current === memberRequest.current && ownerGeneration === generation.current) setMembers(rows);
    } catch (e) { if (current === memberRequest.current && ownerGeneration === generation.current) setMemberError(message(e)); }
    finally { if (current === memberRequest.current) setMemberLoading(false); }
  }
  useEffect(() => { if (selected) void refreshMembers(); }, [selected?.id]);

  async function authenticate() {
    if (!supabase || !backendConfigured || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const credentials = { email: email.trim(), password };
      const result = signUp ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      setPassword('');
      if (signUp && !result.data.session) setNotice('Check your email to confirm your account, then come back here to sign in.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  async function saveHousehold() {
    if (busy) return;
    const current = generation.current;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await householdRequest<Household>(page === 'create' ? '' : '/join', await accessToken(),
        page === 'create' ? { name: name.trim() } : { invite_code: code.trim().toUpperCase() });
      if (current !== generation.current) return;
      setHouseholds(previous => [...previous.filter(item => item.id !== result.id), result]);
      setSelected(result); setPage('home'); setName(''); setCode('');
      setNotice(page === 'create' ? 'Your household is ready. Invite someone to join you.' : 'You’re in! Welcome to your household.');
    } catch (e) { if (current === generation.current) setError(message(e)); }
    finally { if (current === generation.current) setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { const result = await supabase?.auth.signOut({ scope: 'local' }); if (result?.error) throw result.error; }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  const openPage = (next: Page) => { setPage(next); setError(''); setNotice(''); };
  const ready = !!supabase && backendConfigured;

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.brand}><View style={styles.logo}><Leaf size={23} color="white" /></View><Text style={styles.brandText}>mealventory</Text></View>
            {session && <Pressable accessibilityRole="button" accessibilityLabel="Sign out" disabled={busy} onPress={signOut} style={styles.iconButton}><LogOut size={21} color="#52645D" /></Pressable>}
          </View>

          {!session ? <>
            <View style={styles.hero}><Text style={styles.eyebrow}>A LITTLE LESS WASTE. A LOT MORE TOGETHER.</Text>
              <Text style={styles.title}>A shared kitchen,{ '\n' }a fresher start.</Text>
              <Text style={styles.subtitle}>Bring your household together. Start with a place everyone can call their kitchen.</Text>
              <View style={styles.heroIllustration}><Home size={52} color={green} strokeWidth={1.5} /><View><Text style={styles.cardTitle}>Your people. Your pantry.</Text><Text style={styles.muted}>One household, all together.</Text></View></View>
            </View>
            <View style={styles.card}><Text style={styles.heading}>{signUp ? 'Create your account' : 'Welcome back'}</Text>
              <Text style={styles.muted}>{signUp ? 'Your shared kitchen starts here.' : 'Sign in to find your household.'}</Text>
              <Text style={styles.label}>Email address</Text><TextInput accessibilityLabel="Email address" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#84938C" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
              <Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#84938C" secureTextEntry autoCapitalize="none" autoComplete={signUp ? 'new-password' : 'current-password'} onSubmitEditing={authenticate} />
              {!ready && <Text style={styles.info}>App setup is needed before you can sign in. See the frontend connection guide.</Text>}
              <Action title={busy ? 'Please wait…' : signUp ? 'Create account' : 'Sign in'} disabled={busy || !ready || !email.trim() || !password} onPress={authenticate} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSignUp(!signUp); setError(''); setNotice(''); }}><Text style={styles.link}>{signUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></Pressable>
            </View>
          </> : page !== 'home' ? <>
            <Pressable accessibilityRole="button" disabled={busy} style={styles.back} onPress={() => openPage('home')}><ArrowLeft size={18} color={green} /><Text style={styles.link}>Your households</Text></Pressable>
            <Text style={styles.eyebrow}>MAKE ROOM FOR EVERYONE</Text>
            <Text style={styles.title}>{page === 'create' ? 'Start your kitchen.' : 'Pull up a chair.'}</Text>
            <Text style={styles.subtitle}>{page === 'create' ? 'Give your household a name. We’ll make a code you can share with your people.' : 'Enter the six-character invite code shared by someone in your household.'}</Text>
            <View style={styles.card}>
              <Text style={styles.label}>{page === 'create' ? 'Household name' : 'Invite code'}</Text>
              {page === 'create' ? <TextInput accessibilityLabel="Household name" style={styles.input} placeholder="e.g. Smith Family" value={name} onChangeText={setName} maxLength={120} /> : <TextInput accessibilityLabel="Invite code" style={[styles.input, styles.codeInput]} placeholder="ABC123" value={code} onChangeText={value => setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6))} autoCapitalize="characters" autoCorrect={false} maxLength={6} />}
              <Action title={busy ? 'Saving…' : page === 'create' ? 'Create household' : 'Join household'} disabled={busy || (page === 'create' ? !name.trim() : !/^[A-Z0-9]{6}$/.test(code))} onPress={saveHousehold} />
            </View>
          </> : <>
            <Text style={styles.eyebrow}>BETTER TOGETHER</Text><Text style={styles.title}>Your household.</Text>
            <Text style={styles.subtitle}>A home for your shared kitchen.</Text>
            {loading ? <ActivityIndicator accessibilityLabel="Loading households" color={green} style={{ margin: 30 }} /> : !selected ? <View style={styles.empty}><Users size={38} color={green} /><Text style={styles.heading}>Who’s in your kitchen?</Text><Text style={styles.center}>Create a household for your family or roommates, or join one with an invite code.</Text></View> : <>
              {households.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{households.map(household => <Pressable accessibilityRole="button" accessibilityState={{ selected: selected.id === household.id }} key={household.id} onPress={() => setSelected(household)} style={[styles.chip, household.id === selected.id && styles.selectedChip]}><Text style={{ color: green }}>{household.name}</Text></Pressable>)}</ScrollView>}
              <View style={styles.householdCard}><View style={styles.row}><Home size={25} color={green} /><Text style={styles.badge}>{selected.role}</Text></View><Text style={styles.householdName}>{selected.name}</Text><Text style={styles.muted}>YOUR HOUSEHOLD INVITE CODE</Text><Text selectable style={styles.invite}>{selected.invite_code || 'No invite code'}</Text><Text style={styles.muted}>Share this code with someone you’d like to join.</Text></View>
              <View style={styles.card}><View style={styles.row}><Text style={styles.heading}>At the table</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh members" onPress={refreshMembers}><RefreshCw size={18} color={green} /></Pressable></View>
                {memberLoading ? <ActivityIndicator color={green} /> : members.map(member => <View key={member.user_id} style={styles.member}><View style={styles.avatar}><Users size={18} color={green} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{member.user_id === session.user.id ? 'You' : `Member ${member.user_id.slice(0,8)}`}</Text><Text style={styles.muted}>{member.role}</Text></View></View>)}
                {!!memberError && <Text accessibilityRole="alert" style={styles.error}>{memberError}</Text>}
              </View>
            </>}
            <Action title="Create a household" onPress={() => openPage('create')} disabled={loading} />
            <Action title="Join with an invite code" secondary onPress={() => openPage('join')} disabled={loading} />
            <Pressable accessibilityRole="button" disabled={loading} onPress={refreshHouseholds}><Text style={styles.link}>Refresh households</Text></Pressable>
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!notice && <Text accessibilityLiveRegion="polite" style={styles.info}>{notice}</Text>}
          <Text style={styles.footer}>Less food waste. More shared moments.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8F4' }, scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 22 },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 38 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logo: { backgroundColor: green, borderRadius: 13, padding: 9 }, brandText: { fontSize: 22, color: '#183B2D', fontFamily: 'Inter_700Bold', letterSpacing: -.8 },
  iconButton: { padding: 12 }, hero: { marginBottom: 24 }, eyebrow: { fontSize: 10, letterSpacing: 1.8, fontFamily: 'Inter_700Bold', color: green, marginBottom: 13 },
  title: { fontSize: 36, lineHeight: 43, letterSpacing: -1.3, fontFamily: 'Inter_700Bold', color: '#163C2C', marginBottom: 14 },
  subtitle: { fontSize: 15, lineHeight: 23, color: '#617168', marginBottom: 24, fontFamily: 'Inter_400Regular' }, heroIllustration: { backgroundColor: '#E8EFE3', borderRadius: 20, padding: 24, flexDirection: 'row', gap: 20, alignItems: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#E4EAE2', marginBottom: 20, gap: 8 }, heading: { fontFamily: 'Inter_700Bold', fontSize: 21, color: '#183B2D', marginBottom: 4 },
  muted: { color: '#6B7C72', fontSize: 12, lineHeight: 19 }, label: { color: '#334C3E', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 14, marginBottom: 2 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#DDE5DC', borderRadius: 12, paddingHorizontal: 15, color: '#183B2D', backgroundColor: '#FBFCFA', fontSize: 15 },
  button: { minHeight: 52, backgroundColor: green, paddingHorizontal: 20, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }, buttonText: { color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 15 }, secondary: { backgroundColor: '#E7EFE4' },
  link: { color: green, fontSize: 13, textAlign: 'center', paddingVertical: 15, fontFamily: 'Inter_600SemiBold' }, error: { backgroundColor: '#FDECE7', color: '#9B3429', borderRadius: 12, padding: 15, lineHeight: 21, marginTop: 12 }, info: { backgroundColor: '#E6F1E5', color: '#2D6347', borderRadius: 12, padding: 15, lineHeight: 21, marginTop: 12 }, footer: { textAlign: 'center', color: '#819086', fontSize: 11, marginVertical: 28 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 }, codeInput: { fontSize: 25, letterSpacing: 7, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }, empty: { alignItems: 'center', gap: 16, paddingVertical: 28 }, center: { textAlign: 'center', fontSize: 15, color: '#6B7C72', lineHeight: 24, maxWidth: 300 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  householdCard: { borderRadius: 22, backgroundColor: '#E8EFE3', padding: 25, marginBottom: 20 }, householdName: { fontSize: 27, fontFamily: 'Inter_700Bold', color: '#183B2D', marginTop: 20, marginBottom: 27 }, badge: { color: green, backgroundColor: '#D5E6CD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, textTransform: 'capitalize', fontSize: 12 }, invite: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: 7, color: '#183B2D', marginTop: 10, marginBottom: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }, avatar: { borderRadius: 14, backgroundColor: '#EEF3E9', padding: 13 }, cardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#234333', marginBottom: 4 }, chip: { borderWidth: 1, borderColor: '#DDE5DC', borderRadius: 12, padding: 12, marginRight: 8 }, selectedChip: { backgroundColor: '#E0ECD9', borderColor: '#7EA38A' },
});
