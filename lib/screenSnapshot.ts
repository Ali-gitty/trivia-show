import { draftPlan, facePoints, isQuestionPhase } from "./gameReducer";
import { formatAnswerRange } from "./numberRange";
import { PALETTES, PATTERNS, type PaletteId, type PatternId } from "./theme";
import type { GameState, Outcome, Phase, Question, SoundName } from "./types";

export type ScreenTeam = {
  id: string;
  name: string;
  color: string;
  score: number;
};

export type ScreenPlayer = {
  id: string;
  name: string;
  teamId: string;
  isLeader: boolean;
  connected: boolean;
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
  options: string[] | null;
  range: string | null;
  answer: string | null;
};

export type ScreenSnapshot = {
  phase: Phase;
  mode: GameState["mode"];
  palette: PaletteId;
  pattern: PatternId;
  teams: ScreenTeam[];
  players: ScreenPlayer[];
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
  pointMultiplier: number;
};

const paletteIds = new Set<string>(PALETTES.map((palette) => palette.id));
const patternIds = new Set<string>(PATTERNS.map((pattern) => pattern.id));

export function buildSnapshot(
  state: GameState,
  question: Question | null,
  palette: string,
  pattern = "dots",
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
    pattern: patternIds.has(pattern) ? (pattern as PatternId) : "dots",
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      score: team.score,
    })),
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      isLeader: player.isLeader,
      connected: player.connected,
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
    pointMultiplier: facePoints(1, state.pointMultiplier),
    question: showQuestion
      ? {
          category: question.category,
          points: question.points,
          prompt: question.question,
          activity: question.kind === "activity",
          options: state.optionsVisible ? [...state.optionsOrder] : null,
          range:
            state.rangeVisible && state.rangeLow != null && state.rangeHigh != null
              ? formatAnswerRange(state.rangeLow, state.rangeHigh)
              : null,
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
  return (
    typeof snapshot.phase === "string" &&
    Array.isArray(snapshot.teams) &&
    Array.isArray(snapshot.players) &&
    Array.isArray(snapshot.board)
  );
}
