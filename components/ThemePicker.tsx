"use client";

import { PALETTES, PATTERNS } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

export function ThemePicker({ compact = false, embedded = false }: { compact?: boolean; embedded?: boolean }) {
  const { setPalette, setPattern, theme } = useTheme();

  const swatches = (
    <div className={compact ? "flex gap-1" : "grid grid-cols-2 gap-2 sm:grid-cols-3"} role="listbox" aria-label="لوحة الألوان">
      {PALETTES.map((palette) => {
        const active = theme.palette === palette.id;
        return (
          <button
            key={palette.id}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={palette.name}
            onClick={() => setPalette(palette.id)}
            className={`board-swatch ${active ? "board-swatch-on" : ""}`}
          >
            <span
              className="board-swatch-face"
              style={{
                background: `linear-gradient(160deg, ${palette.paper} 0 58%, ${palette.accent} 58% 100%)`,
              }}
            />
            {!compact && <span>{palette.name}</span>}
          </button>
        );
      })}
    </div>
  );

  const patterns = (
    <div className="grid gap-2" role="listbox" aria-label="نقش الخلفية">
      {PATTERNS.map((pattern) => {
        const active = theme.pattern === pattern.id;
        return (
          <button
            key={pattern.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => setPattern(pattern.id)}
            className={`board-swatch ${active ? "board-swatch-on" : ""}`}
          >
            <span className={`pattern-swatch ${pattern.id === "dots" ? "" : `pattern-swatch-${pattern.id}`}`} />
            <span>{pattern.name}</span>
          </button>
        );
      })}
    </div>
  );

  if (compact) return swatches;

  if (embedded) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">اختر لوحة ألوان للكرتون.</p>
        {swatches}
        <p className="text-sm text-muted">نقش الخلفية يتحرك بسلاسة. النقاط أخف، والموجات أنعم، والتظليل أقرب لطباعة القصص المصورة.</p>
        {patterns}
      </div>
    );
  }

  return (
    <section className="board-card p-4">
      <div className="mb-3">
        <p className="kicker">الطابع</p>
        <h2 className="mt-2 text-xl font-black">ألوان الكرتون</h2>
      </div>
      {swatches}
    </section>
  );
}
