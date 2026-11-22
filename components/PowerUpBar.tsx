"use client";

import { motion } from "framer-motion";
import { BetweenHorizonalStart, ListChecks, Scissors, SkipForward, Timer } from "lucide-react";
import type { GameMode, Phase, Team, TeamPowerKind } from "@/lib/types";
import { EXTRA_TIME_SECONDS, teamPowerKindsForMode } from "@/lib/types";
import { cooldownLabel } from "./ui";

const META: Record<
  TeamPowerKind,
  { label: string; icon: typeof Timer }
> = {
  time: { label: `وقت إضافي +${EXTRA_TIME_SECONDS}`, icon: Timer },
  choice: { label: "خيارات متعددة", icon: ListChecks },
  range: { label: "نطاق تقريبي", icon: BetweenHorizonalStart },
  cut: { label: "احذف خيارين", icon: Scissors },
  skip: { label: "تخطي السؤال", icon: SkipForward },
};

export function PowerUpBar({
  teams,
  eligible,
  phase,
  mode,
  optionsVisible,
  rangeVisible,
  optionsCount,
  onUse,
}: {
  teams: Team[];
  eligible: number[];
  phase: Phase;
  mode: GameMode;
  optionsVisible: boolean;
  rangeVisible: boolean;
  optionsCount: number;
  onUse: (teamIndex: number, kind: TeamPowerKind) => void;
}) {
  if (!eligible.length) return null;
  const timedPhase = phase === "primary" || phase === "steal";
  const kinds = teamPowerKindsForMode(mode);
  return (
    <div className="grid gap-2">
      {eligible.map((index) => {
        const team = teams[index];
        if (!team) return null;
        return (
          <div key={team.id} className="rounded-2xl border-[3px] border-ink bg-paper p-3">
            <p className="mb-2 text-xs font-black" style={{ color: team.color }}>
              {team.name}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {kinds.map((kind) => {
                const item = META[kind];
                const turns = team.cooldowns[kind];
                const used =
                  (kind === "choice" && optionsVisible) ||
                  (kind === "range" && rangeVisible) ||
                  (kind === "cut" && optionsCount > 0 && optionsCount <= 2);
                const phaseBlocked = kind === "time" && !timedPhase;
                const disabled = turns > 0 || used || phaseBlocked;
                const Icon = item.icon;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={disabled}
                    onClick={() => onUse(index, kind)}
                    className="board-btn board-btn-ghost inline-flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <motion.span
                      key={turns}
                      initial={{ scale: 1.2, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="chip chip-accent shrink-0 px-2 py-0.5 text-[10px]"
                    >
                      {used && turns <= 0 ? "ظاهر" : cooldownLabel(turns)}
                    </motion.span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
