import { formatAnswerRange } from "./numberRange";
import { draftCategoryTarget, draftPlan, isQuestionPhase, powerEligible } from "./gameReducer";
import {
  teamPowerKindsForMode,
  type AnswerSubmission,
  type Cooldowns,
  type GameState,
  type Outcome,
  type Phase,
  type PlayerSeat,
  type Question,
  type RemoteBuzz,
  type TeamPowerKind,
} from "./types";

export type PlayTeam = {
  id: string;
  name: string;
  color: string;
  score: number;
};

export type PlayQuestion = {
  category: string;
  points: number;
  prompt: string;
  activity: boolean;
  options: string[] | null;
  range: string | null;
  answer: string | null;
};

export type PlaySubmissionView = {
  teamId: string;
  locked: boolean;
  kind: AnswerSubmission["kind"] | null;
  text: string | null;
  number: number | null;
};

export type PlayDraft = {
  turnTeamIndex: number | null;
  optional: boolean;
  picks: { category: string; teamIndex: number | null }[];
  remaining: string[];
  target: number;
};

export type PlayPowerView = {
  teamId: string;
  eligible: boolean;
  cooldowns: Cooldowns;
};

export type PlaySnapshot = {
  phase: Phase;
  mode: GameState["mode"];
  phoneAnswers: GameState["settings"]["phoneAnswers"];
  teams: PlayTeam[];
  players: PlayerSeat[];
  activeTeamIndex: number;
  timer: number;
  timerRunning: boolean;
  timerPaused: boolean;
  buzzingTeamIndex: number | null;
  lockedOutTeamIds: string[];
  remoteBuzz: RemoteBuzz | null;
  notice: string | null;
  outcome: Outcome | null;
  question: PlayQuestion | null;
  submissions: PlaySubmissionView[];
  pointMultiplier: number;
  draft: PlayDraft | null;
  powerKinds: TeamPowerKind[];
  powers: PlayPowerView[];
  optionsVisible: boolean;
  rangeVisible: boolean;
};

export function buildPlaySnapshot(
  state: GameState,
  question: Question | null,
  categories: string[] = [],
): PlaySnapshot {
  const tile = state.board.find((item) => item.id === state.currentTileId);
  const showQuestion = isQuestionPhase(state.phase) && question && tile;
  const submissions: PlaySubmissionView[] = state.teams.map((team) => {
    const entry = state.submissions[team.id];
    if (!entry) {
      return { teamId: team.id, locked: false, kind: null, text: null, number: null };
    }
    const showText = state.answerRevealed || state.phase === "adjudicate" || state.phase === "resolved";
    return {
      teamId: team.id,
      locked: true,
      kind: entry.kind,
      text: showText ? entry.text : null,
      number: showText ? entry.number : null,
    };
  });
  const plan = draftPlan(state);
  const picked = new Set(state.draftPicks.map((pick) => pick.category));
  const draft: PlayDraft | null =
    state.phase === "draft"
      ? {
          turnTeamIndex: plan?.teamIndex ?? null,
          optional: Boolean(plan?.optional),
          picks: state.draftPicks.map((pick) => ({ ...pick })),
          remaining: categories.filter((category) => !picked.has(category)),
          target: draftCategoryTarget(state),
        }
      : null;
  const eligible = new Set(powerEligible(state));
  return {
    phase: state.phase,
    mode: state.mode,
    phoneAnswers: state.settings.phoneAnswers,
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      score: team.score,
    })),
    players: state.players.map((player) => ({ ...player })),
    activeTeamIndex: state.activeTeamIndex,
    timer: state.timer,
    timerRunning: state.timerRunning,
    timerPaused: state.timerPaused,
    buzzingTeamIndex: state.buzzingTeamIndex,
    lockedOutTeamIds: [...state.lockedOutTeamIds],
    remoteBuzz: state.remoteBuzz ? { ...state.remoteBuzz } : null,
    notice: state.notice,
    outcome: state.outcome ? { ...state.outcome } : null,
    pointMultiplier: state.pointMultiplier,
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
    submissions,
    draft,
    powerKinds: teamPowerKindsForMode(state.mode),
    powers: state.teams.map((team, index) => ({
      teamId: team.id,
      eligible: eligible.has(index),
      cooldowns: { ...team.cooldowns },
    })),
    optionsVisible: state.optionsVisible,
    rangeVisible: state.rangeVisible,
  };
}

export function isPlaySnapshot(value: unknown): value is PlaySnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as PlaySnapshot;
  return typeof snap.phase === "string" && Array.isArray(snap.teams) && Array.isArray(snap.players);
}
