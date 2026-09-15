import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/atoms/Icon";
import { useInventory, FigmaScreen } from "@/src/context/InventoryContext";
import { useAppTheme } from "@/src/context/ThemeContext";

export interface SettingsScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { user, logout, inventory } = useInventory();
  const { isDark, toggleTheme, colorScheme } = useAppTheme();
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your household kitchen?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-ground-canvas border-b border-border-default">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("home")}
          className="w-10 h-10 rounded-full bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center"
        >
          <Icon name="ArrowLeft" size={18} color="#10B981" />
        </TouchableOpacity>

        <Text className="text-[17px] font-bold text-text-primary">
          Settings & Profile
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View className="p-5 bg-ground-surface dark:bg-ground-card rounded-[24px] border border-border-default shadow-sm mb-5">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-brand-500/15 border-2 border-brand-500/40 items-center justify-center">
              <Text className="text-2xl font-black text-brand-500">
                {user.initials}
              </Text>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-[18px] font-bold text-text-primary">
                  {user.name}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30">
                  <Text className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                    Admin
                  </Text>
                </View>
              </View>
              <Text className="text-[13px] text-text-muted mt-0.5">
                {user.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Household Section */}
        <View className="p-5 bg-ground-surface dark:bg-ground-card rounded-[24px] border border-border-default shadow-sm mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/20 items-center justify-center">
                <Icon name="Home" size={16} color="#10B981" />
              </View>
              <Text className="text-[15px] font-bold text-text-primary">
                Household Kitchen
              </Text>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-ground-subtle dark:bg-ground-elevated border border-border-default">
              <Text className="text-[11px] font-bold text-text-muted">
                3 Members
              </Text>
            </View>
          </View>

          <View className="p-3.5 bg-ground-subtle dark:bg-ground-elevated rounded-2xl border border-border-default mb-3">
            <Text className="text-[11px] font-semibold uppercase text-text-muted mb-1 tracking-wider">
              Active Household
            </Text>
            <Text className="text-[15px] font-bold text-text-primary">
              {user.household}
            </Text>
            <Text className="text-[12px] text-text-muted mt-0.5">
              Tracking {inventory.length} live pantry items
            </Text>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 p-3 bg-ground-subtle dark:bg-ground-elevated rounded-xl border border-border-default items-center">
              <Text className="text-[18px]">🧊</Text>
              <Text className="text-[11px] font-bold text-text-primary mt-1">Fridge</Text>
            </View>
            <View className="flex-1 p-3 bg-ground-subtle dark:bg-ground-elevated rounded-xl border border-border-default items-center">
              <Text className="text-[18px]">🚪</Text>
              <Text className="text-[11px] font-bold text-text-primary mt-1">Pantry</Text>
            </View>
            <View className="flex-1 p-3 bg-ground-subtle dark:bg-ground-elevated rounded-xl border border-border-default items-center">
              <Text className="text-[18px]">❄️</Text>
              <Text className="text-[11px] font-bold text-text-primary mt-1">Freezer</Text>
            </View>
          </View>
        </View>

        {/* Preferences & Theme Section */}
        <View className="p-5 bg-ground-surface dark:bg-ground-card rounded-[24px] border border-border-default shadow-sm mb-5">
          <Text className="text-[15px] font-bold text-text-primary mb-4">
            Preferences & Appearance
          </Text>

          {/* Theme Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            className="flex-row items-center justify-between py-3 border-b border-border-default"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-ground-subtle dark:bg-ground-elevated items-center justify-center">
                <Icon name={isDark ? "Moon" : "Sun"} size={16} color="#10B981" />
              </View>
              <View>
                <Text className="text-[14px] font-bold text-text-primary">
                  Appearance
                </Text>
                <Text className="text-[12px] text-text-muted">
                  Current: {isDark ? "Dark Slate" : "Executive Light"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-ground-subtle dark:bg-ground-elevated rounded-full border border-border-default">
              <Text className="text-[12px] font-bold text-brand-500 uppercase">
                {colorScheme}
              </Text>
              <Icon name="ChevronRight" size={14} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Expiry Alerts Switch */}
          <View className="flex-row items-center justify-between py-3 border-b border-border-default">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-ground-subtle dark:bg-ground-elevated items-center justify-center">
                <Icon name="Bell" size={16} color="#10B981" />
              </View>
              <View>
                <Text className="text-[14px] font-bold text-text-primary">
                  Expiry Push Alerts
                </Text>
                <Text className="text-[12px] text-text-muted">
                  Notify 3 days before expiration
                </Text>
              </View>
            </View>
            <Switch
              value={expiryAlerts}
              onValueChange={setExpiryAlerts}
              trackColor={{ false: "#64748B", true: "#10B981" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Sound Feedback */}
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-ground-subtle dark:bg-ground-elevated items-center justify-center">
                <Icon name="Volume2" size={16} color="#10B981" />
              </View>
              <View>
                <Text className="text-[14px] font-bold text-text-primary">
                  Audio & Haptics
                </Text>
                <Text className="text-[12px] text-text-muted">
                  Barcode scanner sound effects
                </Text>
              </View>
            </View>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: "#64748B", true: "#10B981" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Log Out CTA */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          className="flex-row items-center justify-center h-[52px] rounded-[18px] bg-urgency-critical-bg border border-urgency-critical/30 mb-4 gap-2"
        >
          <Icon name="LogOut" size={18} color="#F43F5E" />
          <Text className="text-[15px] font-bold text-urgency-critical">
            Log Out of Account
          </Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text className="text-center text-[12px] text-text-subtle font-medium">
          Mealventory v1.0.0 · Production Build
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
