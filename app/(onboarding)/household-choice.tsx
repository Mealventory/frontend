import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { Button } from "@/src/components/atoms";

export default function HouseholdChoiceScreen() {
  const router = useRouter();

  return (
    <RoutePlaceholder
      title="Household Setup"
      category="Onboarding"
      routePath="/(onboarding)/household-choice"
      description="Choose whether to create a brand new household inventory or join an existing family unit via invite code."
      iconName="Users"
    >
      <View className="gap-3">
        <Button
          label="Create a New Household"
          variant="primary"
          onPress={() => router.push("/(onboarding)/create-household" as any)}
        />
        <Button
          label="Join Existing with Code"
          variant="outline"
          onPress={() => router.push("/(onboarding)/join-household" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
