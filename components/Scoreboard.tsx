"use client";

import { motion } from "framer-motion";
import { PanelLeft, Settings2, Tv } from "lucide-react";
import { isQuestionPhase } from "@/lib/gameReducer";
import { useGame } from "./GameProvider";
import { useTv } from "./TvBridge";

export function Scoreboard() {
  const { dispatch, state } = useGame();
  const { live, openLink, viewers } = useTv();
  const picking = state.phase === "board" ? state.teams[state.activeTeamIndex] : null;
  const phones = state.players.filter((player) => player.connected).length;

  return (
    <div className="board-bar sticky top-0 z-20 px-3 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        {state.teams.map((team, index) => {
          const active = picking?.id === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => dispatch({ type: "OPEN_SCORE", teamId: team.id })}
              className="board-card min-w-36 flex-1 px-3 py-2 text-right"
              style={{
                borderColor: active ? team.color : undefined,
                boxShadow: active ? `5px 5px 0 ${team.color}` : undefined,
              }}
            >
              <span className="block text-xs" style={{ color: team.color }}>
                {team.name}
              </span>
              <motion.strong
                key={team.score}
                initial={{ scale: 1.18 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="block text-2xl font-black"
              >
                {team.score}
              </motion.strong>
              {active && <span className="text-[11px] font-bold text-accent">يختار السؤال</span>}
              {state.buzzingTeamIndex === index && isQuestionPhase(state.phase) && (
                <span className="text-[11px] font-bold">على الجرس</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={openLink}
          className="board-btn board-btn-ghost px-3 py-3 text-sm"
        >
          <Tv size={18} />
          {live
            ? viewers > 0 || phones > 0
              ? `متصل${viewers > 0 ? " · تلفاز" : ""}${phones > 0 ? ` · ${phones} جوال` : ""}`
              : "بانتظار الاتصال"
            : "تلفاز / جوالات"}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          className="board-btn board-btn-ghost px-3 py-3 text-sm"
        >
          <Settings2 size={18} />
          الإعدادات
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_HOST" })}
          className="board-btn board-btn-ghost px-3 py-3"
          aria-label="لوحة المقدم"
        >
          <PanelLeft size={18} />
        </button>
      </div>
    </div>
  );
}
