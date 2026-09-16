import { useEffect } from "react";
import { Stack, useRouter, useNavigation } from "expo-router";
import { supabase } from "@/src/lib/supabase";

export default function AppGroupLayout() {
  const router = useRouter();
  const rootNavigation = useNavigation("/");

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === "SIGNED_OUT") {
        if (router.canDismiss()) {
          router.dismissAll();
        } else {
          try {
            rootNavigation.navigate("index" as never);
          } catch {
            router.replace("/" as any);
          }
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, rootNavigation]);

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
