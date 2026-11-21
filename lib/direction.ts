export function optionDirection(text: string): "ltr" | "rtl" {
  const arabic = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const western = text.match(/[A-Za-z0-9]/g)?.length ?? 0;
  return western > arabic ? "ltr" : "rtl";
}

export function numberSequence(text: string): string[] | null {
  const trimmed = text.trim();
  if (!/^[\d\s,،.%+\-–—]+$/.test(trimmed)) return null;
  const pieces = trimmed
    .split(/\s*[,،]\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (pieces.length < 2 || !pieces.every((piece) => /\d/.test(piece))) return null;
  return pieces;
}
