// Year-first input avoids silently swapping day and month across locales.
export function normalizeExpiryDate(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/) || value.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})$/);
  if (!match) throw new Error('Use year, month, day: 20270125, 2027/01/25 or 2027-01-25.');
  const [, y, m, d] = match;
  const normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number(y) < 1 || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error('That date does not exist. Please choose a valid date.');
  }
  return normalized;
}
