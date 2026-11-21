import { parseQuestionText } from "./questionParse.mjs";
import {
  ACTIVITY_OPTIONS,
  isPoints,
  type BankKind,
  type Points,
  type Question,
} from "./types";

function clean(value: string) {
  return value.replace(/\*\*/g, "").trim();
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function toQuestion(input: unknown): Question | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const points = Number(raw.points);
  const kind: BankKind = raw.kind === "activity" ? "activity" : "trivia";
  let options = Array.isArray(raw.options) ? raw.options.map((item) => clean(String(item))) : [];
  if (kind === "activity" && options.length !== 4) {
    options = [...ACTIVITY_OPTIONS];
  }
  if (!isPoints(points) || options.length !== 4) return null;
  const question: Question = {
    id: Number(raw.id),
    kind,
    category: clean(String(raw.category ?? "")),
    points: points as Points,
    question: clean(String(raw.question ?? "")),
    answer: clean(String(raw.answer ?? "")),
    hint: clean(String(raw.hint ?? "")),
    options: options as Question["options"],
  };
  if (!Number.isInteger(question.id) || question.id <= 0) return null;
  if (!question.category || !question.question || !question.answer || !question.hint) return null;
  if (kind === "trivia" && !question.options.includes(question.answer)) return null;
  return question;
}

export function validatePack(questions: Question[]) {
  const errors: string[] = [];
  const ids = new Set<number>();
  if (!questions.length) errors.push("الحزمة لا تحتوي أسئلة صالحة");
  for (const question of questions) {
    if (ids.has(question.id)) errors.push(`معرّف مكرر: ${question.id}`);
    ids.add(question.id);
  }
  return errors;
}

export function parseQuestionDocument(text: string) {
  const parsed = parseQuestionText(text);
  const questions = parsed.questions
    .map((item) => toQuestion({ ...item, kind: item.kind ?? "trivia" }))
    .filter((item): item is Question => item !== null);
  return {
    questions,
    errors: [...parsed.errors, ...validatePack(questions)],
  };
}

export function parseJsonPack(text: string) {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { questions: [] as Question[], errors: ["ملف JSON غير صالح"] };
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { questions?: unknown }).questions)
      ? (data as { questions: unknown[] }).questions
      : null;
  if (!list) return { questions: [] as Question[], errors: ["يجب أن يكون الملف مصفوفة أسئلة"] };

  const questions: Question[] = [];
  const errors: string[] = [];
  list.forEach((item, index) => {
    const question = toQuestion(item);
    if (!question) errors.push(`سؤال غير صالح عند الفهرس ${index + 1}`);
    else questions.push(question);
  });
  errors.push(...validatePack(questions));
  return { questions, errors };
}

export async function parseDocx(buffer: ArrayBuffer) {
  const imported = (await import("mammoth")) as unknown as {
    convertToHtml?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{
      value: string;
      messages: { type: string; message: string }[];
    }>;
    default?: {
      convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{
        value: string;
        messages: { type: string; message: string }[];
      }>;
    };
  };
  const convert = imported.convertToHtml ?? imported.default?.convertToHtml;
  if (!convert) return { questions: [] as Question[], errors: ["تعذر قراءة ملف وورد"] };
  const result = await convert({ arrayBuffer: buffer });
  const parsed = parseQuestionDocument(htmlToText(result.value));
  const failures = result.messages.filter((message) => message.type === "error").map((message) => message.message);
  return { ...parsed, errors: [...parsed.errors, ...failures] };
}

export function mergeQuestions(current: Question[], incoming: Question[]) {
  const map = new Map(current.map((question) => [question.id, question]));
  for (const question of incoming) map.set(question.id, question);
  return [...map.values()].sort((a, b) => a.id - b.id);
}
