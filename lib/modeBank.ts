import { parseAnswerNumber } from "./numberRange";
import type { GameMode, Points, Question } from "./types";

export function isNumericTrivia(question: Question) {
  return question.kind === "trivia" && parseAnswerNumber(question.answer) != null;
}

export function isChoiceTrivia(question: Question) {
  return question.kind === "trivia" && Array.isArray(question.options) && question.options.length === 4;
}

export function playableQuestions(bank: Question[], mode: GameMode) {
  if (mode === "closest") return bank.filter(isNumericTrivia);
  if (mode === "choices") return bank.filter(isChoiceTrivia);
  return bank;
}

export function categoryPlayable(
  bank: Question[],
  mode: GameMode,
  category: string,
  pointTiers: readonly Points[],
) {
  const pool = playableQuestions(bank, mode).filter((question) => question.category === category);
  if (!pool.length) return false;
  if (mode === "closest") {
    // Prefer full tier coverage; otherwise require at least one numeric per selected tier
    // OR enough numerics overall so open-tile fallback can still work.
    const covered = pointTiers.every((tier) => pool.some((question) => question.points === tier));
    if (covered) return true;
    return pool.length >= Math.max(3, pointTiers.length);
  }
  if (mode === "choices") {
    return pointTiers.every((tier) => pool.some((question) => question.points === tier));
  }
  return pointTiers.every((tier) => pool.some((question) => question.points === tier));
}

export function categoriesForMode(bank: Question[], mode: GameMode, pointTiers: readonly Points[]) {
  const names = [...new Set(playableQuestions(bank, mode).map((question) => question.category))];
  return names.filter((category) => categoryPlayable(bank, mode, category, pointTiers));
}
