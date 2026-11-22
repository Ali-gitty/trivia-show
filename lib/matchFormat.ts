import {
  MAX_BUZZER_CATEGORIES,
  POINT_VALUES,
  type Points,
} from "./types";

export type MatchFormatId = "blitz" | "normal" | "long" | "custom";

export type MatchFormatDef = {
  id: MatchFormatId;
  label: string;
  detail: string;
  primarySeconds: number;
  stealSeconds: number;
  categoryCount: number;
  pointTiers: Points[];
  fixed: boolean;
};

export const MATCH_FORMATS: MatchFormatDef[] = [
  {
    id: "blitz",
    label: "برق",
    detail: "45 / 10 ثانية · 3 فئات · 100 / 300 / 500",
    primarySeconds: 45,
    stealSeconds: 10,
    categoryCount: 3,
    pointTiers: [100, 300, 500],
    fixed: true,
  },
  {
    id: "normal",
    label: "عادي",
    detail: "60 / 15 ثانية · 5 فئات · كل المستويات",
    primarySeconds: 60,
    stealSeconds: 15,
    categoryCount: 5,
    pointTiers: [100, 200, 300, 400, 500],
    fixed: true,
  },
  {
    id: "long",
    label: "طويل",
    detail: "75 / 25 ثانية · 7 فئات · كل المستويات",
    primarySeconds: 75,
    stealSeconds: 25,
    categoryCount: 7,
    pointTiers: [100, 200, 300, 400, 500],
    fixed: true,
  },
  {
    id: "custom",
    label: "مخصص",
    detail: "المقدم يضبط الوقت والفئات (حتى 9) ومستويات النقاط",
    primarySeconds: 60,
    stealSeconds: 15,
    categoryCount: 5,
    pointTiers: [100, 200, 300, 400, 500],
    fixed: false,
  },
];

export function matchFormatOf(id: string | null | undefined): MatchFormatDef {
  return MATCH_FORMATS.find((item) => item.id === id) ?? MATCH_FORMATS[1]!;
}

export function normalizePointTiers(input: unknown): Points[] {
  const raw = Array.isArray(input) ? input.map(Number) : [];
  const picked = POINT_VALUES.filter((tier) => raw.includes(tier));
  return picked.length ? [...picked] : [...POINT_VALUES];
}

export function clampCategoryCount(value: number, format: MatchFormatId) {
  if (format !== "custom") return matchFormatOf(format).categoryCount;
  if (!Number.isFinite(value)) return 5;
  return Math.min(MAX_BUZZER_CATEGORIES, Math.max(3, Math.round(value)));
}

/** Classic draft order: split team picks evenly, host takes the last slot. */
export function classicDraftSteps(categoryCount: number): Array<number | null> {
  const n = Math.min(MAX_BUZZER_CATEGORIES, Math.max(3, categoryCount));
  const teamSlots = n - 1;
  const team0 = Math.ceil(teamSlots / 2);
  const team1 = teamSlots - team0;
  return [...Array(team0).fill(0), ...Array(team1).fill(1), null];
}

export function applyFormat(
  format: MatchFormatId,
  overrides?: { categoryCount?: number; pointTiers?: Points[]; primarySeconds?: number; stealSeconds?: number },
) {
  const base = matchFormatOf(format);
  if (base.fixed) {
    return {
      format: base.id,
      primarySeconds: base.primarySeconds,
      stealSeconds: base.stealSeconds,
      categoryCount: base.categoryCount,
      pointTiers: [...base.pointTiers],
    };
  }
  return {
    format: base.id,
    primarySeconds: overrides?.primarySeconds ?? base.primarySeconds,
    stealSeconds: overrides?.stealSeconds ?? base.stealSeconds,
    categoryCount: clampCategoryCount(overrides?.categoryCount ?? base.categoryCount, "custom"),
    pointTiers: normalizePointTiers(overrides?.pointTiers ?? base.pointTiers),
  };
}
