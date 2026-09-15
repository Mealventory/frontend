import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon, Badge } from "@/src/components/atoms";
import { useAppTheme } from "@/src/context/ThemeContext";

export default function SettingsTabScreen() {
  const router = useRouter();
  const { colorScheme, isDark, toggleTheme } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View className="mb-6">
          <Typography variant="h1">Settings</Typography>
          <Typography variant="caption" color="muted">
            Preferences, appearance & household management
          </Typography>
        </View>

        {/* Appearance Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6">
          <Typography variant="h3" className="font-bold mb-1">
            Appearance
          </Typography>
          <Typography variant="caption" color="muted" className="mb-4">
            Current active theme:{" "}
            <Typography variant="caption" className="font-bold uppercase text-brand-500">
              {colorScheme}
            </Typography>
          </Typography>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            className="flex-row items-center justify-between p-3.5 bg-ground-subtle rounded-xl border border-border-default"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/20 items-center justify-center">
                <Icon name={isDark ? "Moon" : "Sun"} size={18} color="#10B981" />
              </View>
              <View>
                <Typography variant="body" className="font-semibold">
                  {isDark ? "Dark Mode (Slate 950)" : "Light Mode (Alabaster)"}
                </Typography>
                <Typography variant="caption" color="muted">
                  Tap to toggle theme
                </Typography>
              </View>
            </View>
            <Badge label={isDark ? "Dark" : "Light"} variant="brand" />
          </TouchableOpacity>
        </View>

        {/* Household Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-3">
          <Typography variant="h3" className="font-bold mb-1">
            Household
          </Typography>
          <Button
            label="Manage Members"
            variant="outline"
            leadingIcon={<Icon name="Users" size={16} />}
            onPress={() => router.push("/(app)/household/members" as any)}
          />
          <Button
            label="Storage Zones (Pantry, Fridge, Freezer)"
            variant="outline"
            leadingIcon={<Icon name="Folder" size={16} />}
            onPress={() => router.push("/(app)/household/storage-zones" as any)}
          />
        </View>

        <Button
          label="View Design System Showcase"
          variant="secondary"
          leadingIcon={<Icon name="Layers" size={16} />}
          onPress={() => router.replace("/" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
