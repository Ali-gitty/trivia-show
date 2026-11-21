import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseQuestionText, strictBankErrors } from "../lib/questionParse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ?? "C:\\Users\\epicc\\Desktop\\200.md";
const text = readFileSync(source, "utf8");
const { questions, errors } = parseQuestionText(text);
const strict = strictBankErrors(questions);
const all = [...errors, ...strict];
if (all.length) {
  console.error(all.join("\n"));
  process.exit(1);
}

const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, "questions.json"), `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(`wrote ${questions.length} questions`);
