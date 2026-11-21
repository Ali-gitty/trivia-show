"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { applyTheme, DEFAULT_THEME, loadTheme, saveTheme, subscribeTheme, type PaletteId, type PatternId } from "@/lib/theme";

type ThemeApi = {
  theme: ReturnType<typeof loadTheme>;
  setPalette: (palette: PaletteId) => void;
  setPattern: (pattern: PatternId) => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, loadTheme, () => DEFAULT_THEME);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setPalette: (palette) => saveTheme({ ...theme, palette }),
        setPattern: (pattern) => saveTheme({ ...theme, pattern }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider missing");
  return value;
}
