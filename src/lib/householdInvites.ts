export const INVITE_CODE_LENGTH = 6;

export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH);
}

export function isValidInviteCode(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalizeInviteCode(value));
}

export function householdInviteLink(code: string): string {
  const normalized = normalizeInviteCode(code);
  if (!isValidInviteCode(normalized)) throw new Error('Invite code must contain 6 letters or numbers.');
  return `mealventory://join-household?code=${encodeURIComponent(normalized)}`;
}

export function householdInviteShareText(householdName: string, code: string): string {
  const normalized = normalizeInviteCode(code);
  const link = householdInviteLink(normalized);
  const name = householdName.trim() || 'my household';
  return `Join ${name} on Mealventory. Invite code: ${normalized}\n${link}`;
}
