import { Stack } from "expo-router";

export default function AppGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="inventory/[id]" />
      <Stack.Screen name="inventory/edit" />
      <Stack.Screen name="recipes/[id]" />
      <Stack.Screen name="household/members" />
      <Stack.Screen name="household/storage-zones" />
    </Stack>
  );
}
