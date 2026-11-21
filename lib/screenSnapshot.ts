import { draftPlan, isQuestionPhase } from "./gameReducer";
import { PALETTES, type PaletteId } from "./theme";
import type { GameState, Outcome, Phase, Question, SoundName } from "./types";

export type ScreenTeam = {
  id: string;
  name: string;
  color: string;
  score: number;
};

export type ScreenTile = {
  id: string;
  category: string;
  points: number;
  status: "open" | "played" | "skipped";
};

export type ScreenQuestion = {
  category: string;
  points: number;
  prompt: string;
  activity: boolean;
  hint: string | null;
  options: string[] | null;
  answer: string | null;
};

export type ScreenSnapshot = {
  phase: Phase;
  mode: GameState["mode"];
  palette: PaletteId;
  teams: ScreenTeam[];
  activeTeamIndex: number;
  draftPicks: GameState["draftPicks"];
  draftLabel: string;
  board: ScreenTile[];
  timer: number;
  timerTotal: number;
  timerRunning: boolean;
  timerPaused: boolean;
  buzzingTeamIndex: number | null;
  lockedOutTeamIds: string[];
  notice: string | null;
  outcome: Outcome | null;
  cue: { id: number; name: SoundName | null };
  question: ScreenQuestion | null;
};

const paletteIds = new Set<string>(PALETTES.map((palette) => palette.id));

export function buildSnapshot(
  state: GameState,
  question: Question | null,
  palette: string,
): ScreenSnapshot {
  const plan = draftPlan(state);
  const draftLabel = !plan
    ? "اكتمل السحب"
    : plan.teamIndex == null
      ? "دور المقدم"
      : `دور ${state.teams[plan.teamIndex]?.name ?? "الفريق"}`;
  const tile = state.board.find((item) => item.id === state.currentTileId);
  const showQuestion = isQuestionPhase(state.phase) && question && tile;
  return {
    phase: state.phase,
    mode: state.mode,
    palette: paletteIds.has(palette) ? (palette as PaletteId) : "kraft",
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      score: team.score,
    })),
    activeTeamIndex: state.activeTeamIndex,
    draftPicks: state.draftPicks.map((pick) => ({ ...pick })),
    draftLabel,
    board: state.board.map((item) => ({
      id: item.id,
      category: item.category,
      points: item.points,
      status: item.status,
    })),
    timer: state.timer,
    timerTotal: state.phase === "steal" ? state.settings.stealSeconds : state.settings.primarySeconds,
    timerRunning: state.timerRunning,
    timerPaused: state.timerPaused,
    buzzingTeamIndex: state.buzzingTeamIndex,
    lockedOutTeamIds: [...state.lockedOutTeamIds],
    notice: state.notice,
    outcome: state.outcome ? { ...state.outcome } : null,
    cue: { id: state.cue.id, name: state.cue.name },
    question: showQuestion
      ? {
          category: question.category,
          points: question.points,
          prompt: question.question,
          activity: question.kind === "activity",
          hint: state.hintVisible ? question.hint : null,
          options: state.optionsVisible ? [...state.optionsOrder] : null,
          answer: state.answerRevealed ? question.answer : null,
        }
      : null,
  };
}

export function snapshotSecrets(snapshot: ScreenSnapshot) {
  return JSON.stringify(snapshot);
}

export function isSnapshot(value: unknown): value is ScreenSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as ScreenSnapshot;
  return typeof snapshot.phase === "string" && Array.isArray(snapshot.teams) && Array.isArray(snapshot.board);
}
