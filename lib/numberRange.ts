const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Pull the primary numeric value from an answer string (years, counts, measurements). */
export function parseAnswerNumber(answer: string): number | null {
  let text = String(answer ?? "").trim();
  if (!text) return null;
  text = text.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
  text = text.replace(/[٬,]/g, "");
  // Prefer the first sizable number token.
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  // Reject tiny fragmentals that are clearly not the scored answer (e.g. "الخيار 1").
  if (Math.abs(value) === 0 && !/^\s*0/.test(text)) return null;
  return value;
}

function niceFloor(value: number, unit: number) {
  if (unit <= 0) return Math.floor(value);
  return Math.floor(value / unit) * unit;
}

function niceCeil(value: number, unit: number) {
  if (unit <= 0) return Math.ceil(value);
  return Math.ceil(value / unit) * unit;
}

function pickUnit(abs: number) {
  if (abs < 1) return 0.1;
  const exp = Math.floor(Math.log10(abs));
  // Step one order below the magnitude so ranges feel roomy but readable.
  return Math.pow(10, Math.max(0, exp - 1));
}

/**
 * Build a public range that contains `target` without centering it.
 * Width scales with magnitude so 1180 → ~300-wide band and 9e6 → multi-million band.
 */
export function buildAnswerRange(
  target: number,
  random: () => number = Math.random,
): { low: number; high: number } {
  if (!Number.isFinite(target)) return { low: 0, high: 10 };
  const negative = target < 0;
  const abs = Math.abs(target);
  if (abs === 0) return { low: -4, high: 12 };

  const unit = pickUnit(abs);
  const minWidth = Math.max(unit * 2, abs * 0.18);
  const maxWidth = Math.max(minWidth * 1.4, abs * 0.65);
  const multiples = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
  let widths = multiples.map((multi) => multi * unit).filter((width) => width >= minWidth * 0.85 && width <= maxWidth * 1.15);
  if (!widths.length) {
    widths = [niceCeil(Math.max(minWidth, abs * 0.35), unit)];
  }
  const width = widths[Math.floor(random() * widths.length)] ?? widths[0]!;

  // Keep the answer off-center: sit in the outer 70% of the band, not the middle 30%.
  const edge = Math.max(unit, width * 0.12);
  const centerBand = width * 0.3;
  let offset = edge + random() * Math.max(width - 2 * edge, unit);
  const center = width / 2;
  if (Math.abs(offset - center) < centerBand / 2) {
    offset = offset < center ? center - centerBand / 2 - random() * edge : center + centerBand / 2 + random() * edge;
    offset = Math.min(width - edge, Math.max(edge, offset));
  }

  let low = abs - offset;
  let high = low + width;
  low = niceFloor(low, unit);
  high = niceCeil(high, unit);
  if (low >= abs) low = niceFloor(abs - unit, unit);
  if (high <= abs) high = niceCeil(abs + unit, unit);
  if (high - low < width * 0.55) high = niceCeil(low + width, unit);
  // Never collapse to a near-exact giveaway.
  if (high - low <= unit) {
    low = niceFloor(abs - unit * 3, unit);
    high = niceCeil(abs + unit * 3, unit);
  }
  if (low < 0 && abs >= 1) low = 0;

  if (negative) return { low: -high, high: -low };
  return { low, high };
}

export function formatRangeNumber(value: number) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded = Math.abs(millions) >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `${rounded} مليون`;
  }
  if (abs >= 10_000) return Math.round(value).toLocaleString("en-US");
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

export function formatAnswerRange(low: number, high: number) {
  return `${formatRangeNumber(low)} – ${formatRangeNumber(high)}`;
}
