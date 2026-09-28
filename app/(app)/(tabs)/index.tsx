import React, { useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Badge } from "@/src/components/atoms";
import { Icon } from "@/src/components/atoms/Icon";
import { FoodItemCard } from "@/src/components/domain/FoodItemCard";
import { TagChipGroup } from "@/src/components/molecules/TagChipGroup";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useInventory } from "@/src/context/InventoryContext";

const categories = ["All", "Produce", "Dairy", "Meat", "Bakery", "Pantry"];

export default function PantryDashboardScreen() {
  const router = useRouter();
  const { inventory, openItem, expiringSoonCount, refreshInventory, inventoryLoading, inventoryError } = useInventory();
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = inventory.filter((item) => {
    const matchesCat = selectedCat === "All" || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-ground-canvas">
      <View className="px-5 pt-3 bg-ground-canvas">
        {/* Top Header */}
        <View className="flex-row items-center justify-between gap-3 mb-5">
          <View className="flex-1 min-w-0">
            <Typography variant="h1">My Kitchen</Typography>
            <Typography variant="caption" color="muted" className="mt-0.5">
              {`${inventory.length} items in pantry`}
            </Typography>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(modal)/manual-add" as any)}
              className="w-11 h-11 items-center justify-center bg-brand-500 rounded-xl shadow-sm"
              accessibilityRole="button"
              accessibilityLabel="Add food item manually"
            >
              <Icon name="Plus" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {expiringSoonCount > 0 && <View className="self-start mb-3"><Badge label={`${expiringSoonCount} expiring soon`} variant="soon" showDot /></View>}

        {/* Search */}
        <View className="flex-row items-center h-[44px] px-3.5 bg-ground-surface dark:bg-ground-card rounded-[16px] border border-border-default shadow-sm mb-3.5">
          <Icon name="Search" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search your kitchen..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2.5 text-[14px] text-text-primary font-regular"
          />
        </View>

        {/* Category Filters */}
        <TagChipGroup
          tags={categories}
          selectedTag={selectedCat}
          onSelectTag={setSelectedCat}
          className="pb-3.5"
        />
      </View>

      {/* Items List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={inventoryLoading} onRefresh={() => void refreshInventory()} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="gap-2.5">
          {!!inventoryError && <EmptyState icon="WifiOff" title="A little connection hiccup" description={inventoryError} actionLabel="Try again" onAction={() => void refreshInventory()} />}
          {!inventoryError && !inventoryLoading && inventory.length === 0 && <EmptyState
            icon="Refrigerator" title="A fresh start for your kitchen"
            description="A few ingredients, a little inspiration. Add your first item and let’s see what’s cooking."
            actionLabel="Scan your first product" onAction={() => router.push("/(app)/(tabs)/scan" as any)}
            secondaryLabel="Manually enter the product" onSecondary={() => router.push("/(modal)/manual-add" as any)} />}
          {!inventoryError && !inventoryLoading && inventory.length > 0 && filtered.length === 0 && <EmptyState
            icon="Search" title="Nothing on this shelf"
            description="Try another ingredient or clear your filters to see the whole kitchen."
            actionLabel="Clear filters" onAction={() => { setSearch(""); setSelectedCat("All"); }} />}
          {filtered.map((item) => (
            <FoodItemCard
              key={item.id}
              item={item}
              onPress={(itm) => {
                openItem(itm);
                router.push(`/(app)/inventory/${itm.id}` as any);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
