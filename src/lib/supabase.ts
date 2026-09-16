import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure any existing auth sessions complete
WebBrowser.maybeCompleteAuthSession();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// First live slice: sessions stay in memory. Reloading requires sign-in again.
// Never put a service-role key, JWT signing secret, or database password here.
export const supabase = url && key ? createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
}) : null;

export async function signInWithOAuthProvider(provider: 'google' | 'apple') {
  if (!supabase) {
    throw new Error('Sign-in is not configured yet.');
  }

  if (Platform.OS === 'web') {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  }

  // Native (iOS/Android): deep link redirect
  const redirectUrl = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No authorization URL returned from Supabase.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code as string | undefined;
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    } else if (result.url.includes('access_token=')) {
      const matchToken = result.url.match(/access_token=([^&]+)/);
      const matchRefresh = result.url.match(/refresh_token=([^&]+)/);
      if (matchToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: decodeURIComponent(matchToken[1]),
          refresh_token: matchRefresh ? decodeURIComponent(matchRefresh[1]) : '',
        });
        if (sessionError) throw sessionError;
      }
    }
  }

  return result;
}

