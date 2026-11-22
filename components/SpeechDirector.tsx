"use client";

import { useEffect, useRef } from "react";
import { isQuestionPhase } from "@/lib/gameReducer";
import { publicAnnouncement, speakArabic, stopSpeech } from "@/lib/speech";
import { useGame } from "./GameProvider";

export function SpeechDirector() {
  const { currentQuestion, state } = useGame();
  const spoken = useRef("");

  useEffect(() => {
    if (!state.settings.speech) {
      spoken.current = "";
      stopSpeech();
      return;
    }
    if (!currentQuestion || !isQuestionPhase(state.phase)) {
      if (spoken.current) {
        spoken.current = "";
        stopSpeech();
      }
      return;
    }
    const piece = publicAnnouncement({
      question: currentQuestion.question,
      options: state.optionsOrder,
      answer: currentQuestion.answer,
      optionsVisible: state.optionsVisible,
      answerRevealed: state.answerRevealed,
    });
    const key = `${currentQuestion.id}:${piece.key}`;
    if (!piece.text || spoken.current === key) return;
    spoken.current = key;
    speakArabic(piece.text, state.settings.speechRate);
  }, [
    currentQuestion,
    state.answerRevealed,
    state.optionsOrder,
    state.optionsVisible,
    state.phase,
    state.settings.speech,
    state.settings.speechRate,
  ]);

  return null;
}
