"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openPlayLink, playerId, type PlayClientWire, type RelayStatus } from "@/lib/playChannel";
import { readRoomParam } from "@/lib/screenChannel";
import type { PlaySnapshot } from "@/lib/playSnapshot";
import { Button, Panel } from "./ui";

type Step = "room" | "name" | "team" | "live";

export function PlayClient() {
  const [ready, setReady] = useState(false);
  const [id, setId] = useState("");
  const [step, setStep] = useState<Step>("room");
  const [roomInput, setRoomInput] = useState("");
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [relay, setRelay] = useState<RelayStatus>("off");
  const [snap, setSnap] = useState<PlaySnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const linkRef = useRef<ReturnType<typeof openPlayLink> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    // Client-only bootstrap (sessionStorage / URL); skip on SSR.
    const code = readRoomParam();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client hydration
    setId(playerId());
    setRoomInput(code);
    setRoom(code);
    setStep(code ? "name" : "room");
    setReady(true);
  }, []);

  const me = snap?.players.find((player) => player.id === id) ?? null;
  const myTeam = snap?.teams.find((team) => team.id === me?.teamId) ?? null;

  const send = useCallback((message: PlayClientWire) => {
    linkRef.current?.send(message);
  }, []);

  useEffect(() => {
    if (!ready || !id || !room) return;
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
  }, [id, ready, room, send]);

  useEffect(() => {
    if (!ready || !id || !joinedTeamId || !room || !name.trim()) return;
    send({
      type: "join",
      playerId: id,
      name: name.trim().slice(0, 24),
      teamId: joinedTeamId,
      at: Date.now(),
    });
  }, [id, joinedTeamId, name, ready, relay, room, send]);

  if (!ready) {
    return (
      <Shell>
        <p className="text-sm text-muted">جارٍ التجهيز…</p>
      </Shell>
    );
  }

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

  const teamsReady = (snap?.teams.length ?? 0) > 0;
  const needsTeam = Boolean(room) && !joinedTeamId && step !== "room";

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

  // Name + team as soon as category draft starts (teams appear in the snapshot).
  if (needsTeam) {
    return (
      <Shell>
        <Panel className="grid w-full max-w-md gap-4 p-5">
          <p className="text-xs text-muted">
            الغرفة {room}
            {snap?.phase === "draft" ? " · سحب الفئات بدأ" : ""}
            {relay === "live" ? "" : " · جارٍ الاتصال…"}
          </p>
          <h1 className="text-2xl font-black">اسمك وفريقك</h1>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field px-3 py-3 text-lg"
            maxLength={24}
            placeholder="مثال: سارة"
            autoFocus
          />
          {!teamsReady ? (
            <p className="text-sm text-muted">
              بانتظار بدء سحب الفئات من المقدم — ستظهر الفرق هنا فوراً.
            </p>
          ) : (
            <>
              <p className="text-sm font-bold">اختر فريقك</p>
              <div className="grid gap-2">
                {snap!.teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    disabled={!name.trim()}
                    onClick={() => joinTeam(team.id, Date.now())}
                    className="board-btn flex items-center justify-between gap-3 px-4 py-4 text-right disabled:opacity-40"
                    style={{ borderColor: team.color }}
                  >
                    <span className="font-black" style={{ color: team.color }}>
                      {team.name}
                    </span>
                    <span className="text-sm text-muted">
                      {snap?.players.filter((player) => player.teamId === team.id && player.connected)
                        .length ?? 0}{" "}
                      لاعب
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
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

        {joinedTeamId && !me && (
          <Panel className="grid gap-3 p-4">
            <p className="text-sm text-muted">جارٍ تسجيل انضمامك للفريق…</p>
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
          onPickCategory={(category, at) =>
            send({ type: "pickCategory", playerId: id, category, at })
          }
          onUsePower={(kind, at) => send({ type: "usePower", playerId: id, kind, at })}
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

const POWER_LABELS: Record<"time" | "choice" | "range" | "cut" | "skip", string> = {
  time: "وقت إضافي",
  choice: "خيارات متعددة",
  range: "نطاق تقريبي",
  cut: "احذف خيارين",
  skip: "تخطي السؤال",
};

function PlayStage({
  snap,
  meId,
  me,
  draft,
  setDraft,
  sent,
  onBuzz,
  onSubmit,
  onPickCategory,
  onUsePower,
}: {
  snap: PlaySnapshot | null;
  meId: string;
  me: PlaySnapshot["players"][number] | null;
  draft: string;
  setDraft: (value: string) => void;
  sent: string | null;
  onBuzz: () => void;
  onSubmit: (kind: "text" | "option" | "number", text: string, number: number | null, at: number) => void;
  onPickCategory: (category: string, at: number) => void;
  onUsePower: (kind: "time" | "choice" | "range" | "cut" | "skip", at: number) => void;
}) {
  if (!snap) {
    return <p className="text-center text-sm text-muted">بانتظار بث المقدم…</p>;
  }

  const question = snap.question;
  const lockedOut = me ? snap.lockedOutTeamIds.includes(me.teamId) : false;
  const mySub = me ? snap.submissions.find((item) => item.teamId === me.teamId) : null;
  const myPower = me ? snap.powers.find((item) => item.teamId === me.teamId) : null;
  const turnTeam =
    snap.draft && snap.draft.turnTeamIndex != null ? snap.teams[snap.draft.turnTeamIndex] : null;
  const myDraftTurn =
    Boolean(me?.isLeader) &&
    snap.phase === "draft" &&
    snap.draft != null &&
    turnTeam?.id === me?.teamId;
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
  const canUsePowers =
    Boolean(me?.isLeader && myPower?.eligible) &&
    (snap.phase === "primary" ||
      snap.phase === "steal" ||
      snap.phase === "buzzOpen" ||
      snap.phase === "buzzLocked");
  const optionSelect = canAnswer && (snap.mode === "choices" || snap.mode === "classic");

  return (
    <div className="grid flex-1 gap-4">
      {snap.phase === "lobby" && (
        <Panel className="p-5 text-center">
          <p className="text-lg font-black">بانتظار بدء السحب</p>
          <p className="mt-2 text-sm text-muted">اختر فريقك إن لم تفعل، ثم انتظر المقدم.</p>
        </Panel>
      )}

      {snap.phase === "draft" && snap.draft && (
        <Panel className="grid gap-3 p-5">
          <p className="text-lg font-black">
            {turnTeam
              ? `دور ${turnTeam.name}`
              : snap.draft.optional
                ? "دور المقدم (اختياري)"
                : "دور المقدم"}
          </p>
          <p className="text-xs text-muted">
            مختار {snap.draft.picks.length} · متناوب بين الفريقين · آخر اختيار للمقدم
          </p>
          {snap.draft.picks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {snap.draft.picks.map((pick) => (
                <span key={pick.category} className="chip px-2 py-1 text-xs">
                  {pick.category}
                </span>
              ))}
            </div>
          )}
          {myDraftTurn ? (
            <div className="grid max-h-72 gap-2 overflow-y-auto">
              {snap.draft.remaining.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onPickCategory(category, Date.now())}
                  className="board-btn px-4 py-3 text-right text-sm font-bold"
                >
                  {category}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {me?.isLeader
                ? "انتظر دور فريقك لاختيار فئة."
                : "القائد يختار الفئة عندما يحين دور فريقكم."}
            </p>
          )}
        </Panel>
      )}

      {snap.phase === "board" && (
        <Panel className="p-5 text-center">
          <p className="text-lg font-black">بانتظار اختيار خانة</p>
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

      {question?.options && question.options.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-black text-muted">
            {snap.mode === "choices" ? "الخيارات" : "خيارات متعددة"}
          </p>
          {question.options.map((option) =>
            optionSelect ? (
              <button
                key={option}
                type="button"
                onClick={() => onSubmit("option", option, null, Date.now())}
                className="board-btn px-4 py-4 text-right text-base font-bold"
              >
                {option}
              </button>
            ) : (
              <p key={option} className="board-card px-4 py-3 text-sm font-bold">
                {option}
              </p>
            ),
          )}
        </div>
      )}

      {canUsePowers && myPower && (
        <div className="grid gap-2">
          <p className="text-xs font-black text-muted">قدرات الفريق</p>
          {(snap.powerKinds ?? []).map((kind) => {
            const turns = myPower.cooldowns[kind] ?? 0;
            const used =
              (kind === "choice" && snap.optionsVisible) ||
              (kind === "range" && snap.rangeVisible) ||
              (kind === "cut" && (question?.options?.length ?? 0) > 0 && (question?.options?.length ?? 0) <= 2);
            const phaseBlocked = kind === "time" && snap.phase !== "primary" && snap.phase !== "steal";
            const disabled = turns > 0 || used || phaseBlocked;
            return (
              <button
                key={kind}
                type="button"
                disabled={disabled}
                onClick={() => onUsePower(kind, Date.now())}
                className="board-btn board-btn-ghost flex items-center justify-between px-4 py-3 text-sm disabled:opacity-40"
              >
                <span>{POWER_LABELS[kind]}</span>
                <span className="chip px-2 py-0.5 text-[10px]">
                  {used && turns <= 0 ? "ظاهر" : turns > 0 ? `${turns}` : "جاهز"}
                </span>
              </button>
            );
          })}
        </div>
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

      {canAnswer && (snap.mode === "classic" || snap.mode === "buzzer") && !question?.options && (
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
