import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseQuestionText } from "../lib/questionParse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] || join(root, "data/activities-200.md");

/** Short draft labels for the long markdown headings. */
const CATEGORY_ALIASES = {
  "ارسم المشهد أو الشيء (بدون كلام أو حروف!)": "ارسم المشهد",
  "اشرح الفيلم أو المسلسل أو الأنمي بشكل سيء ومضحك!": "اشرح بشكل مضحك",
  "التمثيل الصامت وتقليد الأصوات والحركات (Charades)": "تمثيل صامت",
  "تحديات الكلمات الممنوعة (Taboo / لا تقل الكلمة!)": "كلمات ممنوعة",
  "تحديات السرعة والبديهة والذاكرة (تحدي 30 ثانية)": "سرعة وبديهة",
  "تحديات الارتجال والدبلجة والإقناع الكوميدي": "ارتجال وإقناع",
  "تحديات التوازن والمهارات الحركية الخفيفة في المجلس": "توازن ومهارات",
  "الموسيقى، شارات الكرتون، وإكمال الكلمات": "موسيقى وشارات",
  "تحديات الرسم والتخمين الممتعة للصغار": "رسم للأطفال",
  "تحديات الحركة وتقليد الحيوانات والمرح للصغار": "حركة للأطفال",
};

const POINT_VALUES = new Set([100, 200, 300, 400, 500]);

function normalize(item) {
  const category = CATEGORY_ALIASES[item.category];
  if (!category) throw new Error(`unknown activity category: ${item.category}`);
  if (!POINT_VALUES.has(item.points)) throw new Error(`bad points on ${item.id}`);
  if (!Array.isArray(item.options) || item.options.length !== 4) {
    throw new Error(`bad options on ${item.id}`);
  }
  if (!item.question || !item.answer || !item.hint) throw new Error(`incomplete ${item.id}`);
  return {
    id: item.id,
    kind: "activity",
    category,
    points: item.points,
    question: item.question,
    answer: item.answer,
    hint: item.hint,
    options: item.options,
  };
}

const text = readFileSync(source, "utf8");
const parsed = parseQuestionText(text);
if (parsed.errors.length) {
  console.error(parsed.errors.slice(0, 20).join("\n"));
  process.exit(1);
}

let activities;
try {
  activities = parsed.questions.map(normalize);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (activities.length !== 200) {
  console.error(`expected 200 activities, got ${activities.length}`);
  process.exit(1);
}
if (activities.some((item) => item.id < 501 || item.id > 700)) {
  console.error("activity ids must stay in 501–700");
  process.exit(1);
}

const bankPath = join(root, "data/questions.json");
const bank = JSON.parse(readFileSync(bankPath, "utf8"));
const kept = bank.filter((item) => item.kind !== "activity" && !(item.id >= 501 && item.id <= 700));
const next = [...kept, ...activities].sort((a, b) => a.id - b.id);
writeFileSync(bankPath, `${JSON.stringify(next, null, 2)}\n`);

const cats = {};
for (const item of activities) cats[item.category] = (cats[item.category] || 0) + 1;
console.log(
  JSON.stringify(
    {
      total: next.length,
      trivia: kept.length,
      activities: activities.length,
      categories: cats,
      ids: [activities[0].id, activities.at(-1).id],
    },
    null,
    2,
  ),
);
