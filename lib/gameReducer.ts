import { buildBoard, selectQuestion } from "./board";
import {
  clampScore,
  DEFAULT_HOST_SETTINGS,
  freshCooldowns,
  normalizeHostSettings,
  TEAM_NAMES,
  type AnswerSubmission,
  type GameState,
  type HostSettings,
  type Outcome,
  type Phase,
  EXTRA_TIME_SECONDS,
  MAX_BUZZER_CATEGORIES,
  type PlayerSeat,
  type PowerKind,
  type Question,
  type SoundName,
  type Team,
  type TeamPowerKind,
} from "./types";
import { classicDraftSteps } from "./matchFormat";
import { buildAnswerRange, parseAnswerNumber } from "./numberRange";

function usesClassicFlow(mode: GameState["mode"]) {
  return mode === "classic" || mode === "closest" || mode === "choices";
}

const BASE_COOLDOWN = 3;
const SKIP_COOLDOWN = 10;
const STEAL_COOLDOWN = 5;

function cooldownFor(kind: PowerKind) {
  if (kind === "skip") return SKIP_COOLDOWN;
  if (kind === "steal") return STEAL_COOLDOWN;
  return BASE_COOLDOWN;
}

export type Action =
  | { type: "HYDRATE"; state: GameState }
  | { type: "SET_MUTE"; muted: boolean }
  | { type: "SET_SETTINGS"; settings: Partial<HostSettings> }
  | { type: "TOGGLE_HOST" }
  | { type: "TOGGLE_BANK" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "OPEN_SCORE"; teamId: string | null }
  | { type: "START_DRAFT"; mode: GameState["mode"]; teams: { name: string; color: string }[] }
  | { type: "BEGIN_DRAFT" }
  | { type: "PICK_CATEGORY"; category: string; questions: Question[]; playedIds: number[] }
  | { type: "FINISH_DRAFT"; questions: Question[]; playedIds: number[] }
  | { type: "OPEN_TILE"; tileId: string; questions: Question[]; playedIds: number[] }
  | {
      type: "REPLACE_CURRENT";
      questions: Question[];
      playedIds: number[];
      excludeIds?: number[];
    }
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "LOCK" }
  | {
      type: "USE_POWER";
      teamIndex: number;
      kind: TeamPowerKind;
      options?: string[];
      correctAnswer?: string;
      answerNumber?: number;
    }
  | { type: "BUZZ"; teamIndex: number }
  | { type: "STEAL"; teamIndex: number }
  | { type: "REVEAL"; correctAnswer?: string }
  | { type: "AWARD"; teamIndex: number | null }
  | { type: "BUZZ_CORRECT" }
  | { type: "BUZZ_WRONG" }
  | { type: "CLOSE_QUESTION" }
  | { type: "CONTINUE" }
  | { type: "TOGGLE_PEEK" }
  | { type: "ADJUST_SCORE"; teamId: string; delta?: number; exact?: number }
  | { type: "RENAME_TEAM"; teamId: string; name: string }
  | { type: "RESET_COOLDOWN"; teamId: string; kind: PowerKind }
  | { type: "END_MATCH" }
  | { type: "DOUBLE_REMAINING" }
  | { type: "REPLAY" }
  | {
      type: "PLAYER_JOIN";
      playerId: string;
      name: string;
      teamId: string;
      at: number;
    }
  | { type: "PLAYER_LEAVE"; playerId: string }
  | { type: "PLAYER_PING"; playerId: string; at: number }
  | { type: "PLAYER_SET_LEADER"; teamId: string; targetId: string }
  | { type: "PLAYER_BUZZ"; playerId: string; at: number }
  | {
      type: "PLAYER_SUBMIT";
      playerId: string;
      kind: AnswerSubmission["kind"];
      text: string;
      number: number | null;
      at: number;
    }
  | { type: "MARK_PLAYERS_STALE"; now: number; timeoutMs?: number };

