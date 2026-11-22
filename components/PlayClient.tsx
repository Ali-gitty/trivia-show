"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openPlayLink, playerId, type PlayClientWire, type RelayStatus } from "@/lib/playChannel";
import { readRoomParam } from "@/lib/screenChannel";
import type { PlaySnapshot } from "@/lib/playSnapshot";
import { Button, Panel } from "./ui";

type Step = "room" | "name" | "team" | "live";

export function PlayClient() {
  const id = useMemo(() => playerId(), []);
  const [step, setStep] = useState<Step>(() => (readRoomParam() ? "name" : "room"));
  const [roomInput, setRoomInput] = useState(readRoomParam);
  const [room, setRoom] = useState(readRoomParam);
  const [name, setName] = useState("");
  const [relay, setRelay] = useState<RelayStatus>("off");
  const [snap, setSnap] = useState<PlaySnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const linkRef = useRef<ReturnType<typeof openPlayLink> | null>(null);
  const seqRef = useRef(0);

  const me = snap?.players.find((player) => player.id === id) ?? null;
  const myTeam = snap?.teams.find((team) => team.id === me?.teamId) ?? null;

  const send = useCallback((message: PlayClientWire) => {
    linkRef.current?.send(message);
  }, []);

  useEffect(() => {
    if (!room) return;
    seqRef.current = 0;
    const link = openPlayLink(room, setRelay);
    linkRef.current = link;
    const unsub = link.subscribe((message) => {
      if (message.type !== "playState") return;
      if (message.seq < seqRef.current) return;
      seqRef.current = message.seq;
      setSnap(message.snap);
    });
    const beat = window.setInterval(() => {
      send({ type: "ping", playerId: id, at: Date.now() });
    }, 2500);
    send({ type: "hello", playerId: id, at: Date.now() });
    return () => {
      window.clearInterval(beat);
      unsub();
      link.close();
      linkRef.current = null;
    };
  }, [id, room, send]);

  useEffect(() => {
    if (!joinedTeamId || !room || !name.trim()) return;
    send({
      type: "join",
      playerId: id,
      name: name.trim().slice(0, 24),
      teamId: joinedTeamId,
      at: Date.now(),
    });
  }, [id, joinedTeamId, name, relay, room, send]);

  const joinRoom = () => {
    const next = roomInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(next)) return;
    setRoom(next);
    setStep("name");
  };

  const joinTeam = (teamId: string, at: number) => {
    const label = name.trim().slice(0, 24) || "لاعب";
    setName(label);
    setJoinedTeamId(teamId);
    send({ type: "join", playerId: id, name: label, teamId, at });
    setStep("live");
    setSent(null);
    setDraft("");
  };

  const submit = (
    kind: "text" | "option" | "number",
    text: string,
    number: number | null,
    at: number,
  ) => {
    send({ type: "submit", playerId: id, kind, text, number, at });
    setSent(text);
    setDraft("");
  };

  if (step === "room") {
    return (
      <Shell>
        <Panel className="grid w-full max-w-md gap-4 p-5">
          <h1 className="text-2xl font-black">انضم للمباراة</h1>
          <p className="text-sm text-muted">أدخل رمز الغرفة من شاشة المقدم.</p>
          <input
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
            className="field px-3 py-3 text-center text-2xl font-black tracking-[0.25em]"
            dir="ltr"
            maxLength={8}
            aria-label="رمز الغرفة"
          />
          <Button className="h-12" onClick={joinRoom}>
            متابعة
          </Button>
        </Panel>
      </Shell>
    );
  }

  if (step === "name") {
    return (
      <Shell>
        <Panel className="grid w-full max-w-md gap-4 p-5">
          <p className="text-xs text-muted">الغرفة {room}</p>
          <h1 className="text-2xl font-black">اسمك</h1>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field px-3 py-3 text-lg"
            maxLength={24}
            placeholder="مثال: سارة"
          />
          <Button className="h-12" disabled={!name.trim()} onClick={() => setStep("team")}>
            اختيار الفريق
          </Button>
        </Panel>
      </Shell>
    );
  }

  if (step === "team") {
    return (
      <Shell>
        <Panel className="grid w-full max-w-md gap-4 p-5">
          <h1 className="text-2xl font-black">اختر فريقك</h1>
          {!snap?.teams.length && (
            <p className="text-sm text-muted">
              {relay === "live" ? "بانتظار المقدم لبدء المباراة…" : "جارٍ الاتصال…"}
            </p>
          )}
          <div className="grid gap-2">
            {(snap?.teams ?? []).map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => joinTeam(team.id, Date.now())}
                className="board-btn flex items-center justify-between gap-3 px-4 py-4 text-right"
                style={{ borderColor: team.color }}
              >
                <span className="font-black" style={{ color: team.color }}>
                  {team.name}
                </span>
                <span className="text-sm text-muted">{team.score}</span>
              </button>
            ))}
          </div>
        </Panel>
      </Shell>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]" dir="rtl">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">الغرفة {room}</p>
            <p className="font-black">
              {me?.name ?? name}
              {me?.isLeader ? " · القائد" : ""}
            </p>
          </div>
          <p className="chip px-3 py-1 text-xs" style={{ color: myTeam?.color }}>
            {myTeam?.name ?? "—"}
            {relay === "live" ? "" : " · غير متصل"}
          </p>
        </header>

        {snap && !me && (
          <Panel className="grid gap-3 p-4">
            <p className="text-sm">لم تُسجَّل في فريق بعد.</p>
            <Button onClick={() => setStep("team")}>اختيار الفريق</Button>
          </Panel>
        )}

        {me && (
          <Panel className="grid gap-3 p-4">
            <div className="flex flex-wrap gap-2">
              {(snap?.players.filter((player) => player.teamId === me.teamId) ?? []).map((player) => (
                <span
                  key={player.id}
                  className={`chip px-2 py-1 text-xs ${player.connected ? "" : "opacity-40"}`}
                >
                  {player.name}
                  {player.isLeader ? " ★" : ""}
                </span>
              ))}
            </div>
            {!me.isLeader && (
              <Button
                variant="ghost"
                onClick={() =>
                  send({
                    type: "setLeader",
                    playerId: id,
                    teamId: me.teamId,
                    targetId: id,
                    at: Date.now(),
                  })
                }
              >
                أنا القائد
              </Button>
            )}
          </Panel>
        )}

        <PlayStage
          snap={snap}
          meId={id}
          me={me}
          draft={draft}
          setDraft={setDraft}
          sent={sent}
          onBuzz={() => send({ type: "buzz", playerId: id, at: Date.now() })}
          onSubmit={(kind, text, number, at) => submit(kind, text, number, at)}
        />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]" dir="rtl">
      <div className="grid min-h-dvh place-items-center">{children}</div>
    </div>
  );
}

