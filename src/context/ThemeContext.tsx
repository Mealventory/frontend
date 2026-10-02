import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const { colorScheme: nativeScheme, setColorScheme: setNativeWindScheme } = useColorScheme();

  // NativeWind returns a new setter each render. Keep hydration independent
  // of that identity so toggling cannot reload the previous saved preference.
  const nativeWindSetter = useRef(setNativeWindScheme);
  nativeWindSetter.current = setNativeWindScheme;
  const preferenceChanged = useRef(false);

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const webPref = getWebInitialPreference();
    return webPref ?? "system";
  });

  const [ready, setReady] = useState<boolean>(false);
  const persistence = useRef(Promise.resolve());

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
      nativeWindSetter.current(pref);
      setThemePreferenceState(pref);
      // Keep rapid selections in order even when storage is slow.
      persistence.current = persistence.current.catch(() => {}).then(() => themeStorage.setPreference(pref));
      await persistence.current;
    },
    []
  );

  // Use the same resolved appearance as NativeWind's CSS variables. React
  // preference state must not repaint native inputs ahead of the stylesheet.
  const resolvedScheme: ThemeMode = nativeScheme === "dark" ? "dark" : "light";
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
