"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { facePoints } from "@/lib/gameReducer";
import { POINT_VALUES } from "@/lib/types";
import { useGame } from "./GameProvider";

export function GameBoard({ dimmed }: { dimmed: boolean }) {
  const { openTile, state } = useGame();
  const categories: string[] = [];
  for (const tile of state.board) {
    if (!categories.includes(tile.category)) categories.push(tile.category);
  }

  return (
    <div className={`mx-auto max-w-7xl px-3 py-5 transition duration-200 ${dimmed ? "pointer-events-none opacity-30" : ""}`}>
      {state.notice && state.phase === "board" && (
        <p className="note-danger mb-3 px-4 py-2 text-sm">{state.notice}</p>
      )}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(categories.length, 1)}, minmax(148px, 1fr))` }}
        >
          {categories.map((category) => (
            <div key={category} className="grid gap-2">
              <h2 className="cat-head grid min-h-16 place-items-center px-2 text-center text-sm font-black">
                {category}
              </h2>
              {POINT_VALUES.map((points) => {
                const tile = state.board.find((item) => item.category === category && item.points === points);
                if (!tile) return <div key={points} className="tile-spent min-h-20" />;
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
                    whileHover={open ? { scale: 1.04 } : undefined}
                    whileTap={open ? { scale: 0.98 } : undefined}
                    transition={{ duration: 0.2 }}
                    className={`relative grid min-h-20 place-items-center font-black disabled:cursor-default ${
                      tile.status === "open" ? "tile-face" : "tile-spent"
                    }`}
                  >
                    {tile.status === "open" && (
                      <span className="text-2xl leading-none">
                        {worth}
                        {state.pointMultiplier > 1 && (
                          <span className="mt-1 block text-[10px] font-bold">×{state.pointMultiplier}</span>
                        )}
                      </span>
                    )}
                    {tile.status === "played" && <Check aria-label="تم اللعب" />}
                    {tile.status === "skipped" && <Minus aria-label="تم التخطي" />}
                    {tile.reused && tile.status === "open" && (
                      <span className="absolute bottom-1 text-[10px] font-medium opacity-80">أُعيد استخدامه</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
