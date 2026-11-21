"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { Team } from "@/lib/types";
import { cooldownLabel } from "./ui";

export function BuzzerPad({
  teams,
  lockedOut,
  buzzingIndex,
  open,
  stealIndexes,
  onBuzz,
  onSteal,
}: {
  teams: Team[];
  lockedOut: string[];
  buzzingIndex: number | null;
  open: boolean;
  stealIndexes: number[];
  onBuzz: (index: number) => void;
  onSteal: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team, index) => {
        const locked = lockedOut.includes(team.id);
        const buzzing = buzzingIndex === index;
        const canSteal = stealIndexes.includes(index);
        return (
          <div key={team.id} className="grid gap-2">
            <motion.button
              type="button"
              disabled={!open || locked}
              onClick={() => onBuzz(index)}
              animate={buzzing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={buzzing ? { duration: 0.45, repeat: Infinity } : { duration: 0.12 }}
              className="rounded-3xl border-[3px] border-ink px-4 py-6 text-right font-black text-[#1a120c] disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: team.color,
                boxShadow: buzzing ? `6px 6px 0 ${team.color}` : "4px 5px 0 var(--shadow)",
              }}
            >
              <span className="block text-xs opacity-70">مفتاح {index + 1}</span>
              <span className="text-2xl">{team.name}</span>
              {locked && <span className="mt-1 block text-xs">محظور من هذا السؤال</span>}
              {buzzing && <span className="mt-1 block text-xs">يملك الجرس</span>}
            </motion.button>
            {buzzingIndex != null && !buzzing && (
              <button
                type="button"
                disabled={!canSteal}
                onClick={() => onSteal(index)}
                className="board-btn board-btn-ghost inline-flex items-center justify-center gap-2 px-3 py-2 text-xs disabled:opacity-40"
              >
                <Zap size={14} />
                سرقة الجرس
                <span className="text-accent">
                  {canSteal ? `Shift+${index + 1}` : cooldownLabel(team.cooldowns.steal)}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
