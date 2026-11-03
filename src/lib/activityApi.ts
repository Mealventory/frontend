const backendUrl = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

export type ActivityAction =
  | "added"
  | "updated"
  | "moved"
  | "consumed"
  | "discarded"
  | "deleted"
  | "shopping_added";

export type WasteReason =
  | "expired"
  | "spoiled"
  | "bought_too_much"
  | "didnt_like"
  | "other";

export interface HouseholdActivityEvent {
  id: string;
  household_id: string;
  actor_user_id: string;
  actor_name: string;
  action: ActivityAction;
  entity_type: "inventory" | "shopping";
  entity_id: string | null;
  item_name: string;
  created_at: string;
  reason?: WasteReason | null;
}

export async function fetchHouseholdActivity(
  token: string,
  householdId: string,
  limit = 50,
  fetchFn: typeof fetch = fetch,
): Promise<HouseholdActivityEvent[]> {
  if (!backendUrl) throw new Error("The backend connection is not configured.");
  if (!token) throw new Error("Please sign in again.");
  if (!householdId) throw new Error("Choose a household first.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchFn(
      `${backendUrl}/api/v1/activity?limit=${encodeURIComponent(String(limit))}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Household-ID": householdId,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error("Please sign in again.");
      if (response.status === 403) {
        throw new Error("You no longer have access to this household.");
      }
      throw new Error("Could not load household activity. Please try again.");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Activity request timed out. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function activityDescription(event: HouseholdActivityEvent): string {
  switch (event.action) {
    case "added":
      return `added ${event.item_name}`;
    case "updated":
      return `updated ${event.item_name}`;
    case "moved":
      return `moved ${event.item_name}`;
    case "consumed":
      return `marked ${event.item_name} as consumed`;
    case "discarded":
      return `marked ${event.item_name} as discarded`;
    case "deleted":
      return `removed ${event.item_name}`;
    case "shopping_added":
      return `added ${event.item_name} to Shopping`;
    default:
      return event.item_name;
  }
}

export function relativeActivityTime(
  value: string,
  nowMs = Date.now(),
): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const seconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString();
}
