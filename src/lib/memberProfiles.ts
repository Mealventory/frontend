import type { HouseholdRole, Member } from './householdApi';

export interface MemberProfile {
  id: string;
  userId: string;
  householdId: string;
  role: HouseholdRole;
  displayName: string;
  username?: string;
  email?: string;
  initials: string;
  avatarUrl?: string;
  joinedAt: string;
  recentActivity: string;
  isCurrentUser: boolean;
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'MB';
  const cleaned = name.trim();
  if (!cleaned) return 'MB';

  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0] || '';
    const second = parts[1][0] || '';
    const initials = (first + second).toUpperCase();
    if (initials) return initials;
  }

  // Single word: use first 2 letters if alphanumeric
  const alphaNum = cleaned.replace(/[^a-zA-Z0-9]/g, '');
  if (alphaNum.length >= 2) {
    return alphaNum.slice(0, 2).toUpperCase();
  }
  if (alphaNum.length === 1) {
    return alphaNum.toUpperCase();
  }
  return 'MB';
}

export function formatRole(role?: HouseholdRole | string | null): 'Owner' | 'Admin' | 'Member' {
  if (!role) return 'Member';
  const lower = role.toLowerCase();
  if (lower === 'owner') return 'Owner';
  if (lower === 'admin') return 'Admin';
  return 'Member';
}

export function getRoleBadgeVariant(role?: HouseholdRole | string | null): 'brand' | 'soon' | 'neutral' {
  if (!role) return 'neutral';
  const lower = role.toLowerCase();
  if (lower === 'owner') return 'brand';
  if (lower === 'admin') return 'soon';
  return 'neutral';
}

export function formatJoinDate(dateStr?: string | null): string {
  if (!dateStr) return 'Joined recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Joined recently';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Joined recently';
  }
}

// In-memory profile cache for resolving known collaborator identities
const profileCache = new Map<string, Partial<MemberProfile>>();

export function cacheMemberProfile(userId: string, profile: Partial<MemberProfile>): void {
  if (!userId) return;
  const existing = profileCache.get(userId) || {};
  profileCache.set(userId, { ...existing, ...profile });
}

export function getCachedMemberProfile(userId: string): Partial<MemberProfile> | undefined {
  return profileCache.get(userId);
}

export function clearMemberProfileCache(): void {
  profileCache.clear();
}

export interface UserSessionLike {
  user?: {
    id?: string;
    email?: string | null;
    user_metadata?: {
      display_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
      [key: string]: any;
    } | null;
    created_at?: string | null;
  } | null;
}

export function resolveMemberProfile(
  member: Member,
  currentUserSession?: UserSessionLike | null
): MemberProfile {
  const currentUserId = currentUserSession?.user?.id;
  const isCurrentUser = Boolean(currentUserId && member.user_id === currentUserId);
  const cached = getCachedMemberProfile(member.user_id);

  let displayName = '';
  let username: string | undefined = undefined;
  let email: string | undefined = undefined;
  let avatarUrl: string | undefined = undefined;
  let recentActivity = 'Active in kitchen';
  let joinedAt = formatJoinDate(member.joined_at || member.created_at);

  if (isCurrentUser) {
    const metadata = currentUserSession?.user?.user_metadata;
    const sessionEmail = currentUserSession?.user?.email || undefined;
    displayName =
      metadata?.display_name?.trim() ||
      metadata?.username?.trim() ||
      sessionEmail?.split('@')[0] ||
      'You';
    username = metadata?.username?.trim() || undefined;
    email = sessionEmail;
    avatarUrl = metadata?.avatar_url || undefined;
    recentActivity = 'Active now';
    if (currentUserSession?.user?.created_at && !member.created_at && !member.joined_at) {
      joinedAt = formatJoinDate(currentUserSession.user.created_at);
    }
  } else if (member.display_name?.trim()) {
    displayName = member.display_name.trim();
    username = member.username?.trim() || undefined;
    email = member.email || undefined;
    avatarUrl = member.avatar_url || undefined;
    recentActivity = member.last_active_at || 'Active recently';
  } else if (cached?.displayName) {
    displayName = cached.displayName;
    username = cached.username;
    email = cached.email;
    avatarUrl = cached.avatarUrl;
    recentActivity = cached.recentActivity || 'Active recently';
    if (cached.joinedAt) joinedAt = cached.joinedAt;
  } else if (member.username?.trim()) {
    displayName = member.username.trim();
    username = member.username.trim();
    email = member.email || undefined;
  } else if (member.email?.trim()) {
    displayName = member.email.split('@')[0];
    email = member.email.trim();
  } else {
    // Missing profile info graceful fallback
    const idSegment = member.user_id ? member.user_id.replace(/-/g, '').slice(0, 6) : 'unknown';
    displayName = `Member ${idSegment}`;
  }

  const initials = getInitials(displayName || (member.user_id ? member.user_id.slice(0, 2) : 'MB'));

  return {
    id: member.user_id,
    userId: member.user_id,
    householdId: member.household_id,
    role: member.role || 'member',
    displayName,
    username,
    email,
    initials,
    avatarUrl,
    joinedAt,
    recentActivity: member.last_active_at || recentActivity,
    isCurrentUser,
  };
}

export function resolveMemberList(
  members: Member[],
  currentUserSession?: UserSessionLike | null
): MemberProfile[] {
  const resolved = members.map((m) => resolveMemberProfile(m, currentUserSession));

  // Prioritize current user first, then Owners, then Admins, then Members
  const rolePriority: Record<HouseholdRole, number> = {
    owner: 1,
    admin: 2,
    member: 3,
  };

  return resolved.sort((a, b) => {
    if (a.isCurrentUser && !b.isCurrentUser) return -1;
    if (!a.isCurrentUser && b.isCurrentUser) return 1;

    const roleDiff = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;

    return a.displayName.localeCompare(b.displayName);
  });
}
