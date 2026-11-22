import { applyFormat, type MatchFormatId } from "./matchFormat";

export const POINT_VALUES = [100, 200, 300, 400, 500] as const;

export type Points = (typeof POINT_VALUES)[number];

/** Absolute ceiling for draft categories in any mode/format. */
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

export type GameMode = "classic" | "buzzer" | "closest" | "choices";

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

export type PowerKind = "time" | "choice" | "range" | "cut" | "skip" | "steal";

export const TEAM_POWER_KINDS = ["time", "choice", "range", "cut", "skip"] as const;
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

export type PhoneAnswers = "open" | "hostOnly";

export type HostSettings = {
  primarySeconds: number;
  stealSeconds: number;
  speech: boolean;
  speechRate: number;
  format: MatchFormatId;
  categoryCount: number;
  pointTiers: Points[];
  phoneAnswers: PhoneAnswers;
};

export const DEFAULT_HOST_SETTINGS: HostSettings = {
  primarySeconds: 60,
  stealSeconds: 15,
  speech: false,
  speechRate: 0.95,
  format: "normal",
  categoryCount: 5,
  pointTiers: [100, 200, 300, 400, 500],
  phoneAnswers: "open",
};

export type PlayerSeat = {
  id: string;
  name: string;
  teamId: string;
  isLeader: boolean;
  connected: boolean;
  lastSeen: number;
};

export type AnswerSubmission = {
  playerId: string;
  teamId: string;
  kind: "text" | "option" | "number";
  text: string;
  number: number | null;
  at: number;
};

export type RemoteBuzz = {
  playerId: string;
  playerName: string;
  teamId: string;
  at: number;
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
  const format = (input?.format as MatchFormatId | undefined) ?? DEFAULT_HOST_SETTINGS.format;
  const applied = applyFormat(format, {
    categoryCount: Number(input?.categoryCount ?? DEFAULT_HOST_SETTINGS.categoryCount),
    pointTiers: (input?.pointTiers as Points[] | undefined) ?? DEFAULT_HOST_SETTINGS.pointTiers,
    primarySeconds: Number(input?.primarySeconds ?? DEFAULT_HOST_SETTINGS.primarySeconds),
    stealSeconds: Number(input?.stealSeconds ?? DEFAULT_HOST_SETTINGS.stealSeconds),
  });
  const phoneAnswers = input?.phoneAnswers === "hostOnly" ? "hostOnly" : "open";
  return {
    primarySeconds: clampTimerSeconds(applied.primarySeconds, 10, 300),
    stealSeconds: clampTimerSeconds(applied.stealSeconds, 5, 120),
    speech: input?.speech === true,
    speechRate: clampSpeechRate(Number(input?.speechRate ?? DEFAULT_HOST_SETTINGS.speechRate)),
    format: applied.format,
    categoryCount: applied.categoryCount,
    pointTiers: applied.pointTiers,
    phoneAnswers,
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
  rangeVisible: boolean;
  rangeLow: number | null;
  rangeHigh: number | null;
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
  players: PlayerSeat[];
  submissions: Record<string, AnswerSubmission>;
  remoteBuzz: RemoteBuzz | null;
};

export function isPoints(value: number): value is Points {
  return (POINT_VALUES as readonly number[]).includes(value);
}

export function freshCooldowns(): Cooldowns {
  return { time: 0, choice: 0, range: 0, cut: 0, skip: 0, steal: 0 };
}

export function teamPowerKindsForMode(mode: GameMode): TeamPowerKind[] {
  if (mode === "closest") return ["time", "range", "skip"];
  if (mode === "choices") return ["time", "cut", "skip"];
  return ["time", "choice", "skip"];
}

export function normalizeCooldowns(input: Partial<Record<string, number>> | null | undefined): Cooldowns {
  const time = Number(input?.time ?? input?.hint ?? input?.ask ?? 0);
  const choice = Number(input?.choice ?? 0);
  const range = Number(input?.range ?? 0);
  const cut = Number(input?.cut ?? 0);
  const skip = Number(input?.skip ?? 0);
  const steal = Number(input?.steal ?? 0);
  return {
    time: Number.isFinite(time) ? Math.max(0, Math.round(time)) : 0,
    choice: Number.isFinite(choice) ? Math.max(0, Math.round(choice)) : 0,
    range: Number.isFinite(range) ? Math.max(0, Math.round(range)) : 0,
    cut: Number.isFinite(cut) ? Math.max(0, Math.round(cut)) : 0,
    skip: Number.isFinite(skip) ? Math.max(0, Math.round(skip)) : 0,
    steal: Number.isFinite(steal) ? Math.max(0, Math.round(steal)) : 0,
  };
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
