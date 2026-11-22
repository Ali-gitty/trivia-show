"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { boardLayout } from "@/lib/boardLayout";
import { CategoryLabel } from "@/lib/categoryIcons";
import { facePoints } from "@/lib/gameReducer";
import { POINT_VALUES } from "@/lib/types";
import { useGame } from "./GameProvider";

export function GameBoard({ dimmed }: { dimmed: boolean }) {
  const { openTile, state } = useGame();
  const categories: string[] = [];
  for (const tile of state.board) {
    if (!categories.includes(tile.category)) categories.push(tile.category);
  }
  const layout = boardLayout(categories.length);

  return (
    <div
      className={`board-fit mx-auto px-2 py-3 transition duration-200 ${dimmed ? "pointer-events-none opacity-30" : ""}`}
      style={{ height: "calc(100dvh - 5.75rem)" }}
    >
      {state.notice && state.phase === "board" && (
        <p className="note-danger mb-2 shrink-0 px-3 py-1.5 text-xs sm:text-sm">{state.notice}</p>
      )}
      <div
        className="grid h-full min-h-0 w-full"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          gap: layout.gap,
        }}
      >
        {categories.map((category) => (
          <div
            key={category}
            className="grid h-full min-h-0 min-w-0"
            style={{
              gridTemplateRows: `auto repeat(${POINT_VALUES.length}, minmax(0, 1fr))`,
              gap: layout.gap,
            }}
          >
            <h2 className={`cat-head grid place-items-center text-center font-black ${layout.headClass}`}>
              <CategoryLabel category={category} stacked size={layout.labelSize} />
            </h2>
            {POINT_VALUES.map((points) => {
              const tile = state.board.find((item) => item.category === category && item.points === points);
              if (!tile) return <div key={points} className={`tile-spent ${layout.tileClass}`} />;
              const open = tile.status === "open" && state.phase === "board";
              const worth = facePoints(tile.points, state.pointMultiplier);
              return (
                <motion.button
                  key={tile.id}
                  type="button"
                  disabled={!open}
                  onClick={() => openTile(tile.id)}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: tile.status === "open" ? 1 : 0.4, scale: 1 }}
                  whileHover={open ? { scale: 1.03 } : undefined}
                  whileTap={open ? { scale: 0.98 } : undefined}
                  transition={{ duration: 0.2 }}
                  className={`relative grid place-items-center font-black disabled:cursor-default ${layout.tileClass} ${
                    tile.status === "open" ? "tile-face" : "tile-spent"
                  }`}
                >
                  {tile.status === "open" && (
                    <span className="leading-none" style={{ fontSize: layout.pointSize }}>
                      {worth}
                      {state.pointMultiplier > 1 && (
                        <span className="mt-0.5 block text-[9px] font-bold sm:text-[10px]">×{state.pointMultiplier}</span>
                      )}
                    </span>
                  )}
                  {tile.status === "played" && <Check aria-label="تم اللعب" size={layout.cols >= 8 ? 16 : 20} />}
                  {tile.status === "skipped" && <Minus aria-label="تم التخطي" size={layout.cols >= 8 ? 16 : 20} />}
                  {tile.reused && tile.status === "open" && (
                    <span className="absolute bottom-0.5 text-[8px] font-medium opacity-80 sm:text-[10px]">أُعيد</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
