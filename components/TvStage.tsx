"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Volume2 } from "lucide-react";
import { boardLayout } from "@/lib/boardLayout";
import { CategoryLabel } from "@/lib/categoryIcons";
import { facePoints, isQuestionPhase, unreachableLead } from "@/lib/gameReducer";
import { openScreenLink, readRoomParam, viewerId } from "@/lib/screenChannel";
import type { ScreenSnapshot } from "@/lib/screenSnapshot";
import { SoundEngine } from "@/lib/sounds";
import { ChoiceGrid, IsolatedText } from "./ChoiceGrid";
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
      {!snap && <Waiting room={room} />}
      {snap?.phase === "lobby" && <Waiting room={room} />}
      {snap?.phase === "connect" && <ConnectLobby snap={snap} room={room} />}
      {snap?.phase === "draft" && <DraftView snap={snap} />}
      {snap &&
        snap.phase !== "lobby" &&
        snap.phase !== "connect" &&
        snap.phase !== "draft" &&
        snap.phase !== "podium" && <MatchView snap={snap} />}
      {snap?.phase === "podium" && <PodiumView snap={snap} />}
    </div>
  );
}

function Waiting({ room }: { room?: string }) {
  return (
    <div className="grid min-h-dvh place-content-center gap-3 px-6 text-center">
      <p className="kicker">شاشة التلفاز</p>
      <h1 className="text-5xl font-black">في انتظار المقدم</h1>
      <p className="text-lg text-muted">انضموا من الجوال قبل سحب الفئات — الإجابة تبقى على الآيباد حتى الكشف.</p>
      {room ? (
        <p className="mt-4 text-4xl font-black tracking-[0.2em]" dir="ltr">
          {room}
        </p>
      ) : null}
    </div>
  );
}

