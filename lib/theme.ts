export const PALETTES = [
  { id: "kraft", name: "كرتون", paper: "#f2d7b0", accent: "#ef7b24" },
  { id: "candy", name: "حلوى", paper: "#ffd8cc", accent: "#ff4d6d" },
  { id: "meadow", name: "مرج", paper: "#d9efc4", accent: "#2f9e44" },
  { id: "tide", name: "موجة", paper: "#cfe8f6", accent: "#157a9c" },
  { id: "comic", name: "كوميك", paper: "#ffe08a", accent: "#e11d2e" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const PATTERNS = [
  { id: "dots", name: "نقاط ناعمة" },
  { id: "waves", name: "خطوط مموجة" },
  { id: "halftone", name: "تظليل كوميك" },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];

export type ThemeChoice = {
  palette: PaletteId;
  pattern: PatternId;
};

export const THEME_KEY = "trivia.theme";

export const DEFAULT_THEME: ThemeChoice = { palette: "kraft", pattern: "dots" };

const paletteIds = new Set<string>(PALETTES.map((palette) => palette.id));
const patternIds = new Set<string>(PATTERNS.map((pattern) => pattern.id));

export function parseTheme(raw: string | null): ThemeChoice {
  if (!raw) return DEFAULT_THEME;
  try {
    const value = JSON.parse(raw) as Partial<ThemeChoice>;
    const palette = value.palette && paletteIds.has(value.palette) ? value.palette : DEFAULT_THEME.palette;
    const pattern = value.pattern && patternIds.has(value.pattern) ? value.pattern : DEFAULT_THEME.pattern;
    return { palette, pattern };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.dataset.palette = theme.palette;
  root.dataset.pattern = theme.pattern;
  delete root.dataset.mode;
}

let cachedRaw: string | null = null;
let cachedTheme: ThemeChoice = DEFAULT_THEME;
let hasThemeCache = false;

export function loadTheme(): ThemeChoice {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const raw = localStorage.getItem(THEME_KEY);
  if (hasThemeCache && raw === cachedRaw) return cachedTheme;
  hasThemeCache = true;
  cachedRaw = raw;
  cachedTheme = parseTheme(raw);
  return cachedTheme;
}

export function saveTheme(theme: ThemeChoice) {
  const raw = JSON.stringify(theme);
  cachedTheme = theme;
  cachedRaw = raw;
  hasThemeCache = true;
  localStorage.setItem(THEME_KEY, raw);
  applyTheme(theme);
  window.dispatchEvent(new Event("trivia-theme"));
}

export function subscribeTheme(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("trivia-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("trivia-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}
