"use client";

import { PALETTES } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

export function ThemePicker({ compact = false, embedded = false }: { compact?: boolean; embedded?: boolean }) {
  const { setPalette, theme } = useTheme();

  const swatches = (
    <div className={compact ? "flex gap-1" : "grid grid-cols-2 gap-2 sm:grid-cols-5"} role="listbox" aria-label="لوحة الألوان">
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

  if (compact || embedded) {
    return (
      <div className="grid gap-3">
        {embedded && <p className="text-sm text-muted">اختر لوحة ألوان للكرتون.</p>}
        {swatches}
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
