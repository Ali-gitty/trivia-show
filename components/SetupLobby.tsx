"use client";

import { useMemo, useState } from "react";
import { BookOpen, RotateCcw, Settings2, Smartphone, Tv, Users, Volume2, VolumeX } from "lucide-react";
import { useTv } from "./TvBridge";
import { useGame } from "./GameProvider";
import { Button, Panel } from "./ui";
import { categoriesForMode } from "@/lib/modeBank";
import { MATCH_FORMATS, matchFormatOf, type MatchFormatId } from "@/lib/matchFormat";
import { MAX_BUZZER_CATEGORIES, POINT_VALUES, TEAM_COLORS, TEAM_NAMES, type GameMode, type Points } from "@/lib/types";

export function SetupLobby() {
  const { bank, dispatch, playedIds, resetPlayed, startDraft, state, toggleMute } = useGame();
  const { openLink } = useTv();
  const [mode, setMode] = useState<GameMode>("classic");
  const [count, setCount] = useState(3);
  const format = state.settings.format;
  const formatDef = matchFormatOf(format);
  const teamCount = mode === "buzzer" ? count : 2;
  const categoryNeed = state.settings.categoryCount;
  const categories = useMemo(
    () => categoriesForMode(bank, mode, state.settings.pointTiers),
    [bank, mode, state.settings.pointTiers],
  );
  const [names, setNames] = useState<string[]>([...TEAM_NAMES]);
  const [colors, setColors] = useState<string[]>([...TEAM_COLORS]);

  const duplicate = useMemo(() => {
    const used = colors.slice(0, teamCount);
    return new Set(used).size !== used.length;
  }, [colors, teamCount]);

  const setFormat = (next: MatchFormatId) => {
    const preset = matchFormatOf(next);
    dispatch({
      type: "SET_SETTINGS",
      settings: {
        format: next,
        primarySeconds: preset.primarySeconds,
        stealSeconds: preset.stealSeconds,
        categoryCount: preset.categoryCount,
        pointTiers: [...preset.pointTiers],
      },
    });
  };

  const toggleTier = (tier: Points) => {
    if (format !== "custom") return;
    const current = state.settings.pointTiers;
    const next = current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier].sort((a, b) => a - b);
    if (!next.length) return;
    dispatch({ type: "SET_SETTINGS", settings: { pointTiers: next } });
  };

  const start = () => {
    if (duplicate || categories.length < categoryNeed) return;
    if (mode === "buzzer" && teamCount > categoryNeed) return;
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
          <Button variant="ghost" onClick={openLink}>
            <Tv size={16} />
            تلفاز / جوالات
          </Button>
        </div>
      </header>

      <Panel className="grid gap-3 p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Smartphone size={18} /> اتصال اللاعبين
        </h2>
        <p className="text-sm leading-7 text-muted">
          اختياري في كل الأوضاع — يمكنهم القراءة والإرسال أو إخبارك شفهياً. في وضع الجرس يظهر زر جرس على
          الجوال ويُعلَن من ضغط أولاً.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip px-3 py-1.5 text-sm font-black ${state.settings.phoneAnswers === "open" ? "chip-accent" : ""}`}
            onClick={() => dispatch({ type: "SET_SETTINGS", settings: { phoneAnswers: "open" } })}
          >
            إجابات الجوال مسموحة
          </button>
          <button
            type="button"
            className={`chip px-3 py-1.5 text-sm font-black ${state.settings.phoneAnswers === "hostOnly" ? "chip-accent" : ""}`}
            onClick={() => dispatch({ type: "SET_SETTINGS", settings: { phoneAnswers: "hostOnly" } })}
          >
            المقدم فقط (قراءة + جرس)
          </button>
          <Button variant="ghost" onClick={openLink}>
            فتح رمز الغرفة / QR
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <ModeCard
          active={mode === "classic"}
          title="وضع الفريقين الكلاسيكي"
          detail={`مؤقت ${state.settings.primarySeconds} ثم ${state.settings.stealSeconds} · ${categoryNeed} فئات · مستويات ${state.settings.pointTiers.join(" / ")}`}
          onClick={() => setMode("classic")}
        />
        <ModeCard
          active={mode === "buzzer"}
          title="وضع الفرق المتعددة والجرس"
          detail="من 2 إلى 7 فرق. الجرس يفتح فوراً، والإجابة الخاطئة تخصم نصف قيمة السؤال."
          onClick={() => setMode("buzzer")}
        />
        <ModeCard
          active={mode === "closest"}
          title="سباق الأرقام (الأقرب يفوز)"
          detail="أسئلة رقمية فقط. بدون خيارات متعددة — بديلها قدرة «نطاق تقريبي». المقدم يحكم لمن الأقرب."
          onClick={() => setMode("closest")}
        />
        <ModeCard
          active={mode === "choices"}
          title="وضع الاختيارات المتعددة"
          detail="الخيارات الأربعة ظاهرة من البداية. قدرة «احذف خيارين» تبقي الإجابة الصحيحة وخياراً خاطئاً واحداً."
          onClick={() => setMode("choices")}
        />
      </div>

      <Panel className="p-5">
        <h2 className="mb-3 text-xl font-black">إعداد المباراة</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MATCH_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={`board-card p-4 text-right ${format === item.id ? "board-card-on" : ""}`}
            >
              <p className="text-lg font-black">{item.label}</p>
              <p className={`mt-1 text-xs leading-5 ${format === item.id ? "opacity-80" : "text-muted"}`}>{item.detail}</p>
            </button>
          ))}
        </div>

        {format === "custom" && (
          <div className="mt-4 grid gap-4 rounded-2xl border-[3px] border-ink bg-paper p-4">
            <label className="grid gap-2 text-sm font-bold">
              عدد الفئات ({categoryNeed})
              <input
                type="range"
                min={3}
                max={MAX_BUZZER_CATEGORIES}
                value={categoryNeed}
                onChange={(event) =>
                  dispatch({ type: "SET_SETTINGS", settings: { categoryCount: Number(event.target.value) } })
                }
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                الوقت الأساسي
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={state.settings.primarySeconds}
                  onChange={(event) =>
                    dispatch({ type: "SET_SETTINGS", settings: { primarySeconds: Number(event.target.value) } })
                  }
                  className="field px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                فرصة الفريق الآخر
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={state.settings.stealSeconds}
                  onChange={(event) =>
                    dispatch({ type: "SET_SETTINGS", settings: { stealSeconds: Number(event.target.value) } })
                  }
                  className="field px-3 py-2"
                />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">مستويات النقاط</p>
              <div className="flex flex-wrap gap-2">
                {POINT_VALUES.map((tier) => {
                  const on = state.settings.pointTiers.includes(tier);
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => toggleTier(tier)}
                      className={`chip px-3 py-1.5 text-sm font-black ${on ? "chip-accent" : ""}`}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {format !== "custom" && (
          <p className="mt-3 text-sm text-muted">
            {formatDef.label}: {state.settings.primarySeconds}/{state.settings.stealSeconds} ثانية · {categoryNeed} فئات ·{" "}
            {state.settings.pointTiers.join(" / ")}
          </p>
        )}
      </Panel>

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
        {categories.length < categoryNeed && (
          <p className="note-danger mt-3 px-3 py-2 text-sm">البنك لا يكفي لعدد الفئات المطلوب ({categoryNeed}).</p>
        )}
        {mode === "buzzer" && teamCount > categoryNeed && (
          <p className="note-danger mt-3 px-3 py-2 text-sm">
            عدد الفرق أكبر من عدد الفئات في هذا الإعداد. اختر إعداداً بفئات أكثر أو قلّل الفرق.
          </p>
        )}
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">سُجّل لعب {playedIds.length} سؤالاً من المباريات السابقة.</p>
        <Button variant="ghost" onClick={resetPlayed}>
          <RotateCcw size={16} />
          تصفير سجل الأسئلة الملعوبة
        </Button>
      </div>

      <Button
        className="h-14 text-base"
        disabled={duplicate || categories.length < categoryNeed || (mode === "buzzer" && teamCount > categoryNeed)}
        onClick={start}
      >
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
