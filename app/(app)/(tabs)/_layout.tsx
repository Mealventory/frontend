import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { Icon } from "@/src/components/atoms/Icon";
import { useAppTheme } from "@/src/context/ThemeContext";

export default function TabsLayout() {
  const { isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        tabBarStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderTopColor: isDark ? "#1E293B" : "#E2E8F0",
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
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
          tabBarIcon: ({ color, size }) => (
            <Icon name="Refrigerator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <View className="w-10 h-10 rounded-2xl bg-brand-500 items-center justify-center -mt-2 shadow-sm shadow-brand-500/40">
              <Icon name="Camera" size={20} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <Icon name="UtensilsCrossed" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarIcon: ({ color, size }) => (
            <Icon name="ShoppingCart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Icon name="Settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
