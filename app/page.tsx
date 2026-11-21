"use client";

import { Arena } from "@/components/Arena";
import { GameProvider } from "@/components/GameProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function HomePage() {
  return (
    <ThemeProvider>
      <GameProvider>
        <Arena />
      </GameProvider>
    </ThemeProvider>
  );
}
