import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { WasteReason } from "@/src/lib/activityApi";

export const DISCARD_REASON_OPTIONS: Array<{ reason: WasteReason; label: string }> = [
  { reason: "expired", label: "Expired" },
  { reason: "spoiled", label: "Spoiled" },
  { reason: "bought_too_much", label: "Bought too much" },
  { reason: "didnt_like", label: "Didn't like it" },
  { reason: "other", label: "Other" },
];

export function DiscardReasonModal({
  visible,
  itemName,
  onSelect,
  onCancel,
  busy = false,
}: {
  visible: boolean;
  itemName: string;
  onSelect: (reason: WasteReason) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-center bg-black/60 px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel discard"
          disabled={busy}
          onPress={onCancel}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          accessibilityViewIsModal
          className="w-full max-w-md self-center rounded-3xl bg-ground-surface dark:bg-ground-card border border-border-default p-5 shadow-2xl"
        >
          <Text className="text-xl font-bold text-text-primary">
            Discard item
          </Text>
          <Text className="mt-1 mb-4 text-sm text-text-muted">
            Why are you discarding {itemName}?
          </Text>
          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {DISCARD_REASON_OPTIONS.map(({ reason, label }) => (
              <Pressable
                key={reason}
                testID={`discard-reason-${reason}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={busy}
                onPress={() => onSelect(reason)}
                className="min-h-[48px] justify-center rounded-xl border border-border-default bg-ground-subtle dark:bg-ground-elevated px-4"
              >
                <Text className="text-[15px] font-semibold text-text-primary">
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            testID="discard-reason-cancel"
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            disabled={busy}
            onPress={onCancel}
            className="mt-3 min-h-[48px] items-center justify-center rounded-xl px-4"
          >
            <Text className="text-[15px] font-bold text-text-muted">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
