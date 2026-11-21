"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

export function Dialog({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    frameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      ref={frameRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="scrim popup-window outline-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function cooldownLabel(turns: number) {
  if (turns <= 0) return "جاهز";
  if (turns === 1) return "متاح بعد 1";
  return `متاح بعد ${turns} أدوار`;
}
