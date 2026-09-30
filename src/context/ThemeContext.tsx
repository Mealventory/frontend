import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Appearance } from "react-native";
import { useColorScheme } from "nativewind";
import {
  themeStorage,
  ThemePreference,
  getWebInitialPreference,
} from "@/src/lib/themeStorage";

export type ThemePreference = "system" | "light" | "dark";
export type ThemeMode = "light" | "dark";

export interface ThemeContextType {
  colorScheme: ThemeMode;
  themePreference: ThemePreference;
  isDark: boolean;
  ready: boolean;
  isLoaded: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  setColorScheme: (scheme: ThemePreference | ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "light",
  themePreference: "system",
  isDark: false,
  ready: false,
  isLoaded: false,
  setThemePreference: async () => {},
  setColorScheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme: setNativeWindScheme } = useColorScheme();

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const webPref = getWebInitialPreference();
    return webPref ?? "system";
  });

  const [systemScheme, setSystemScheme] = useState<ThemeMode>(() => {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
  });

  const [ready, setReady] = useState<boolean>(false);

  // Synchronize OS appearance changes when following system theme
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === "dark" || colorScheme === "light") {
        setSystemScheme(colorScheme);
      }
    });
    return () => subscription.remove();
  }, []);

  // Hydrate preference from local storage on mount
  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      try {
        const stored = await themeStorage.getPreference();
        if (isMounted) {
          const activePref = stored || "system";
          setThemePreferenceState(activePref);
          try {
            setNativeWindScheme(activePref);
          } catch {}
        }
      } catch {
        // Fallback gracefully on storage error
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    }

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, [setNativeWindScheme]);

  const setThemePreference = useCallback(
    async (pref: ThemePreference) => {
      setThemePreferenceState(pref);
      try {
        setNativeWindScheme(pref);
      } catch {}
      await themeStorage.setPreference(pref);
    },
    [setNativeWindScheme]
  );

  const resolvedScheme: ThemeMode =
    themePreference === "system" ? systemScheme : themePreference;
  const isDark = resolvedScheme === "dark";

  const toggleTheme = useCallback(() => {
    const nextPref: ThemePreference = isDark ? "light" : "dark";
    void setThemePreference(nextPref);
  }, [isDark, setThemePreference]);

  const setColorScheme = useCallback(
    (scheme: ThemePreference | ThemeMode) => {
      void setThemePreference(scheme);
    },
    [setThemePreference]
  );

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: resolvedScheme,
        themePreference,
        isDark,
        ready,
        isLoaded: ready,
        setThemePreference,
        setColorScheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
