import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ThemeProvider, useAppTheme } from "@/src/context/ThemeContext";
import { InventoryProvider } from "@/src/context/InventoryContext";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";

SplashScreen.preventAutoHideAsync();

export function RootLayoutContent() {
  const { isDark, ready: themeReady } = useAppTheme();
  const { ready: authReady, recovery } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAppReady = authReady && (themeReady ?? true);

  useEffect(() => {
    if (isAppReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  useEffect(() => {
    if (isAppReady && recovery && pathname !== '/reset-password') {
      router.replace('/reset-password' as any);
    }
  }, [isAppReady, recovery, pathname, router]);

  if (!isAppReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? "#020617" : "#FAFAFA",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(modal)" options={{ presentation: "modal" }} />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Failsafe: hide splash screen if auth hydration takes longer than 5 seconds
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
      <InventoryProvider>
        <RootLayoutContent />
      </InventoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
