import bundled from "@/data/questions.json";
import { toQuestion } from "./parsePack";
import { rememberPlayed } from "./board";
import type { Question } from "./types";

export const STORAGE = {
  bank: "trivia.customBank",
  played: "trivia.playedQuestionIds",
  mute: "trivia.muted",
  match: "trivia.match",
  settings: "trivia.settings",
  screenRoom: "trivia.screenRoom",
  screenLive: "trivia.screenLive",
  screenViewer: "trivia.screenViewer",
  playPlayer: "trivia.playPlayer",
} as const;

export const bundledQuestions: Question[] = (bundled as unknown[])
  .map((item) => toQuestion(item))
  .filter((item): item is Question => item !== null);

export function loadCustomBank(): Question[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE.bank);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const questions = parsed
      .map((item) => toQuestion(item))
      .filter((item): item is Question => item !== null);
    return questions.length ? questions : null;
  } catch {
    return null;
  }
}

export function resolveBank(custom: Question[] | null): Question[] {
  if (!custom?.length) return bundledQuestions;
  const map = new Map<number, Question>();
  for (const question of bundledQuestions) map.set(question.id, question);
  for (const question of custom) map.set(question.id, question);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function saveCustomBank(questions: Question[]) {
  const normalized = questions
    .map((item) => toQuestion(item))
    .filter((item): item is Question => item !== null);
  localStorage.setItem(STORAGE.bank, JSON.stringify(normalized));
}

export function clearCustomBank() {
  localStorage.removeItem(STORAGE.bank);
}

export function loadPlayedIds() {
  if (typeof window === "undefined") return [] as number[];
  try {
    const raw = localStorage.getItem(STORAGE.played);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => Number.isInteger(id)) as number[];
  } catch {
    return [];
  }
}

export function savePlayedIds(ids: number[]) {
  localStorage.setItem(STORAGE.played, JSON.stringify(ids));
}

export function pushPlayed(ids: number[], questionId: number) {
  const next = rememberPlayed(ids, questionId);
  savePlayedIds(next);
  return next;
}
