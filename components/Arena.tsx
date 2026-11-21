"use client";

import { MotionConfig } from "framer-motion";
import { isQuestionPhase } from "@/lib/gameReducer";
import { CategoryDraft } from "./CategoryDraft";
import { GameBoard } from "./GameBoard";
import { useGame } from "./GameProvider";
import { HostPanel } from "./HostPanel";
import { Podium } from "./Podium";
import { QuestionBankModal } from "./QuestionBankModal";
import { QuestionStage } from "./QuestionStage";
import { ScoreEditor } from "./ScoreEditor";
import { Scoreboard } from "./Scoreboard";
import { SettingsModal } from "./SettingsModal";
import { SetupLobby } from "./SetupLobby";
import { TvBridge } from "./TvBridge";

export function Arena() {
  const { dispatch, ready, state } = useGame();
  if (!ready) {
    return <div className="grid min-h-dvh place-items-center text-lg">جارٍ تجهيز الساحة</div>;
  }

  const match =
    state.phase === "board" ||
    state.phase === "podium" ||
    isQuestionPhase(state.phase);

  return (
    <TvBridge>
    <MotionConfig reducedMotion="user">
      {state.phase === "lobby" && <SetupLobby />}
      {state.phase === "draft" && <CategoryDraft />}
      {match && state.phase !== "podium" && (
        <>
          <Scoreboard />
          <GameBoard dimmed={isQuestionPhase(state.phase)} />
          <QuestionStage />
        </>
      )}
      {state.phase === "podium" && <Podium />}
      {state.phase !== "lobby" && !state.hostPanelOpen && (
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_HOST" })}
          className="board-btn board-btn-accent fixed bottom-4 left-4 z-40 px-4 py-2 text-sm"
        >
          لوحة المقدم
        </button>
      )}
      <HostPanel />
      <QuestionBankModal />
      <SettingsModal />
      <ScoreEditor />
    </MotionConfig>
    </TvBridge>
  );
}
