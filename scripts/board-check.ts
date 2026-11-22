import { readFileSync } from "node:fs";
import { buildBoard, selectQuestion } from "../lib/board";
import { numberSequence } from "../lib/direction";
import type { Points, Question } from "../lib/types";

const bank = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8")) as Question[];

function question(id: number, points: Points): Question {
  return {
    id,
    kind: "trivia",
    category: "تجربة",
    points,
    question: `سؤال ${id}`,
    answer: "جواب",
    hint: "تلميح",
    options: ["أ", "ب", "ج", "د"],
  };
}

const pool = [1, 2, 3, 4].map((id) => question(id, 100));
const low = selectQuestion(pool, "تجربة", 100, [], [], () => 0);
const high = selectQuestion(pool, "تجربة", 100, [], [], () => 0.99);
if (!low || !high || low.question.id === high.question.id) {
  throw new Error("random draw did not cover different rolls");
}
const skipped = selectQuestion(pool, "تجربة", 100, [1, 2], [], () => 0.5);
if (!skipped || skipped.reused || ![3, 4].includes(skipped.question.id)) {
  throw new Error("played questions were drawn again");
}
const repeated = new Set<number>();
for (let roll = 0; roll < 40; roll += 1) {
  const picked = selectQuestion(pool, "تجربة", 100, [], [], Math.random);
  if (!picked) throw new Error("empty draw");
  repeated.add(picked.question.id);
}
if (repeated.size < 2) throw new Error("draw stayed on one question");

const built = buildBoard(
  ["تجربة"],
  [question(10, 100), question(11, 200), question(12, 300), question(13, 400), question(14, 500)],
  [],
);
if (built.error || built.board.length !== 5) throw new Error(built.error ?? "board size");
if (built.board.some((tile) => tile.questionId !== 0)) throw new Error("board must defer question picks");

const sparse = buildBoard(["تجربة"], [question(20, 300), question(21, 500)], [], [100, 200, 300, 400, 500], {
  allowMissingTiers: true,
});
if (sparse.error || sparse.board.length !== 5) throw new Error(sparse.error ?? "sparse board");
const blocked = buildBoard(["تجربة"], [question(20, 300), question(21, 500)], [], [100, 200, 300, 400, 500]);
if (!blocked.error) throw new Error("missing tiers should fail without allowMissingTiers");

const many = Array.from({ length: 40 }, (_, index) => question(100 + index, 100));
const draws = new Set<number>();
for (let round = 0; round < 40; round += 1) {
  const picked = selectQuestion(many, "تجربة", 100, [], [], Math.random);
  if (!picked) throw new Error("empty random draw");
  draws.add(picked.question.id);
}
if (draws.size < 10) throw new Error(`random draw too narrow: ${draws.size}`);

const tiers = new Map<string, { kind: string; set: Map<number, number> }>();
for (const item of bank) {
  const entry = tiers.get(item.category) ?? { kind: item.kind ?? "trivia", set: new Map<number, number>() };
  entry.set.set(item.points, (entry.set.get(item.points) ?? 0) + 1);
  tiers.set(item.category, entry);
}
for (const [category, { kind, set }] of tiers) {
  const perTier = kind === "activity" ? 4 : 10;
  const floor = perTier * 5;
  let total = 0;
  for (const tier of [100, 200, 300, 400, 500]) {
    const count = set.get(tier) ?? 0;
    total += count;
    if (count < perTier) throw new Error(`${category} has ${count} at ${tier}, need ${perTier}`);
  }
  if (total < floor) throw new Error(`${category} has only ${total} items`);
}

const lost = bank.find((item) => item.id === 277);
if (!lost || numberSequence(lost.answer)?.join(",") !== "4,8,15,16,23,42") {
  throw new Error("lost numbers were rewritten");
}
if (numberSequence("99.1%")) throw new Error("a single figure should stay one piece");
if (numberSequence("الحضارة السومرية")) throw new Error("arabic text is not a number list");

console.log("board checks passed");
