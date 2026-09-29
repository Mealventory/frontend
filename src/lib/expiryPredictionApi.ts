const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export type Prediction = { predicted_expiry_date: string | null; source: 'model' | 'unavailable'; explanation: string };
export async function predictExpiry(token: string, household: string, input: {name:string; storage_zone:string; purchase_date:string; item_id?:string; avg_shelf_life_days?:number}, signal: AbortSignal): Promise<Prediction> {
  if (!base) throw new Error('The backend connection is not configured.');
  const response = await fetch(`${base}/api/v1/items/predict-expiry`, {method:'POST', headers:{Authorization:`Bearer ${token}`, 'X-Household-ID':household,'Content-Type':'application/json'}, body:JSON.stringify(input), signal});
  if (!response.ok) throw new Error(response.status === 403 ? 'You no longer have access to this household.' : 'Could not predict this date. Check the details and try again.');
  return response.json();
}
