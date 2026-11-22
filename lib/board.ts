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

function shuffleInPlace<T>(values: T[], random: () => number) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = pickIndex(index + 1, random);
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

export function selectQuestion(
  questions: Question[],
  category: string,
  points: Points,
  playedIds: number[],
  excludeIds: number[] = [],
  random: () => number = Math.random,
) {
  const blocked = new Set(excludeIds.filter((id) => id > 0));
  const pool = questions.filter(
    (question) =>
      question.category === category &&
      question.points === points &&
      !blocked.has(question.id),
  );
  if (!pool.length) return null;

  const fresh = pool.filter((question) => !playedIds.includes(question.id));
  if (fresh.length) {
    const draw = shuffleInPlace([...fresh], random);
    return { question: draw[0], reused: false };
  }

  const ranked = pool
    .map((question) => ({
      question,
      at: playedIds.indexOf(question.id),
    }))
    .sort((a, b) => a.at - b.at || a.question.id - b.question.id);
  const window = Math.max(1, Math.min(ranked.length, Math.ceil(ranked.length * 0.4)));
  const candidates = ranked.slice(0, window).map((item) => item.question);
  return { question: candidates[pickIndex(candidates.length, random)], reused: true };
}

export function categoryKind(questions: Question[], category: string): "trivia" | "activity" | "mixed" {
  const kinds = new Set(
    questions.filter((question) => question.category === category).map((question) => question.kind),
  );
  if (kinds.size === 0) return "trivia";
  if (kinds.size > 1) return "mixed";
  return kinds.has("activity") ? "activity" : "trivia";
}

export function tierAvailable(questions: Question[], category: string, points: Points) {
  return questions.some((question) => question.category === category && question.points === points);
}

export function buildBoard(
  categories: string[],
  questions: Question[],
  playedIds: number[] = [],
  pointTiers: readonly Points[] = POINT_VALUES,
  options: { allowMissingTiers?: boolean } = {},
): { board: Tile[]; error: string | null } {
  void playedIds;
  const tiers = pointTiers.length ? pointTiers : POINT_VALUES;
  const board: Tile[] = [];
  for (const category of categories) {
    const inCategory = questions.some((question) => question.category === category);
    if (!inCategory) {
      return { board: [], error: `لا توجد أسئلة متاحة: ${category}` };
    }
    for (const points of tiers) {
      if (!options.allowMissingTiers && !tierAvailable(questions, category, points)) {
        return { board: [], error: `لا توجد أسئلة متاحة: ${category} / ${points}` };
      }
      board.push({
        id: `${category}-${points}`,
        category,
        points,
        questionId: 0,
        reused: false,
        status: "open",
      });
    }
  }
  return { board, error: null };
}

export function rememberPlayed(playedIds: number[], questionId: number) {
  if (!questionId) return playedIds;
  return [...playedIds.filter((id) => id !== questionId), questionId];
}
