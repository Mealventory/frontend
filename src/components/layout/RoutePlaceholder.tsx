import { BrandLogo } from "@/src/components/atoms/BrandLogo";
import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography } from "../atoms/Typography";
import { Button } from "../atoms/Button";
import { Badge } from "../atoms/Badge";
import { Icon, IconName } from "../atoms/Icon";

export interface RoutePlaceholderProps {
  title: string;
  category: "Auth" | "Onboarding" | "Tabs" | "Inventory" | "Recipes" | "Modal" | "Household";
  routePath: string;
  description: string;
  iconName?: IconName;
  showBackToHome?: boolean;
  children?: React.ReactNode;
}

export function RoutePlaceholder({
  title,
  category,
  routePath,
  description,
  iconName = "Layers",
  showBackToHome = true,
  children,
}: RoutePlaceholderProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 40, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        {/* Header navigation */}
        <View className="flex-row items-center justify-between mb-6">
          <Button
            label="Back"
            variant="outline"
            size="sm"
            leadingIcon={<Icon name="ArrowLeft" size={16} />}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/" as any);
              }
            }}
          />
          <Badge label={category} variant="brand" size="sm" />
        </View>

        <View style={{ alignItems: "center", marginBottom: 20 }}><BrandLogo width={category === "Auth" || category === "Onboarding" ? 180 : 132} hero={category === "Auth" || category === "Onboarding"} /></View>

        {/* Hero Info */}
        <View className="items-center p-7 bg-ground-card rounded-[28px] border border-border-default shadow-sm mb-6">
          <View className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/20 items-center justify-center mb-4">
            <Icon name={iconName} size={24} color="#10B981" />
          </View>
          <Typography variant="h2" className="mb-2 font-bold text-center">
            {title}
          </Typography>
          <Typography variant="body" color="secondary" className="text-center">
            {description}
          </Typography>
        </View>

        {/* Custom Screen Content Slot */}
        {children}

        {/* Quick Nav to Showcase */}
        {showBackToHome && (
          <View className="mt-8 pt-6 border-t border-border-default">
            <Button
              label="Back to your kitchen"
              variant="ghost"
              size="sm"
              leadingIcon={<Icon name="Home" size={16} />}
              onPress={() => router.replace("/" as any)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
