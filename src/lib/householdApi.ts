export type HouseholdRole = 'owner' | 'admin' | 'member';
export type Household = { id: string; name: string; invite_code: string | null; role: HouseholdRole };
export type Member = {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  joined_at?: string | null;
  last_active_at?: string | null;
};

const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export const backendConfigured = Boolean(backendUrl);

export async function householdRequest<T>(
  path: string,
  token: string,
  body?: object,
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
): Promise<T> {
  if (!backendUrl) throw new Error('The app connection is not configured yet. Follow the frontend setup guide.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const httpMethod = method || (body ? 'POST' : 'GET');
    const response = await fetch(`${backendUrl}/api/v1/households${path}`, {
      method: httpMethod,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your sign-in could not be verified. Sign out and sign in again.');
      if (response.status === 404 && path === '/join') throw new Error('That invite code wasn’t found. Check the code and try again.');
      if (response.status === 404 && path.includes('/members')) throw new Error('Household member not found.');
      if (response.status === 403) throw new Error(typeof data?.detail === 'string' ? data.detail : 'You do not have permission to perform this household action.');
      if (response.status === 409) throw new Error(typeof data?.detail === 'string' ? data.detail : 'The last owner cannot leave or be demoted; appoint another owner first.');
      if ([502, 503, 530].includes(response.status) && backendUrl.includes('.trycloudflare.com')) {
        throw new Error('The temporary backend tunnel is unavailable. Restart the backend tunnel, update the app connection address, and restart Expo.');
      }
      if (response.status >= 500) throw new Error('The household service is unavailable. Please try again shortly.');
      throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not complete that request. Please try again.');
    }
    return data as T;
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw new Error('The backend request timed out. Check that the backend and its tunnel are running, then tap Retry.');
    if (error instanceof TypeError) throw new Error('Could not reach the backend. Check your connection and that the backend is running.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function getHouseholdMembers(householdId: string, token: string): Promise<Member[]> {
  return householdRequest<Member[]>(`/${householdId}/members`, token);
}

export async function updateHouseholdMemberRole(
  householdId: string,
  userId: string,
  role: HouseholdRole,
  token: string
): Promise<Member> {
  return householdRequest<Member>(`/${householdId}/members/${userId}`, token, { role }, 'PATCH');
}

export async function removeHouseholdMember(
  householdId: string,
  userId: string,
  token: string
): Promise<void> {
  return householdRequest<void>(`/${householdId}/members/${userId}`, token, undefined, 'DELETE');
}

