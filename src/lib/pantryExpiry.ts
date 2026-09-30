import type { FoodItem } from '../types';
export type ExpiryGroup = 'all' | 'expired' | 'today' | 'soon';
export function localDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function ordinal(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time / 86400000 : null;
}
export function expiryDays(value: string | null | undefined, today: string): number | null {
  const end = value ? ordinal(value) : null;
  const start = ordinal(today);
  return end === null || start === null ? null : end-start;
}
export function expiryGroup(days: number | null): ExpiryGroup {
  if (days === null) return 'all';
  return days < 0 ? 'expired' : days === 0 ? 'today' : days <= 2 ? 'soon' : 'all';
}
export function expiryLabel(days: number | null): string {
  return days === null ? 'No date' : days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`;
}
export function pantryView(items: FoodItem[], today: string, zone = 'all', category = 'All', search = '', group: ExpiryGroup = 'all') {
  const query = search.trim().toLocaleLowerCase();
  const scoped = items.filter(item => (zone === 'all' || item.storageZone === zone) &&
    (category === 'All' || item.category === category) && item.name.toLocaleLowerCase().includes(query));
  const counts = { expired: 0, today: 0, soon: 0 };
  for (const item of scoped) {
    const bucket = expiryGroup(expiryDays(item.expiryDate, today));
    if (bucket !== 'all') counts[bucket]++;
  }
  const sorted = scoped.filter(item => group === 'all' || expiryGroup(expiryDays(item.expiryDate, today)) === group)
    .slice().sort((a,b) => {
      const left = expiryDays(a.expiryDate,today) ?? Infinity;
      const right = expiryDays(b.expiryDate,today) ?? Infinity;
      return (left === right ? 0 : left-right) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  return { items: sorted, counts };
}
