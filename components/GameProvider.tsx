"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { categoriesOf, rememberPlayed } from "@/lib/board";
import {
  bundledQuestions,
  clearCustomBank,
  loadCustomBank,
  loadPlayedIds,
  saveCustomBank,
  savePlayedIds,
  STORAGE,
} from "@/lib/bank";
import {
  createInitialState,
  gameReducer,
  isQuestionPhase,
  type Action,
} from "@/lib/gameReducer";
import { mergeQuestions, toQuestion } from "@/lib/parsePack";
import { SoundEngine } from "@/lib/sounds";
import { normalizeHostSettings, type GameMode, type GameState, type PowerKind, type Question } from "@/lib/types";

type GameApi = {
  state: GameState;
  bank: Question[];
  playedIds: number[];
  ready: boolean;
  categories: string[];
  currentQuestion: Question | null;
  dispatch: (action: Action) => void;
  startDraft: (mode: GameMode, teams: { name: string; color: string }[]) => void;
  pickCategory: (category: string) => void;
  finishDraft: () => void;
  openTile: (tileId: string) => void;
  usePower: (teamIndex: number, kind: "hint" | "choice" | "skip") => void;
  toggleMute: () => void;
  resetPlayed: () => void;
  saveQuestion: (draft: Question, isNew: boolean) => string | null;
  deleteQuestion: (id: number) => string | null;
  importQuestions: (questions: Question[]) => void;
  restoreBundled: () => void;
};

const GameContext = createContext<GameApi | null>(null);