function ConnectLobby({ snap, room }: { snap: ScreenSnapshot; room: string }) {
  const connected = snap.players.filter((player) => player.connected);
  const byTeam = snap.teams.map((team) => ({
    team,
    members: connected.filter((player) => player.teamId === team.id),
  }));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="text-center">
        <p className="kicker">قاعة الانتظار</p>
        <h1 className="mt-3 text-5xl font-black sm:text-6xl">انضموا من الجوال</h1>
        <p className="mt-3 text-lg text-muted">الأسماء تظهر هنا فور الاتصال — انتظروا إشارة المقدم.</p>
        <p className="mt-6 text-6xl font-black tracking-[0.28em] sm:text-7xl" dir="ltr">
          {room}
        </p>
        <p className="mt-4 text-2xl font-black">
          {connected.length > 0 ? `${connected.length} لاعب متصل` : "بانتظار أول لاعب…"}
        </p>
      </header>

      <div className="grid flex-1 gap-6 md:grid-cols-2">
        {byTeam.map(({ team, members }) => (
          <section
            key={team.id}
            className="board-card flex min-h-64 flex-col gap-4 p-5"
            style={{ boxShadow: `inset 10px 0 0 ${team.color}` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-3xl font-black" style={{ color: team.color }}>
                {team.name}
              </h2>
              <span className="text-lg font-bold text-muted">{members.length}</span>
            </div>
            {members.length === 0 ? (
              <p className="text-xl text-muted">لا أحد بعد</p>
            ) : (
              <div className="flex flex-wrap content-start gap-3">
                <AnimatePresence initial={false}>
                  {members.map((player) => (
                    <motion.span
                      key={player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="chip px-4 py-3 text-2xl font-black"
                      style={{
                        borderColor: team.color,
                        boxShadow: `4px 4px 0 ${team.color}`,
                      }}
                    >
                      {player.name}
                      {player.isLeader ? " ★" : ""}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        ))}
      </div>

      {connected.length === 0 && (
        <p className="text-center text-xl text-muted">امسحوا رمز المقدم أو أدخلوا الرمز أعلاه على الجوال.</p>
      )}
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
              <CategoryLabel category={pick.category} size={18} />
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
  const layout = boardLayout(categories.length);
  const pointTiers = [...new Set(snap.board.map((tile) => tile.points))].sort((a, b) => a - b);
  return (
    <div className={asking ? "opacity-100" : undefined}>
      <ScoreStrip snap={snap} />
      <LeadBanner snap={snap} />
      <div
        className={`board-fit mx-auto px-2 py-3 ${asking ? "pointer-events-none opacity-30" : ""}`}
        style={{ height: "calc(100dvh - 5.75rem)" }}
      >
        <div
          className="grid h-full min-h-0 w-full"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gap: layout.gap,
          }}
        >
          {categories.map((category) => (
            <div
              key={category}
              className="grid h-full min-h-0 min-w-0"
              style={{
                gridTemplateRows: `auto repeat(${Math.max(pointTiers.length, 1)}, minmax(0, 1fr))`,
                gap: layout.gap,
              }}
            >
              <h2 className={`cat-head grid place-items-center text-center font-black ${layout.headClass}`}>
                <CategoryLabel category={category} stacked size={layout.labelSize} />
              </h2>
              {pointTiers.map((points) => {
                const tile = snap.board.find((item) => item.category === category && item.points === points);
                if (!tile) return <div key={points} className={`tile-spent ${layout.tileClass}`} />;
                return (
                  <div
                    key={tile.id}
                    className={`grid place-items-center font-black ${layout.tileClass} ${
                      tile.status === "open" ? "tile-face" : "tile-spent"
                    }`}
                  >
                    {tile.status === "open" && (
                      <span className="leading-none" style={{ fontSize: layout.pointSize }}>
                        {facePoints(tile.points, snap.pointMultiplier)}
                        {snap.pointMultiplier > 1 && (
                          <span className="mt-0.5 block text-[9px] font-bold sm:text-[10px]">×{snap.pointMultiplier}</span>
                        )}
                      </span>
                    )}
                    {tile.status === "played" && <Check aria-label="تم اللعب" size={layout.cols >= 8 ? 16 : 20} />}
                    {tile.status === "skipped" && <Minus aria-label="تم التخطي" size={layout.cols >= 8 ? 16 : 20} />}
                  </div>
                );
              })}
            </div>
          ))}
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
    <div className="scrim z-30">
      <section className="board-card question-shell gap-3 p-4 sm:p-6">
        <div className="flex shrink-0 flex-wrap gap-2 text-sm">
          <span className="chip chip-accent px-3 py-1">
            <CategoryLabel category={question.category} size={14} />
          </span>
          <span className="chip px-3 py-1">{facePoints(question.points, snap.pointMultiplier)}</span>
          {question.activity && <span className="chip px-3 py-1">فعالية</span>}
          {actor && <span className="chip px-3 py-1">{actor.name}</span>}
          {snap.phase === "buzzOpen" && <span className="chip px-3 py-1">الجرس مفتوح</span>}
        </div>
        {timing && (
          <div className="flex shrink-0 items-center gap-3">
            <TimerRing seconds={snap.timer} total={Math.max(1, snap.timerTotal)} paused={snap.timerPaused} />
            <div>
              <p className="text-xs text-muted sm:text-sm">
                {snap.phase === "primary" ? "الوقت الأساسي" : "فرصة الفريق الآخر"}
              </p>
              <p className="text-4xl font-black tabular-nums sm:text-5xl">{snap.timer}</p>
            </div>
          </div>
        )}
        <h2 className="question-prompt min-h-0 shrink font-black">{question.prompt}</h2>
        {snap.mode === "closest" && !question.answer && (
          <p className="shrink-0 text-sm text-muted">أقرب رقم يفوز — التخمين عند الفرق.</p>
        )}
        {question.range && (
          <p className="note-ok shrink-0 px-3 py-2 text-sm font-bold">النطاق التقريبي: {question.range}</p>
        )}
        {question.options && <ChoiceGrid options={question.options} compact />}
        {question.answer ? (
          <p className="answer-banner shrink-0 px-3 py-2 text-lg font-black sm:text-2xl">
            {question.activity ? "معيار التحكيم" : "الإجابة"}: <IsolatedText text={question.answer} />
          </p>
        ) : (
          <div className="shrink-0 rounded-2xl border-[3px] border-ink bg-ink px-3 py-3 text-paper">
            <p className="text-xs font-bold">محجوب عن التلفاز</p>
            <p className="mt-1 text-lg font-black sm:text-2xl">
              {question.activity ? "معيار التحكيم عند المقدم على الآيباد" : "الإجابة عند المقدم على الآيباد"}
            </p>
          </div>
        )}
        {snap.notice && <p className="note-danger shrink-0 px-3 py-2 text-sm">{snap.notice}</p>}
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
