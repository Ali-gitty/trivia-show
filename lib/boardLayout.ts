/** Shared sizing so host + TV boards shrink cleanly as category count grows. */
export function boardLayout(categoryCount: number) {
  const cols = Math.max(categoryCount, 1);
  const dense = cols >= 7;
  const tight = cols >= 9;
  return {
    cols,
    gap: tight ? "0.35rem" : dense ? "0.45rem" : "0.55rem",
    labelSize: tight ? 12 : dense ? 14 : 18,
    pointSize: tight ? "1rem" : dense ? "1.2rem" : "1.5rem",
    headClass: tight
      ? "min-h-0 px-1 py-1 text-[10px] leading-tight"
      : dense
        ? "min-h-0 px-1.5 py-1.5 text-xs leading-tight"
        : "min-h-0 px-2 py-2 text-sm",
    tileClass: tight ? "min-h-0" : dense ? "min-h-0" : "min-h-0",
  };
}
