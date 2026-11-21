import { createInitialState } from "../lib/gameReducer";
import { connectPacket, parsePackets, parsePublish, publishPacket } from "../lib/mqtt";
import { buildSnapshot } from "../lib/screenSnapshot";
import type { Question } from "../lib/types";

const secret = "إجابة سرية لا تُبث";
const hint = "تلميح خاص";
const question: Question = {
  id: 1,
  kind: "trivia",
  category: "تاريخ",
  points: 100,
  question: "ما السؤال الظاهر للجميع؟",
  answer: secret,
  hint,
  options: [secret, "خيار أ", "خيار ب", "خيار ج"],
};

let state = createInitialState();
state = {
  ...state,
  phase: "primary",
  teams: [
    { id: "a", name: "الأول", color: "#22d3ee", score: 0, cooldowns: { ask: 0, choice: 0, skip: 0, steal: 0 } },
    { id: "b", name: "الثاني", color: "#fb923c", score: 0, cooldowns: { ask: 0, choice: 0, skip: 0, steal: 0 } },
  ],
  board: [
    {
      id: "تاريخ-100",
      category: "تاريخ",
      points: 100,
      questionId: 1,
      reused: false,
      status: "open",
    },
  ],
  currentTileId: "تاريخ-100",
  hostPeek: true,
  timer: 42,
  timerRunning: true,
};

const hidden = buildSnapshot(state, question, "kraft");
const raw = JSON.stringify(hidden);
if (raw.includes(secret) || raw.includes(hint) || raw.includes("hostPeek")) {
  throw new Error(`secret leaked: ${raw}`);
}
if (hidden.question?.prompt !== question.question || hidden.question.answer !== null || hidden.pattern !== "dots") {
  throw new Error("public prompt missing");
}
if (hidden.question?.hostAsk) throw new Error("host ask leaked before use");
const waved = buildSnapshot(state, question, "kraft", "waves");
if (waved.pattern !== "waves") throw new Error("pattern was dropped");

state = {
  ...state,
  hostAskOpen: true,
  optionsVisible: true,
  optionsOrder: [...question.options],
  answerRevealed: true,
};
const shown = buildSnapshot(state, question, "tide");
if (shown.question?.answer !== secret || !shown.question.hostAsk || shown.palette !== "tide") {
  throw new Error("reveal did not publish the public fields");
}
if (JSON.stringify(shown).includes(hint)) throw new Error("written hint leaked to the TV");
if (JSON.stringify(shown).includes("hostPeek")) throw new Error("peek flag leaked");

const activity = buildSnapshot(
  { ...state, answerRevealed: false, hostAskOpen: false, optionsVisible: false },
  { ...question, kind: "activity", answer: "معيار سري" },
  "nope",
);
if (JSON.stringify(activity).includes("معيار سري") || activity.palette !== "kraft") {
  throw new Error("activity criterion leaked");
}

const published = publishPacket("trivia-show/screen/TEST01", JSON.stringify({ type: "state", seq: 1 }));
const parsed = parsePackets(published);
if (parsed.packets.length !== 1 || parsed.packets[0]?.type !== 3) throw new Error("publish packet");
const decoded = parsePublish(parsed.packets[0].body);
if (decoded.topic !== "trivia-show/screen/TEST01" || !decoded.payload.includes("\"seq\":1")) {
  throw new Error("publish payload");
}
const connected = parsePackets(connectPacket("tvtest"));
if (connected.packets[0]?.type !== 1) throw new Error("connect packet");

console.log("screen snapshot checks passed");