export function createInitialState(): GameState {
  return {
    phase: "lobby",
    mode: "classic",
    teams: [],
    draftPicks: [],
    draftError: null,
    board: [],
    activeTeamIndex: 0,
    currentTileId: null,
    timer: 0,
    timerRunning: false,
    timerPaused: false,
    buzzingTeamIndex: null,
    lockedOutTeamIds: [],
    optionsVisible: false,
    optionsOrder: [],
    rangeVisible: false,
    rangeLow: null,
    rangeHigh: null,
    answerRevealed: false,
    hostPeek: false,
    usedThisQuestion: [],
    hostPanelOpen: false,
    bankOpen: false,
    settingsOpen: false,
    scoreEditorTeamId: null,
    muted: false,
    settings: { ...DEFAULT_HOST_SETTINGS },
    cue: { id: 0, name: null },
    outcome: null,
    notice: null,
    pointMultiplier: 1,
    players: [],
    submissions: {},
    remoteBuzz: null,
  };
}

export function draftCategoryTarget(state: GameState) {
  return Math.min(
    MAX_BUZZER_CATEGORIES,
    Math.max(state.mode === "buzzer" ? state.teams.length : 3, state.settings.categoryCount),
  );
}

export function draftPlan(state: GameState): { teamIndex: number | null; optional: boolean } | null {
  if (state.phase !== "draft") return null;
  const target = draftCategoryTarget(state);
  if (usesClassicFlow(state.mode)) {
    const steps = classicDraftSteps(target);
    if (state.draftPicks.length >= steps.length) return null;
    return { teamIndex: steps[state.draftPicks.length] ?? null, optional: false };
  }
  if (state.draftPicks.length < state.teams.length) {
    return { teamIndex: state.draftPicks.length, optional: false };
  }
  if (state.draftPicks.length >= target) return { teamIndex: null, optional: true };
  return { teamIndex: null, optional: true };
}

export function powerEligible(state: GameState) {
  if (state.phase === "primary") return [state.activeTeamIndex];
  if (state.phase === "steal") return [state.activeTeamIndex === 0 ? 1 : 0];
  if (state.phase === "buzzOpen" || state.phase === "buzzLocked") {
    return state.teams
      .map((team, index) => ({ team, index }))
      .filter(({ team }) => !state.lockedOutTeamIds.includes(team.id))
      .map(({ index }) => index);
  }
  return [] as number[];
}

export function stealEligible(state: GameState) {
  if (state.mode !== "buzzer" || state.phase !== "buzzLocked" || state.buzzingTeamIndex == null) {
    return [] as number[];
  }
  return state.teams
    .map((team, index) => ({ team, index }))
    .filter(
      ({ team, index }) =>
        index !== state.buzzingTeamIndex &&
        team.cooldowns.steal === 0 &&
        !state.lockedOutTeamIds.includes(team.id),
    )
    .map(({ index }) => index);
}

export function isQuestionPhase(phase: Phase) {
  return (
    phase === "primary" ||
    phase === "steal" ||
    phase === "adjudicate" ||
    phase === "buzzOpen" ||
    phase === "buzzLocked" ||
    phase === "resolved"
  );
}

function sound(state: GameState, name: SoundName): GameState["cue"] {
  return { id: state.cue.id + 1, name };
}

