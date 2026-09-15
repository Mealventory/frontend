import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button } from "@/src/components/atoms";

export default function CreateHouseholdScreen() {
  const router = useRouter();
  const [name, setName] = useState("");

  return (
    <RoutePlaceholder
      title="Create Household"
      category="Onboarding"
      routePath="/(onboarding)/create-household"
      description="Initialize a collaborative tenant unit for your family or roommates with shared pantry tracking."
      iconName="Home"
    >
      <View className="gap-4">
        <FormField
          label="Household Name"
          placeholder="e.g. Ordonez Family Kitchen"
          value={name}
          onChangeText={setName}
        />
        <Button
          label="Initialize Kitchen"
          variant="primary"
          onPress={() => router.replace("/(app)/(tabs)" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