function PlayStage({
  snap,
  meId,
  me,
  draft,
  setDraft,
  sent,
  onBuzz,
  onSubmit,
}: {
  snap: PlaySnapshot | null;
  meId: string;
  me: PlaySnapshot["players"][number] | null;
  draft: string;
  setDraft: (value: string) => void;
  sent: string | null;
  onBuzz: () => void;
  onSubmit: (kind: "text" | "option" | "number", text: string, number: number | null, at: number) => void;
}) {
  if (!snap) {
    return <p className="text-center text-sm text-muted">بانتظار بث المقدم…</p>;
  }

  const question = snap.question;
  const lockedOut = me ? snap.lockedOutTeamIds.includes(me.teamId) : false;
  const mySub = me ? snap.submissions.find((item) => item.teamId === me.teamId) : null;
  const canAnswer =
    Boolean(me) &&
    snap.phoneAnswers === "open" &&
    !question?.activity &&
    ((snap.mode === "buzzer" &&
      snap.phase === "buzzLocked" &&
      snap.remoteBuzz?.playerId === meId) ||
      (snap.mode !== "buzzer" &&
        me?.isLeader &&
        (snap.phase === "primary" || snap.phase === "steal" || snap.phase === "adjudicate")));

  return (
    <div className="grid flex-1 gap-4">
      {(snap.phase === "lobby" || snap.phase === "draft" || snap.phase === "board") && (
        <Panel className="p-5 text-center">
          <p className="text-lg font-black">
            {snap.phase === "board" ? "بانتظار اختيار خانة" : "بانتظار بدء السؤال"}
          </p>
          <p className="mt-2 text-sm text-muted">ستظهر الأسئلة هنا تلقائياً.</p>
        </Panel>
      )}

      {question && (
        <Panel className="grid gap-3 p-5">
          <p className="text-xs text-muted">
            {question.category} · {question.points}
            {snap.timerRunning ? ` · ${snap.timer}ث` : ""}
          </p>
          <h2 className="text-xl font-black leading-9">{question.prompt}</h2>
          {question.range && (
            <p className="note-ok px-3 py-2 text-sm font-bold">النطاق: {question.range}</p>
          )}
          {snap.remoteBuzz && (
            <p className="chip chip-accent px-3 py-2 text-sm">
              ضغط أولاً: {snap.remoteBuzz.playerName}
            </p>
          )}
          {question.answer && (
            <p className="note-ok px-3 py-2 text-sm font-bold">الإجابة: {question.answer}</p>
          )}
        </Panel>
      )}

      {snap.mode === "buzzer" && snap.phase === "buzzOpen" && me && (
        <button
          type="button"
          disabled={lockedOut}
          onClick={onBuzz}
          className="board-btn board-btn-accent grid min-h-48 place-items-center rounded-[2rem] text-3xl font-black disabled:opacity-40"
        >
          {lockedOut ? "مستبعد" : "جرس"}
        </button>
      )}

      {canAnswer && snap.mode === "choices" && question?.options && (
        <div className="grid gap-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSubmit("option", option, null, Date.now())}
              className="board-btn px-4 py-4 text-right text-base font-bold"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {canAnswer && snap.mode === "closest" && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(draft.replace(/,/g, ""));
            if (!Number.isFinite(value)) return;
            onSubmit("number", String(value), value, Date.now());
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value.replace(/[^\d.-]/g, ""))}
            inputMode="decimal"
            className="field px-3 py-4 text-center text-2xl font-black"
            dir="ltr"
            placeholder="رقم فقط"
          />
          <Button className="h-12" type="submit" disabled={!draft.trim()}>
            إرسال التخمين
          </Button>
        </form>
      )}

      {canAnswer && (snap.mode === "classic" || snap.mode === "buzzer") && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            onSubmit("text", draft.trim(), null, Date.now());
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="field px-3 py-3 text-base"
            placeholder="اكتب الإجابة أو أخبر المقدم"
          />
          <Button className="h-12" type="submit" disabled={!draft.trim()}>
            إرسال للمقدم
          </Button>
        </form>
      )}

      {(sent || mySub?.locked) && (
        <p className="text-center text-sm text-muted">
          تم القفل: {sent ?? mySub?.text ?? "…"} — يمكنك أيضاً إخبار المقدم شفهياً.
        </p>
      )}

      {snap.notice && <p className="text-center text-sm font-bold">{snap.notice}</p>}
      {snap.phase === "podium" && <p className="text-center text-xl font-black">انتهت المباراة</p>}
    </div>
  );
}
