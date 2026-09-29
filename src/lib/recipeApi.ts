import type { Recipe } from '../types';
const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export async function generateRecipes(token: string, household: string, signal: AbortSignal): Promise<Recipe[]> {
  if (!base) throw new Error('The backend connection is not configured.');
  const response = await fetch(`${base}/api/v1/recipes/`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household }, signal,
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Please sign in again.');
    if (response.status === 403) throw new Error('You no longer have access to this household.');
    throw new Error('Could not generate recipes. Please try again shortly.');
  }
  const data = await response.json();
  return data.recipes.map((r: any, index: number) => {
    const have: string[] = [...r.uses_priority_items, ...r.uses_other_items];
    const missing: string[] = r.optional_pantry_basics;
    return { id: `generated-${Date.now()}-${index}`, name: r.title,
      time: `${r.prep_time_minutes + r.cook_time_minutes} min`, difficulty: r.difficulty,
      uses: [...have, ...missing], priorityIngredients: r.uses_priority_items, missingIngredients: missing,
      match: Math.round(100 * have.length / Math.max(1, have.length + missing.length)),
      emoji: '🍲', tag: 'Your pantry', description: r.waste_reduction_reason, steps: r.steps };
  });
}
