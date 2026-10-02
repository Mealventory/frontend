import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Appearance } from "react-native";
import { useColorScheme } from "nativewind";
import {
  themeStorage,
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

  // NativeWind returns a new setter each render. Keep hydration independent
  // of that identity so toggling cannot reload the previous saved preference.
  const nativeWindSetter = useRef(setNativeWindScheme);
  nativeWindSetter.current = setNativeWindScheme;
  const preferenceChanged = useRef(false);

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
        if (isMounted && !preferenceChanged.current) {
          const activePref = stored || "system";
          setThemePreferenceState(activePref);
          try {
            nativeWindSetter.current(activePref);
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
  }, []);

  const setThemePreference = useCallback(
    async (pref: ThemePreference) => {
      preferenceChanged.current = true;
      setThemePreferenceState(pref);
      try {
        nativeWindSetter.current(pref);
      } catch {}
      await themeStorage.setPreference(pref);
    },
    []
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
