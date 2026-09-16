export type HouseholdRole = 'owner' | 'admin' | 'member';
export type Household = { id: string; name: string; invite_code: string | null; role: HouseholdRole };
export type Member = { household_id: string; user_id: string; role: HouseholdRole };

const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export const backendConfigured = Boolean(backendUrl);

export async function householdRequest<T>(path: string, token: string, body?: object): Promise<T> {
  if (!backendUrl) throw new Error('The app connection is not configured yet. Follow the frontend setup guide.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${backendUrl}/api/v1/households${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your sign-in could not be verified. Sign out and sign in again.');
      if (response.status === 404 && path === '/join') throw new Error('That invite code wasn’t found. Check the code and try again.');
      if ([502, 503, 530].includes(response.status) && backendUrl.includes('.trycloudflare.com')) {
        throw new Error('The temporary backend tunnel is unavailable. Restart the backend tunnel, update the app connection address, and restart Expo.');
      }
      if (response.status >= 500) throw new Error('The household service is unavailable. Please try again shortly.');
      throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not complete that request. Please try again.');
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The connection timed out. Check that your phone and computer are on the same Wi-Fi.');
    if (error instanceof TypeError) throw new Error('Could not reach the backend. Check your connection and that the backend is running.');
    throw error;
  } finally { clearTimeout(timeout); }
}
