import { POINT_VALUES, type Points, type Question, type Tile } from "./types";

export function categoriesOf(questions: Question[]) {
  const categories: string[] = [];
  for (const question of questions) {
    if (!categories.includes(question.category)) categories.push(question.category);
  }
  return categories;
}

function pickIndex(length: number, random: () => number) {
  const roll = random();
  const index = Math.floor((Number.isFinite(roll) ? roll : 0) * length);
  return Math.min(length - 1, Math.max(0, index));
}

export function selectQuestion(
  questions: Question[],
  category: string,
  points: Points,
  playedIds: number[],
  excludeIds: number[] = [],
  random: () => number = Math.random,
) {
  const blocked = new Set(excludeIds);
  const pool = questions
    .filter(
      (question) =>
        question.category === category &&
        question.points === points &&
        !blocked.has(question.id),
    )
    .sort((a, b) => a.id - b.id);
  if (!pool.length) return null;
  const fresh = pool.filter((question) => !playedIds.includes(question.id));
  if (fresh.length) return { question: fresh[pickIndex(fresh.length, random)], reused: false };

  let oldest = pool[0];
  let oldestAt = Number.POSITIVE_INFINITY;
  for (const question of pool) {
    const at = playedIds.indexOf(question.id);
    if (at !== -1 && at < oldestAt) {
      oldest = question;
      oldestAt = at;
    }
  }
  return { question: oldest, reused: true };
}

export function categoryKind(questions: Question[], category: string): "trivia" | "activity" | "mixed" {
  const kinds = new Set(
    questions.filter((question) => question.category === category).map((question) => question.kind),
  );
  if (kinds.size === 0) return "trivia";
  if (kinds.size > 1) return "mixed";
  return kinds.has("activity") ? "activity" : "trivia";
}

export function buildBoard(
  categories: string[],
  questions: Question[],
  playedIds: number[],
): { board: Tile[]; error: string | null } {
  const board: Tile[] = [];
  for (const category of categories) {
    for (const points of POINT_VALUES) {
      const picked = selectQuestion(questions, category, points, playedIds);
      if (!picked) {
        return { board: [], error: `لا توجد أسئلة متاحة: ${category} / ${points}` };
      }
      board.push({
        id: `${category}-${points}`,
        category,
        points,
        questionId: picked.question.id,
        reused: picked.reused,
        status: "open",
      });
    }
  }
  return { board, error: null };
}

export function rememberPlayed(playedIds: number[], questionId: number) {
  return [...playedIds.filter((id) => id !== questionId), questionId];
}
