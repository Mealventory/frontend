import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="household-choice" />
      <Stack.Screen name="create-household" />
      <Stack.Screen name="join-household" />
    </Stack>
  );
}
