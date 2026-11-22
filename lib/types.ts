export const POINT_VALUES = [100, 200, 300, 400, 500] as const;

export type Points = (typeof POINT_VALUES)[number];

/** Classic draft always fills this many categories. */
export const CLASSIC_CATEGORY_COUNT = 5;
/** Buzzer draft: each team picks one, then host may add up to this total. */
export const MAX_BUZZER_CATEGORIES = 9;

export type BankKind = "trivia" | "activity";

export const ACTIVITY_OPTIONS = [
  "نجاح كامل",
  "نجاح جزئي",
  "محاولة مقبولة",
  "لم ينجح",
] as const;

export type Question = {
  id: number;
  kind: BankKind;
  category: string;
  points: Points;
  question: string;
  answer: string;
  hint: string;
  options: [string, string, string, string];
};

export const ACTIVITY_CATEGORIES = [
  "ارسم المشهد",
  "تعليق كوميدي",
  "تمثيل صامت",
  "قصة مقيدة",
  "سرعة وبديهة",
  "ارتجال وإقناع",
  "توازن ومهارات",
  "موسيقى وشارات",
  "رسم للأطفال",
  "حركة للأطفال",
] as const;

export const KIDS_CATEGORIES = [
  "حيوانات للأطفال",
  "حساب بسيط للأطفال",
  "من حولنا للأطفال",
  "رسم للأطفال",
  "حركة للأطفال",
] as const;

export function isActivity(question: Pick<Question, "kind">) {
  return question.kind === "activity";
}

export const TEAM_COLORS = [
  "#22d3ee",
  "#fb923c",
  "#c084fc",
  "#34d399",
  "#fb7185",
  "#fbbf24",
  "#38bdf8",
] as const;

export const TEAM_NAMES = [
  "الفريق الأول",
  "الفريق الثاني",
  "الفريق الثالث",
  "الفريق الرابع",
  "الفريق الخامس",
  "الفريق السادس",
  "الفريق السابع",
];

export type GameMode = "classic" | "buzzer";

export type Phase =
  | "lobby"
  | "draft"
  | "board"
  | "primary"
  | "steal"
  | "adjudicate"
  | "buzzOpen"
  | "buzzLocked"
  | "resolved"
  | "podium";

export type PowerKind = "time" | "choice" | "skip" | "steal";

export const TEAM_POWER_KINDS = ["time", "choice", "skip"] as const;
export type TeamPowerKind = (typeof TEAM_POWER_KINDS)[number];

export const EXTRA_TIME_SECONDS = 20;

export type SoundName =
  | "tile"
  | "tick"
  | "timeup"
  | "buzz"
  | "steal"
  | "power"
  | "correct"
  | "wrong";

export type Cooldowns = Record<PowerKind, number>;

export type Team = {
  id: string;
  name: string;
  color: string;
  score: number;
  cooldowns: Cooldowns;
};

export type TileStatus = "open" | "played" | "skipped";

export type Tile = {
  id: string;
  category: string;
  points: Points;
  questionId: number;
  reused: boolean;
  status: TileStatus;
};

export type PowerUse = { teamIndex: number; kind: PowerKind };

export type Cue = { id: number; name: SoundName | null };

export type Outcome = {
  kind: "correct" | "closed";
  teamIndex: number | null;
  delta: number;
};

export type HostSettings = {
  primarySeconds: number;
  stealSeconds: number;
  speech: boolean;
  speechRate: number;
};

export const DEFAULT_HOST_SETTINGS: HostSettings = {
  primarySeconds: 60,
  stealSeconds: 15,
  speech: false,
  speechRate: 0.95,
};

export function clampSpeechRate(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_HOST_SETTINGS.speechRate;
  const stepped = Math.round(value * 20) / 20;
  return Math.min(1.35, Math.max(0.7, stepped));
}

export function clampTimerSeconds(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeHostSettings(input: Partial<HostSettings> | null | undefined): HostSettings {
  return {
    primarySeconds: clampTimerSeconds(Number(input?.primarySeconds ?? DEFAULT_HOST_SETTINGS.primarySeconds), 10, 300),
    stealSeconds: clampTimerSeconds(Number(input?.stealSeconds ?? DEFAULT_HOST_SETTINGS.stealSeconds), 5, 120),
    speech: input?.speech === true,
    speechRate: clampSpeechRate(Number(input?.speechRate ?? DEFAULT_HOST_SETTINGS.speechRate)),
  };
}

export type GameState = {
  phase: Phase;
  mode: GameMode;
  teams: Team[];
  draftPicks: { category: string; teamIndex: number | null }[];
  draftError: string | null;
  board: Tile[];
  activeTeamIndex: number;
  currentTileId: string | null;
  timer: number;
  timerRunning: boolean;
  timerPaused: boolean;
  buzzingTeamIndex: number | null;
  lockedOutTeamIds: string[];
  optionsVisible: boolean;
  optionsOrder: string[];
  answerRevealed: boolean;
  hostPeek: boolean;
  usedThisQuestion: PowerUse[];
  hostPanelOpen: boolean;
  bankOpen: boolean;
  settingsOpen: boolean;
  scoreEditorTeamId: string | null;
  muted: boolean;
  settings: HostSettings;
  cue: Cue;
  outcome: Outcome | null;
  notice: string | null;
  pointMultiplier: number;
};

export function isPoints(value: number): value is Points {
  return (POINT_VALUES as readonly number[]).includes(value);
}

export function freshCooldowns(): Cooldowns {
  return { time: 0, choice: 0, skip: 0, steal: 0 };
}

export function normalizeCooldowns(input: Partial<Record<string, number>> | null | undefined): Cooldowns {
  const time = Number(input?.time ?? input?.hint ?? input?.ask ?? 0);
  const choice = Number(input?.choice ?? 0);
  const skip = Number(input?.skip ?? 0);
  const steal = Number(input?.steal ?? 0);
  return {
    time: Number.isFinite(time) ? Math.max(0, Math.round(time)) : 0,
    choice: Number.isFinite(choice) ? Math.max(0, Math.round(choice)) : 0,
    skip: Number.isFinite(skip) ? Math.max(0, Math.round(skip)) : 0,
    steal: Number.isFinite(steal) ? Math.max(0, Math.round(steal)) : 0,
  };
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
