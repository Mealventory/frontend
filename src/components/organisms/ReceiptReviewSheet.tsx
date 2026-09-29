import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, Button, Icon, Badge, Avatar, Checkbox } from "@/src/components/atoms";
import { FormField } from "@/src/components/molecules";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { StorageZone } from "@/src/types";

export interface ReviewItemState {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  storageZone: StorageZone;
  confidence?: number;
  confirmed: boolean;
  isEditing?: boolean;
}

export interface ReceiptReviewSheetProps {
  items: ReviewItemState[];
  onToggleConfirm: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onToggleEdit: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<ReviewItemState>) => void;
  onSubmit: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
  successCount?: number | null;
  mode?: string;
  onCancel?: () => void;
  onScanAgain?: () => void;
  onManualAdd?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function getItemEmoji(name: string, category: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("blueberry") || lower.includes("berries")) return "🫐";
  if (lower.includes("apple")) return "🍎";
  if (lower.includes("banana")) return "🍌";
  if (lower.includes("orange") || lower.includes("lemon") || lower.includes("citrus")) return "🍊";
  if (lower.includes("chicken") || lower.includes("beef") || lower.includes("meat") || lower.includes("pork")) return "🍗";
  if (lower.includes("fish") || lower.includes("salmon") || lower.includes("shrimp") || lower.includes("seafood")) return "🐟";
  if (lower.includes("milk") || lower.includes("dairy")) return "🥛";
  if (lower.includes("yogurt")) return "🫙";
  if (lower.includes("cheese") || lower.includes("cheddar")) return "🧀";
  if (lower.includes("egg")) return "🥚";
  if (lower.includes("bread") || lower.includes("toast") || lower.includes("bakery")) return "🍞";
  if (lower.includes("tomato")) return "🍅";
  if (lower.includes("spinach") || lower.includes("lettuce") || lower.includes("salad") || lower.includes("carrot")) return "🥬";
  if (lower.includes("avocado")) return "🥑";
  if (lower.includes("pasta") || lower.includes("penne") || lower.includes("noodle")) return "🍝";
  if (lower.includes("protein") || lower.includes("shake") || lower.includes("beverage")) return "🥤";

  const catLower = category.toLowerCase();
  if (catLower.includes("produce")) return "🥦";
  if (catLower.includes("dairy")) return "🥛";
  if (catLower.includes("meat")) return "🥩";
  if (catLower.includes("bakery")) return "🥖";
  if (catLower.includes("beverage")) return "🧃";
  return "🍽️";
}

export function addDaysOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const STORAGE_ZONES: { id: StorageZone; label: string; icon: "Box" | "Refrigerator" | "Snowflake" | "Sparkles" }[] = [
  { id: "pantry", label: "Pantry", icon: "Box" },
  { id: "fridge", label: "Fridge", icon: "Refrigerator" },
  { id: "freezer", label: "Freezer", icon: "Snowflake" },
  { id: "spicerack", label: "Spices", icon: "Sparkles" },
];

const DATE_PRESETS = [
  { label: "+3d", days: 3 },
  { label: "+7d", days: 7 },
  { label: "+14d", days: 14 },
  { label: "+1mo", days: 30 },
];

