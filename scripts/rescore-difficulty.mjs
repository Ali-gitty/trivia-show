/**
 * Re-assign point tiers inside every category so harder items sit higher.
 * Keeps the existing per-tier counts (trivia 10×5, activities 4×5).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bankPath = join(root, "data/questions.json");
const tiers = [100, 200, 300, 400, 500];

function activityScore(item) {
  let score = item.points; // mild prior so relative order inside a broken tier still moves
  const text = `${item.question} ${item.answer}`;
  const seconds = Number((text.match(/(\d+)\s*(?:ثانية|ثوان)/) || [])[1] || 0);
  if (seconds && seconds <= 15) score += 35;
  else if (seconds && seconds <= 25) score += 20;
  else if (seconds && seconds <= 35) score += 10;
  else if (seconds >= 45) score += 5;

  if (/مغمض|غير المهيمنة|العين|بالترتيب|دون استخدام حرف|جماعي|Relay|كل الفريق/.test(text)) score += 40;
  if (/أربع كلمات|أربعة|5 |خمس|بدون|دون/.test(text)) score += 15;
  if (/قف|ساق|توازن|Stopwatch|±/.test(text)) score += 20;
  if (/أطفال/.test(item.category)) score -= 25;
  if (/100|سهل|30 ثانية/.test(text) && item.points === 100) score -= 5;
  score += Math.min(item.question.length, 80) / 4;
  return score;
}

function triviaScore(item) {
  let score = 0;
  const answer = item.answer || "";
  const question = item.question || "";
  score += Math.min(answer.length, 48);
  if (answer.length <= 4) score -= 12;
  if (answer.length >= 18) score += 10;
  if (/\d/.test(answer)) score += 14;
  if (/\d{3,}/.test(answer)) score += 8;
  if (/^من |من هو|من هي|ما اسم|في أي عام|متى |كم /.test(question)) score += 8;
  if (/لماذا|كيف |بماذا|أي من/.test(question)) score += 6;
  if (/ تقريبا|حوالي|أكثر من/.test(answer)) score += 5;
  if (/الأطفال/.test(item.category)) score -= 28;
  if (/حساب بسيط/.test(item.category)) {
    const n = (answer.match(/\d+/g) || []).map(Number);
    score += Math.max(...n, 0) / 8;
  }
  // Slight prior from current tier so we don't thrash stable easy/hard labels.
  score += item.points / 20;
  // Unique-ish option length variance: closer wrong options feel harder.
  if (Array.isArray(item.options)) {
    const lens = item.options.map((option) => option.length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + Math.abs(b - avg), 0) / lens.length;
    if (variance < 3) score += 6;
  }
  return score;
}

function assignTiers(items) {
  const counts = new Map(tiers.map((tier) => [tier, items.filter((item) => item.points === tier).length]));
  for (const tier of tiers) {
    if ((counts.get(tier) || 0) < 1) throw new Error(`empty tier before rescore`);
  }
  const scored = [...items].sort((a, b) => {
    const diff = (a._score ?? 0) - (b._score ?? 0);
    if (diff !== 0) return diff;
    return a.id - b.id;
  });
  let cursor = 0;
  for (const tier of tiers) {
    const count = counts.get(tier);
    for (let i = 0; i < count; i += 1) {
      scored[cursor + i].points = tier;
    }
    cursor += count;
  }
  return scored;
}

const bank = JSON.parse(readFileSync(bankPath, "utf8"));
const byCategory = new Map();
for (const item of bank) {
  if (!byCategory.has(item.category)) byCategory.set(item.category, []);
  byCategory.get(item.category).push(item);
}

const moved = [];
for (const [category, items] of byCategory) {
  for (const item of items) {
    item._score = item.kind === "activity" ? activityScore(item) : triviaScore(item);
  }
  const before = new Map(items.map((item) => [item.id, item.points]));
  assignTiers(items);
  for (const item of items) {
    if (before.get(item.id) !== item.points) {
      moved.push({ id: item.id, category, from: before.get(item.id), to: item.points });
    }
    delete item._score;
  }
}

const next = [...byCategory.values()].flat().sort((a, b) => a.id - b.id);
writeFileSync(bankPath, `${JSON.stringify(next, null, 2)}\n`);

// verify tier floors
for (const [category, items] of byCategory) {
  const kind = items[0]?.kind === "activity" ? "activity" : "trivia";
  const need = kind === "activity" ? 4 : 10;
  for (const tier of tiers) {
    const count = items.filter((item) => item.points === tier).length;
    if (count < need) throw new Error(`${category} tier ${tier} has ${count}`);
  }
}

console.log(
  JSON.stringify(
    {
      categories: byCategory.size,
      moved: moved.length,
      sample: moved.slice(0, 12),
    },
    null,
    2,
  ),
);
