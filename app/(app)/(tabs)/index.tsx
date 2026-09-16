import React, { useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { Typography, Badge } from "@/src/components/atoms";
import { Icon } from "@/src/components/atoms/Icon";
import { FoodItemCard } from "@/src/components/domain/FoodItemCard";
import { TagChipGroup } from "@/src/components/molecules/TagChipGroup";
import { useInventory } from "@/src/context/InventoryContext";

const categories = ["All", "Produce", "Dairy", "Meat", "Bakery", "Pantry"];

export default function PantryDashboardScreen() {
  const router = useRouter();
  const rootNavigation = useNavigation("/");
  const { inventory, openItem, expiringSoonCount, refreshInventory, inventoryLoading, inventoryError } = useInventory();
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = inventory.filter((item) => {
    const matchesCat = selectedCat === "All" || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <View className="px-5 pt-3 bg-ground-canvas">
        {/* Top Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Typography variant="h1">My Kitchen</Typography>
            <Typography variant="caption" color="muted" className="mt-0.5">
              {`${inventory.length} items in pantry`}
            </Typography>
          </View>
          <View className="flex-row items-center gap-2">
            {expiringSoonCount > 0 && (
              <Badge
                label={`${expiringSoonCount} expiring soon`}
                variant="soon"
                showDot
              />
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(modal)/manual-add" as any)}
              className="flex-row items-center gap-1 px-2.5 py-1.5 bg-brand-500 rounded-xl shadow-sm"
              accessibilityLabel="Add food item manually"
            >
              <Icon name="Plus" size={14} color="#FFFFFF" />
              <Typography variant="caption" className="font-bold text-white">
                Add
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (router.canDismiss()) {
                  router.dismissAll();
                } else {
                  try {
                    rootNavigation.navigate("index" as never);
                  } catch {
                    router.replace("/" as any);
                  }
                }
              }}
              className="flex-row items-center gap-1.5 px-3 py-1.5 bg-ground-surface dark:bg-ground-card border border-border-default rounded-xl shadow-sm"
              accessibilityLabel="Households and log out"
            >
              <Icon name="Home" size={15} color="#10B981" />
              <Typography variant="caption" className="font-semibold text-brand-600 dark:text-brand-400">
                Households
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="gap-2.5">
          {!!inventoryError && <Typography color="critical">{inventoryError}</Typography>}
          {!inventoryError && !inventoryLoading && inventory.length === 0 && <Typography>Your household pantry is empty. Add your first item.</Typography>}
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
