import type { InventoryRow } from './inventoryApi';

export type Deduction = { item_id: string; quantity: string; expected_quantity: string; unit: string };
export type CompletionRequest = { completion_id: string; recipe_id: string; recipe_name: string; items: Deduction[] };
export type CompletionResult = { completion_id: string; recipe_name: string; items: { item_id: string; name: string; used: string; remaining: string; unit: string; status: string }[] };
export type CompletionRecord = { request: CompletionRequest; result?: CompletionResult };

const normalize = (name: string) => name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
export function suggestedInventory(ingredients: string[], rows: InventoryRow[]) {
  // No fuzzy matching: branded/ambiguous names can be chosen explicitly in the review.
  const names = new Set(ingredients.map(normalize));
  return rows.filter(row => names.has(normalize(row.name)));
}

export function reviewedDeductions(rows: InventoryRow[], amounts: Record<string, string>): Deduction[] {
  return rows.flatMap(row => {
    const input = (amounts[row.id] || '').trim();
    if (!input) return [];
    if (!/^\d+(?:\.\d{1,3})?$/.test(input) || Number(input) <= 0 || Number(input) > Number(row.quantity)) {
      throw new Error(`Enter an amount greater than 0 and no more than ${row.quantity} ${row.unit} for ${row.name}.`);
    }
    return [{ item_id: row.id, quantity: input, expected_quantity: String(row.quantity), unit: row.unit }];
  });
}

export function newCompletionId() {
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export class CompletionError extends Error {
  constructor(message: string, public canReviewAgain = false) { super(message); }
}

export async function submitCompletion(token: string, household: string, request: CompletionRequest): Promise<CompletionResult> {
  const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!base) throw new CompletionError('The backend connection is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/api/v1/recipes/complete`, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) throw new CompletionError('Please sign in again, then retry this meal.');
      if (response.status === 403) throw new CompletionError('You no longer have access to this household.');
      if (response.status === 404 && body.detail === 'Not Found') throw new CompletionError('The backend needs the recipe completion update.');
      throw new CompletionError(typeof body.detail === 'string' ? body.detail : 'Could not save this meal. Retry to check its status.', [404, 409, 422].includes(response.status));
    }
    return await response.json();
  } catch (error) {
    if (error instanceof CompletionError) throw error;
    throw new CompletionError('Connection interrupted. Retry this same meal to check whether it saved; it will not be deducted twice.');
  } finally { clearTimeout(timer); }
}
