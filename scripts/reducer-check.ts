import { gameReducer, createInitialState, powerEligible, unreachableLead } from "../lib/gameReducer";
import { numberSequence, optionDirection } from "../lib/direction";
import { publicAnnouncement } from "../lib/speech";
import { normalizeHostSettings } from "../lib/types";
import type { Question } from "../lib/types";

function question(id: number, category: string, points: Question["points"]): Question {
  return {
    id,
    kind: "trivia",
    category,
    points,
    question: `س${id}`,
    answer: "صح",
    hint: "تلميح",
    options: ["صح", "أ", "ب", "ج"],
  };
}

const categories = ["تاريخ", "جغرافيا", "علوم", "رياضة", "فن"];
const questions = categories.flatMap((category, categoryIndex) =>
  [100, 200, 300, 400, 500].map((points, tier) =>
    question(categoryIndex * 5 + tier + 1, category, points as Question["points"]),
  ),
);

let state = gameReducer(createInitialState(), {
  type: "START_DRAFT",
  mode: "classic",
  teams: [
    { name: "الأول", color: "#22d3ee" },
    { name: "الثاني", color: "#fb923c" },
  ],
});

for (const category of categories) {
  state = gameReducer(state, { type: "PICK_CATEGORY", category, questions, playedIds: [] });
}
if (state.phase !== "board" || state.board.length !== 25) {
  throw new Error(`classic board failed: ${state.phase} ${state.board.length}`);
}

const tile = state.board[0];
if (tile.questionId !== 0) throw new Error("tile should open unassigned");
const rich = [
  ...questions,
  ...[901, 902, 903, 904, 905].map((id) => question(id, tile.category, tile.points)),
];
const draws = new Set<number>();
for (let round = 0; round < 20; round += 1) {
  const sample = gameReducer(state, { type: "OPEN_TILE", tileId: tile.id, questions: rich, playedIds: [] });
  const assigned = sample.board.find((item) => item.id === tile.id)?.questionId ?? 0;
  if (assigned > 0) draws.add(assigned);
}
if (draws.size < 3) throw new Error(`open tile draws too narrow: ${draws.size}`);
state = gameReducer(state, { type: "OPEN_TILE", tileId: tile.id, questions, playedIds: [] });
if (state.phase !== "primary" || state.timer !== 60) throw new Error("primary timer");
const opened = state.board.find((item) => item.id === tile.id);
if (!opened || opened.questionId <= 0) throw new Error("open did not assign a question");
state = gameReducer(state, { type: "LOCK" });
if (state.phase !== "steal" || state.timer !== 15) throw new Error("steal timer");
state = gameReducer(state, { type: "LOCK" });
if (state.phase !== "adjudicate") throw new Error("adjudicate");
state = gameReducer(state, { type: "REVEAL" });
state = gameReducer(state, { type: "AWARD", teamIndex: 0 });
if (state.teams[0].score !== tile.points || state.phase !== "board") throw new Error("award");
if (state.activeTeamIndex !== 1) throw new Error("turn did not alternate");

state = gameReducer(state, {
  type: "OPEN_TILE",
  tileId: state.board.find((item) => item.status === "open")!.id,
  questions,
  playedIds: [],
});
const actor = powerEligible(state)[0];
state = gameReducer(state, { type: "USE_POWER", teamIndex: actor, kind: "hint" });
if (!state.hintVisible || state.teams[actor].cooldowns.hint !== 3) throw new Error("hint cooldown");
state = gameReducer(state, { type: "LOCK" });
state = gameReducer(state, { type: "LOCK" });
state = gameReducer(state, { type: "REVEAL" });
state = gameReducer(state, { type: "AWARD", teamIndex: null });
if (state.teams[actor].cooldowns.hint !== 3) throw new Error("hint decayed on the same question");

