import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/lib/supabase';
import { changePassword } from '@/src/lib/account';
import { APP_GUTTER } from '@/src/lib/layout';

export default function ResetPasswordScreen() {
  const { isDark } = useAppTheme();
  const styles = isDark ? darkStyles : lightStyles;
  const placeholderColor = isDark ? '#94A3B8' : '#84938C';
  const { session, ready, recoveryError, finishRecovery } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save() {
    if (busy || !session) return;
    setBusy(true); setError('');
    try {
      await changePassword(supabase, password, confirmation);
      setPassword(''); setConfirmation(''); setSaved(true); finishRecovery();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update password.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.page}><View style={styles.card}>
    <Text style={styles.title}>Choose a new password</Text>
    {saved ? <><Text style={styles.body}>Password updated successfully.</Text><Pressable accessibilityRole="button" accessibilityLabel="Continue to your households" onPress={() => router.replace('/')}><Text style={styles.link}>Continue to your households</Text></Pressable></> : <>
      {ready && !session && <Text style={styles.body}>Open the latest recovery link from your email to continue.</Text>}
      {!!(error || recoveryError) && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>
          {error || recoveryError}
        </Text>
      )}
      <TextInput style={styles.input} accessibilityLabel="New password" placeholder="New password" placeholderTextColor={placeholderColor} secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} accessibilityLabel="Confirm new password" placeholder="Confirm new password" placeholderTextColor={placeholderColor} secureTextEntry autoCapitalize="none" value={confirmation} onChangeText={setConfirmation} />
      <Pressable accessibilityRole="button" disabled={busy || !session || !!recoveryError} onPress={save}><Text style={styles.link}>{busy ? 'Saving…' : 'Save new password'}</Text></Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Request another recovery email"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => { finishRecovery(); router.replace('/(auth)/forgot-password' as any); }}
      >
        <Text style={styles.link}>Request another recovery email</Text>
      </Pressable>
    </>}
  </View></SafeAreaView>;
}
const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8F4', paddingHorizontal: APP_GUTTER, paddingVertical: 24 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 20, paddingTop: 36 },
  title: { fontSize: 26, fontWeight: '700', color: '#153C2F' },
  body: { color: '#334C3E', lineHeight: 22 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#CBD5CE', borderRadius: 12, padding: 16, color: '#183B2D' },
  link: { color: '#087F5B', fontWeight: '700', paddingVertical: 12 },
  error: { color: '#B42318' },
});

const darkStyles = StyleSheet.create({
  page: { ...lightStyles.page, backgroundColor: '#020617' },
  card: lightStyles.card,
  title: { ...lightStyles.title, color: '#F8FAFC' },
  body: { ...lightStyles.body, color: '#94A3B8' },
  input: { ...lightStyles.input, backgroundColor: '#1E293B', borderColor: '#475569', color: '#F8FAFC' },
  link: { ...lightStyles.link, color: '#34D399' },
  error: { color: '#FDA29B' },
});
