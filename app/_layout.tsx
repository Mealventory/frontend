import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
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

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { isDark } = useAppTheme();

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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <InventoryProvider>
        <RootLayoutContent />
      </InventoryProvider>
    </ThemeProvider>
  );
}
