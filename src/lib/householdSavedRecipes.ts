import type { Recipe } from '../types';
const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export async function householdSavedRecipes(token: string, household: string, action: 'list' | 'save' | 'remove' = 'list', recipe?: Recipe): Promise<Recipe[]> {
  if (!base) throw new Error('The backend connection is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api/v1/recipes/saved${action === 'remove' ? '/remove' : ''}`, {
      method: action === 'list' ? 'GET' : action === 'save' ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household, 'Content-Type': 'application/json' },
      body: recipe ? JSON.stringify(recipe) : undefined, signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Please sign in again.');
      if (response.status === 403) throw new Error('You no longer have access to this household.');
      throw new Error('Could not sync household recipes. Check the backend and try again.');
    }
    return response.status === 204 ? [] : await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Recipe sync timed out. Refresh before retrying; your change may have been saved.');
    throw error;
  } finally { clearTimeout(timer); }
}