let multi = gameReducer(createInitialState(), {
  type: "START_DRAFT",
  mode: "buzzer",
  teams: [
    { name: "أ", color: "#22d3ee" },
    { name: "ب", color: "#fb923c" },
    { name: "ج", color: "#34d399" },
  ],
});
for (const category of categories.slice(0, 3)) {
  multi = gameReducer(multi, { type: "PICK_CATEGORY", category, questions, playedIds: [] });
}
multi = gameReducer(multi, { type: "FINISH_DRAFT", questions, playedIds: [] });
if (multi.board.length !== 15) throw new Error("multi board");
const buzzTile = multi.board.find((item) => item.points === 500)!;
multi = gameReducer(multi, { type: "OPEN_TILE", tileId: buzzTile.id, questions, playedIds: [] });
multi = gameReducer(multi, { type: "BUZZ", teamIndex: 0 });
multi = gameReducer(multi, { type: "STEAL", teamIndex: 1 });
if (multi.buzzingTeamIndex !== 1 || multi.teams[1].cooldowns.steal !== 5) throw new Error("steal");
multi.teams[1].score = 0;
multi = gameReducer(multi, { type: "BUZZ_WRONG" });
if (multi.teams[1].score !== 0) throw new Error("score went negative");
if (!multi.lockedOutTeamIds.includes("team-2") || multi.phase !== "buzzOpen") throw new Error("reopen");
multi = gameReducer(multi, { type: "BUZZ", teamIndex: 2 });
multi = gameReducer(multi, { type: "BUZZ_CORRECT" });
if (multi.teams[2].score !== 500 || multi.phase !== "resolved") throw new Error("correct");

let blown = {
  ...state,
  teams: state.teams.map((team, index) => (index === 0 ? { ...team, score: 20000 } : team)),
};
const lead = unreachableLead(blown);
if (!lead || lead.gap <= lead.remaining) throw new Error("lead should be out of reach");
blown = gameReducer(blown, { type: "DOUBLE_REMAINING" });
if (blown.pointMultiplier !== 2) throw new Error("double remaining");
const still = unreachableLead(blown);
if (!still) throw new Error("one double is not enough for this gap");
const doubledTile = blown.board.find((item) => item.status === "open" && item.points === 500);
if (!doubledTile) throw new Error("missing open tile");
blown = gameReducer(blown, { type: "OPEN_TILE", tileId: doubledTile.id, questions, playedIds: [] });
blown = gameReducer(blown, { type: "LOCK" });
blown = gameReducer(blown, { type: "LOCK" });
blown = gameReducer(blown, { type: "REVEAL" });
const before = blown.teams[1].score;
blown = gameReducer(blown, { type: "AWARD", teamIndex: 1 });
if (blown.teams[1].score !== before + 1000) throw new Error("doubled award");

const quiet = publicAnnouncement({
  question: "ما السؤال؟",
  hint: "تلميح سري",
  options: ["أ", "ب"],
  answer: "الإجابة السرية",
  hintVisible: false,
  optionsVisible: false,
  answerRevealed: false,
});
if (quiet.text.includes("السرية") || quiet.key !== "question") throw new Error("speech leaked the answer");
const aloud = publicAnnouncement({
  question: "ما السؤال؟",
  hint: "تلميح",
  options: [],
  answer: "الإجابة السرية",
  hintVisible: false,
  optionsVisible: false,
  answerRevealed: true,
});
if (!aloud.text.includes("الإجابة السرية")) throw new Error("speech skipped the revealed answer");
const kept = normalizeHostSettings({ primarySeconds: 40, speech: true, speechRate: 1.1 });
if (!kept.speech || kept.speechRate !== 1.1 || kept.primarySeconds !== 40) throw new Error("settings dropped speech");
if (optionDirection("4, 8, 15, 16, 23, 42") !== "ltr") throw new Error("numbers should stay left to right");
if (numberSequence("4, 8, 15, 16, 23, 42")?.join("|") !== "4|8|15|16|23|42") throw new Error("number list split");
if (optionDirection("الحضارة السومرية") !== "rtl") throw new Error("arabic choices should stay right to left");

console.log("reducer checks passed");
