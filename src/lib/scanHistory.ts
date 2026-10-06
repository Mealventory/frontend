import { authStorageAdapter } from "./authStorage";
import type { ScannedItem, ScannerMode } from "./scanApi";

export type ScanHistoryStatus = "success" | "failed";

export interface ScanHistoryScope {
  userId: string;
  householdId: string;
}

export interface ScanHistoryEntry {
  id: string;
  mode: ScannerMode;
  status: ScanHistoryStatus;
  createdAt: string;
  items: ScannedItem[];
  error?: string;
  barcode?: string;
}

const MAX_HISTORY_ENTRIES = 40;
const STORAGE_PREFIX = "mealventory.scan-history.v1";

function historyKey(scope: ScanHistoryScope) {
  return `${STORAGE_PREFIX}.${scope.userId}.${scope.householdId}`;
}

export function isScannerMode(value: unknown): value is ScannerMode {
  return value === "food" || value === "receipt" || value === "tag" || value === "barcode";
}

export function scanModeLabel(mode: ScannerMode): string {
  if (mode === "food") return "Product";
  if (mode === "receipt") return "Receipt";
  if (mode === "tag") return "Tag";
  return "Barcode";
}

function isHistoryEntry(value: unknown): value is ScanHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ScanHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    isScannerMode(entry.mode) &&
    (entry.status === "success" || entry.status === "failed") &&
    typeof entry.createdAt === "string" &&
    Array.isArray(entry.items)
  );
}

export async function loadScanHistory(scope: ScanHistoryScope): Promise<ScanHistoryEntry[]> {
  if (!scope.userId || !scope.householdId) return [];
  const raw = await authStorageAdapter.getItem(historyKey(scope));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

async function prependScanHistory(
  scope: ScanHistoryScope,
  entry: ScanHistoryEntry,
): Promise<ScanHistoryEntry> {
  const current = await loadScanHistory(scope);
  const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(
    0,
    MAX_HISTORY_ENTRIES,
  );
  await authStorageAdapter.setItem(historyKey(scope), JSON.stringify(next));
  return entry;
}

function createHistoryId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function recordScanSuccess(
  scope: ScanHistoryScope,
  mode: ScannerMode,
  items: ScannedItem[],
  barcode?: string,
): Promise<ScanHistoryEntry> {
  return prependScanHistory(scope, {
    id: createHistoryId(),
    mode,
    status: "success",
    createdAt: new Date().toISOString(),
    items,
    barcode: barcode || undefined,
  });
}

export async function recordScanFailure(
  scope: ScanHistoryScope,
  mode: ScannerMode,
  error: string,
): Promise<ScanHistoryEntry> {
  return prependScanHistory(scope, {
    id: createHistoryId(),
    mode,
    status: "failed",
    createdAt: new Date().toISOString(),
    items: [],
    error: error.trim() || "Scan failed.",
  });
}

export async function getScanHistoryEntry(
  scope: ScanHistoryScope,
  id: string,
): Promise<ScanHistoryEntry | null> {
  const history = await loadScanHistory(scope);
  return history.find((entry) => entry.id === id) || null;
}

export function summarizeScanItems(items: ScannedItem[]): string {
  const names = items.map((item) => item.name?.trim()).filter(Boolean);
  if (names.length === 0) return "No items detected";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}
