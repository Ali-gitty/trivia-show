export function optionDirection(text: string): "ltr" | "rtl" {
  const arabic = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const western = text.match(/[A-Za-z0-9]/g)?.length ?? 0;
  return western > arabic ? "ltr" : "rtl";
}
