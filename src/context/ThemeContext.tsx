import React, { createContext, useContext } from "react";
import { useColorScheme } from "nativewind";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  colorScheme: ThemeMode;
  isDark: boolean;
  setColorScheme: (scheme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "light",
  isDark: false,
  setColorScheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const currentScheme: ThemeMode = colorScheme === "dark" ? "dark" : "light";

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: currentScheme,
        isDark: currentScheme === "dark",
        setColorScheme: (scheme: ThemeMode) => setColorScheme(scheme),
        toggleTheme: toggleColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
