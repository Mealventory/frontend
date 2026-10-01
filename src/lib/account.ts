import type { SupabaseClient } from '@supabase/supabase-js';

export function accountClient(client: SupabaseClient | null) {
  if (!client) throw new Error('Sign-in is not configured yet.');
  return client;
}

export function usernameFor(email: string, username = '') {
  return username.trim() || email.trim().split('@')[0];
}

let signOutCleanup: (() => Promise<void>) | undefined;
export function setSignOutCleanup(cleanup: () => Promise<void>) {
  signOutCleanup = cleanup;
  return () => { if (signOutCleanup === cleanup) signOutCleanup = undefined; };
}

export async function signOutAccount(client: SupabaseClient | null) {
  const account = accountClient(client);
  await signOutCleanup?.();
  const { error } = await account.auth.signOut();
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

export interface SignUpFormValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignUpValidationErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function validateSignUp(values: SignUpFormValues): {
  isValid: boolean;
  errors: SignUpValidationErrors;
} {
  const errors: SignUpValidationErrors = {};
  if (!values.displayName || !values.displayName.trim()) {
    errors.displayName = 'Display name is required.';
  }
  const trimmedEmail = values.email ? values.email.trim() : '';
  if (!trimmedEmail) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export async function signUpAccount(
  client: SupabaseClient | null,
  data: { email: string; password: string; displayName: string }
) {
  const account = accountClient(client);
  const trimmedEmail = data.email.trim();
  const trimmedName = data.displayName.trim();
  const username = usernameFor(trimmedEmail, trimmedName);
  return await account.auth.signUp({
    email: trimmedEmail,
    password: data.password,
    options: {
      data: {
        display_name: trimmedName,
        username,
      },
    },
  });
}

