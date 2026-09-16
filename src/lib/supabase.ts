import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// First live slice: sessions stay in memory. Reloading requires sign-in again.
// Never put a service-role key, JWT signing secret, or database password here.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
