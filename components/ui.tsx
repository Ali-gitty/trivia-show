import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "gold" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  gold: "board-btn board-btn-accent",
  ghost: "board-btn board-btn-ghost",
  danger: "board-btn board-btn-danger",
};

export function Button({
  variant = "gold",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={`board-card ${className}`}>{children}</section>;
}

export function cooldownLabel(turns: number) {
  if (turns <= 0) return "جاهز";
  if (turns === 1) return "متاح بعد 1";
  return `متاح بعد ${turns} أدوار`;
}
