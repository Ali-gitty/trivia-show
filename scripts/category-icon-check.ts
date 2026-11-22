import { readFileSync } from "node:fs";
import { hasCategoryIcon } from "../lib/categoryIcons";
import { ACTIVITY_CATEGORIES } from "../lib/types";

const bank = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8")) as {
  category: string;
}[];
const categories = [...new Set(bank.map((item) => item.category))];
for (const category of categories) {
  if (!hasCategoryIcon(category)) throw new Error(`missing icon for ${category}`);
}
for (const category of ACTIVITY_CATEGORIES) {
  if (!hasCategoryIcon(category)) throw new Error(`missing activity icon for ${category}`);
}
if (hasCategoryIcon("فئة غير معروفة")) throw new Error("unknown category should not be mapped");
console.log("category icon checks passed", categories.length);
