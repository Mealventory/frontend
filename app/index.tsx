import { BrandLogo } from "@/src/components/atoms/BrandLogo";
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Home, LogOut, RefreshCw, Users } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { signOutAccount, usernameFor } from '@/src/lib/account';
import { backendConfigured, Household, householdRequest, Member } from '@/src/lib/householdApi';
import { resolveMemberProfile, formatRole } from '@/src/lib/memberProfiles';
import { HouseholdInviteCard } from '@/src/components/domain/HouseholdInviteCard';
import { isValidInviteCode, normalizeInviteCode } from '@/src/lib/householdInvites';
import { APP_GUTTER, APP_PAGE_TOP } from '@/src/lib/layout';
import { E2E_EMAIL, E2E_HOUSEHOLD, E2E_MEMBER, E2E_PASSWORD, E2E_SESSION } from '@/src/lib/e2e';

const green = '#087F5B';
type Page = 'home' | 'create' | 'join';
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

function Action({ title, onPress, disabled, secondary = false, testID }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && { opacity: .5 }]}>
    <Text style={[styles.buttonText, secondary && { color: green }]}>{title}</Text>
    {!secondary && <ArrowRight color="white" size={18} />}
  </Pressable>;
}

export default function HouseholdScreen({ initialSignUp = false }: { initialSignUp?: boolean }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const inviteParam = normalizeInviteCode(
    Array.isArray(params.invite) ? params.invite[0] || '' : params.invite || ''
  );
  const {
    session,
    selectHousehold,
    e2eMode,
    signInE2E,
    signOutE2E,
  } = useAuth();
  const sessionRef = useRef<Session | null>(null);
  const generation = useRef(0);
  const memberRequest = useRef(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(e2eMode ? E2E_EMAIL : '');
  const [password, setPassword] = useState(e2eMode ? E2E_PASSWORD : '');
  const [signUp, setSignUp] = useState(initialSignUp);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [householdsLoaded, setHouseholdsLoaded] = useState(false);
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
    const changedUser = sessionRef.current?.user.id !== session?.user.id;
    sessionRef.current = session;
    if (changedUser) {
      generation.current++;
      memberRequest.current++;
      setHouseholds([]); setSelected(null); setMembers([]); setPage('home');
      setHouseholdsLoaded(false);
      setError(''); setNotice(''); setBusy(false); setLoading(false);
      setSignUp(false); setForgot(false);
    }
  }, [session]);
  useEffect(() => () => { generation.current++; memberRequest.current++; }, []);

  // QR/shared invites arrive here after the /join-household deep-link bridge.
  // Keep the code in the URL while signed out so signing in can resume the invite.
  useEffect(() => {
    if (!isValidInviteCode(inviteParam)) return;
    setCode(inviteParam);
    if (session?.user.id) {
      setPage('join');
      setError('');
      setNotice('Invite code loaded. Review it, then join the household.');
      router.setParams({ invite: undefined } as any);
    } else {
      setNotice('Sign in or create an account to accept this household invite.');
    }
  }, [inviteParam, session?.user.id, router]);

  async function accessToken() {
    if (e2eMode) return E2E_SESSION.access_token;
    if (!supabase) throw new Error('Sign-in is not configured yet.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Please sign in again.');
    return data.session.access_token;
  }

  async function refreshHouseholds() {
    const current = generation.current;
    setLoading(true); setError('');
    try {
      const rows = e2eMode
        ? [E2E_HOUSEHOLD]
        : await householdRequest<Household[]>('/me', await accessToken());
      if (current !== generation.current) return;
      setHouseholds(rows);
      setHouseholdsLoaded(true);
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
      const rows = e2eMode
        ? [E2E_MEMBER]
        : await householdRequest<Member[]>(`/${selected.id}/members`, await accessToken());
      if (current === memberRequest.current && ownerGeneration === generation.current) setMembers(rows);
    } catch (e) { if (current === memberRequest.current && ownerGeneration === generation.current) setMemberError(message(e)); }
    finally { if (current === memberRequest.current) setMemberLoading(false); }
  }
  useEffect(() => { if (selected) void refreshMembers(); }, [selected?.id]);

  async function authenticate() {
    if (busy) return;
    if (!e2eMode && (!supabase || !backendConfigured)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (e2eMode) {
        if (!signInE2E(E2E_EMAIL, E2E_PASSWORD)) {
          throw new Error('Could not start the isolated E2E session.');
        }
        setPassword(E2E_PASSWORD);
        setUsername('');
        return;
      }
      if (!supabase) throw new Error('Sign-in is not configured yet.');
      const defaultUsername = usernameFor(email, username);
      const credentials = {
        email: email.trim(),
        password,
        ...(signUp ? {
          options: {
            data: {
              username: defaultUsername,
              display_name: defaultUsername,
            },
          },
        } : {}),
      };
      const result = signUp ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      setUsername('');
      if (signUp && !result.data.session) setNotice('Check your email to confirm your account, then come back here to sign in.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  async function handleForgotPassword() {
    if (!supabase || busy || !email.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : Linking.createURL('/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setNotice('Password reset link sent! Check your inbox to reset your password.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  async function saveHousehold() {
    if (busy) return;
    const current = generation.current;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await householdRequest<Household>(page === 'create' ? '' : '/join', await accessToken(),
        page === 'create' ? { name: name.trim() } : { invite_code: normalizeInviteCode(code) });
      if (current !== generation.current) return;
      setHouseholds(previous => [...previous.filter(item => item.id !== result.id), result]);
      setSelected(result); setPage('home'); setName(''); setCode('');
      setNotice(page === 'create' ? 'Your household is ready. Invite someone to join you.' : 'You’re in! Welcome to your household.');
    } catch (e) { if (current === generation.current) setError(message(e)); }
    finally { if (current === generation.current) setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      if (e2eMode) signOutE2E();
      else await signOutAccount(supabase);
      sessionRef.current = null;
      selectHousehold(null);
      setEmail(e2eMode ? E2E_EMAIL : '');
      setPassword(e2eMode ? E2E_PASSWORD : ''); setUsername('');
      setHouseholds([]);
      setSelected(null);
      setMembers([]);
      setPage('home');
      setError('');
      setNotice('You have been signed out.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  const openPage = (next: Page) => { setPage(next); setError(''); setNotice(''); };
  const ready = e2eMode || (!!supabase && backendConfigured);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.headerWrapper}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <BrandLogo width={170} />
        </View>
        {session && (
          <Pressable accessibilityRole="button" accessibilityLabel="Log out" disabled={busy} onPress={signOut} style={styles.signOutHeaderButton}>
            <LogOut size={16} color="#B42318" />
            <Text style={styles.signOutHeaderText}>Log out</Text>
          </Pressable>
        )}
      </View>
    </View>

    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollFrame} contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {!session ? <>
            <View style={styles.hero}><Text style={styles.eyebrow}>A LITTLE LESS WASTE. A LOT MORE TOGETHER.</Text>
              <Text style={styles.title}>A shared kitchen,{ '\n' }a fresher start.</Text>
              <Text style={styles.subtitle}>Bring your household together. Start with a place everyone can call their kitchen.</Text>
              <View style={styles.heroIllustration}><Home size={52} color={green} strokeWidth={1.5} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Your people. Your pantry.</Text><Text style={styles.muted}>One household, all together.</Text></View></View>
            </View>
            <View style={styles.card}>
              {e2eMode && (
                <Text testID="e2e-mode-indicator" style={styles.e2eIndicator}>
                  E2E Test Mode
                </Text>
              )}
              {forgot ? <>
                <Text style={styles.heading}>Reset your password</Text>
                <Text style={styles.muted}>Enter your email to receive a password recovery link.</Text>
                <Text style={styles.label}>Email address</Text>
                <TextInput accessibilityLabel="Email address" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#84938C" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                <Action title={busy ? 'Sending…' : 'Send recovery email'} disabled={busy || !email.trim()} onPress={handleForgotPassword} />
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setForgot(false); setError(''); setNotice(''); }}><Text style={styles.link}>Back to sign in</Text></Pressable>
              </> : <>
                <Text style={styles.heading}>{signUp ? 'Create your account' : 'Welcome back'}</Text>
                <Text style={[styles.muted, { textAlign: "center" }]}>{signUp ? 'Your shared kitchen starts here.' : 'Sign in to find your household.'}</Text>
                {signUp && <>
                  <Text style={styles.label}>Username (optional)</Text>
                  <TextInput accessibilityLabel="Username" style={styles.input} value={username} onChangeText={setUsername} placeholder={`e.g. ${email.includes('@') ? email.split('@')[0] : 'chef_pablo'} (optional)`} placeholderTextColor="#84938C" autoCapitalize="none" autoCorrect={false} />
                </>}
                <Text style={styles.label}>Email address</Text>
                <TextInput testID="e2e-email" accessibilityLabel="Email address" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#84938C" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                <Text style={styles.label}>Password</Text>
                <TextInput testID="e2e-password" accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#84938C" secureTextEntry autoCapitalize="none" autoComplete={signUp ? 'new-password' : 'current-password'} onSubmitEditing={authenticate} />
                {!signUp && (
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setForgot(true); setError(''); setNotice(''); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                    <Text style={[styles.link, { paddingVertical: 2, fontSize: 13 }]}>Forgot password?</Text>
                  </Pressable>
                )}
                {!ready && <Text style={styles.info}>App setup is needed before you can sign in. See the frontend connection guide.</Text>}
                <Action
                  testID="e2e-sign-in"
                  title={busy ? 'Please wait…' : e2eMode ? 'Continue as E2E tester' : signUp ? 'Create account' : 'Sign in'}
                  disabled={busy || !ready || (!e2eMode && (!email.trim() || !password))}
                  onPress={authenticate}
                />
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSignUp(!signUp); setForgot(false); setError(''); setNotice(''); }}><Text style={styles.link}>{signUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></Pressable>
              </>}
            </View>
          </> : page !== 'home' ? <>
            <Pressable accessibilityRole="button" disabled={busy} style={styles.back} onPress={() => openPage('home')}><ArrowLeft size={18} color={green} /><Text style={styles.link}>Your households</Text></Pressable>
            <Text style={styles.eyebrow}>MAKE ROOM FOR EVERYONE</Text>
            <Text style={styles.title}>{page === 'create' ? 'Start your kitchen.' : 'Pull up a chair.'}</Text>
            <Text style={styles.subtitle}>{page === 'create' ? 'Give your household a name. We’ll make a code you can share with your people.' : 'Enter the six-character invite code shared by someone in your household.'}</Text>
            <View style={styles.card}>
              <Text style={styles.label}>{page === 'create' ? 'Household name' : 'Invite code'}</Text>
              {page === 'create' ? <TextInput accessibilityLabel="Household name" style={styles.input} placeholder="e.g. Smith Family" value={name} onChangeText={setName} maxLength={120} /> : <TextInput accessibilityLabel="Invite code" style={[styles.input, styles.codeInput]} placeholder="ABC123" value={code} onChangeText={value => setCode(normalizeInviteCode(value))} autoCapitalize="characters" autoCorrect={false} maxLength={6} />}
              <Action title={busy ? 'Saving…' : page === 'create' ? 'Create household' : 'Join household'} disabled={busy || (page === 'create' ? !name.trim() : !isValidInviteCode(code))} onPress={saveHousehold} />
            </View>
          </> : <>
            <Text style={styles.eyebrow}>BETTER TOGETHER</Text><Text style={styles.title}>Your household.</Text>
            <Text style={styles.subtitle}>A home for your shared kitchen.</Text>
            {loading ? <ActivityIndicator accessibilityLabel="Loading households" color={green} style={{ margin: 30 }} /> : !householdsLoaded ? <View style={styles.empty}><Text style={styles.heading}>Couldn’t load your households</Text><Text style={styles.center}>Your membership hasn’t been checked yet. Retry once the backend connection is restored.</Text><Action title="Retry" onPress={refreshHouseholds} /></View> : !selected ? <View style={styles.empty}><Users size={38} color={green} /><Text style={styles.heading}>Who’s in your kitchen?</Text><Text style={styles.center}>Create a household for your family or roommates, or join one with an invite code.</Text></View> : <>
              {households.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{households.map(household => <Pressable accessibilityRole="button" accessibilityState={{ selected: selected.id === household.id }} key={household.id} onPress={() => setSelected(household)} style={[styles.chip, household.id === selected.id && styles.selectedChip]}><Text style={{ color: green }}>{household.name}</Text></Pressable>)}</ScrollView>}
              <View style={styles.householdCard}>
                <View style={styles.row}><Home size={25} color={green} /><Text style={styles.badge}>{selected.role}</Text></View>
                <Text style={styles.householdName}>{selected.name}</Text>
                {selected.invite_code ? (
                  <HouseholdInviteCard
                    householdName={selected.name}
                    inviteCode={selected.invite_code}
                  />
                ) : (
                  <Text style={styles.muted}>This household does not currently have an invite code.</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  testID="e2e-enter-kitchen"
                  accessibilityLabel={`Enter ${selected.name} Kitchen`}
                  onPress={() => { selectHousehold(selected); router.push('/(app)/(tabs)' as any); }}
                  style={styles.cardEnterButton}
                >
                  <Text style={styles.cardEnterButtonText}>Enter kitchen</Text>
                  <ArrowRight color="white" size={16} />
                </Pressable>
              </View>
              <View style={styles.card}><View style={styles.row}><Text style={styles.heading}>At the table</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh members" onPress={refreshMembers}><RefreshCw size={18} color={green} /></Pressable></View>
                {memberLoading ? <ActivityIndicator color={green} /> : members.map(member => {
                  const profile = resolveMemberProfile(member, session);
                  return (
                    <View key={member.user_id} style={styles.member}>
                      <View style={styles.avatar}>
                        {profile.initials ? (
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: green }}>{profile.initials}</Text>
                        ) : (
                          <Users size={18} color={green} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{profile.isCurrentUser ? `${profile.displayName} (You)` : profile.displayName}</Text>
                        <Text style={styles.muted}>{formatRole(member.role)}</Text>
                      </View>
                    </View>
                  );
                })}
                {!!memberError && <Text accessibilityRole="alert" style={styles.error}>{memberError}</Text>}
              </View>
            </>}
            <Action title="Create a household" onPress={() => openPage('create')} disabled={loading || !householdsLoaded} />
            <Action title="Join with an invite code" secondary onPress={() => openPage('join')} disabled={loading || !householdsLoaded} />
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
  safe: { flex: 1, backgroundColor: '#F6F8F4' },
  headerWrapper: {
    width: '100%',
    paddingHorizontal: APP_GUTTER,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#F6F8F4',
    borderBottomWidth: 1,
    borderBottomColor: '#E4EAE2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  scrollFrame: { width: "100%", maxWidth: 560, alignSelf: "center" },
  scroll: { flexGrow: 1, paddingHorizontal: APP_GUTTER, paddingTop: APP_PAGE_TOP, paddingBottom: 32 },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  brand: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, logoImage: { width: 42, height: 42, borderRadius: 13 }, brandText: { fontSize: 22, color: '#183B2D', fontFamily: 'Inter_700Bold', letterSpacing: -.8 },
  iconButton: { padding: 12 }, hero: { marginBottom: 24 }, eyebrow: { fontSize: 10, letterSpacing: 1.8, fontFamily: 'Inter_700Bold', color: green, marginBottom: 13 },
  title: { fontSize: 36, lineHeight: 43, letterSpacing: -1.3, fontFamily: 'Inter_700Bold', color: '#163C2C', marginBottom: 14 },
  subtitle: { fontSize: 15, lineHeight: 23, color: '#617168', marginBottom: 24, fontFamily: 'Inter_400Regular' }, heroIllustration: { backgroundColor: '#E8EFE3', borderRadius: 20, padding: 24, flexDirection: 'row', gap: 20, alignItems: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#E4EAE2', marginBottom: 20, gap: 8 }, heading: { textAlign: "center", fontFamily: 'Inter_700Bold', fontSize: 21, color: '#183B2D', marginBottom: 4 },
  muted: { color: '#6B7C72', fontSize: 12, lineHeight: 19 }, label: { color: '#334C3E', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 14, marginBottom: 2 },
  e2eIndicator: { alignSelf: 'center', color: green, backgroundColor: '#E6F1E5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontFamily: 'Inter_700Bold' },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#DDE5DC', borderRadius: 12, paddingHorizontal: 15, color: '#183B2D', backgroundColor: '#FBFCFA', fontSize: 15 },
  button: { minHeight: 52, backgroundColor: green, paddingHorizontal: 20, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }, buttonText: { textAlign: 'center', flexShrink: 1, color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 15 }, secondary: { backgroundColor: '#E7EFE4' },
  link: { color: green, fontSize: 13, textAlign: 'center', paddingVertical: 15, fontFamily: 'Inter_600SemiBold' }, error: { backgroundColor: '#FDECE7', color: '#9B3429', borderRadius: 12, padding: 15, lineHeight: 21, marginTop: 12 }, info: { backgroundColor: '#E6F1E5', color: '#2D6347', borderRadius: 12, padding: 15, lineHeight: 21, marginTop: 12 }, footer: { textAlign: 'center', color: '#819086', fontSize: 11, marginVertical: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 }, codeInput: { fontSize: 25, letterSpacing: 7, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }, empty: { alignItems: 'center', gap: 16, padding: 24, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E4EAE2' }, center: { textAlign: 'center', fontSize: 15, color: '#6B7C72', lineHeight: 24, maxWidth: 300 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  householdCard: { borderRadius: 22, backgroundColor: '#E8EFE3', padding: 25, marginBottom: 20 }, householdName: { fontSize: 27, fontFamily: 'Inter_700Bold', color: '#183B2D', marginTop: 20, marginBottom: 27 }, badge: { color: green, backgroundColor: '#D5E6CD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, textTransform: 'capitalize', fontSize: 12 }, invite: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: 7, color: '#183B2D', marginTop: 10, marginBottom: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }, avatar: { borderRadius: 14, backgroundColor: '#EEF3E9', padding: 13 }, cardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#234333', marginBottom: 4 }, chip: { borderWidth: 1, borderColor: '#DDE5DC', borderRadius: 12, padding: 12, marginRight: 8 }, selectedChip: { backgroundColor: '#E0ECD9', borderColor: '#7EA38A' },
  signOutHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE4E2',
    borderWidth: 1,
    borderColor: '#FDA29B',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutHeaderText: {
    color: '#B42318',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  bottomLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3F2',
    borderWidth: 1.5,
    borderColor: '#FDA29B',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  bottomLogoutText: {
    color: '#B42318',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  cardEnterButton: {
    backgroundColor: green,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  cardEnterButtonText: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
