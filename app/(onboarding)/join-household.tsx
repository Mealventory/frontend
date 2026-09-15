import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button } from "@/src/components/atoms";

export default function JoinHouseholdScreen() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  return (
    <RoutePlaceholder
      title="Join Household"
      category="Onboarding"
      routePath="/(onboarding)/join-household"
      description="Enter the 6-character alphanumeric code provided by your household admin to sync shared inventory."
      iconName="Key"
    >
      <View className="gap-4">
        <FormField
          label="6-Digit Invite Code"
          placeholder="e.g. MEAL-99"
          value={inviteCode}
          onChangeText={(val) => setInviteCode(val.toUpperCase())}
          autoCapitalize="characters"
        />
        <Button
          label="Join Household"
          variant="primary"
          onPress={() => router.replace("/(app)/(tabs)" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
