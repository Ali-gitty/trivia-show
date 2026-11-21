"use client";

import { useMemo, useState } from "react";
import { BookOpen, RotateCcw, Settings2, Users, Volume2, VolumeX } from "lucide-react";
import { useGame } from "./GameProvider";
import { Button, Panel } from "./ui";
import { TEAM_COLORS, TEAM_NAMES, type GameMode } from "@/lib/types";

export function SetupLobby() {
  const { categories, dispatch, playedIds, resetPlayed, startDraft, state, toggleMute } = useGame();
  const [mode, setMode] = useState<GameMode>("classic");
  const [count, setCount] = useState(3);
  const teamCount = mode === "classic" ? 2 : count;
  const [names, setNames] = useState<string[]>([...TEAM_NAMES]);
  const [colors, setColors] = useState<string[]>([...TEAM_COLORS]);

  const duplicate = useMemo(() => {
    const used = colors.slice(0, teamCount);
    return new Set(used).size !== used.length;
  }, [colors, teamCount]);

  const start = () => {
    if (duplicate || categories.length < (mode === "classic" ? 5 : teamCount)) return;
    startDraft(
      mode,
      Array.from({ length: teamCount }, (_, index) => ({
        name: names[index] ?? TEAM_NAMES[index],
        color: colors[index] ?? TEAM_COLORS[index],
      })),
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <div>
          <p className="kicker">HOME PLAY</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">فعاليات البيت</h1>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
            <Settings2 size={16} />
            الإعدادات
          </Button>
          <Button variant="ghost" onClick={toggleMute}>
            {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {state.muted ? "الصوت مغلق" : "كتم الصوت"}
          </Button>
          <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_BANK" })}>
            <BookOpen size={16} />
            بنك الأسئلة
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ModeCard
          active={mode === "classic"}
          title="وضع الفريقين الكلاسيكي"
          detail={`فئتان لكل فريق، وفئة يختارها المقدم. مؤقت ${state.settings.primarySeconds} ثانية ثم ${state.settings.stealSeconds} ثانية للفريق الآخر.`}
          onClick={() => setMode("classic")}
        />
        <ModeCard
          active={mode === "buzzer"}
          title="وضع الفرق المتعددة والجرس"
          detail="من 2 إلى 7 فرق. الجرس يفتح فوراً، والإجابة الخاطئة تخصم نصف قيمة السؤال."
          onClick={() => setMode("buzzer")}
        />
      </div>

      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Users size={18} /> الفرق
          </h2>
          {mode === "buzzer" && (
            <label className="flex items-center gap-3 text-sm">
              عدد الفرق
              <input
                type="range"
                min={2}
                max={7}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              />
              <span className="w-6 font-black text-accent">{count}</span>
            </label>
          )}
        </div>
        <div className="grid gap-3">
          {Array.from({ length: teamCount }, (_, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3">
              <input
                value={names[index] ?? ""}
                onChange={(event) =>
                  setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? event.target.value : name)))
                }
                aria-label={`اسم الفريق ${index + 1}`}
                className="field min-w-48 flex-1 px-3 py-2"
              />
              <div className="flex gap-1.5">
                {TEAM_COLORS.map((color) => {
                  const taken = colors.slice(0, teamCount).some((used, usedIndex) => used === color && usedIndex !== index);
                  const selected = colors[index] === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      disabled={taken}
                      onClick={() =>
                        setColors((current) => current.map((item, itemIndex) => (itemIndex === index ? color : item)))
                      }
                      className="h-7 w-7 rounded-full border-2 border-ink disabled:opacity-20"
                      style={{
                        background: color,
                        boxShadow: selected ? `3px 3px 0 var(--shadow)` : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {duplicate && <p className="note-danger mt-3 px-3 py-2 text-sm">اختر لوناً مختلفاً لكل فريق.</p>}
        {categories.length < (mode === "classic" ? 5 : teamCount) && (
          <p className="note-danger mt-3 px-3 py-2 text-sm">البنك لا يكفي لعدد الفئات المطلوب.</p>
        )}
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">سُجّل لعب {playedIds.length} سؤالاً من المباريات السابقة.</p>
        <Button variant="ghost" onClick={resetPlayed}>
          <RotateCcw size={16} />
          تصفير سجل الأسئلة الملعوبة
        </Button>
      </div>

      <Button className="h-14 text-base" disabled={duplicate} onClick={start}>
        ابدأ سحب الفئات
      </Button>
    </div>
  );
}

function ModeCard({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`board-card p-5 text-right ${active ? "board-card-on" : ""}`}
    >
      <h2 className="text-xl font-black">{title}</h2>
      <p className={`mt-2 text-sm leading-6 ${active ? "opacity-80" : "text-muted"}`}>{detail}</p>
    </button>
  );
}
