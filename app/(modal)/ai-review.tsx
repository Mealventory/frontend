import { normalizeExpiryDate } from '@/src/lib/expiryDate';
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import { supabase } from "@/src/lib/supabase";
import { inventoryRequest, batchCreateInventoryItems, NewItem } from "@/src/lib/inventoryApi";
import { ScannedItem } from "@/src/lib/scanApi";
import { resolveScanZone } from "@/src/lib/storageZones";
import { StorageZone } from "@/src/types";
import { isScannerMode, recordScanSuccess } from "@/src/lib/scanHistory";
import {
  ReceiptReviewSheet,
  ReviewItemState,
  getItemEmoji,
} from "@/src/components/organisms/ReceiptReviewSheet";

export { ReviewItemState, getItemEmoji };

export function parseRawScanItems(rawParam?: string, rawBarcode?: string): ReviewItemState[] {
  if (rawParam) {
    try {
      const parsed = JSON.parse(rawParam);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: ScannedItem, index: number) => ({
          id: item.id || `scanned-${index}-${Date.now()}`,
          name: item.name ?? `Detected Item ${index + 1}`,
          category: item.category || "Pantry",
          quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
          unit: item.unit || "units",
          expiry_date: item.expiry_date || "",
          storageZone: resolveScanZone(item.storageZone, item.category || "Pantry"),
          confidence: typeof item.confidence === "number" ? item.confidence : undefined,
          imageRef: item.imageRef,
          confirmed: !(typeof item.confidence === "number" && item.confidence < 0.7),
          isEditing: !item.name || (typeof item.confidence === "number" && item.confidence < 0.7),
        }));
      }
    } catch {
      // Fall through to rawBarcode check if json parse fails
    }
  }

  if (rawBarcode) {
    return [
      {
        id: `scanned-barcode-${Date.now()}`,
        name: `Barcode: ${rawBarcode}`,
        category: "Pantry",
        quantity: 1,
        unit: "units",
        expiry_date: "",
        storageZone: "pantry",
        confidence: 1.0,
        confirmed: true,
        isEditing: false,
      },
    ];
  }

  return [];
}

export async function saveReviewedItems(
  items: ReviewItemState[],
  save: (payload: NewItem) => Promise<unknown>,
) {
  const savedIds: string[] = [];
  const errors: string[] = [];
  for (const item of items.filter((item) => item.confirmed)) {
    try {
      if (!item.name.trim()) throw new Error("Enter the food name before saving.");
      await save({
        name: item.name.trim(),
        category: item.category.trim() || "Pantry",
        quantity: item.quantity,
        unit: item.unit.trim() || "units",
        expiry_date: normalizeExpiryDate(item.expiry_date),
        storage_zone: item.storageZone,
        image_ref: item.imageRef ?? null,
      });
      savedIds.push(item.id);
    } catch (error) {
      errors.push(item.name + ": " + (error instanceof Error ? error.message : "Failed to add"));
    }
  }
  return { savedIds, errors };
}

export async function batchSaveReviewedItems(
  items: ReviewItemState[],
  batchSave: (payloads: NewItem[]) => Promise<unknown>,
): Promise<{ savedIds: string[]; errors: string[] }> {
  const confirmed = items.filter((item) => item.confirmed);
  if (confirmed.length === 0) return { savedIds: [], errors: [] };

  try {
    const payloads: NewItem[] = confirmed.map((item) => {
      if (!item.name.trim()) throw new Error("Enter the food name before saving.");
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Enter a positive quantity.");
      return {
        name: item.name.trim(), category: item.category.trim() || "Pantry",
        quantity: item.quantity, unit: item.unit.trim() || "units",
        expiry_date: normalizeExpiryDate(item.expiry_date), storage_zone: item.storageZone,
        image_ref: item.imageRef ?? null,
      };
    });
    await batchSave(payloads);
    return {
      savedIds: confirmed.map((i) => i.id),
      errors: [],
    };
  } catch (error) {
    return {
      savedIds: [],
      errors: [(error instanceof Error ? error.message : "Batch save failed")],
    };
  }
}

export default function AIReviewModal() {
  const router = useRouter();
  const { session, household } = useAuth();
  const { refreshInventory } = useInventory();
  const params = useLocalSearchParams<{
    items?: string;
    mode?: string;
    barcode?: string;
    barcodeType?: string;
    historyReplay?: string;
  }>();

  // Parse items from scanner navigation route params
  const initialItems = useMemo(
    () => parseRawScanItems(params.items, params.barcode),
    [params.items, params.barcode]
  );

  const [items, setItems] = useState<ReviewItemState[]>(initialItems);
  const historyRecorded = useRef(false);
  const savingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    if (
      historyRecorded.current ||
      params.historyReplay === "1" ||
      !session?.user.id ||
      !household?.id ||
      initialItems.length === 0
    ) {
      return;
    }

    historyRecorded.current = true;
    const mode = isScannerMode(params.mode) ? params.mode : "food";
    const historyItems: ScannedItem[] = initialItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiry_date: item.expiry_date || null,
      confidence: item.confidence,
      storageZone: item.storageZone,
      imageRef: item.imageRef,
    }));

    void recordScanSuccess(
      { userId: session.user.id, householdId: household.id },
      mode,
      historyItems,
      params.barcode,
    );
  }, [
    household?.id,
    initialItems,
    params.barcode,
    params.historyReplay,
    params.mode,
    session?.user.id,
  ]);

  const confirmedItems = items.filter((i) => i.confirmed);

  const handleToggleConfirm = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const handleSelectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, confirmed: true })));
  };

  const handleDeselectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, confirmed: false })));
  };

  const handleToggleEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEditing: !item.isEditing } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ReviewItemState>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const getAccessToken = async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    const result = await supabase?.auth.getSession();
    if (result?.data?.session?.access_token) return result.data.session.access_token;
    throw new Error("Please sign in again.");
  };

  const handleAddToPantry = async () => {
    if (savingRef.current) return;
    const selected = items.length === 1 ? [{ ...items[0], confirmed: true }] : confirmedItems;
    if (selected.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to add to your pantry.");
      return;
    }

    if (!household?.id) {
      setErrorMessage("Please choose a household first.");
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await getAccessToken();
      const { savedIds, errors } = await batchSaveReviewedItems(selected,
        payloads => batchCreateInventoryItems(token, household.id, payloads));
      if (errors.length) { setErrorMessage(errors.join("\n")); return; }
      setItems(previous => previous.filter(item => !savedIds.includes(item.id)));
      setSuccessCount(previous => (previous || 0) + savedIds.length);
      await refreshInventory();
      router.replace("/(app)/(tabs)" as any);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not save items to inventory.");
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <ReceiptReviewSheet
      items={items}
      mode={params.mode}
      onToggleConfirm={handleToggleConfirm}
      onRemoveItem={handleRemoveItem}
      onToggleEdit={handleToggleEdit}
      onUpdateItem={handleUpdateItem}
      onSubmit={handleAddToPantry}
      submitting={submitting}
      errorMessage={errorMessage}
      onDismissError={() => setErrorMessage(null)}
      successCount={successCount}
      onCancel={() => router.back()}
      onScanAgain={() => router.replace("/(modal)/scanner" as any)}
      onManualAdd={() => router.replace("/(modal)/manual-add" as any)}
      onSelectAll={handleSelectAll}
      onDeselectAll={handleDeselectAll}
    />
  );
}
