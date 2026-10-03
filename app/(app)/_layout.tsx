import { Redirect, Stack, usePathname } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function AppGroupLayout() {
  const { session, ready, recovery, household } = useAuth();
  const pathname = typeof usePathname === "function" ? usePathname() : undefined;

  if (!ready) return null;
  if (recovery) return <Redirect href={'/reset-password' as any} />;
  if (!session || !household) {
    if (pathname === '/') return null;
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="inventory/[id]" />
      <Stack.Screen name="inventory/edit" />
      <Stack.Screen name="expiry-calendar" />
      <Stack.Screen name="meal-plan" />
      <Stack.Screen name="scan-history/index" />
      <Stack.Screen name="scan-history/[id]" />
      <Stack.Screen name="recipes/[id]" />
      <Stack.Screen name="recipes/[id]/cook" />
      <Stack.Screen name="household/members" />
      <Stack.Screen name="household/storage-zones" />
    </Stack>
  );
}
