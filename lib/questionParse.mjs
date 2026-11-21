const POINT_VALUES = [100, 200, 300, 400, 500];

function clean(value) {
  return value.replace(/\*\*/g, "").trim();
}

function field(line, label) {
  const match = line.match(
    new RegExp(
      `^(?:[-*]\\s*)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*[:：]\\s*(?:\\*\\*)?\\s*(.+)$`,
    ),
  );
  return match ? clean(match[1]) : null;
}

export function parseQuestionText(text) {
  const errors = [];
  const questions = [];
  let category = "";
  let current = null;

  const flush = () => {
    if (!current) return;
    const missing = ["points", "id", "question", "answer", "hint", "options"].filter(
      (key) => current[key] == null || current[key] === "",
    );
    if (!category) missing.push("category");
    if (missing.length) {
      errors.push(`السؤال ${current.id ?? "؟"} ناقص: ${missing.join("، ")}`);
      current = null;
      return;
    }
    const options = current.options;
    if (!Array.isArray(options) || options.length !== 4) {
      errors.push(`السؤال ${current.id} يحتاج 4 خيارات`);
      current = null;
      return;
    }
    if (!POINT_VALUES.includes(current.points)) {
      errors.push(`نقاط غير صالحة في السؤال ${current.id}`);
      current = null;
      return;
    }
    if (!options.includes(current.answer)) {
      const close = options.filter(
        (option) =>
          option &&
          (current.answer.startsWith(option) || option.startsWith(current.answer)),
      );
      if (close.length === 1) {
        options[options.indexOf(close[0])] = current.answer;
      } else {
        errors.push(`إجابة السؤال ${current.id} ليست ضمن الخيارات`);
        current = null;
        return;
      }
    }
    questions.push({
      id: current.id,
      category,
      points: current.points,
      question: current.question,
      answer: current.answer,
      hint: current.hint,
      options,
    });
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const categoryMatch = line.match(/^(?:##\s*)?الفئة\s+\d+\s*:\s*(.+)$/);
    if (categoryMatch) {
      flush();
      category = categoryMatch[1].trim();
      continue;
    }

    const questionMatch = line.match(
      /^(?:###\s*)?\[(\d+)\]\s+(\d+)\.\s*السؤال:\s*(.+)$/,
    );
    if (questionMatch) {
      flush();
      current = {
        points: Number(questionMatch[1]),
        id: Number(questionMatch[2]),
        question: questionMatch[3].trim(),
        answer: null,
        hint: null,
        options: null,
      };
      continue;
    }

    if (!current) continue;
    const answer = field(line, "الإجابة");
    if (answer) {
      current.answer = answer;
      continue;
    }
    const hint = field(line, "التلميح");
    if (hint) {
      current.hint = hint;
      continue;
    }
    const choices = field(line, "الخيارات");
    if (choices) {
      current.options = choices
        .split(/\s*\|\s*/)
        .map((part) => clean(part))
        .filter(Boolean);
    }
  }
  flush();
  return { questions, errors };
}

export function strictBankErrors(questions) {
  const errors = [];
  if (questions.length !== 200) {
    errors.push(`المتوقع 200 سؤالاً، وُجد ${questions.length}`);
  }
  const ids = new Set();
  const buckets = new Map();
  for (const question of questions) {
    if (ids.has(question.id)) errors.push(`معرّف مكرر: ${question.id}`);
    ids.add(question.id);
    const key = `${question.category}::${question.points}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  for (let id = 1; id <= 200; id += 1) {
    if (!ids.has(id)) errors.push(`السؤال ${id} مفقود`);
  }
  const categories = [...new Set(questions.map((question) => question.category))];
  if (categories.length !== 10) {
    errors.push(`المتوقع 10 فئات، وُجد ${categories.length}`);
  }
  for (const category of categories) {
    for (const points of POINT_VALUES) {
      const count = buckets.get(`${category}::${points}`) ?? 0;
      if (count !== 4) {
        errors.push(`${category} / ${points}: ${count} بدلاً من 4`);
      }
    }
  }
  return errors;
}
