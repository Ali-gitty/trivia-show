"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, loadTheme, saveTheme, type ThemeChoice, type PaletteId } from "@/lib/theme";

type ThemeApi = {
  theme: ThemeChoice;
  setPalette: (palette: PaletteId) => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>(DEFAULT_THEME);

  useEffect(() => {
    const saved = loadTheme();
    setTheme(saved);
    saveTheme(saved);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setPalette: (palette) => {
          const next = { palette };
          setTheme(next);
          saveTheme(next);
        },
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
