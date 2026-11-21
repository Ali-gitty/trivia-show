"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Eye, EyeOff, Pause, Play, Settings2 } from "lucide-react";
import { CategoryLabel } from "@/lib/categoryIcons";
import { speakArabic, visibleReading } from "@/lib/speech";
import { facePoints, isQuestionPhase, powerEligible, stealEligible } from "@/lib/gameReducer";
import { useGame } from "./GameProvider";
import { useTv } from "./TvBridge";
import { BuzzerPad } from "./BuzzerPad";
import { ChoiceGrid, IsolatedText } from "./ChoiceGrid";
import { PowerUpBar } from "./PowerUpBar";
import { Button } from "./ui";

export function QuestionStage() {
  const { currentQuestion, dispatch, state, usePower } = useGame();
  const { live: tvLive } = useTv();
  const open = isQuestionPhase(state.phase) && currentQuestion;
  const tile = state.board.find((item) => item.id === state.currentTileId);
  const worth = facePoints(tile?.points ?? 0, state.pointMultiplier);
  const total = state.phase === "steal" ? state.settings.stealSeconds : state.settings.primarySeconds;
  const actor =
    state.phase === "primary"
      ? state.teams[state.activeTeamIndex]
      : state.phase === "steal"
        ? state.teams[state.activeTeamIndex === 0 ? 1 : 0]
        : null;
  const allLocked =
    state.mode === "buzzer" &&
    state.teams.length > 0 &&
    state.teams.every((team) => state.lockedOutTeamIds.includes(team.id));

  return (
    <AnimatePresence>
      {open && tile && (
        <motion.div
          className="scrim fixed inset-0 z-30 grid place-items-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            key={tile.id}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="board-card max-h-[92dvh] w-full max-w-5xl overflow-y-auto p-5"
          >
            <div className="mb-4 grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="chip chip-accent px-3 py-1">
                    <CategoryLabel category={tile.category} size={14} />
                  </span>
                  <span className="chip px-3 py-1">{worth}</span>
                  {actor && <span className="chip px-3 py-1">يجيب: {actor.name}</span>}
                </div>
                {(state.phase === "primary" || state.phase === "steal") && (
                  <div className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-paper px-3 py-2">
                    <TimerRing seconds={state.timer} total={total} paused={state.timerPaused} />
                    <div>
                      <p className="text-xs text-muted">
                        {state.phase === "primary" ? "الوقت الأساسي" : "فرصة الفريق الآخر"}
                      </p>
                      <p className="text-3xl font-black tabular-nums leading-none">{state.timer}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => dispatch({ type: state.timerPaused ? "RESUME" : "PAUSE" })}
                    >
                      {state.timerPaused ? <Play size={16} /> : <Pause size={16} />}
                      {state.timerPaused ? "استئناف" : "إيقاف مؤقت"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
                  <Settings2 size={16} />
                  الإعدادات
                </Button>
                {state.settings.speech && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      speakArabic(
                        visibleReading({
                          question: currentQuestion.question,
                          hint: currentQuestion.hint,
                          options: state.optionsOrder,
                          answer: currentQuestion.answer,
                          hintVisible: state.hintVisible,
                          optionsVisible: state.optionsVisible,
                          answerRevealed: state.answerRevealed,
                        }),
                        state.settings.speechRate,
                      )
                    }
                  >
                    <AudioLines size={16} />
                    اقرأ الآن
                  </Button>
                )}
                <Button variant="ghost" onClick={() => dispatch({ type: "TOGGLE_PEEK" })}>
                  {state.hostPeek ? <EyeOff size={16} /> : <Eye size={16} />}
                  معاينة الإجابة للمقدم
                </Button>
              </div>
            </div>

            <h2 className="text-3xl font-black leading-relaxed sm:text-4xl">{currentQuestion.question}</h2>

            {state.hintVisible && (
              <p className="note-ok mt-4 px-4 py-3">
                تلميح للجميع: {currentQuestion.hint}
              </p>
            )}

            {state.optionsVisible && <ChoiceGrid options={state.optionsOrder} />}

            {state.hostPeek && !state.answerRevealed && (
              <p className="mt-4 rounded-2xl border-[3px] border-dashed border-ink bg-paper px-4 py-3 text-sm">
                {tvLive ? "ظاهرة على هذا الآيباد فقط" : "معاينة خاصة غير ظاهرة للجمهور"}:{" "}
                <IsolatedText text={currentQuestion.answer} />
              </p>
            )}

            {state.answerRevealed && (
              <p className="answer-banner mt-4 px-4 py-3 font-black">
                الإجابة: <IsolatedText text={currentQuestion.answer} />
              </p>
            )}

            {state.notice && (
              <p className="note-danger mt-3 px-4 py-2 text-sm">{state.notice}</p>
            )}
            {allLocked && (
              <p className="note-danger mt-3 px-4 py-2 text-sm">لا فرق متبقية على الجرس. أغلق السؤال إذا لزم.</p>
            )}

            <div className="mt-5">
              <PowerUpBar
                teams={state.teams}
                eligible={powerEligible(state)}
                hintVisible={state.hintVisible}
                optionsVisible={state.optionsVisible}
                onUse={usePower}
              />
            </div>

            {(state.phase === "primary" || state.phase === "steal") && (
              <Button className="mt-5 h-12 w-full text-base" onClick={() => dispatch({ type: "LOCK" })}>
                تثبيت الإجابة
              </Button>
            )}

            {state.phase === "adjudicate" && !state.answerRevealed && (
              <Button className="mt-5 h-12 w-full text-base" onClick={() => dispatch({ type: "REVEAL" })}>
                كشف الإجابة
              </Button>
            )}

            {state.phase === "adjudicate" && state.answerRevealed && (
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {state.teams.slice(0, 2).map((team, index) => (
                  <Button key={team.id} onClick={() => dispatch({ type: "AWARD", teamIndex: index })}>
                    نقاط لـ {team.name} (+{worth})
                  </Button>
                ))}
                <Button variant="danger" onClick={() => dispatch({ type: "AWARD", teamIndex: null })}>
                  لا أحد / إجابة خاطئة (0)
                </Button>
              </div>
            )}

            {state.mode === "buzzer" && state.phase !== "resolved" && state.phase !== "adjudicate" && (
              <div className="mt-5 grid gap-3">
                <p className="text-xs text-muted">المفاتيح 1–7 للجرس، و Shift+الرقم لسرقة الجرس، و H لمعاينة المقدم.</p>
                <BuzzerPad
                  teams={state.teams}
                  lockedOut={state.lockedOutTeamIds}
                  buzzingIndex={state.buzzingTeamIndex}
                  open={state.phase === "buzzOpen"}
                  stealIndexes={stealEligible(state)}
                  onBuzz={(index) => dispatch({ type: "BUZZ", teamIndex: index })}
                  onSteal={(index) => dispatch({ type: "STEAL", teamIndex: index })}
                />
                {state.phase === "buzzLocked" && state.buzzingTeamIndex != null && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => dispatch({ type: "BUZZ_CORRECT" })}>إجابة صحيحة (+{worth})</Button>
                    <Button variant="danger" onClick={() => dispatch({ type: "BUZZ_WRONG" })}>
                      إجابة خاطئة (−{worth / 2})
                    </Button>
                  </div>
                )}
                <Button variant="ghost" onClick={() => dispatch({ type: "CLOSE_QUESTION" })}>
                  تخطي / إغلاق السؤال
                </Button>
              </div>
            )}

            {state.phase === "resolved" && (
              <Button className="mt-5" variant="ghost" onClick={() => dispatch({ type: "CONTINUE" })}>
                متابعة
              </Button>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimerRing({ seconds, total, paused }: { seconds: number; total: number; paused: boolean }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, seconds) / total);
  const urgent = seconds <= 10;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--ink)" strokeOpacity="0.2" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke={urgent ? "var(--danger-ink)" : "var(--accent)"}
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        opacity={paused ? 0.45 : 1}
      />
    </svg>
  );
}
