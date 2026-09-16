import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function AppGroupLayout() {
  const { session, ready, recovery, household } = useAuth();
  if (!ready) return null;
  if (recovery) return <Redirect href={'/reset-password' as any} />;
  if (!session || !household) return <Redirect href="/" />;

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
