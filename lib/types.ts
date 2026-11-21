export const POINT_VALUES = [100, 200, 300, 400, 500] as const;

export type Points = (typeof POINT_VALUES)[number];

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
  "رسم سريع",
  "وصف سيء ومضحك",
  "تمثيل وتخميم",
  "تحديات حركية للأطفال",
  "تحديات عائلية خفيفة",
  "ألعاب صوت وكلام",
] as const;

export const KIDS_CATEGORIES = [
  "حيوانات للأطفال",
  "حساب بسيط للأطفال",
  "من حولنا للأطفال",
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

export type PowerKind = "hint" | "choice" | "skip" | "steal";

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
};

export const DEFAULT_HOST_SETTINGS: HostSettings = {
  primarySeconds: 60,
  stealSeconds: 15,
};

export function clampTimerSeconds(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeHostSettings(input: Partial<HostSettings> | null | undefined): HostSettings {
  return {
    primarySeconds: clampTimerSeconds(Number(input?.primarySeconds ?? DEFAULT_HOST_SETTINGS.primarySeconds), 10, 300),
    stealSeconds: clampTimerSeconds(Number(input?.stealSeconds ?? DEFAULT_HOST_SETTINGS.stealSeconds), 5, 120),
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
  hintVisible: boolean;
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
};

export function isPoints(value: number): value is Points {
  return (POINT_VALUES as readonly number[]).includes(value);
}

export function freshCooldowns(): Cooldowns {
  return { hint: 0, choice: 0, skip: 0, steal: 0 };
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
