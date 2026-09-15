import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Icon } from "../atoms/Icon";
import { FigmaScreen } from "@/src/context/InventoryContext";

export interface BottomNavProps {
  activeScreen: FigmaScreen;
  onNavigate: (screen: FigmaScreen) => void;
}

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const isHome = activeScreen === "home";
  const isRecipes = activeScreen === "recipes";

  return (
    <View style={styles.container}>
      <View className="flex-row items-center justify-around bg-ground-surface dark:bg-ground-elevated rounded-[28px] py-2 px-3 shadow-lg border border-border-default">
        {/* Kitchen / Home Tab */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("home")}
          className="items-center px-4 py-1"
        >
          <Icon
            name="Home"
            size={20}
            color={isHome ? "#10B981" : "#94A3B8"}
            strokeWidth={isHome ? 2.5 : 2}
          />
          <Text
            className={`text-[11px] font-bold mt-1 ${
              isHome ? "text-brand-500" : "text-text-muted"
            }`}
          >
            Kitchen
          </Text>
        </TouchableOpacity>

        {/* Elevated Scan Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigate("scan")}
          style={styles.scanButton}
          className="items-center justify-center bg-brand-500 rounded-[20px] shadow-md shadow-brand-500/50"
        >
          <Icon name="Camera" size={24} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Recipes Tab */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("recipes")}
          className="items-center px-4 py-1"
        >
          <Icon
            name="UtensilsCrossed"
            size={20}
            color={isRecipes ? "#10B981" : "#94A3B8"}
            strokeWidth={isRecipes ? 2.5 : 2}
          />
          <Text
            className={`text-[11px] font-bold mt-1 ${
              isRecipes ? "text-brand-500" : "text-text-muted"
            }`}
          >
            Recipes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  scanButton: {
    width: 56,
    height: 56,
    marginTop: -22,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
