import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/atoms/Icon";
import { FreshnessHero } from "@/src/components/domain/FreshnessHero";
import { FreshnessMeter } from "@/src/components/domain/FreshnessMeter";
import { useInventory, FigmaScreen } from "@/src/context/InventoryContext";

export interface ItemDetailScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function ItemDetailScreen({ onNavigate }: ItemDetailScreenProps) {
  const { selectedItem, removeItem } = useInventory();

  if (!selectedItem) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[16px] font-bold text-text-primary mb-4">
          No item selected
        </Text>
        <TouchableOpacity
          onPress={() => onNavigate("home")}
          className="px-5 py-2.5 rounded-xl bg-brand-500"
        >
          <Text className="text-white font-bold">Return to Kitchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    removeItem(selectedItem.id);
    onNavigate("home");
  };

  const infoRows = [
    { label: "Expiration Date", value: selectedItem.expDate },
    { label: "Category", value: selectedItem.category },
    { label: "Quantity", value: selectedItem.quantity },
  ];

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("home")}
          className="w-[38px] h-[38px] rounded-[14px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default"
        >
          <Icon name="ArrowLeft" size={18} />
        </TouchableOpacity>

        <Text className="text-[16px] font-bold text-text-primary">
          Item Detail
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDelete}
          className="w-[38px] h-[38px] rounded-[14px] bg-urgency-critical-bg border border-urgency-critical/30 items-center justify-center"
        >
          <Icon name="Trash2" size={16} color="#F43F5E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* Dynamic Freshness Hero */}
        <FreshnessHero item={selectedItem} />

        {/* Freshness Bar */}
        <FreshnessMeter daysLeft={selectedItem.daysLeft} />

        {/* Info Rows Table */}
        <View className="bg-ground-surface dark:bg-ground-card rounded-[22px] border border-border-default shadow-sm mb-4 overflow-hidden">
          {infoRows.map((row, index) => (
            <View
              key={row.label}
              className={`flex-row items-center justify-between px-5 py-3.5 ${
                index < infoRows.length - 1 ? "border-b border-border-default" : ""
              }`}
            >
              <Text className="text-[14px] font-regular text-text-muted">
                {row.label}
              </Text>
              <Text className="text-[14px] font-bold text-text-primary">
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Recipe Suggestion Nudge Card */}
        <View className="p-5 bg-brand-50 dark:bg-brand-500/15 border border-brand-500/30 rounded-[22px]">
          <View className="flex-row items-center gap-2.5 mb-2">
            <Text className="text-2xl">👨‍🍳</Text>
            <Text className="text-[15px] font-bold text-brand-600 dark:text-brand-400">
              Use it before it expires
            </Text>
          </View>
          <Text className="text-[13px] text-text-secondary leading-relaxed mb-3.5">
            Find recipes that use {selectedItem.name} so nothing goes to waste.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onNavigate("recipes")}
            className="w-full h-[44px] rounded-[14px] bg-brand-500 items-center justify-center shadow-sm shadow-brand-500/30"
          >
            <Text className="text-[14px] font-bold text-white">
              View Recipes →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
