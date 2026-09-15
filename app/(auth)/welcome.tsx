import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { Button } from "@/src/components/atoms";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <RoutePlaceholder
      title="Welcome & Cold Launch"
      category="Auth"
      routePath="/(auth)/welcome"
      description="Cold start landing screen showcasing Mealventory's core value proposition: 'Track your food, waste less'."
      iconName="Sparkles"
    >
      <View className="gap-3">
        <Button
          label="Go to Sign In"
          variant="primary"
          onPress={() => router.push("/(auth)/sign-in" as any)}
        />
        <Button
          label="Go to Sign Up"
          variant="outline"
          onPress={() => router.push("/(auth)/sign-up" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
