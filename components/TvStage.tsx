"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Minus, Volume2 } from "lucide-react";
import { POINT_VALUES } from "@/lib/types";
import { facePoints, isQuestionPhase, unreachableLead } from "@/lib/gameReducer";
import { openScreenLink, readRoomParam, viewerId } from "@/lib/screenChannel";
import type { ScreenSnapshot } from "@/lib/screenSnapshot";
import { SoundEngine } from "@/lib/sounds";
import { ChoiceGrid } from "./ChoiceGrid";
import { Button } from "./ui";

function subscribeNothing() {
  return () => undefined;
}

export function TvStage() {
  const room = useSyncExternalStore(subscribeNothing, readRoomParam, () => "");
  const [draft, setDraft] = useState("");
  const [snap, setSnap] = useState<ScreenSnapshot | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const sounds = useMemo(() => new SoundEngine(), []);
  const lastCue = useRef(0);

  useEffect(() => {
    if (!room) return;
    let currentSeq = 0;
    const link = openScreenLink(room, () => undefined);
    const unsubscribe = link.subscribe((message) => {
      if (message.type !== "state" || message.seq <= currentSeq) return;
      currentSeq = message.seq;
      setSnap(message.snap);
      document.documentElement.dataset.palette = message.snap.palette;
      document.documentElement.dataset.pattern = message.snap.pattern || "dots";
    });
    const id = viewerId();
    const beat = window.setInterval(() => {
      link.send({ type: "watch", id, at: Date.now() });
    }, 2500);
    link.send({ type: "watch", id, at: Date.now() });
    return () => {
      window.clearInterval(beat);
      unsubscribe();
      link.close();
    };
  }, [room]);

  useEffect(() => {
    if (!soundOn || !snap || snap.cue.id === lastCue.current) return;
    lastCue.current = snap.cue.id;
    if (snap.cue.name) sounds.play(snap.cue.name);
  }, [snap, soundOn, sounds]);

  if (!room) {
    return (
      <form
        className="mx-auto grid min-h-dvh w-full max-w-md place-content-center gap-4 px-4"
        onSubmit={(event) => {
          event.preventDefault();
          const next = draft.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (next.length < 4) return;
          const url = new URL(window.location.href);
          url.searchParams.set("room", next);
          window.location.assign(url);
        }}
      >
        <p className="kicker">شاشة التلفاز</p>
        <h1 className="text-4xl font-black">أدخل رمز المقدم</h1>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
          className="field px-4 py-3 text-center text-3xl font-black tracking-[0.25em]"
          aria-label="رمز الشاشة"
          autoCapitalize="characters"
          maxLength={8}
        />
        <Button type="submit" className="h-12">
          عرض المباراة
        </Button>
      </form>
    );
  }

  return (
    <div className="min-h-dvh">
      {!soundOn && (
        <button
          type="button"
          className="board-btn board-btn-accent fixed bottom-4 left-4 z-40 px-4 py-2 text-sm"
          onClick={() => {
            sounds.unlock();
            setSoundOn(true);
          }}
        >
          <Volume2 size={16} />
          صوت الشاشة
        </button>
      )}
      {!snap && <Waiting />}
      {snap?.phase === "lobby" && <Waiting />}
      {snap?.phase === "draft" && <DraftView snap={snap} />}
      {snap && snap.phase !== "lobby" && snap.phase !== "draft" && snap.phase !== "podium" && (
        <MatchView snap={snap} />
      )}
      {snap?.phase === "podium" && <PodiumView snap={snap} />}
    </div>
  );
}

function Waiting() {
  return (
    <div className="grid min-h-dvh place-content-center gap-3 px-6 text-center">
      <p className="kicker">شاشة التلفاز</p>
      <h1 className="text-5xl font-black">في انتظار المقدم</h1>
      <p className="text-lg text-muted">الإجابة تبقى على الآيباد إلى أن تُكشف للجميع.</p>
    </div>
  );
}

