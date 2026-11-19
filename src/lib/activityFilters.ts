import type { Member } from "./householdApi";
import type { ActivityAction, HouseholdActivityEvent } from "./activityApi";

export type ActivityActionFilter = ActivityAction | "all";

export const ACTIVITY_ACTION_FILTERS: ReadonlyArray<{
  value: ActivityActionFilter;
  label: string;
}> = [
  { value: "all", label: "All actions" },
  { value: "added", label: "Added" },
  { value: "updated", label: "Updated" },
  { value: "moved", label: "Moved" },
  { value: "consumed", label: "Consumed" },
  { value: "discarded", label: "Discarded" },
  { value: "deleted", label: "Deleted" },
  { value: "shopping_added", label: "Shopping added" },
];

export type ActivityActorOption = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
};

/** A short attribution label, with a safe fallback for departed members. */
export function activityActorInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Include current members and historical activity authors who have since left. */
export function activityActorOptions(
  events: HouseholdActivityEvent[],
  members: Pick<Member, "user_id" | "display_name" | "username" | "email" | "avatar_url">[] = [],
): ActivityActorOption[] {
  const options = new Map<string, ActivityActorOption>();
  for (const event of events) {
    if (!event.actor_user_id) continue;
    options.set(event.actor_user_id, {
      userId: event.actor_user_id,
      name: event.actor_name?.trim() || "Household member",
    });
  }
  for (const member of members) {
    if (!member.user_id) continue;
    const previous = options.get(member.user_id);
    options.set(member.user_id, {
      userId: member.user_id,
      name:
        member.display_name?.trim() ||
        member.username?.trim() ||
        member.email?.split("@")[0]?.trim() ||
        previous?.name ||
        "Household member",
      avatarUrl: member.avatar_url,
    });
  }
  return Array.from(options.values()).sort((a, b) =>
    a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
  );
}

/** Filter only the events fetched for the selected household, preserving order. */
export function filterActivityEvents(
  events: HouseholdActivityEvent[],
  action: ActivityActionFilter,
  actorUserId: string,
): HouseholdActivityEvent[] {
  return events.filter(
    (event) =>
      (action === "all" || event.action === action) &&
      (actorUserId === "all" || event.actor_user_id === actorUserId),
  );
}
