import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Icon, Typography } from "@/src/components/atoms";

export interface PantryFilterSheetProps {
  visible: boolean;
  zones: string[];
  categories: string[];
  selectedZone: string;
  selectedCategory: string;
  onApply: (zone: string, category: string) => void;
  onClose: () => void;
}

function ChoiceGroup({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option}
            onPress={() => onSelect(option)}
            className={`min-h-[44px] px-4 rounded-xl border items-center justify-center ${
              active
                ? "bg-brand-500 border-brand-500"
                : "bg-ground-subtle dark:bg-ground-elevated border-border-default"
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                active ? "text-white" : "text-text-secondary"
              }`}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PantryFilterSheet({
  visible,
  zones,
  categories,
  selectedZone,
  selectedCategory,
  onApply,
  onClose,
}: PantryFilterSheetProps) {
  const [draftZone, setDraftZone] = useState(selectedZone);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);

  useEffect(() => {
    if (!visible) return;
    setDraftZone(selectedZone);
    setDraftCategory(selectedCategory);
  }, [visible, selectedZone, selectedCategory]);

  const clearDraft = () => {
    setDraftZone(zones[0] || "All zones");
    setDraftCategory(categories[0] || "All");
  };

  const activeCount =
    (draftZone !== (zones[0] || "All zones") ? 1 : 0) +
    (draftCategory !== (categories[0] || "All") ? 1 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close pantry filters"
          style={{ flex: 1 }}
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          className="bg-ground-surface dark:bg-ground-card rounded-t-[32px] px-5 pt-4 pb-7 max-w-lg w-full self-center border-t border-border-default shadow-2xl max-h-[88%]"
        >
          <View className="w-10 h-1 bg-border-default rounded-full self-center mb-4" />

          <View className="flex-row items-start justify-between gap-3 mb-5">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Icon name="Filter" size={20} color="#10B981" />
                <Typography variant="h2">Filters</Typography>
              </View>
              <Typography variant="caption" color="muted" className="mt-1">
                Narrow your pantry by storage location and category.
              </Typography>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-ground-subtle dark:bg-ground-elevated items-center justify-center"
            >
              <Icon name="X" size={18} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <View className="gap-3 mb-6">
              <View className="flex-row items-center justify-between">
                <Typography variant="body" className="font-bold">
                  Storage
                </Typography>
                {draftZone !== (zones[0] || "All zones") && (
                  <Typography variant="caption" color="brand">
                    {draftZone}
                  </Typography>
                )}
              </View>
              <ChoiceGroup options={zones} selected={draftZone} onSelect={setDraftZone} />
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Typography variant="body" className="font-bold">
                  Category
                </Typography>
                {draftCategory !== (categories[0] || "All") && (
                  <Typography variant="caption" color="brand">
                    {draftCategory}
                  </Typography>
                )}
              </View>
              <ChoiceGroup
                options={categories}
                selected={draftCategory}
                onSelect={setDraftCategory}
              />
            </View>
          </ScrollView>

          <View className="flex-row gap-3 pt-5 mt-4 border-t border-border-default">
            <View className="flex-1">
              <Button
                label="Clear All"
                variant="outline"
                onPress={clearDraft}
              />
            </View>
            <View className="flex-[1.3]">
              <Button
                label={activeCount > 0 ? `Apply Filters (${activeCount})` : "Apply Filters"}
                variant="primary"
                onPress={() => onApply(draftZone, draftCategory)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