function shuffle(values: string[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function questionFields() {
  return {
    currentTileId: null,
    timer: 0,
    timerRunning: false,
    timerPaused: false,
    buzzingTeamIndex: null,
    lockedOutTeamIds: [] as string[],
    optionsVisible: false,
    optionsOrder: [] as string[],
    rangeVisible: false,
    rangeLow: null as number | null,
    rangeHigh: null as number | null,
    answerRevealed: false,
    hostPeek: false,
    usedThisQuestion: [] as GameState["usedThisQuestion"],
    outcome: null as Outcome | null,
    notice: null as string | null,
    submissions: {} as GameState["submissions"],
    remoteBuzz: null as GameState["remoteBuzz"],
  };
}

function sanitizePlayerName(name: string) {
  return name.trim().slice(0, 24) || "لاعب";
}

function withLeader(players: PlayerSeat[], teamId: string, targetId: string) {
  return players.map((player) =>
    player.teamId === teamId ? { ...player, isLeader: player.id === targetId } : player,
  );
}

/** Closest numeric submissions; returns team index or null on tie/missing. */
export function closestWinnerIndex(state: GameState, answer: string) {
  const target = parseAnswerNumber(answer);
  if (target == null) return null;
  const scored = state.teams
    .map((team, index) => {
      const entry = state.submissions[team.id];
      if (!entry || entry.number == null || !Number.isFinite(entry.number)) return null;
      return { index, distance: Math.abs(entry.number - target) };
    })
    .filter((item): item is { index: number; distance: number } => item != null);
  if (scored.length < 2) return null;
  scored.sort((a, b) => a.distance - b.distance || a.index - b.index);
  if (scored[0]!.distance === scored[1]!.distance) return null;
  return scored[0]!.index;
}

function canSubmit(state: GameState, player: PlayerSeat) {
  if (state.settings.phoneAnswers === "hostOnly") return false;
  if (state.mode === "buzzer") {
    return (
      state.phase === "buzzLocked" &&
      state.remoteBuzz?.playerId === player.id &&
      state.buzzingTeamIndex != null &&
      state.teams[state.buzzingTeamIndex]?.id === player.teamId
    );
  }
  if (!player.isLeader) return false;
  if (state.phase !== "primary" && state.phase !== "steal" && state.phase !== "adjudicate") {
    return false;
  }
  if (usesClassicFlow(state.mode)) {
    const eligible = powerEligible(state);
    const teamIndex = state.teams.findIndex((team) => team.id === player.teamId);
    if (state.phase === "adjudicate") return teamIndex >= 0;
    return eligible.includes(teamIndex);
  }
  return false;
}

function decay(teams: Team[], used: GameState["usedThisQuestion"]) {
  return teams.map((team, index) => {
    const cooldowns = { ...team.cooldowns };
    (["time", "choice", "range", "cut", "skip", "steal"] as const).forEach((kind) => {
      const spent = used.some((use) => use.teamIndex === index && use.kind === kind);
      if (spent) cooldowns[kind] = cooldownFor(kind);
      else cooldowns[kind] = Math.max(0, cooldowns[kind] - 1);
    });
    return { ...team, cooldowns };
  });
}

function pickForTile(
  state: GameState,
  questions: Question[],
  tile: { category: string; points: Question["points"]; questionId: number; reused?: boolean },
  playedIds: number[],
  exclude: number[],
) {
  if (tile.questionId > 0) {
    const existing = questions.find((item) => item.id === tile.questionId);
    return existing ? { question: existing, reused: Boolean(tile.reused) } : null;
  }
  const direct = selectQuestion(questions, tile.category, tile.points, playedIds, exclude);
  if (direct) return direct;
  if (state.mode !== "closest") return null;
  for (const points of state.settings.pointTiers) {
    if (points === tile.points) continue;
    const fallback = selectQuestion(questions, tile.category, points, playedIds, exclude);
    if (fallback) return fallback;
  }
  const pool = questions.filter(
    (question) => question.category === tile.category && !exclude.includes(question.id),
  );
  if (!pool.length) return null;
  const fresh = pool.filter((question) => !playedIds.includes(question.id));
  const draw = fresh.length ? fresh : pool;
  const question = draw[Math.floor(Math.random() * draw.length)];
  if (!question) return null;
  return { question, reused: !fresh.length };
}

function settle(
  state: GameState,
  tileStatus: "played" | "skipped",
  nextPicker: number,
  cueName: SoundName | null,
): GameState {
  const board = state.board.map((tile) =>
    tile.id === state.currentTileId ? { ...tile, status: tileStatus } : tile,
  );
  const done = board.length > 0 && board.every((tile) => tile.status !== "open");
  return {
    ...state,
    ...questionFields(),
    teams: decay(state.teams, state.usedThisQuestion),
    board,
    phase: done ? "podium" : "board",
    activeTeamIndex: nextPicker,
    cue: cueName ? sound(state, cueName) : state.cue,
  };
}

function spend(state: GameState, teamIndex: number, kind: PowerKind): GameState {
  return {
    ...state,
    teams: state.teams.map((team, index) =>
      index === teamIndex
        ? {
            ...team,
            cooldowns: {
              ...team.cooldowns,
              [kind]: cooldownFor(kind),
            },
          }
        : team,
    ),
    usedThisQuestion: [...state.usedThisQuestion, { teamIndex, kind }],
  };
}

function startBoard(state: GameState, questions: Question[], playedIds: number[]): GameState {
  const categories = state.draftPicks.map((pick) => pick.category);
  const built = buildBoard(categories, questions, playedIds, state.settings.pointTiers, {
    allowMissingTiers: state.mode === "closest",
  });
  if (built.error) return { ...state, draftError: built.error };
  return {
    ...state,
    ...questionFields(),
    phase: "board",
    board: built.board,
    activeTeamIndex: 0,
    draftError: null,
  };
}

function livePower(state: GameState, teamIndex: number, kind: TeamPowerKind) {
  const team = state.teams[teamIndex];
  if (!team || team.cooldowns[kind] > 0) return false;
  if (kind === "time" && state.phase !== "primary" && state.phase !== "steal") return false;
  const live =
    state.phase === "primary" ||
    state.phase === "steal" ||
    state.phase === "buzzOpen" ||
    state.phase === "buzzLocked";
  if (!live) return false;
  if (usesClassicFlow(state.mode)) return powerEligible(state).includes(teamIndex);
  return !state.lockedOutTeamIds.includes(team.id);
}

export function facePoints(base: number, multiplier: number) {
  const scale = Number.isInteger(multiplier) && multiplier > 0 ? multiplier : 1;
  return base * scale;
}

const MAX_POINT_MULTIPLIER = 32;

export function unreachableLead(state: {
  phase: Phase;
  teams: { id: string; name: string; color: string; score: number }[];
  board: { points: number; status: "open" | "played" | "skipped" }[];
  pointMultiplier: number;
}) {
  if (
    state.phase === "lobby" ||
    state.phase === "connect" ||
    state.phase === "draft" ||
    state.phase === "podium"
  ) {
    return null;
  }
  if (state.teams.length < 2) return null;
  const ranked = [...state.teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));
  const leader = ranked[0];
  const challenger = ranked[1];
  if (!leader || !challenger) return null;
  const gap = leader.score - challenger.score;
  const multiplier = facePoints(1, state.pointMultiplier);
  const remaining = state.board
    .filter((tile) => tile.status === "open")
    .reduce((sum, tile) => sum + facePoints(tile.points, multiplier), 0);
  if (remaining <= 0 || gap <= remaining) return null;
  return {
    leaderName: leader.name,
    leaderColor: leader.color,
    challengerName: challenger.name,
    gap,
    remaining,
    multiplier,
  };
}

function currentPoints(state: GameState) {
  const base = state.board.find((tile) => tile.id === state.currentTileId)?.points ?? 0;
  return facePoints(base, state.pointMultiplier);
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_MUTE":
      return { ...state, muted: action.muted };
    case "SET_SETTINGS":
      return { ...state, settings: normalizeHostSettings({ ...state.settings, ...action.settings }) };
    case "TOGGLE_HOST":
      return { ...state, hostPanelOpen: !state.hostPanelOpen };
    case "TOGGLE_BANK":
      return { ...state, bankOpen: !state.bankOpen };
    case "TOGGLE_SETTINGS":
      return { ...state, settingsOpen: !state.settingsOpen };
    case "OPEN_SCORE":
      return { ...state, scoreEditorTeamId: action.teamId };
    case "START_DRAFT": {
      const teams = action.teams.map((team, index) => ({
        id: `team-${index + 1}`,
        name: team.name.trim() || TEAM_NAMES[index] || `الفريق ${index + 1}`,
        color: team.color,
        score: 0,
        cooldowns: freshCooldowns(),
      }));
      return {
        ...createInitialState(),
        muted: state.muted,
        settings: state.settings,
        cue: state.cue,
        phase: "connect",
        mode: action.mode,
        teams,
        players: [],
      };
    }
    case "BEGIN_DRAFT":
      if (state.phase !== "connect" || state.teams.length < 2) return state;
      return { ...state, phase: "draft", draftPicks: [], draftError: null };
    case "PICK_CATEGORY": {
      const plan = draftPlan(state);
      if (!plan) return state;
      if (state.draftPicks.some((pick) => pick.category === action.category)) return state;
      const target = draftCategoryTarget(state);
      if (plan.optional && state.draftPicks.length >= target) return state;
      const draftPicks = [
        ...state.draftPicks,
        { category: action.category, teamIndex: plan.teamIndex },
      ];
      const next = { ...state, draftPicks, draftError: null };
      if (usesClassicFlow(state.mode) && draftPicks.length === classicDraftSteps(target).length) {
        return startBoard(next, action.questions, action.playedIds);
      }
      if (state.mode === "buzzer" && state.settings.format !== "custom" && draftPicks.length === target) {
        return startBoard(next, action.questions, action.playedIds);
      }
      return next;
    }
    case "FINISH_DRAFT":
      if (state.mode !== "buzzer" || state.draftPicks.length < state.teams.length) return state;
      return startBoard(state, action.questions, action.playedIds);
    case "OPEN_TILE": {
      if (state.phase !== "board") return state;
      const tile = state.board.find((item) => item.id === action.tileId && item.status === "open");
      if (!tile) return state;
      const exclude = state.board.map((item) => item.questionId).filter((id) => id > 0);
      const picked = pickForTile(state, action.questions, tile, action.playedIds, exclude);
      if (!picked) return { ...state, notice: "لا توجد أسئلة متاحة لهذه الخانة" };
      const board = state.board.map((item) =>
        item.id === tile.id
          ? { ...item, questionId: picked.question.id, reused: picked.reused }
          : item,
      );
      const choiceOpen = state.mode === "choices";
      const opened = {
        ...state,
        ...questionFields(),
        board,
        currentTileId: tile.id,
        notice: null,
        cue: sound(state, "tile"),
        optionsVisible: choiceOpen,
        optionsOrder: choiceOpen ? shuffle([...picked.question.options]) : [],
      };
      if (picked.question.kind === "activity") {
        return { ...opened, phase: "adjudicate", timer: 0, timerRunning: false, optionsVisible: false, optionsOrder: [] };
      }
      if (usesClassicFlow(state.mode)) {
        return {
          ...opened,
          phase: "primary",
          timer: state.settings.primarySeconds,
          timerRunning: true,
        };
      }
      return { ...opened, phase: "buzzOpen", timer: 0, timerRunning: false };
    }
    case "REPLACE_CURRENT": {
      if (!isQuestionPhase(state.phase) || !state.currentTileId) return state;
      const tile = state.board.find((item) => item.id === state.currentTileId);
      if (!tile) return state;
      const exclude = [
        tile.questionId,
        ...(action.excludeIds ?? []),
        ...state.board.map((item) => item.questionId),
      ];
      const picked = pickForTile(
        state,
        action.questions,
        { ...tile, questionId: 0 },
        action.playedIds,
        exclude,
      );
      if (!picked) {
        return { ...state, notice: "لا يوجد بديل متاح في نفس الفئة والنقاط" };
      }
      const board = state.board.map((item) =>
        item.id === tile.id
          ? { ...item, questionId: picked.question.id, reused: picked.reused }
          : item,
      );
      const choiceOpen = state.mode === "choices";
      const base = {
        ...state,
        ...questionFields(),
        board,
        currentTileId: tile.id,
        notice: "تم استبدال المحتوى",
        cue: sound(state, "tile"),
        optionsVisible: choiceOpen,
        optionsOrder: choiceOpen ? shuffle([...picked.question.options]) : [],
      };
      if (picked.question.kind === "activity") {
        return { ...base, phase: "adjudicate", timer: 0, timerRunning: false, optionsVisible: false, optionsOrder: [] };
      }
      if (usesClassicFlow(state.mode)) {
        return {
          ...base,
          phase: "primary",
          timer: state.settings.primarySeconds,
          timerRunning: true,
        };
      }
      return { ...base, phase: "buzzOpen", timer: 0, timerRunning: false };
    }
    case "TICK": {
      if (!state.timerRunning || state.timerPaused) return state;
      if (state.phase !== "primary" && state.phase !== "steal") return state;
      if (state.timer <= 1) {
        if (state.phase === "primary") {
          return {
            ...state,
            phase: "steal",
            timer: state.settings.stealSeconds,
            timerRunning: true,
            timerPaused: false,
            cue: sound(state, "timeup"),
          };
        }
        return {
          ...state,
          phase: "adjudicate",
          timer: 0,
          timerRunning: false,
          timerPaused: false,
          cue: sound(state, "timeup"),
        };
      }
      const timer = state.timer - 1;
      return {
        ...state,
        timer,
        cue: timer <= 10 ? sound(state, "tick") : state.cue,
      };
    }
    case "PAUSE":
      if (!state.timerRunning || (state.phase !== "primary" && state.phase !== "steal")) return state;
      return { ...state, timerPaused: true };
    case "RESUME":
      if (!state.timerRunning) return state;
      return { ...state, timerPaused: false };
    case "LOCK":
      if (state.phase === "primary") {
        return {
          ...state,
          phase: "steal",
          timer: state.settings.stealSeconds,
          timerRunning: true,
          timerPaused: false,
        };
      }
      if (state.phase === "steal") {
        return { ...state, phase: "adjudicate", timer: 0, timerRunning: false, timerPaused: false };
      }
      return state;
    case "USE_POWER": {
      if (!livePower(state, action.teamIndex, action.kind)) return state;
      if (action.kind === "time") {
        if (state.phase !== "primary" && state.phase !== "steal") return state;
        return {
          ...spend(state, action.teamIndex, "time"),
          timer: state.timer + EXTRA_TIME_SECONDS,
          timerRunning: true,
          timerPaused: false,
          notice: `+${EXTRA_TIME_SECONDS} ثانية`,
          cue: sound(state, "power"),
        };
      }
      if (action.kind === "choice") {
        if (state.mode === "closest" || state.mode === "choices") return state;
        if (state.optionsVisible || !action.options?.length) return state;
        return {
          ...spend(state, action.teamIndex, "choice"),
          optionsVisible: true,
          optionsOrder: shuffle(action.options),
          cue: sound(state, "power"),
        };
      }
      if (action.kind === "range") {
        if (state.mode !== "closest" || state.rangeVisible) return state;
        if (action.answerNumber == null || !Number.isFinite(action.answerNumber)) return state;
        const band = buildAnswerRange(action.answerNumber);
        return {
          ...spend(state, action.teamIndex, "range"),
          rangeVisible: true,
          rangeLow: band.low,
          rangeHigh: band.high,
          notice: "نطاق تقريبي ظاهر للجميع",
          cue: sound(state, "power"),
        };
      }
      if (action.kind === "cut") {
        if (state.mode !== "choices") return state;
        if (!action.options?.length || !action.correctAnswer) return state;
        if (state.optionsOrder.length > 0 && state.optionsOrder.length <= 2) return state;
        const correct = action.correctAnswer;
        const wrongs = shuffle(action.options.filter((option) => option !== correct));
        const keepWrong = wrongs[0];
        if (!keepWrong) return state;
        return {
          ...spend(state, action.teamIndex, "cut"),
          optionsVisible: true,
          optionsOrder: shuffle([correct, keepWrong]),
          notice: "حُذف خياران خاطئان",
          cue: sound(state, "power"),
        };
      }
      if (action.kind !== "skip") return state;
      const spent = spend(state, action.teamIndex, "skip");
      const nextPicker = (state.activeTeamIndex + 1) % Math.max(1, state.teams.length);
      return settle(spent, "skipped", nextPicker, "power");
    }
    case "BUZZ": {
      if (state.phase !== "buzzOpen") return state;
      const team = state.teams[action.teamIndex];
      if (!team || state.lockedOutTeamIds.includes(team.id)) return state;
      return {
        ...state,
        phase: "buzzLocked",
        buzzingTeamIndex: action.teamIndex,
        remoteBuzz: null,
        notice: null,
        cue: sound(state, "buzz"),
      };
    }
    case "STEAL": {
      if (!stealEligible(state).includes(action.teamIndex)) return state;
      const spent = spend(state, action.teamIndex, "steal");
      return { ...spent, buzzingTeamIndex: action.teamIndex, cue: sound(state, "steal") };
    }
    case "REVEAL": {
      if (state.phase !== "adjudicate" && state.phase !== "resolved" && state.phase !== "buzzLocked") {
        return state;
      }
      const revealed = { ...state, answerRevealed: true };
      if (state.phase === "adjudicate" && state.mode === "closest" && action.correctAnswer) {
        const numericCount = state.teams.filter(
          (team) => state.submissions[team.id]?.number != null,
        ).length;
        if (numericCount >= 2) {
          const winner = closestWinnerIndex(revealed, action.correctAnswer);
          const points = currentPoints(revealed);
          const teams =
            winner == null
              ? revealed.teams
              : revealed.teams.map((team, index) =>
                  index === winner ? { ...team, score: clampScore(team.score + points) } : team,
                );
          const nextPicker = (revealed.activeTeamIndex + 1) % Math.max(1, revealed.teams.length);
          return settle(
            {
              ...revealed,
              teams,
              notice:
                winner == null
                  ? "تعادل في الأقرب — بدون نقاط"
                  : `الأقرب: ${revealed.teams[winner]?.name ?? ""}`,
            },
            "played",
            nextPicker,
            winner == null ? "wrong" : "correct",
          );
        }
      }
      return revealed;
    }
    case "AWARD": {
      if (state.phase !== "adjudicate" || !state.answerRevealed) return state;
      const points = currentPoints(state);
      const teams =
        action.teamIndex == null
          ? state.teams
          : state.teams.map((team, index) =>
              index === action.teamIndex ? { ...team, score: clampScore(team.score + points) } : team,
            );
      const nextPicker = (state.activeTeamIndex + 1) % Math.max(1, state.teams.length);
      return settle(
        { ...state, teams },
        "played",
        nextPicker,
        action.teamIndex == null ? "wrong" : "correct",
      );
    }
    case "BUZZ_CORRECT": {
      if (state.phase !== "buzzLocked" || state.buzzingTeamIndex == null) return state;
      const points = currentPoints(state);
      const index = state.buzzingTeamIndex;
      const teams = state.teams.map((team, teamIndex) =>
        teamIndex === index ? { ...team, score: clampScore(team.score + points) } : team,
      );
      return {
        ...state,
        teams,
        phase: "resolved",
        answerRevealed: true,
        timerRunning: false,
        outcome: { kind: "correct", teamIndex: index, delta: points },
        cue: sound(state, "correct"),
      };
    }
    case "BUZZ_WRONG": {
      if (state.phase !== "buzzLocked" || state.buzzingTeamIndex == null) return state;
      const penalty = currentPoints(state) / 2;
      const index = state.buzzingTeamIndex;
      const team = state.teams[index];
      const teams = state.teams.map((item, teamIndex) =>
        teamIndex === index ? { ...item, score: clampScore(item.score - penalty) } : item,
      );
      return {
        ...state,
        teams,
        lockedOutTeamIds: [...state.lockedOutTeamIds, team.id],
        buzzingTeamIndex: null,
        remoteBuzz: null,
        phase: "buzzOpen",
        notice: `خصم ${penalty} من ${team.name}`,
        cue: sound(state, "wrong"),
      };
    }
    case "CLOSE_QUESTION":
      if (state.phase !== "buzzOpen" && state.phase !== "buzzLocked") return state;
      return {
        ...state,
        phase: "resolved",
        answerRevealed: true,
        timerRunning: false,
        outcome: { kind: "closed", teamIndex: null, delta: 0 },
      };
    case "CONTINUE": {
      if (state.phase !== "resolved" || !state.outcome) return state;
      const nextPicker =
        state.outcome.kind === "correct" && state.outcome.teamIndex != null
          ? state.outcome.teamIndex
          : (state.activeTeamIndex + 1) % Math.max(1, state.teams.length);
      const status = state.outcome.kind === "closed" ? "skipped" : "played";
      return settle(state, status, nextPicker, null);
    }
    case "TOGGLE_PEEK":
      if (!isQuestionPhase(state.phase)) return state;
      return { ...state, hostPeek: !state.hostPeek };
    case "ADJUST_SCORE":
      return {
        ...state,
        teams: state.teams.map((team) => {
          if (team.id !== action.teamId) return team;
          const next = action.exact == null ? team.score + (action.delta ?? 0) : action.exact;
          return { ...team, score: clampScore(next) };
        }),
      };
    case "RENAME_TEAM":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, name: action.name.trim() || team.name } : team,
        ),
      };
    case "RESET_COOLDOWN":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, cooldowns: { ...team.cooldowns, [action.kind]: 0 } }
            : team,
        ),
      };
    case "DOUBLE_REMAINING": {
      const lead = unreachableLead(state);
      if (!lead || state.pointMultiplier >= MAX_POINT_MULTIPLIER) return state;
      const pointMultiplier = state.pointMultiplier * 2;
      return {
        ...state,
        pointMultiplier,
        notice: `نقاط الأسئلة المتبقية أصبحت ×${pointMultiplier}`,
        cue: sound(state, "power"),
      };
    }
    case "END_MATCH":
      if (state.phase === "lobby" || state.phase === "podium") return state;
      return {
        ...state,
        ...questionFields(),
        phase: "podium",
        timerRunning: false,
        hostPanelOpen: false,
      };
    case "REPLAY":
      return {
        ...createInitialState(),
        muted: state.muted,
        settings: state.settings,
        cue: state.cue,
      };
    case "PLAYER_JOIN": {
      if (!state.teams.some((team) => team.id === action.teamId)) return state;
      const name = sanitizePlayerName(action.name);
      const existing = state.players.find((player) => player.id === action.playerId);
      if (existing) {
        const players = state.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                name,
                teamId: action.teamId,
                connected: true,
                lastSeen: action.at,
              }
            : player,
        );
        const teamHasLeader = players.some(
          (player) => player.teamId === action.teamId && player.isLeader && player.connected,
        );
        return {
          ...state,
          players: teamHasLeader ? players : withLeader(players, action.teamId, action.playerId),
        };
      }
      const alone = !state.players.some((player) => player.teamId === action.teamId && player.connected);
      const seat: PlayerSeat = {
        id: action.playerId,
        name,
        teamId: action.teamId,
        isLeader: alone,
        connected: true,
        lastSeen: action.at,
      };
      return { ...state, players: [...state.players, seat] };
    }
    case "PLAYER_LEAVE": {
      const leaving = state.players.find((player) => player.id === action.playerId);
      if (!leaving) return state;
      let players = state.players.map((player) =>
        player.id === action.playerId ? { ...player, connected: false, isLeader: false } : player,
      );
      if (leaving.isLeader) {
        const next = players.find((player) => player.teamId === leaving.teamId && player.connected);
        if (next) players = withLeader(players, leaving.teamId, next.id);
      }
      return { ...state, players };
    }
    case "PLAYER_PING": {
      if (!state.players.some((player) => player.id === action.playerId)) return state;
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId
            ? { ...player, connected: true, lastSeen: action.at }
            : player,
        ),
      };
    }
    case "PLAYER_SET_LEADER": {
      if (!state.players.some((player) => player.id === action.targetId && player.teamId === action.teamId)) {
        return state;
      }
      return { ...state, players: withLeader(state.players, action.teamId, action.targetId) };
    }
    case "PLAYER_BUZZ": {
      if (state.phase !== "buzzOpen") return state;
      const player = state.players.find((item) => item.id === action.playerId && item.connected);
      if (!player) return state;
      const teamIndex = state.teams.findIndex((team) => team.id === player.teamId);
      if (teamIndex < 0 || state.lockedOutTeamIds.includes(player.teamId)) return state;
      return {
        ...state,
        phase: "buzzLocked",
        buzzingTeamIndex: teamIndex,
        remoteBuzz: {
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          at: action.at,
        },
        notice: `ضغط أولاً: ${player.name}`,
        cue: sound(state, "buzz"),
      };
    }
    case "PLAYER_SUBMIT": {
      const player = state.players.find((item) => item.id === action.playerId && item.connected);
      if (!player || !canSubmit(state, player)) return state;
      if (action.kind === "number" && (action.number == null || !Number.isFinite(action.number))) {
        return state;
      }
      const text = action.text.trim().slice(0, 120);
      if (!text && action.kind !== "number") return state;
      const number =
        action.kind === "number"
          ? action.number
          : action.kind === "text"
            ? parseAnswerNumber(text)
            : null;
      const entry: AnswerSubmission = {
        playerId: player.id,
        teamId: player.teamId,
        kind: action.kind,
        text: action.kind === "number" && action.number != null ? String(action.number) : text,
        number: number != null && Number.isFinite(number) ? number : null,
        at: action.at,
      };
      return {
        ...state,
        submissions: { ...state.submissions, [player.teamId]: entry },
        notice: `إجابة ${player.name} وصلت`,
      };
    }
    case "MARK_PLAYERS_STALE": {
      const timeout = action.timeoutMs ?? 7000;
      let changed = false;
      const players = state.players.map((player) => {
        if (!player.connected) return player;
        if (action.now - player.lastSeen <= timeout) return player;
        changed = true;
        return { ...player, connected: false };
      });
      if (!changed) return state;
      let next = players;
      for (const team of state.teams) {
        const leader = next.find((player) => player.teamId === team.id && player.isLeader);
        if (leader && !leader.connected) {
          const replacement = next.find((player) => player.teamId === team.id && player.connected);
          next = replacement
            ? withLeader(next, team.id, replacement.id)
            : next.map((player) =>
                player.teamId === team.id ? { ...player, isLeader: false } : player,
              );
        }
      }
      return { ...state, players: next };
    }
    default:
      return state;
  }
}
