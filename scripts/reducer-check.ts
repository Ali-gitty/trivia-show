import { gameReducer, createInitialState, powerEligible, unreachableLead } from "../lib/gameReducer";
import { optionDirection } from "../lib/direction";
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
state = gameReducer(state, { type: "OPEN_TILE", tileId: tile.id, questions });
if (state.phase !== "primary" || state.timer !== 60) throw new Error("primary timer");
state = gameReducer(state, { type: "LOCK" });
if (state.phase !== "steal" || state.timer !== 15) throw new Error("steal timer");
state = gameReducer(state, { type: "LOCK" });
if (state.phase !== "adjudicate") throw new Error("adjudicate");
state = gameReducer(state, { type: "REVEAL" });
state = gameReducer(state, { type: "AWARD", teamIndex: 0 });
if (state.teams[0].score !== tile.points || state.phase !== "board") throw new Error("award");
if (state.activeTeamIndex !== 1) throw new Error("turn did not alternate");

state = gameReducer(state, { type: "OPEN_TILE", tileId: state.board.find((item) => item.status === "open")!.id, questions });
const actor = powerEligible(state)[0];
state = gameReducer(state, { type: "USE_POWER", teamIndex: actor, kind: "ask" });
if (!state.hostAskOpen || state.teams[actor].cooldowns.ask !== 3) throw new Error("ask cooldown");
state = gameReducer(state, { type: "LOCK" });
state = gameReducer(state, { type: "LOCK" });
state = gameReducer(state, { type: "REVEAL" });
state = gameReducer(state, { type: "AWARD", teamIndex: null });
if (state.teams[actor].cooldowns.ask !== 3) throw new Error("ask decayed on the same question");

state = gameReducer(state, { type: "OPEN_TILE", tileId: state.board.find((item) => item.status === "open")!.id, questions });
const skipper = powerEligible(state)[0];
state = gameReducer(state, { type: "USE_POWER", teamIndex: skipper, kind: "skip" });
if (state.phase !== "board" || state.teams[skipper].cooldowns.skip !== 10) throw new Error("skip cooldown");

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
multi = gameReducer(multi, { type: "OPEN_TILE", tileId: buzzTile.id, questions });
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
blown = gameReducer(blown, { type: "OPEN_TILE", tileId: doubledTile.id, questions });
blown = gameReducer(blown, { type: "LOCK" });
blown = gameReducer(blown, { type: "LOCK" });
blown = gameReducer(blown, { type: "REVEAL" });
const before = blown.teams[1].score;
blown = gameReducer(blown, { type: "AWARD", teamIndex: 1 });
if (blown.teams[1].score !== before + 1000) throw new Error("doubled award");

const quiet = publicAnnouncement({
  question: "ما السؤال؟",
  options: ["أ", "ب"],
  answer: "الإجابة السرية",
  hostAskOpen: false,
  optionsVisible: false,
  answerRevealed: false,
});
if (quiet.text.includes("السرية") || quiet.key !== "question") throw new Error("speech leaked the answer");
const askLine = publicAnnouncement({
  question: "ما السؤال؟",
  options: [],
  answer: "الإجابة السرية",
  hostAskOpen: true,
  optionsVisible: false,
  answerRevealed: false,
});
if (askLine.key !== "ask" || !askLine.text.includes("بصراحة") || askLine.text.includes("السرية")) {
  throw new Error("host ask speech");
}
const aloud = publicAnnouncement({
  question: "ما السؤال؟",
  options: [],
  answer: "الإجابة السرية",
  hostAskOpen: false,
  optionsVisible: false,
  answerRevealed: true,
});
if (!aloud.text.includes("الإجابة السرية")) throw new Error("speech skipped the revealed answer");
const kept = normalizeHostSettings({ primarySeconds: 40, speech: true, speechRate: 1.1 });
if (!kept.speech || kept.speechRate !== 1.1 || kept.primarySeconds !== 40) throw new Error("settings dropped speech");
if (optionDirection("4, 8, 15, 16, 23, 42") !== "ltr") throw new Error("numbers should stay left to right");
if (optionDirection("الحضارة السومرية") !== "rtl") throw new Error("arabic choices should stay right to left");

console.log("reducer checks passed");
