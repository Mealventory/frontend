import { supabase } from "./supabase";

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, "");

if (!backendUrl) {
  throw new Error("Missing EXPO_PUBLIC_BACKEND_URL");
}

export interface Household {
  id: string;
  name: string;
  invite_code: string | null;
  role: "owner" | "admin" | "member";
}

export interface HouseholdItem {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  quantity: number | string;
  unit: string;
  expiry_date: string | null;
  status: "active" | "consumed" | "discarded";
  storage_location_id: string | null;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("You are not authenticated.");
  }

  return data.session.access_token;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  householdId?: string,
): Promise<T> {
  const token = await getAccessToken();

  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${token}`);

  if (householdId) {
    headers.set("X-Household-ID", householdId);
  }

  const response = await fetch(`${backendUrl}/api/v1${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
        ? data.detail
        : typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof data.message === "string"
          ? data.message
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export async function registerBackendUser() {
  return apiRequest("/users/register", {
    method: "POST",
  });
}

export async function getHouseholds() {
  return apiRequest<Household[]>("/households/me");
}

export async function createHousehold(name: string) {
  return apiRequest<Household>("/households", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function joinHousehold(inviteCode: string) {
  return apiRequest<Household>("/households/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export async function getHouseholdItems(householdId: string) {
  return apiRequest<HouseholdItem[]>("/items", {}, householdId);
}