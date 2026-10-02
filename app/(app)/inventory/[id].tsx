import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/src/components/atoms/Icon";
import { FreshnessHero } from "@/src/components/domain/FreshnessHero";
import { FreshnessMeter } from "@/src/components/domain/FreshnessMeter";
import { useInventory } from "@/src/context/InventoryContext";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { inventory, removeItem, transitionItem } = useInventory();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const item = inventory.find((i) => i.id === id);

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[16px] font-bold text-text-primary mb-4">
          Item not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-brand-500"
        >
          <Text className="text-white font-bold">Return to Kitchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleAction = async (action: 'delete' | 'consume' | 'discard') => {
    if (deleting) return;
    setDeleting(true); setError('');
    try {
      if (action === 'delete') await removeItem(item.id);
      else await transitionItem(item.id, action);
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update item.'); }
    finally { setDeleting(false); }
  };

  const infoRows = [
    { label: "Expiration Date", value: item.expDate },
    { label: "Category", value: item.category },
    { label: "Quantity", value: item.quantity },
  ];

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[14px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default"
        >
          <Icon name="ArrowLeft" size={18} />
        </TouchableOpacity>

        <Text className="text-[16px] font-bold text-text-primary">
          Item Detail
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleAction("delete")}
          disabled={deleting}
          accessibilityLabel={deleting ? 'Deleting item' : 'Delete item'}
          className="w-[38px] h-[38px] rounded-[14px] bg-urgency-critical-bg border border-urgency-critical/30 items-center justify-center"
        >
          <Icon name="Trash2" size={16} color="#F43F5E" />
        </TouchableOpacity>
      </View>

      {!!error && <Text accessibilityRole="alert" style={{ color: '#B42318', padding: 20 }}>{error}</Text>}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* Dynamic Freshness Hero */}
        <FreshnessHero item={item} />

        {/* Freshness Bar */}
        {item.expiryDate !== null && <FreshnessMeter daysLeft={item.daysLeft} />}

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
              <Text className="text-[14px] font-bold text-text-primary text-right flex-1 ml-4">
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {item.remainingPercent != null && (
          <View className={`p-4 rounded-[22px] border mb-4 ${item.isLowStock ? 'bg-urgency-soon-bg border-urgency-soon/30' : 'bg-ground-surface border-border-default'}`}>
            <View className="flex-row items-center gap-2 mb-2">
              <Icon name="Gauge" size={18} color={item.isLowStock ? '#F59E0B' : '#10B981'} />
              <Text className={`text-[15px] font-bold ${item.isLowStock ? 'text-urgency-soon' : 'text-text-primary'}`}>
                {item.isLowStock ? 'Low stock' : 'Quantity remaining'}
              </Text>
            </View>
            <Text className="text-[14px] text-text-secondary">
              {item.quantity} remaining · {item.remainingPercent}% left
            </Text>
            <Text className="text-[12px] text-text-muted mt-1">
              Mealventory warns automatically at 10% remaining.
            </Text>
          </View>
        )}

        <View className="gap-3 mb-4">
          <TouchableOpacity disabled={deleting} accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(app)/inventory/edit', params: { id: item.id } })}
            className="p-4 rounded-xl bg-ground-subtle items-center">
            <Text className="text-brand-600 dark:text-brand-400 font-bold">Edit item</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={deleting} onPress={() => handleAction('consume')}
            className="p-4 rounded-xl bg-brand-500 items-center" accessibilityRole="button">
            <Text className="text-white font-bold">{deleting ? 'Saving…' : 'Mark as consumed'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={deleting} onPress={() => handleAction('discard')}
            className="p-4 rounded-xl bg-ground-subtle items-center" accessibilityRole="button">
            <Text className="text-text-primary font-bold">Mark as discarded</Text>
          </TouchableOpacity>
          <Text className="text-text-muted">These actions apply to the entire item quantity and keep its history.</Text>
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
            Find recipes that use {item.name} so nothing goes to waste.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/(tabs)/recipes" as any)}
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
