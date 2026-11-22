"use client";

import { useMemo, useState } from "react";
import { Dices, Search, Settings2 } from "lucide-react";
import { CategoryLabel } from "@/lib/categoryIcons";
import { draftPlan } from "@/lib/gameReducer";
import { useGame } from "./GameProvider";
import { Button, Panel } from "./ui";

export function CategoryDraft() {
  const { categories, dispatch, finishDraft, pickCategory, state } = useGame();
  const [query, setQuery] = useState("");
  const plan = draftPlan(state);
  const taken = new Set(state.draftPicks.map((pick) => pick.category));
  const hostTurn = plan?.teamIndex == null;
  const remaining = categories.filter((category) => !taken.has(category));
  const needle = query.trim();
  const visible = useMemo(
    () => categories.filter((category) => !needle || category.includes(needle)),
    [categories, needle],
  );

  const title = !plan
    ? "اكتمل السحب"
    : plan.teamIndex == null
      ? "دور المقدم"
      : `دور ${state.teams[plan.teamIndex]?.name ?? "الفريق"}`;

  const detail =
    state.mode === "classic"
      ? "فريقان يختاران فئتين لكل منهما، ثم فئة أخيرة للمقدم."
      : "كل فريق يختار فئة. يمكن للمقدم إضافة فئات حتى 7 ثم بدء اللوحة.";

  const random = () => {
    if (!remaining.length || !hostTurn) return;
    const category = remaining[Math.floor(Math.random() * remaining.length)];
    pickCategory(category);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">سحب الفئات</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-2 text-muted">{detail}</p>
        </div>
        <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
          <Settings2 size={16} />
          الإعدادات
        </Button>
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
              <span className="mr-2 text-muted">{team ? team.name : "المقدم"}</span>
            </span>
          );
        })}
        <span className="chip chip-accent px-3 py-1 text-sm">
          {state.draftPicks.length} / {state.mode === "classic" ? 5 : 7}
        </span>
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

      {state.draftError && (
        <p className="note-danger px-4 py-3 text-sm">{state.draftError}</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((category) => {
          const pick = state.draftPicks.find((item) => item.category === category);
          return (
            <button
              key={category}
              type="button"
              disabled={Boolean(pick) || (state.mode === "buzzer" && hostTurn && state.draftPicks.length >= 7)}
              onClick={() => pickCategory(category)}
              className="board-card min-h-16 px-3 py-3 text-sm font-black leading-5 disabled:cursor-not-allowed disabled:opacity-40"
              style={pick?.teamIndex != null ? { borderColor: state.teams[pick.teamIndex]?.color } : undefined}
            >
              <CategoryLabel category={category} size={18} className="justify-center font-black" />
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
        <p className="text-sm text-muted">لا توجد فئة بهذا الاسم.</p>
      )}

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        {hostTurn && (
          <Button variant="ghost" onClick={random} disabled={!remaining.length || state.draftPicks.length >= 7}>
            <Dices size={16} />
            عشوائي
          </Button>
        )}
        {state.mode === "buzzer" && hostTurn && (
          <Button onClick={finishDraft} disabled={state.draftPicks.length < state.teams.length}>
            ابدأ اللوحة
          </Button>
        )}
        <p className="text-sm text-muted">
          {state.mode === "classic"
            ? "اللوحة: 5 فئات × 5 مستويات = 25 سؤالاً"
            : `اللوحة: ${Math.max(state.draftPicks.length, state.teams.length)} فئات × 5 مستويات`}
        </p>
      </Panel>
    </div>
  );
}
