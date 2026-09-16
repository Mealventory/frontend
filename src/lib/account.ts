import type { SupabaseClient } from '@supabase/supabase-js';

export function accountClient(client: SupabaseClient | null) {
  if (!client) throw new Error('Sign-in is not configured yet.');
  return client;
}

export function usernameFor(email: string, username = '') {
  return username.trim() || email.trim().split('@')[0];
}

export async function signOutAccount(client: SupabaseClient | null) {
  const { error } = await accountClient(client).auth.signOut();
  if (error) throw error;
}

export async function changePassword(client: SupabaseClient | null, password: string, confirmation: string) {
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  const { error } = await accountClient(client).auth.updateUser({ password });
  if (error) throw error;
}

export async function acceptRecoveryLink(client: SupabaseClient | null, url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.hash.slice(1));
  const recovery = params.get('type') === 'recovery' || parsed.pathname.endsWith('/reset-password') || parsed.hostname === 'reset-password';
  if (!recovery) return false;
  if (params.has('error') || parsed.searchParams.has('error')) {
    throw new Error('This recovery link is invalid or expired. Please request another email.');
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const code = parsed.searchParams.get('code');
  if (access_token && refresh_token) {
    const { error } = await accountClient(client).auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return true;
  }
  if (code) {
    const { error } = await accountClient(client).auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  return false;
}