function DraftView({ snap }: { snap: ScreenSnapshot }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <p className="kicker">سحب الفئات</p>
      <h1 className="text-5xl font-black">{snap.draftLabel}</h1>
      <div className="flex flex-wrap gap-3">
        {snap.draftPicks.map((pick) => {
          const team = pick.teamIndex == null ? null : snap.teams[pick.teamIndex];
          return (
            <span
              key={pick.category}
              className="chip px-4 py-2 text-lg font-black"
              style={{ boxShadow: team ? `inset 6px 0 0 ${team.color}` : undefined }}
            >
              {pick.category}
              <span className="mr-3 text-sm font-medium text-muted">{team ? team.name : "المقدم"}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MatchView({ snap }: { snap: ScreenSnapshot }) {
  const asking = isQuestionPhase(snap.phase);
  const categories: string[] = [];
  for (const tile of snap.board) {
    if (!categories.includes(tile.category)) categories.push(tile.category);
  }
  return (
    <div className={asking ? "opacity-100" : undefined}>
      <ScoreStrip snap={snap} />
      <LeadBanner snap={snap} />
      <div className={`mx-auto max-w-7xl px-3 py-5 ${asking ? "pointer-events-none opacity-30" : ""}`}>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(categories.length, 1)}, minmax(148px, 1fr))` }}
          >
            {categories.map((category) => (
              <div key={category} className="grid gap-2">
                <h2 className="cat-head grid min-h-16 place-items-center px-2 text-center text-sm font-black">
                  {category}
                </h2>
                {POINT_VALUES.map((points) => {
                  const tile = snap.board.find((item) => item.category === category && item.points === points);
                  if (!tile) return <div key={points} className="tile-spent min-h-20" />;
                  return (
                    <div
                      key={tile.id}
                      className={`grid min-h-20 place-items-center font-black ${
                        tile.status === "open" ? "tile-face" : "tile-spent"
                      }`}
                    >
                      {tile.status === "open" && (
                        <span className="text-2xl leading-none">
                          {facePoints(tile.points, snap.pointMultiplier)}
                          {snap.pointMultiplier > 1 && (
                            <span className="mt-1 block text-[10px] font-bold">×{snap.pointMultiplier}</span>
                          )}
                        </span>
                      )}
                      {tile.status === "played" && <Check aria-label="تم اللعب" />}
                      {tile.status === "skipped" && <Minus aria-label="تم التخطي" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {asking && snap.question && <QuestionCard snap={snap} />}
    </div>
  );
}

function LeadBanner({ snap }: { snap: ScreenSnapshot }) {
  const lead = unreachableLead(snap);
  if (!lead || snap.phase !== "board") return null;
  return (
    <p className="note-danger mx-auto mt-3 max-w-3xl px-4 py-3 text-center text-sm font-black">
      تقدم {lead.leaderName} لا يُغلق بالمتبقي. القرار عند المقدم على الآيباد: مضاعفة النقاط أو إنهاء المباراة.
    </p>
  );
}

function ScoreStrip({ snap }: { snap: ScreenSnapshot }) {
  const picking = snap.phase === "board" ? snap.teams[snap.activeTeamIndex] : null;
  return (
    <div className="board-bar sticky top-0 z-20 px-3 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        {snap.teams.map((team, index) => (
          <div
            key={team.id}
            className="board-card min-w-36 flex-1 px-3 py-2"
            style={{
              borderColor: picking?.id === team.id ? team.color : undefined,
              boxShadow: picking?.id === team.id ? `5px 5px 0 ${team.color}` : undefined,
            }}
          >
            <span className="block text-xs" style={{ color: team.color }}>
              {team.name}
            </span>
            <strong className="block text-3xl font-black">{team.score}</strong>
            {picking?.id === team.id && <span className="text-[11px] font-bold text-accent">يختار السؤال</span>}
            {snap.buzzingTeamIndex === index && isQuestionPhase(snap.phase) && (
              <span className="text-[11px] font-bold">على الجرس</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ snap }: { snap: ScreenSnapshot }) {
  const question = snap.question;
  if (!question) return null;
  const actor =
    snap.phase === "primary"
      ? snap.teams[snap.activeTeamIndex]
      : snap.phase === "steal"
        ? snap.teams[snap.activeTeamIndex === 0 ? 1 : 0]
        : snap.buzzingTeamIndex == null
          ? null
          : snap.teams[snap.buzzingTeamIndex];
  const timing = snap.phase === "primary" || snap.phase === "steal";
  return (
    <div className="scrim fixed inset-0 z-30 grid place-items-center p-3">
      <section className="board-card max-h-[92dvh] w-full max-w-5xl overflow-y-auto p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <span className="chip chip-accent px-3 py-1">{question.category}</span>
          <span className="chip px-3 py-1">{facePoints(question.points, snap.pointMultiplier)}</span>
          {question.activity && <span className="chip px-3 py-1">فعالية</span>}
          {actor && <span className="chip px-3 py-1">{actor.name}</span>}
          {snap.phase === "buzzOpen" && <span className="chip px-3 py-1">الجرس مفتوح</span>}
        </div>
        {timing && (
          <div className="mb-4 flex items-center gap-4">
            <TimerRing seconds={snap.timer} total={Math.max(1, snap.timerTotal)} paused={snap.timerPaused} />
            <div>
              <p className="text-sm text-muted">{snap.phase === "primary" ? "الوقت الأساسي" : "فرصة الفريق الآخر"}</p>
              <p className="text-5xl font-black">{snap.timer}</p>
            </div>
          </div>
        )}
        <h2 className="text-3xl font-black leading-relaxed sm:text-5xl">{question.prompt}</h2>
        {question.hostAsk && (
          <p className="note-ok mt-4 px-4 py-3 font-bold">
            يحق للفريق سؤال المقدم مرة واحدة. على المقدم أن يجيب بصراحة.
          </p>
        )}
        {question.options && <ChoiceGrid options={question.options} />}
        {question.answer ? (
          <p className="answer-banner mt-4 px-4 py-3 text-2xl font-black">
            {question.activity ? "معيار التحكيم" : "الإجابة"}: {question.answer}
          </p>
        ) : (
          <div className="mt-5 rounded-2xl border-[3px] border-ink bg-ink px-4 py-4 text-paper">
            <p className="text-xs font-bold">محجوب عن التلفاز</p>
            <p className="mt-1 text-2xl font-black">
              {question.activity ? "معيار التحكيم عند المقدم على الآيباد" : "الإجابة عند المقدم على الآيباد"}
            </p>
          </div>
        )}
        {snap.notice && <p className="note-danger mt-3 px-4 py-2 text-sm">{snap.notice}</p>}
      </section>
    </div>
  );
}

function PodiumView({ snap }: { snap: ScreenSnapshot }) {
  const ranked = [...snap.teams].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const winners = ranked.filter((team) => team.score === top);
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="kicker">المنصة</p>
      <h1 className="text-center text-5xl font-black">
        {winners.length > 1 ? "تعادل على الصدارة" : `الفائز: ${winners[0]?.name ?? "—"}`}
      </h1>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {ranked.slice(0, 3).map((team, index) => (
          <article
            key={team.id}
            className="board-card p-5 text-center"
            style={{ boxShadow: index === 0 ? `8px 8px 0 ${team.color}` : undefined }}
          >
            <p className="text-sm text-muted">المركز {index + 1}</p>
            <h2 className="mt-1 text-2xl font-black" style={{ color: team.color }}>
              {team.name}
            </h2>
            <p className="text-5xl font-black">{team.score}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function TimerRing({ seconds, total, paused }: { seconds: number; total: number; paused: boolean }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, seconds) / total);
  const urgent = seconds <= 10;
  return (
    <svg width="84" height="84" viewBox="0 0 72 72" aria-hidden>
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
