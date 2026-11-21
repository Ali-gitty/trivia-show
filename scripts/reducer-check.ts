import { gameReducer, createInitialState, powerEligible } from "../lib/gameReducer";
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

const activityQuestions = [
  ...questions,
  ...([100, 200, 300, 400, 500] as const).map((points, index) => ({
    id: 900 + index,
    kind: "activity" as const,
    category: "ارسم المشهد",
    points,
    question: "ارسم سفينة",
    answer: "أن يخمن الفريق السفينة",
    hint: "تلميح",
    options: ["سفينة", "طائرة", "قطار", "سيارة"] as [string, string, string, string],
  })),
];
let activity = gameReducer(createInitialState(), {
  type: "START_DRAFT",
  mode: "classic",
  teams: [
    { name: "الأول", color: "#22d3ee" },
    { name: "الثاني", color: "#fb923c" },
  ],
});
for (const category of ["ارسم المشهد", ...categories.slice(0, 4)]) {
  activity = gameReducer(activity, {
    type: "PICK_CATEGORY",
    category,
    questions: activityQuestions,
    playedIds: [],
  });
}
const activityTile = activity.board.find((item) => item.category === "ارسم المشهد" && item.points === 100);
if (!activityTile) throw new Error("activity tile missing");
activity = gameReducer(activity, { type: "OPEN_TILE", tileId: activityTile.id, questions: activityQuestions });
if (activity.phase !== "adjudicate" || activity.timerRunning) throw new Error("activity should open for host judgment");
activity = gameReducer(activity, { type: "REVEAL" });
activity = gameReducer(activity, { type: "AWARD", teamIndex: 1 });
if (activity.teams[1].score !== 100 || activity.phase !== "board") throw new Error("activity award");

console.log("reducer checks passed");
