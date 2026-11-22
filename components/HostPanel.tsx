"use client";

import { useState } from "react";
import { Eye, RotateCcw, Settings2, Tv, Volume2, VolumeX, X } from "lucide-react";
import { useTv } from "./TvBridge";
import { isQuestionPhase } from "@/lib/gameReducer";
import { teamPowerKindsForMode, type PowerKind } from "@/lib/types";
import { useGame } from "./GameProvider";
import { Button } from "./ui";

const powerLabels: Record<PowerKind, string> = {
  time: "وقت+",
  choice: "خيارات",
  range: "نطاق",
  cut: "حذف2",
  skip: "تخطي",
  steal: "سرقة",
};

const dock = {
  bottom: "max(0.75rem, env(safe-area-inset-bottom))",
  left: "max(0.75rem, env(safe-area-inset-left))",
};

export function HostPanel() {
  const { dispatch, resetPlayed, state, toggleMute } = useGame();
  const { live, openLink, viewers } = useTv();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  if (!state.hostPanelOpen || state.phase === "lobby" || state.phase === "connect") return null;
  const timing = state.phase === "primary" || state.phase === "steal";
  const teamPowers: { kind: PowerKind; label: string }[] = [
    ...teamPowerKindsForMode(state.mode).map((kind) => ({ kind, label: powerLabels[kind] })),
    ...(state.mode === "buzzer" ? [{ kind: "steal" as const, label: powerLabels.steal }] : []),
  ];

  return (
    <aside
      className="board-card fixed z-40 flex w-[min(22.5rem,calc(100vw-1.5rem))] max-h-[min(78dvh,38rem)] flex-col overflow-hidden"
      style={dock}
    >
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink px-4 py-3">
        <h2 className="text-lg font-black">لوحة المقدم</h2>
        <button
          type="button"
          aria-label="إغلاق"
          onClick={() => dispatch({ type: "TOGGLE_HOST" })}
          className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-ink bg-card"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="w-full" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
            <Settings2 size={16} />
            الإعدادات
          </Button>
          <Button variant="ghost" className="w-full" onClick={toggleMute}>
            {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {state.muted ? "تشغيل الصوت" : "كتم"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => dispatch({ type: "TOGGLE_BANK" })}>
            بنك الأسئلة
          </Button>
          <Button variant="ghost" className="w-full" onClick={openLink}>
            <Tv size={16} />
            {live ? (viewers > 0 ? "التلفاز متصل" : "بانتظار التلفاز") : "شاشة التلفاز"}
          </Button>
          <Button variant="ghost" className="col-span-2 w-full" onClick={resetPlayed}>
            <RotateCcw size={16} />
            تصفير السجل
          </Button>
        </div>

        {isQuestionPhase(state.phase) && (
          <Button variant="ghost" className="w-full" onClick={() => dispatch({ type: "TOGGLE_PEEK" })}>
            <Eye size={16} />
            {state.hostPeek ? "إخفاء المعاينة" : "معاينة الإجابة للمقدم"}
            <span className="chip chip-accent px-2 py-0.5 text-xs">H</span>
          </Button>
        )}

        {timing && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => dispatch({ type: state.timerPaused ? "RESUME" : "PAUSE" })}
          >
            {state.timerPaused ? "استئناف المؤقت" : "إيقاف المؤقت"}
          </Button>
        )}

        <div className="grid gap-2">
          {state.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border-[3px] border-ink bg-paper p-3">
              <div className="flex items-center gap-2">
                <input
                  value={names[team.id] ?? team.name}
                  onChange={(event) => setNames((current) => ({ ...current, [team.id]: event.target.value }))}
                  onBlur={() => dispatch({ type: "RENAME_TEAM", teamId: team.id, name: names[team.id] ?? team.name })}
                  className="field min-w-0 flex-1 px-2 py-1.5"
                  aria-label={`اسم ${team.name}`}
                />
                <button
                  type="button"
                  className="grid h-11 min-w-16 place-items-center rounded-xl border-[3px] border-ink bg-card text-lg font-black tabular-nums"
                  style={{ color: team.color }}
                  onClick={() => dispatch({ type: "OPEN_SCORE", teamId: team.id })}
                >
                  {team.score}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {state.players
                  .filter((player) => player.teamId === team.id)
                  .map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      title="تعيين قائداً"
                      onClick={() =>
                        dispatch({
                          type: "PLAYER_SET_LEADER",
                          teamId: team.id,
                          targetId: player.id,
                        })
                      }
                      className={`chip px-2 py-1 text-[11px] ${player.connected ? "" : "opacity-40"} ${
                        player.isLeader ? "chip-accent" : ""
                      }`}
                    >
                      {player.name}
                      {player.isLeader ? " ★" : ""}
                    </button>
                  ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {teamPowers.map((power, index) => (
                  <button
                    key={power.kind}
                    type="button"
                    onClick={() => dispatch({ type: "RESET_COOLDOWN", teamId: team.id, kind: power.kind })}
                    className={`chip px-2 py-1 text-center text-[11px] ${
                      index === teamPowers.length - 1 && teamPowers.length % 2 === 1 ? "col-span-2" : ""
                    }`}
                  >
                    تصفير {power.label} ({team.cooldowns[power.kind]})
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {state.phase !== "podium" &&
          (confirmEnd ? (
            <div className="note-danger grid gap-2 p-3">
              <p className="text-sm">إنهاء المباراة والانتقال للمنصة؟</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="danger" className="w-full" onClick={() => dispatch({ type: "END_MATCH" })}>
                  تأكيد الإنهاء
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setConfirmEnd(false)}>
                  رجوع
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="w-full" onClick={() => setConfirmEnd(true)}>
              إنهاء المباراة
            </Button>
          ))}
      </div>
    </aside>
  );
}

export const hostDock = dock;