function sanitize(input: GameState): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...input,
    teams: Array.isArray(input.teams) ? input.teams : [],
    board: Array.isArray(input.board) ? input.board : [],
    draftPicks: Array.isArray(input.draftPicks) ? input.draftPicks : [],
    lockedOutTeamIds: Array.isArray(input.lockedOutTeamIds) ? input.lockedOutTeamIds : [],
    usedThisQuestion: Array.isArray(input.usedThisQuestion) ? input.usedThisQuestion : [],
    optionsOrder: Array.isArray(input.optionsOrder) ? input.optionsOrder : [],
    settings: normalizeHostSettings(input.settings),
    settingsOpen: false,
    cue: input.cue ?? base.cue,
  };
}

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE.settings);
    return normalizeHostSettings(raw ? (JSON.parse(raw) as Partial<GameState["settings"]>) : null);
  } catch {
    return normalizeHostSettings(null);
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [bank, setBank] = useState<Question[]>(bundledQuestions);
  const [playedIds, setPlayedIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const sounds = useMemo(() => new SoundEngine(), []);
  const lastCue = useRef(0);
  const boardSnapshot = useRef(state.board);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const custom = loadCustomBank();
      if (custom) setBank(custom);
      setPlayedIds(loadPlayedIds());
      const muted = localStorage.getItem(STORAGE.mute) === "1";
      const settings = loadPersistedSettings();
      const saved = sessionStorage.getItem(STORAGE.match);
      if (saved) {
        try {
          const parsed = sanitize(JSON.parse(saved) as GameState);
          parsed.cue = { ...parsed.cue, name: null };
          parsed.muted = muted || parsed.muted;
          parsed.settings = settings;
          if (parsed.timerRunning) {
            parsed.timerPaused = true;
            parsed.notice = "توقف المؤقت بعد تحديث الصفحة. استأنفه من لوحة المقدم.";
          }
          lastCue.current = parsed.cue.id;
          boardSnapshot.current = parsed.board;
          dispatch({ type: "HYDRATE", state: parsed });
        } catch {
          dispatch({
            type: "HYDRATE",
            state: { ...createInitialState(), muted, settings },
          });
        }
      } else {
        dispatch({
          type: "HYDRATE",
          state: { ...createInitialState(), muted, settings },
        });
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(STORAGE.match, JSON.stringify(state));
  }, [ready, state]);

  useEffect(() => {
    if (!ready) return;
    sounds.setMuted(state.muted);
    localStorage.setItem(STORAGE.mute, state.muted ? "1" : "0");
  }, [ready, sounds, state.muted]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
  }, [ready, state.settings]);

  useEffect(() => {
    if (!ready || state.cue.id === lastCue.current) return;
    lastCue.current = state.cue.id;
    if (state.cue.name) sounds.play(state.cue.name);
  }, [ready, sounds, state.cue]);

  useEffect(() => {
    if (!state.timerRunning || state.timerPaused) return;
    if (state.phase !== "primary" && state.phase !== "steal") return;
    const id = window.setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.timerPaused, state.timerRunning]);

  useEffect(() => {
    if (!ready || state.phase !== "resolved") return;
    const id = window.setTimeout(() => dispatch({ type: "CONTINUE" }), 2400);
    return () => window.clearTimeout(id);
  }, [ready, state.currentTileId, state.phase]);

  useEffect(() => {
    if (!ready) return;
    const previous = boardSnapshot.current;
    const closed = state.board.filter((tile) => {
      if (tile.status === "open") return false;
      const prior = previous.find((item) => item.id === tile.id);
      return !prior || prior.status === "open";
    });
    boardSnapshot.current = state.board;
    if (!closed.length) return;
    setPlayedIds((current) => {
      const next = closed.reduce((ids, tile) => rememberPlayed(ids, tile.questionId), current);
      savePlayedIds(next);
      return next;
    });
  }, [ready, state.board]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.code === "KeyH" && isQuestionPhase(state.phase)) {
        event.preventDefault();
        dispatch({ type: "TOGGLE_PEEK" });
      }
      if (state.mode !== "buzzer") return;
      const digit = /^Digit([1-7])$/.exec(event.code);
      if (!digit) return;
      const index = Number(digit[1]) - 1;
      if (index < 0 || index >= state.teams.length) return;
      event.preventDefault();
      dispatch({ type: event.shiftKey ? "STEAL" : "BUZZ", teamIndex: index });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.mode, state.phase, state.teams.length]);

  const startDraft = useCallback((mode: GameMode, teams: { name: string; color: string }[]) => {
    dispatch({ type: "START_DRAFT", mode, teams });
  }, []);

  const pickCategory = useCallback((category: string) => {
    dispatch({
      type: "PICK_CATEGORY",
      category,
      questions: bank,
      playedIds,
    });
  }, [bank, playedIds]);

  const finishDraft = useCallback(() => {
    dispatch({
      type: "FINISH_DRAFT",
      questions: bank,
      playedIds,
    });
  }, [bank, playedIds]);

  const openTile = useCallback((tileId: string) => {
    dispatch({ type: "OPEN_TILE", tileId, questions: bank });
  }, [bank]);

  const usePower = useCallback((teamIndex: number, kind: "hint" | "choice" | "skip") => {
    const tile = state.board.find((item) => item.id === state.currentTileId);
    const question = tile ? bank.find((item) => item.id === tile.questionId) : undefined;
    dispatch({
      type: "USE_POWER",
      teamIndex,
      kind,
      options: question ? [...question.options] : undefined,
    });
  }, [bank, state.board, state.currentTileId]);

  const toggleMute = useCallback(() => {
    dispatch({ type: "SET_MUTE", muted: !state.muted });
  }, [state.muted]);

  const resetPlayed = useCallback(() => {
    savePlayedIds([]);
    setPlayedIds([]);
  }, []);

  const saveQuestion = useCallback((draft: Question, isNew: boolean) => {
    const id = isNew ? Math.max(0, ...bank.map((item) => item.id)) + 1 : draft.id;
    const question = toQuestion({ ...draft, id, kind: draft.kind ?? "trivia" });
    if (!question) {
      return draft.kind === "activity"
        ? "تحقق من الحقول: نص الفعالية، ومعايير الحكم، والتلميح."
        : "تحقق من الحقول: أربعة خيارات، والإجابة تطابق أحدها تماماً.";
    }
    setBank((current) => {
      const normalized = current
        .map((item) => toQuestion(item))
        .filter((item): item is Question => item !== null);
      const exists = normalized.some((item) => item.id === question.id);
      const next = exists
        ? normalized.map((item) => (item.id === question.id ? question : item))
        : [...normalized, question].sort((a, b) => a.id - b.id);
      saveCustomBank(next);
      return next;
    });
    return null;
  }, [bank]);

  const deleteQuestion = useCallback((id: number) => {
    if (state.board.some((tile) => tile.questionId === id && tile.status === "open")) {
      return "هذا السؤال على لوحة المباراة الحالية.";
    }
    const next = bank.filter((item) => item.id !== id);
    if (!next.length) return "لا يمكن حذف آخر سؤال في البنك.";
    saveCustomBank(next);
    setBank(next);
    return null;
  }, [bank, state.board]);

  const importQuestions = useCallback((questions: Question[]) => {
    setBank((current) => {
      const next = mergeQuestions(current, questions);
      saveCustomBank(next);
      return next;
    });
  }, []);

  const restoreBundled = useCallback(() => {
    clearCustomBank();
    setBank(bundledQuestions);
  }, []);

  const currentTile = state.board.find((tile) => tile.id === state.currentTileId);
  const currentQuestion = currentTile
    ? bank.find((question) => question.id === currentTile.questionId) ?? null
    : null;

  const api = useMemo<GameApi>(
    () => ({
      state,
      bank,
      playedIds,
      ready,
      categories: categoriesOf(bank),
      currentQuestion,
      dispatch,
      startDraft,
      pickCategory,
      finishDraft,
      openTile,
      usePower,
      toggleMute,
      resetPlayed,
      saveQuestion,
      deleteQuestion,
      importQuestions,
      restoreBundled,
    }),
    [
      bank,
      currentQuestion,
      deleteQuestion,
      finishDraft,
      importQuestions,
      openTile,
      pickCategory,
      playedIds,
      ready,
      resetPlayed,
      restoreBundled,
      saveQuestion,
      startDraft,
      state,
      toggleMute,
      usePower,
    ],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}

export type { PowerKind };
