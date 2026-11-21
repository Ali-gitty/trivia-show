"use client";

import { motion } from "framer-motion";
import { Lightbulb, ListChecks, SkipForward } from "lucide-react";
import type { Team } from "@/lib/types";
import { cooldownLabel } from "./ui";

const kinds = [
  { kind: "hint" as const, label: "تلميح للجميع", icon: Lightbulb },
  { kind: "choice" as const, label: "خيارات متعددة", icon: ListChecks },
  { kind: "skip" as const, label: "تخطي السؤال", icon: SkipForward },
];

export function PowerUpBar({
  teams,
  eligible,
  hintVisible,
  optionsVisible,
  onUse,
}: {
  teams: Team[];
  eligible: number[];
  hintVisible: boolean;
  optionsVisible: boolean;
  onUse: (teamIndex: number, kind: "hint" | "choice" | "skip") => void;
}) {
  if (!eligible.length) return null;
  return (
    <div className="grid gap-2">
      {eligible.map((index) => {
        const team = teams[index];
        if (!team) return null;
        return (
          <div key={team.id} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold" style={{ color: team.color }}>
              {team.name}
            </span>
            {kinds.map((item) => {
              const turns = team.cooldowns[item.kind];
              const used =
                (item.kind === "hint" && hintVisible) || (item.kind === "choice" && optionsVisible);
              const disabled = turns > 0 || used;
              const Icon = item.icon;
              return (
                <button
                  key={item.kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUse(index, item.kind)}
                  className="board-btn board-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon size={14} />
                  {item.label}
                  <motion.span
                    key={turns}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="chip chip-accent px-2 py-0.5 text-[10px]"
                  >
                    {used && turns <= 0 ? "ظاهر" : cooldownLabel(turns)}
                  </motion.span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
