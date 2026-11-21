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
const first = selectQuestion(pool, "تجربة", 100, [], [], () => 0);
const last = selectQuestion(pool, "تجربة", 100, [], [], () => 0.99);
if (first?.question.id !== 1 || last?.question.id !== 4) throw new Error("random draw did not cover the pool");
const skipped = selectQuestion(pool, "تجربة", 100, [1, 2], [], () => 0);
if (skipped?.question.id !== 3 || skipped.reused) throw new Error("played questions were drawn again");
const repeated = new Set<number>();
for (let roll = 0; roll < 20; roll += 1) {
  const picked = selectQuestion(pool, "تجربة", 100, [], [], () => roll / 20);
  if (!picked) throw new Error("empty draw");
  repeated.add(picked.question.id);
}
if (repeated.size < 2) throw new Error("draw stayed on one question");

const built = buildBoard(["تجربة"], [question(10, 100), question(11, 200), question(12, 300), question(13, 400), question(14, 500)], []);
if (built.error || built.board.length !== 5) throw new Error(built.error ?? "board size");

const expectPoints: Record<number, Points> = {
  23: 300,
  27: 100,
  118: 200,
  337: 100,
  238: 200,
  18: 200,
  440: 300,
  54: 200,
  58: 300,
  493: 300,
  451: 200,
  245: 100,
  96: 200,
  5: 500,
  277: 500,
};
for (const [id, points] of Object.entries(expectPoints)) {
  const found = bank.find((item) => item.id === Number(id));
  if (!found || found.points !== points) throw new Error(`points for ${id} are ${found?.points}, expected ${points}`);
}

const tiers = new Map<string, Set<number>>();
for (const item of bank) {
  const set = tiers.get(item.category) ?? new Set<number>();
  set.add(item.points);
  tiers.set(item.category, set);
}
for (const [category, set] of tiers) {
  for (const tier of [100, 200, 300, 400, 500]) {
    if (!set.has(tier)) throw new Error(`${category} has no ${tier}`);
  }
}

const lost = bank.find((item) => item.id === 277);
if (!lost || numberSequence(lost.answer)?.join(",") !== "4,8,15,16,23,42") {
  throw new Error("lost numbers were rewritten");
}
if (numberSequence("99.1%")) throw new Error("a single figure should stay one piece");
if (numberSequence("الحضارة السومرية")) throw new Error("arabic text is not a number list");

console.log("board checks passed");
