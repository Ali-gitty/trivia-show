const POINT_VALUES = [100, 200, 300, 400, 500];

function clean(value) {
  return value.replace(/\*\*/g, "").trim();
}

function bare(value) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/[«»"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return bare(value)
    .split(/[\s،,.\-–—:]+/)
    .map((part) => part.replace(/^و+/, ""))
    .filter((part) => part.length > 1);
}

function alignToOption(answer, options) {
  const direct = options.find(
    (option) => option && (answer.startsWith(option) || option.startsWith(answer)),
  );
  if (direct && options.filter((option) => answer.startsWith(option) || option.startsWith(answer)).length === 1) {
    return direct;
  }
  const answerTokens = new Set(tokens(answer));
  const scored = options.map((option) => {
    const optionTokens = tokens(option);
    const hit = optionTokens.filter((token) => answerTokens.has(token)).length;
    const ratio = optionTokens.length ? hit / optionTokens.length : 0;
    const plainAnswer = bare(answer);
    const plainOption = bare(option);
    const substring =
      plainOption.length > 2 &&
      (plainAnswer.includes(plainOption) || plainOption.includes(plainAnswer));
    return { option, ratio, hit, substring };
  });
  const perfect = scored.filter((item) => item.ratio === 1 && item.hit >= 1);
  if (perfect.length === 1) return perfect[0].option;
  const contained = scored.filter((item) => item.substring);
  if (contained.length === 1) return contained[0].option;
  const ranked = [...scored].sort((a, b) => b.ratio - a.ratio || b.hit - a.hit);
  if (ranked[0] && ranked[0].ratio >= 0.75 && ranked[0].ratio - (ranked[1]?.ratio ?? 0) >= 0.25) {
    return ranked[0].option;
  }
  const stem = (token) => token.replace(/^ال/, "").slice(0, 5);
  const answerStems = new Set([...answerTokens].map(stem).filter((item) => item.length >= 5));
  const stemmed = scored.filter((item) =>
    tokens(item.option).some((token) => answerStems.has(stem(token))),
  );
  if (stemmed.length === 1) return stemmed[0].option;
  return null;
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
    const kind = current.kind === "activity" ? "activity" : "trivia";
    if (kind === "trivia" && !options.includes(current.answer)) {
      const aligned = alignToOption(current.answer, options);
      if (!aligned) {
        errors.push(`إجابة السؤال ${current.id} ليست ضمن الخيارات`);
        current = null;
        return;
      }
      current.answer = aligned;
    }
    questions.push({
      id: current.id,
      kind,
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

    const categoryMatch = line.match(
      /^(?:##\s*)?الفئة\s+\d+\s*(?:\[[^\]]*\])?\s*:\s*(.+)$/,
    );
    if (categoryMatch) {
      flush();
      category = categoryMatch[1].trim();
      continue;
    }

    const bracketFirst = line.match(
      /^(?:###\s*)?\[(\d+)\]\s+(\d+)\.\s*(السؤال|الفعالية):\s*(.+)$/,
    );
    const numberFirst = line.match(
      /^(?:###\s*)?(\d+)\.\s*\[(\d+)\s*نقطة\]\s*(السؤال|الفعالية):\s*(.+)$/,
    );
    const questionMatch = bracketFirst || numberFirst;
    if (questionMatch) {
      flush();
      const points = Number(bracketFirst ? questionMatch[1] : questionMatch[2]);
      const id = Number(bracketFirst ? questionMatch[2] : questionMatch[1]);
      const label = questionMatch[3];
      const prompt = questionMatch[4];
      current = {
        points,
        id,
        kind: label === "الفعالية" ? "activity" : "trivia",
        question: clean(prompt),
        answer: null,
        hint: null,
        options: null,
      };
      continue;
    }

    if (!current) continue;
    const answer =
      field(line, "المطلوب / معيار التحكيم") ||
      field(line, "معيار التحكيم") ||
      field(line, "المطلوب") ||
      field(line, "الإجابة");
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