export function ReceiptReviewSheet({
  items,
  onToggleConfirm,
  onRemoveItem,
  onToggleEdit,
  onUpdateItem,
  onSubmit,
  submitting = false,
  errorMessage = null,
  onDismissError,
  successCount = null,
  mode = "food",
  onCancel,
  onScanAgain,
  onManualAdd,
  onSelectAll,
  onDeselectAll,
}: ReceiptReviewSheetProps) {
  const confirmedItems = items.filter((i) => i.confirmed);
  const allConfirmed = items.length > 0 && confirmedItems.length === items.length;

  const modeBadge = React.useMemo(() => {
    switch (mode) {
      case "barcode":
        return "Barcode scan";
      case "receipt":
        return "Receipt OCR";
      case "tag":
        return "Tag scan";
      case "food":
      default:
        return "Product AI";
    }
  }, [mode]);

  // Empty items state
  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas p-6">
        <View className="flex-row items-center justify-between mb-4">
          {onCancel && (
            <Button
              label="Back"
              variant="ghost"
              size="sm"
              onPress={onCancel}
            />
          )}
          <Badge label={modeBadge} variant="brand" showDot />
          <View className="w-12" />
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 24 }}>
          <EmptyState
            icon="ScanLine"
            title="Ready for another look?"
            description="There are no ingredients to review yet. Try a clearer photo, or add an item yourself."
            actionLabel="Scan again"
            onAction={onScanAgain}
            secondaryLabel="Add manually"
            onSecondary={onManualAdd}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-3">
          {onCancel && (
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={onCancel}
            />
          )}
          <Badge label={modeBadge} variant="brand" showDot />
          <View className="w-12" />
        </View>

        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <Typography variant="h2" className="font-bold mb-1">
              Review {items.length > 1 ? `Items (${items.length})` : "Item"}
            </Typography>
            {items.length > 1 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={allConfirmed ? onDeselectAll : onSelectAll}
                className="py-1 px-2.5 rounded-lg bg-ground-surface border border-border-default"
              >
                <Text className="text-[12px] font-semibold text-brand-600 dark:text-brand-400">
                  {allConfirmed ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Typography variant="caption" color="muted">
            Verify AI-extracted item attributes before committing to household pantry
          </Typography>
        </View>

        {/* Success Banner */}
        {successCount !== null && (
          <View className="mb-4 p-4 bg-fresh-500/15 border border-fresh-500/40 rounded-2xl flex-row items-center">
            <Icon name="CheckCircle2" size={20} color="#10B981" />
            <Typography variant="body" className="ml-2.5 font-bold text-fresh-700">
              {successCount} {successCount === 1 ? "item" : "items"} added to pantry!
            </Typography>
          </View>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <View className="mb-4 p-4 bg-danger-500/10 border border-danger-500/30 rounded-2xl flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <Icon name="AlertCircle" size={20} color="#EF4444" />
              <Typography variant="caption" className="ml-2 text-danger-700 flex-1 font-medium">
                {errorMessage}
              </Typography>
            </View>
            {onDismissError && (
              <TouchableOpacity onPress={onDismissError}>
                <Icon name="X" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Multi-Item Review Cards */}
        <View className="gap-4 mb-6">
          {items.map((item) => {
            const emoji = getItemEmoji(item.name, item.category);
            const confidencePercent = item.confidence
              ? `${Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence)}% confidence`
              : null;

            return (
              <View
                key={item.id}
                className={`p-4 bg-ground-surface dark:bg-ground-card rounded-2xl border transition-all ${
                  item.confirmed
                    ? "border-border-default shadow-sm opacity-100"
                    : "border-border-default/40 opacity-60"
                }`}
              >
                {/* Header Row: Checkbox, Avatar, Name, Confidence, Actions */}
                <View className="flex-row items-center">
                  <Checkbox
                    checked={item.confirmed}
                    onToggle={() => onToggleConfirm(item.id)}
                    className="mr-3"
                  />

                  <Avatar emoji={emoji} size="md" className="mr-3" />

                  <View className="flex-1 min-w-0 mr-2">
                    <Typography variant="h3" className="font-bold" numberOfLines={1}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {item.category} · {item.quantity} {item.unit}
                    </Typography>
                  </View>

                  <View className="items-end gap-1.5 shrink-0">
                    {confidencePercent && (
                      <Badge label={confidencePercent} variant="fresh" size="sm" />
                    )}

                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onToggleEdit(item.id)}
                        accessibilityLabel="Edit item details"
                        className="p-1.5 rounded-lg bg-ground-canvas dark:bg-ground-elevated border border-border-default"
                      >
                        <Icon
                          name={item.isEditing ? "ChevronUp" : "Edit3"}
                          size={15}
                          color="#64748B"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onRemoveItem(item.id)}
                        accessibilityLabel="Reject or delete item"
                        className="p-1.5 rounded-lg bg-danger-500/10 border border-danger-500/20"
                      >
                        <Icon name="Trash2" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Interactive Controls Row: Quantity Stepper & Storage Zone Pills */}
                <View className="mt-3.5 pt-3 border-t border-border-default/50 gap-3">
                  {/* Quantity Stepper Selector */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Icon name="Hash" size={14} color="#94A3B8" />
                      <Text className="text-[12px] font-medium text-text-secondary ml-1.5">
                        Quantity:
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-ground-canvas dark:bg-ground-elevated border border-border-default rounded-xl p-0.5">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          onUpdateItem(item.id, {
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        accessibilityLabel="Decrease quantity"
                        className="w-8 h-8 items-center justify-center rounded-lg bg-ground-surface dark:bg-ground-card border border-border-default/50"
                      >
                        <Icon name="Minus" size={14} color="#64748B" />
                      </TouchableOpacity>
                      <Text className="px-3 text-[13px] font-bold text-text-primary min-w-[36px] text-center">
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          onUpdateItem(item.id, {
                            quantity: item.quantity + 1,
                          })
                        }
                        accessibilityLabel="Increase quantity"
                        className="w-8 h-8 items-center justify-center rounded-lg bg-ground-surface dark:bg-ground-card border border-border-default/50"
                      >
                        <Icon name="Plus" size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Storage Zone Pills */}
                  <View>
                    <View className="flex-row items-center mb-1.5">
                      <Icon name="Layers" size={14} color="#94A3B8" />
                      <Text className="text-[12px] font-medium text-text-secondary ml-1.5">
                        Storage Zone:
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-1.5">
                      {STORAGE_ZONES.map((zone) => {
                        const isSelected = item.storageZone === zone.id;
                        return (
                          <TouchableOpacity
                            key={zone.id}
                            activeOpacity={0.7}
                            onPress={() =>
                              onUpdateItem(item.id, { storageZone: zone.id })
                            }
                            className={`flex-row items-center px-3 py-1.5 rounded-xl border ${
                              isSelected
                                ? "bg-brand-500 border-brand-500"
                                : "bg-ground-canvas dark:bg-ground-elevated border-border-default"
                            }`}
                          >
                            <Icon
                              name={zone.icon}
                              size={12}
                              color={isSelected ? "#FFFFFF" : "#64748B"}
                            />
                            <Text
                              className={`text-[12px] font-semibold ml-1.5 capitalize ${
                                isSelected ? "text-white" : "text-text-secondary"
                              }`}
                            >
                              {zone.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Date Picker / Expiration Controls */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center">
                        <Icon name="Calendar" size={14} color="#94A3B8" />
                        <Text className="text-[12px] font-medium text-text-secondary ml-1.5">
                          Expires:{" "}
                          <Text className="font-bold text-text-primary">
                            {item.expiry_date || "Not set"}
                          </Text>
                        </Text>
                      </View>
                      {item.expiry_date ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onUpdateItem(item.id, { expiry_date: "" })}
                        >
                          <Text className="text-[11px] font-medium text-danger-500">
                            Clear
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Quick Date Presets */}
                    <View className="flex-row gap-1.5">
                      {DATE_PRESETS.map((preset) => {
                        const presetDate = addDaysOffset(preset.days);
                        const isSelected = item.expiry_date === presetDate;
                        return (
                          <TouchableOpacity
                            key={preset.label}
                            activeOpacity={0.7}
                            onPress={() =>
                              onUpdateItem(item.id, { expiry_date: presetDate })
                            }
                            className={`flex-1 py-1 px-2 rounded-lg border items-center justify-center ${
                              isSelected
                                ? "bg-brand-500 border-brand-500"
                                : "bg-ground-canvas dark:bg-ground-elevated border-border-default"
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-semibold ${
                                isSelected ? "text-white" : "text-text-secondary"
                              }`}
                            >
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Expandable Detailed Edit Section */}
                {item.isEditing && (
                  <View className="gap-3 mt-3.5 pt-3.5 border-t border-border-default">
                    <FormField
                      label="Product Name"
                      value={item.name}
                      onChangeText={(val) => onUpdateItem(item.id, { name: val })}
                      leadingIcon={<Icon name="Tag" size={16} color="#94A3B8" />}
                    />

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <FormField
                          label="Quantity"
                          value={String(item.quantity)}
                          keyboardType="numeric"
                          onChangeText={(val) => {
                            const num = parseFloat(val);
                            onUpdateItem(item.id, {
                              quantity: isNaN(num) || num <= 0 ? 1 : num,
                            });
                          }}
                          leadingIcon={<Icon name="Hash" size={16} color="#94A3B8" />}
                        />
                      </View>
                      <View className="flex-1">
                        <FormField
                          label="Unit"
                          value={item.unit}
                          onChangeText={(val) => onUpdateItem(item.id, { unit: val })}
                          leadingIcon={<Icon name="Package" size={16} color="#94A3B8" />}
                        />
                      </View>
                    </View>

                    <FormField
                      label="Category"
                      value={item.category}
                      onChangeText={(val) => onUpdateItem(item.id, { category: val })}
                      leadingIcon={<Icon name="Folder" size={16} color="#94A3B8" />}
                    />

                    <FormField
                      label="Custom Expiration Date (YYYY-MM-DD)"
                      value={item.expiry_date}
                      placeholder="YYYY-MM-DD"
                      onChangeText={(val) => onUpdateItem(item.id, { expiry_date: val })}
                      leadingIcon={<Icon name="Calendar" size={16} color="#94A3B8" />}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Primary Action Button */}
        <Button
          label={
            submitting
              ? "Saving to Pantry..."
              : confirmedItems.length > 0
              ? `Add ${confirmedItems.length} ${
                  confirmedItems.length === 1 ? "Item" : "Items"
                } to Pantry`
              : "Select Items to Add"
          }
          variant="primary"
          size="lg"
          disabled={confirmedItems.length === 0 || submitting}
          loading={submitting}
          leadingIcon={
            !submitting ? (
              <Icon name="PlusCircle" size={18} color="#FFFFFF" />
            ) : undefined
          }
          onPress={onSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
