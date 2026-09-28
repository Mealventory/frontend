import React, { useState } from "react";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/atoms/Icon";
import { FoodItemCard } from "@/src/components/domain/FoodItemCard";
import { BottomNav } from "@/src/components/layout/BottomNav";
import { TagChipGroup } from "@/src/components/molecules/TagChipGroup";
import { useInventory, FigmaScreen } from "@/src/context/InventoryContext";

const categories = ["All", "Produce", "Dairy", "Meat", "Bakery", "Pantry"];

export interface HomeScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { inventory, openItem, expiringSoonCount, user } = useInventory();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = inventory.filter((item) => {
    const matchesFilter = filter === "All" || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {/* Top Header & Search */}
      <View className="px-5 pt-3 bg-ground-canvas">
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-[22px] font-bold text-text-primary tracking-tight font-bold">
              My Kitchen
            </Text>
            <Text className="text-[13px] text-text-muted mt-0.5 font-regular">
              {inventory.length} items
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            {expiringSoonCount > 0 && (
              <View className="flex-row items-center px-3 py-1 bg-urgency-soon-bg border border-urgency-soon/30 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-urgency-soon mr-1.5" />
                <Text className="text-[12px] font-bold text-urgency-soon">
                  {expiringSoonCount} expiring
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNavigate("settings")}
              className="w-10 h-10 rounded-full bg-brand-500/15 border border-brand-500/30 items-center justify-center"
            >
              <Text className="text-[13px] font-bold text-brand-500">
                {user.initials}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center h-[44px] px-3.5 bg-ground-surface dark:bg-ground-card rounded-[16px] border border-border-default shadow-sm mb-3.5">
          <Icon name="Search" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search your kitchen..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2.5 text-[14px] text-text-primary font-regular"
          />
          {search.length > 0 && (
            <Icon
              name="X"
              size={16}
              color="#94A3B8"
            />
          )}
        </View>

        {/* Category Filter Chips */}
        <TagChipGroup
          tags={categories}
          selectedTag={filter}
          onSelectTag={setFilter}
          className="pb-3.5"
        />
      </View>

      {/* Food Items Scrollable List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="gap-2.5">
          {filtered.map((item) => (
            <FoodItemCard
              key={item.id}
              item={item}
              onPress={openItem}
            />
          ))}
        </View>

        {filtered.length === 0 && (
          <EmptyState icon="Search" title="Nothing on this shelf" description="Try another ingredient or category to find your next meal." />
        )}
      </ScrollView>

      {/* Floating Bottom Nav */}
      <BottomNav activeScreen="home" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}
