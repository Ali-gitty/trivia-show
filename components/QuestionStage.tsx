"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Eye, EyeOff, Pause, Play, Settings2 } from "lucide-react";
import { CategoryLabel } from "@/lib/categoryIcons";
import { speakArabic, visibleReading } from "@/lib/speech";
import { facePoints, isQuestionPhase, powerEligible, stealEligible } from "@/lib/gameReducer";
import { formatAnswerRange } from "@/lib/numberRange";
import { isActivity } from "@/lib/types";
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
  const activity = currentQuestion ? isActivity(currentQuestion) : false;
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
          className="scrim z-30"
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
            className="board-card question-shell gap-2 p-3 sm:gap-3 sm:p-5"
          >
            <div className="grid shrink-0 gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="chip chip-accent px-3 py-1">
                    <CategoryLabel category={tile.category} size={14} />
                  </span>
                  <span className="chip px-3 py-1">{worth}</span>
                  {activity && <span className="chip px-3 py-1">فعالية · يحكم المقدم</span>}
                  {actor && <span className="chip px-3 py-1">يجيب: {actor.name}</span>}
                </div>
                {(state.phase === "primary" || state.phase === "steal") && (
                  <div className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-paper px-2.5 py-1.5">
                    <TimerRing seconds={state.timer} total={total} paused={state.timerPaused} />
                    <div>
                      <p className="text-[10px] text-muted sm:text-xs">
                        {state.phase === "primary" ? "الوقت الأساسي" : "فرصة الفريق الآخر"}
                      </p>
                      <p className="text-2xl font-black tabular-nums leading-none sm:text-3xl">{state.timer}</p>
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
                          options: state.optionsOrder,
                          answer: currentQuestion.answer,
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
                  {activity ? "معاينة المعيار للمقدم" : "معاينة الإجابة للمقدم"}
                </Button>
              </div>
            </div>

            <h2 className="question-prompt min-h-0 shrink font-black">{currentQuestion.question}</h2>
            {activity && !state.answerRevealed && (
              <p className="shrink-0 text-xs text-muted sm:text-sm">
                يؤدي الفريق التحدي، ثم يمنح المقدم النقاط حسب معيار التحكيم.
              </p>
            )}
            {state.mode === "closest" && !state.answerRevealed && (
              <p className="shrink-0 text-xs text-muted sm:text-sm">
                أقرب رقم صحيح يفوز — الفرق تخمّن، والمقدم يحكم بعد كشف الإجابة.
              </p>
            )}

            {state.rangeVisible && state.rangeLow != null && state.rangeHigh != null && (
              <p className="note-ok shrink-0 px-3 py-2 text-sm font-bold">
                النطاق التقريبي: {formatAnswerRange(state.rangeLow, state.rangeHigh)}
              </p>
            )}

            {state.optionsVisible && <ChoiceGrid options={state.optionsOrder} compact />}

            {state.hostPeek && !state.answerRevealed && (
              <p className="shrink-0 rounded-2xl border-[3px] border-dashed border-ink bg-paper px-3 py-2 text-sm">
                {tvLive
                  ? "ظاهرة على هذا الآيباد فقط"
                  : activity
                    ? "معيار التحكيم، غير ظاهر للفرق"
                    : "معاينة خاصة غير ظاهرة للجمهور"}
                : <IsolatedText text={currentQuestion.answer} />
              </p>
            )}

            {state.answerRevealed && (
              <p className="answer-banner shrink-0 px-3 py-2 font-black">
                {activity ? "معيار التحكيم" : "الإجابة"}: <IsolatedText text={currentQuestion.answer} />
              </p>
            )}

            {state.notice && <p className="note-danger shrink-0 px-3 py-2 text-sm">{state.notice}</p>}
            {allLocked && (
              <p className="note-danger shrink-0 px-3 py-2 text-sm">لا فرق متبقية على الجرس. أغلق السؤال إذا لزم.</p>
            )}

            <div className="min-h-0 shrink">
              <PowerUpBar
                teams={state.teams}
                eligible={powerEligible(state)}
                phase={state.phase}
                mode={state.mode}
                optionsVisible={state.optionsVisible}
                rangeVisible={state.rangeVisible}
                optionsCount={state.optionsOrder.length}
                onUse={usePower}
              />
            </div>

            <div className="mt-auto grid shrink-0 gap-2">
              {(state.phase === "primary" || state.phase === "steal") && (
                <Button className="h-11 w-full text-base" onClick={() => dispatch({ type: "LOCK" })}>
                  تثبيت الإجابة
                </Button>
              )}

              {state.phase === "adjudicate" && !state.answerRevealed && (
                <Button className="h-11 w-full text-base" onClick={() => dispatch({ type: "REVEAL" })}>
                  {activity ? "كشف معيار التحكيم" : "كشف الإجابة"}
                </Button>
              )}

              {state.phase === "adjudicate" && state.answerRevealed && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {state.teams.slice(0, 2).map((team, index) => (
                    <Button key={team.id} onClick={() => dispatch({ type: "AWARD", teamIndex: index })}>
                      {state.mode === "closest"
                        ? `الأقرب: ${team.name} (+${worth})`
                        : `نقاط لـ ${team.name} (+${worth})`}
                    </Button>
                  ))}
                  <Button variant="danger" onClick={() => dispatch({ type: "AWARD", teamIndex: null })}>
                    {state.mode === "closest" ? "تعادل / لا أحد (0)" : "لا أحد / إجابة خاطئة (0)"}
                  </Button>
                </div>
              )}

              {state.mode === "buzzer" && state.phase !== "resolved" && state.phase !== "adjudicate" && (
                <div className="grid gap-2">
                  <p className="text-[11px] text-muted">المفاتيح 1–7 للجرس، و Shift+الرقم لسرقة الجرس، و H لمعاينة المقدم.</p>
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
                <Button variant="ghost" onClick={() => dispatch({ type: "CONTINUE" })}>
                  متابعة
                </Button>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimerRing({ seconds, total, paused }: { seconds: number; total: number; paused: boolean }) {
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, seconds) / total);
  const urgent = seconds <= 10;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--ink)" strokeOpacity="0.2" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={urgent ? "var(--danger-ink)" : "var(--accent)"}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        opacity={paused ? 0.45 : 1}
      />
    </svg>
  );
}
