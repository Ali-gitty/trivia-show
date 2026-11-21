import { readFileSync, writeFileSync, existsSync } from "node:fs";

const files = ["/tmp/expand-a.json", "/tmp/expand-b.json", "/tmp/expand-c.json", "/tmp/expand-d.json", "/tmp/expand-topup.json"];
const bankPath = new URL("../data/questions.json", import.meta.url);
const bank = JSON.parse(readFileSync(bankPath, "utf8"));
const prompts = new Set(bank.map((item) => item.question.trim()));
let nextId = Math.max(...bank.map((item) => item.id)) + 1;

function valid(item) {
  if (!item || typeof item !== "object") return false;
  if (item.kind !== "trivia") return false;
  if (![100, 200, 300, 400, 500].includes(item.points)) return false;
  if (!item.category || !item.question || !item.answer || !item.hint) return false;
  if (!Array.isArray(item.options) || item.options.length !== 4) return false;
  if (!item.options.includes(item.answer)) return false;
  return true;
}

const added = [];
for (const file of files) {
  if (!existsSync(file)) {
    console.error("missing", file);
    process.exit(1);
  }
  const pack = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(pack)) throw new Error(`${file} is not an array`);
  for (const item of pack) {
    if (!valid(item)) {
      console.error("invalid", file, item?.question?.slice?.(0, 60));
      process.exit(1);
    }
    const prompt = String(item.question).trim();
    if (prompts.has(prompt)) continue;
    prompts.add(prompt);
    added.push({
      kind: "trivia",
      id: nextId++,
      category: String(item.category).trim(),
      points: item.points,
      question: prompt,
      answer: String(item.answer).trim(),
      hint: String(item.hint).trim(),
      options: item.options.map((option) => String(option).trim()),
    });
  }
}

const merged = [...bank, ...added];
const counts = new Map();
for (const item of merged) {
  if (!counts.has(item.category)) counts.set(item.category, { n: 0, by: { 100: 0, 200: 0, 300: 0, 400: 0, 500: 0 } });
  const row = counts.get(item.category);
  row.n += 1;
  row.by[item.points] += 1;
}

let failed = false;
for (const [category, row] of [...counts].sort((a, b) => a[0].localeCompare(b[0], "ar"))) {
  const thin = Object.values(row.by).some((count) => count < 10) || row.n < 50;
  console.log(`${thin ? "BAD" : "ok "} ${row.n}\t${Object.values(row.by).join("/")}\t${category}`);
  if (thin) failed = true;
}

if (failed) {
  console.error("categories still below 50 / 10 per tier");
  process.exit(1);
}

writeFileSync(bankPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`added ${added.length}; total ${merged.length}`);
