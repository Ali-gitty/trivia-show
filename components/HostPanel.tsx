"use client";

import { useState } from "react";
import { Eye, RotateCcw, Settings2, Tv, Volume2, VolumeX, X } from "lucide-react";
import { useTv } from "./TvBridge";
import { isQuestionPhase } from "@/lib/gameReducer";
import type { PowerKind } from "@/lib/types";
import { useGame } from "./GameProvider";
import { Button } from "./ui";

const powers: { kind: PowerKind; label: string }[] = [
  { kind: "hint", label: "تلميح" },
  { kind: "choice", label: "خيارات" },
  { kind: "skip", label: "تخطي" },
  { kind: "steal", label: "سرقة" },
];

export function HostPanel() {
  const { dispatch, resetPlayed, state, toggleMute } = useGame();
  const { live, openLink, viewers } = useTv();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  if (!state.hostPanelOpen || state.phase === "lobby") return null;
  const timing = state.phase === "primary" || state.phase === "steal";

  return (
    <aside className="board-card fixed bottom-0 left-0 z-40 flex max-h-[88dvh] w-[min(420px,100%)] flex-col gap-4 overflow-y-auto rounded-none p-4 sm:top-20 sm:bottom-4 sm:rounded-[1.35rem]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">لوحة المقدم</h2>
        <button type="button" aria-label="إغلاق" onClick={() => dispatch({ type: "TOGGLE_HOST" })}>
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
          <Settings2 size={16} />
          الإعدادات
        </Button>
        <Button variant="ghost" onClick={toggleMute}>
          {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {state.muted ? "تشغيل الصوت" : "كتم"}
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_BANK" })}>
          بنك الأسئلة
        </Button>
        <Button variant="ghost" onClick={openLink}>
          <Tv size={16} />
          {live ? (viewers > 0 ? "التلفاز متصل" : "بانتظار التلفاز") : "شاشة التلفاز"}
        </Button>
        <Button variant="ghost" onClick={resetPlayed}>
          <RotateCcw size={16} />
          تصفير السجل
        </Button>
      </div>

      {isQuestionPhase(state.phase) && (
        <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_PEEK" })}>
          <Eye size={16} />
          {state.hostPeek ? "إخفاء المعاينة" : "معاينة الإجابة للمقدم"}
          <span className="chip chip-accent px-2 py-0.5 text-xs">H</span>
        </Button>
      )}

      {timing && (
        <Button variant="ghost" onClick={() => dispatch({ type: state.timerPaused ? "RESUME" : "PAUSE" })}>
          {state.timerPaused ? "استئناف المؤقت" : "إيقاف المؤقت"}
        </Button>
      )}

      <div className="grid gap-3">
        {state.teams.map((team) => (
          <div key={team.id} className="rounded-2xl border-[3px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--shadow)]">
            <div className="flex items-center justify-between gap-2">
              <input
                value={names[team.id] ?? team.name}
                onChange={(event) => setNames((current) => ({ ...current, [team.id]: event.target.value }))}
                onBlur={() => dispatch({ type: "RENAME_TEAM", teamId: team.id, name: names[team.id] ?? team.name })}
                className="field w-full px-2 py-1"
                aria-label={`اسم ${team.name}`}
              />
              <button
                type="button"
                className="font-black"
                style={{ color: team.color }}
                onClick={() => dispatch({ type: "OPEN_SCORE", teamId: team.id })}
              >
                {team.score}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {powers
                .filter((power) => state.mode === "buzzer" || power.kind !== "steal")
                .map((power) => (
                  <button
                    key={power.kind}
                    type="button"
                    onClick={() => dispatch({ type: "RESET_COOLDOWN", teamId: team.id, kind: power.kind })}
                    className="chip px-2 py-1 text-[11px]"
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
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => dispatch({ type: "END_MATCH" })}>
                تأكيد الإنهاء
              </Button>
              <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
                رجوع
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmEnd(true)}>
            إنهاء المباراة
          </Button>
        ))}
    </aside>
  );
}
