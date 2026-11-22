import { createInitialState, gameReducer, closestWinnerIndex } from "../lib/gameReducer";
import { buildPlaySnapshot } from "../lib/playSnapshot";
import { isClientWire, isHostWire } from "../lib/playChannel";
import type { Question } from "../lib/types";

const secret = "إجابة سرية رقم 42";
const question: Question = {
  id: 1,
  kind: "trivia",
  category: "أرقام",
  points: 100,
  question: "كم؟",
  answer: secret,
  hint: "تلميح سري",
  options: [secret, "1", "2", "3"],
};

let state = gameReducer(createInitialState(), {
  type: "START_DRAFT",
  mode: "closest",
  teams: [
    { name: "أ", color: "#22d3ee" },
    { name: "ب", color: "#fb923c" },
  ],
});

state = gameReducer(state, {
  type: "PLAYER_JOIN",
  playerId: "p1",
  name: "سارة",
  teamId: "team-1",
  at: 1,
});
state = gameReducer(state, {
  type: "PLAYER_JOIN",
  playerId: "p2",
  name: "محمد",
  teamId: "team-2",
  at: 2,
});
if (!state.players[0]?.isLeader || !state.players[1]?.isLeader) {
  throw new Error("first joiner per team should be leader");
}

state = {
  ...state,
  phase: "primary",
  board: [
    {
      id: "أرقام-100",
      category: "أرقام",
      points: 100,
      questionId: 1,
      reused: false,
      status: "open",
    },
  ],
  currentTileId: "أرقام-100",
  activeTeamIndex: 0,
};

state = gameReducer(state, {
  type: "PLAYER_SUBMIT",
  playerId: "p2",
  kind: "number",
  text: "40",
  number: 40,
  at: 3,
});
if (state.submissions["team-2"]) throw new Error("non-active team should not submit in primary");

state = gameReducer(state, {
  type: "PLAYER_SUBMIT",
  playerId: "p1",
  kind: "number",
  text: "40",
  number: 40,
  at: 4,
});
if (!state.submissions["team-1"] || state.submissions["team-1"].number !== 40) {
  throw new Error("leader submit failed");
}

state = gameReducer(state, { type: "LOCK" });
state = gameReducer(state, {
  type: "PLAYER_SUBMIT",
  playerId: "p2",
  kind: "number",
  text: "45",
  number: 45,
  at: 5,
});
state = gameReducer(state, { type: "LOCK" });
if (state.phase !== "adjudicate") throw new Error("expected adjudicate");

const winner = closestWinnerIndex(
  {
    ...state,
    submissions: {
      "team-1": { playerId: "p1", teamId: "team-1", kind: "number", text: "40", number: 40, at: 1 },
      "team-2": { playerId: "p2", teamId: "team-2", kind: "number", text: "41", number: 41, at: 2 },
    },
  },
  "42",
);
if (winner !== 1) throw new Error(`expected team-2 closer, got ${winner}`);

state = gameReducer(state, { type: "REVEAL", correctAnswer: "42" });
if (state.phase !== "podium" && state.phase !== "board") {
  throw new Error(`closest reveal should auto-settle: ${state.phase}`);
}
if (state.teams[0].score !== 100) throw new Error(`closer team should score, got ${state.teams.map((t) => t.score)}`);
if (state.teams[1].score !== 0) throw new Error("farther team should stay at 0");

const snap = buildPlaySnapshot(
  {
    ...createInitialState(),
    phase: "primary",
    teams: state.teams,
    board: [
      {
        id: "أرقام-100",
        category: "أرقام",
        points: 100,
        questionId: 1,
        reused: false,
        status: "open",
      },
    ],
    currentTileId: "أرقام-100",
    hostPeek: true,
  },
  question,
);
if (JSON.stringify(snap).includes(secret) || JSON.stringify(snap).includes("تلميح")) {
  throw new Error("play snapshot leaked secrets");
}

let buzz = gameReducer(createInitialState(), {
  type: "START_DRAFT",
  mode: "buzzer",
  teams: [
    { name: "أ", color: "#22d3ee" },
    { name: "ب", color: "#fb923c" },
  ],
});
buzz = gameReducer(buzz, {
  type: "PLAYER_JOIN",
  playerId: "a1",
  name: "ليان",
  teamId: "team-1",
  at: 1,
});
buzz = gameReducer(buzz, {
  type: "PLAYER_JOIN",
  playerId: "b1",
  name: "عمر",
  teamId: "team-2",
  at: 2,
});
buzz = {
  ...buzz,
  phase: "buzzOpen",
  board: [
    {
      id: "ت-100",
      category: "ت",
      points: 100,
      questionId: 1,
      reused: false,
      status: "open",
    },
  ],
  currentTileId: "ت-100",
};
buzz = gameReducer(buzz, { type: "PLAYER_BUZZ", playerId: "b1", at: 10 });
buzz = gameReducer(buzz, { type: "PLAYER_BUZZ", playerId: "a1", at: 11 });
if (buzz.remoteBuzz?.playerId !== "b1" || buzz.buzzingTeamIndex !== 1) {
  throw new Error("first buzz should win");
}

if (
  !isClientWire({ type: "buzz", playerId: "x", at: 1 }) ||
  isClientWire({ type: "playState", seq: 1, snap }) ||
  !isHostWire({ type: "playState", seq: 1, snap })
) {
  throw new Error("wire guards failed");
}

console.log("play checks passed");
