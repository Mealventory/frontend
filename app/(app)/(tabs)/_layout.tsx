import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";
import { Icon } from "@/src/components/atoms/Icon";
import { useAppTheme } from "@/src/context/ThemeContext";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        tabBarStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderTopColor: isDark ? "#1E293B" : "#E2E8F0",
          height: 52 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Pantry",
          tabBarAccessibilityLabel: "Pantry",
          tabBarIcon: ({ color, size }) => (
            <Icon name="Refrigerator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarAccessibilityLabel: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <Icon name="UtensilsCrossed" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarAccessibilityLabel: "Scan",
          tabBarIcon: ({ color, size }) => (
            <View className="w-10 h-10 rounded-2xl bg-brand-500 items-center justify-center shadow-sm shadow-brand-500/40">
              <Icon name="Camera" size={20} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarAccessibilityLabel: "Shopping",
          tabBarIcon: ({ color, size }) => (
            <Icon name="ShoppingCart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarAccessibilityLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Icon name="Settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
