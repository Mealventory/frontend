import type { FoodItem } from '../types';
import { expiryDays } from './pantryExpiry';

export type TimelineGroupKey = 'expired' | 'today' | 'tomorrow' | 'week' | 'later' | 'unknown';
export type CalendarTone = 'critical' | 'soon' | 'fresh';

export interface CalendarCell {
  date: string;
  day: number;
  count: number;
  tone: CalendarTone | null;
}

export interface TimelineGroups {
  expired: FoodItem[];
  today: FoodItem[];
  tomorrow: FoodItem[];
  week: FoodItem[];
  later: FoodItem[];
  unknown: FoodItem[];
}

function isDateOnly(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function sortByExpiry(items: FoodItem[], today: string): FoodItem[] {
  return items.slice().sort((a, b) => {
    const left = expiryDays(a.expiryDate, today) ?? Infinity;
    const right = expiryDays(b.expiryDate, today) ?? Infinity;
    return (left === right ? 0 : left - right) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export function expiryTimeline(items: FoodItem[], today: string): TimelineGroups {
  const groups: TimelineGroups = {
    expired: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
    unknown: [],
  };

  for (const item of items) {
    const days = expiryDays(item.expiryDate, today);
    if (days === null) groups.unknown.push(item);
    else if (days < 0) groups.expired.push(item);
    else if (days === 0) groups.today.push(item);
    else if (days === 1) groups.tomorrow.push(item);
    else if (days <= 7) groups.week.push(item);
    else groups.later.push(item);
  }

  groups.expired = sortByExpiry(groups.expired, today);
  groups.today = sortByExpiry(groups.today, today);
  groups.tomorrow = sortByExpiry(groups.tomorrow, today);
  groups.week = sortByExpiry(groups.week, today);
  groups.later = sortByExpiry(groups.later, today);
  groups.unknown = groups.unknown.slice().sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return groups;
}

function toneForDays(days: number | null): CalendarTone | null {
  if (days === null) return null;
  if (days <= 1) return 'critical';
  if (days <= 7) return 'soon';
  return 'fresh';
}

function strongerTone(left: CalendarTone | null, right: CalendarTone | null): CalendarTone | null {
  const rank: Record<CalendarTone, number> = { critical: 3, soon: 2, fresh: 1 };
  if (!left) return right;
  if (!right) return left;
  return rank[left] >= rank[right] ? left : right;
}

export function calendarCells(items: FoodItem[], today: string, year: number, month: number): Array<CalendarCell | null> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return [];

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  const counts = new Map<string, number>();
  const tones = new Map<string, CalendarTone | null>();

  for (const item of items) {
    const date = item.expiryDate;
    if (!isDateOnly(date) || !date.startsWith(prefix)) continue;
    counts.set(date, (counts.get(date) || 0) + 1);
    tones.set(date, strongerTone(tones.get(date) || null, toneForDays(expiryDays(date, today))));
  }

  const cells: Array<CalendarCell | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= dayCount; day++) {
    const date = `${prefix}${String(day).padStart(2, '0')}`;
    cells.push({
      date,
      day,
      count: counts.get(date) || 0,
      tone: tones.get(date) || null,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function itemsForDate(items: FoodItem[], date: string): FoodItem[] {
  if (!isDateOnly(date)) return [];
  return items
    .filter((item) => item.expiryDate === date)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}
