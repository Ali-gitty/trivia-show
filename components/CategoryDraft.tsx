"use client";

import { useMemo, useState } from "react";
import { Dices, Search, Settings2, Smartphone } from "lucide-react";
import { categoryKind } from "@/lib/board";
import { CategoryLabel } from "@/lib/categoryIcons";
import { draftCategoryTarget, draftPlan } from "@/lib/gameReducer";
import { matchFormatOf } from "@/lib/matchFormat";
import { useGame } from "./GameProvider";
import { useTv } from "./TvBridge";
import { Button, Panel } from "./ui";

type KindFilter = "all" | "trivia" | "activity";

export function CategoryDraft() {
  const { bank, categories, dispatch, finishDraft, pickCategory, state } = useGame();
  const { openLink } = useTv();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const plan = draftPlan(state);
  const target = draftCategoryTarget(state);
  const taken = new Set(state.draftPicks.map((pick) => pick.category));
  const hostTurn = plan?.teamIndex == null;
  const needle = query.trim();
  const formatLabel = matchFormatOf(state.settings.format).label;

  const remaining = categories.filter((category) => {
    if (taken.has(category)) return false;
    if (kindFilter === "all") return true;
    return categoryKind(bank, category) === kindFilter;
  });
  const visible = useMemo(
    () =>
      categories.filter((category) => {
        if (kindFilter !== "all" && categoryKind(bank, category) !== kindFilter) return false;
        return !needle || category.includes(needle);
      }),
    [bank, categories, kindFilter, needle],
  );

  const title = !plan
    ? "اكتمل السحب"
    : plan.teamIndex == null
      ? "دور المقدم"
      : `دور ${state.teams[plan.teamIndex]?.name ?? "الفريق"} (تناوب · الجوال أيضاً)`;

  const modeLabel =
    state.mode === "buzzer"
      ? "جرس"
      : state.mode === "closest"
        ? "أرقام"
        : state.mode === "choices"
          ? "اختيارات"
          : "كلاسيكي";
  const detail = `${modeLabel} · ${formatLabel} · ${state.mode === "buzzer" ? "حتى " : ""}${target} فئات · ${state.settings.pointTiers.join(" / ")}`;

  const atCap = state.draftPicks.length >= target;
  const canPick = Boolean(plan) && remaining.length > 0 && !(state.mode === "buzzer" && hostTurn && atCap);

  const pickRandomCategory = () => {
    if (!canPick) return;
    const category = remaining[Math.floor(Math.random() * remaining.length)];
    pickCategory(category);
  };

  const filters: { id: KindFilter; label: string }[] = [
    { id: "all", label: "الكل" },
    { id: "trivia", label: "أسئلة" },
    { id: "activity", label: "فعاليات" },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">سحب الفئات</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-2 text-muted">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPick && (
            <Button onClick={pickRandomCategory}>
              <Dices size={16} />
              فئة عشوائية
            </Button>
          )}
          <Button variant="ghost" onClick={openLink}>
            <Smartphone size={16} />
            QR الجوالات
          </Button>
          <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
            <Settings2 size={16} />
            الإعدادات
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {state.draftPicks.map((pick) => {
          const team = pick.teamIndex == null ? null : state.teams[pick.teamIndex];
          return (
            <span
              key={pick.category}
              className="chip px-3 py-1 text-sm"
              style={{ boxShadow: team ? `inset 4px 0 0 ${team.color}, 2px 3px 0 var(--shadow)` : undefined }}
            >
              <CategoryLabel category={pick.category} size={14} />
              {categoryKind(bank, pick.category) === "activity" && (
                <span className="mr-1 text-[11px] text-accent">فعالية</span>
              )}
              <span className="mr-2 text-muted">{team ? team.name : "المقدم"}</span>
            </span>
          );
        })}
        <span className="chip chip-accent px-3 py-1 text-sm">
          {state.draftPicks.length} / {target}
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية نوع الفئات">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={kindFilter === filter.id}
            onClick={() => setKindFilter(filter.id)}
            className={`chip px-3 py-1.5 text-sm font-black ${kindFilter === filter.id ? "chip-accent" : ""}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <label className="field flex items-center gap-2 px-3">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث عن فئة"
          className="w-full bg-transparent py-2.5 outline-none"
          aria-label="بحث في الفئات"
        />
      </label>

      {state.draftError && <p className="note-danger px-4 py-3 text-sm">{state.draftError}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((category) => {
          const pick = state.draftPicks.find((item) => item.category === category);
          const activity = categoryKind(bank, category) === "activity";
          return (
            <button
              key={category}
              type="button"
              disabled={Boolean(pick) || (state.mode === "buzzer" && hostTurn && atCap)}
              onClick={() => pickCategory(category)}
              className="board-card min-h-16 px-3 py-3 text-sm font-black leading-5 disabled:cursor-not-allowed disabled:opacity-40"
              style={pick?.teamIndex != null ? { borderColor: state.teams[pick.teamIndex]?.color } : undefined}
            >
              <CategoryLabel category={category} size={18} className="justify-center font-black" />
              {activity && <span className="mt-1 block text-[11px] font-medium text-accent">فعالية</span>}
              {pick && (
                <span className="mt-1 block text-xs font-medium text-muted">
                  {pick.teamIndex == null ? "اختيار المقدم" : state.teams[pick.teamIndex]?.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {categories.length === 0 && <p className="note-danger px-4 py-3 text-sm">لا توجد فئات في البنك.</p>}
      {categories.length > 0 && visible.length === 0 && (
        <p className="text-sm text-muted">
          {kindFilter === "activity"
            ? "لا توجد فئات فعاليات مطابقة."
            : kindFilter === "trivia"
              ? "لا توجد فئات أسئلة مطابقة."
              : "لا توجد فئة بهذا الاسم."}
        </p>
      )}

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        {canPick && (
          <Button variant="ghost" onClick={pickRandomCategory}>
            <Dices size={16} />
            فئة عشوائية
          </Button>
        )}
        {state.mode === "buzzer" && hostTurn && state.settings.format === "custom" && (
          <Button onClick={finishDraft} disabled={state.draftPicks.length < state.teams.length}>
            ابدأ اللوحة
          </Button>
        )}
        <p className="text-sm text-muted">
          اللوحة:{" "}
          {Math.max(
            state.draftPicks.length,
            state.mode === "buzzer" ? state.teams.length : target,
          )}{" "}
          فئات × {state.settings.pointTiers.length} مستويات
        </p>
      </Panel>
    </div>
  );
}
