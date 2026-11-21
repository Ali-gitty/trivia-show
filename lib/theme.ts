export const PALETTES = [
  { id: "kraft", name: "كرتون", paper: "#f2d7b0", accent: "#ef7b24" },
  { id: "candy", name: "حلوى", paper: "#ffd8cc", accent: "#ff4d6d" },
  { id: "meadow", name: "مرج", paper: "#d9efc4", accent: "#2f9e44" },
  { id: "tide", name: "موجة", paper: "#cfe8f6", accent: "#157a9c" },
  { id: "comic", name: "كوميك", paper: "#ffe08a", accent: "#e11d2e" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export type ThemeChoice = {
  palette: PaletteId;
};

export const THEME_KEY = "trivia.theme";

export const DEFAULT_THEME: ThemeChoice = { palette: "kraft" };

const paletteIds = new Set<string>(PALETTES.map((palette) => palette.id));

export function parseTheme(raw: string | null): ThemeChoice {
  if (!raw) return DEFAULT_THEME;
  try {
    const value = JSON.parse(raw) as Partial<ThemeChoice>;
    const palette = value.palette && paletteIds.has(value.palette) ? value.palette : DEFAULT_THEME.palette;
    return { palette };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.dataset.palette = theme.palette;
  delete root.dataset.mode;
}

export function loadTheme(): ThemeChoice {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return parseTheme(localStorage.getItem(THEME_KEY));
}

export function saveTheme(theme: ThemeChoice) {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  applyTheme(theme);
}
