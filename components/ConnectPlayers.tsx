"use client";

import { useMemo, useState } from "react";
import { Copy, Smartphone, Users } from "lucide-react";
import { encode } from "uqr";
import { useGame } from "./GameProvider";
import { useTv } from "./TvBridge";
import { Button, Panel } from "./ui";

export function ConnectPlayers() {
  const { dispatch, state } = useGame();
  const { live, openLink, playLink, room, viewers } = useTv();
  const [copied, setCopied] = useState(false);

  const connected = state.players.filter((player) => player.connected);
  const byTeam = useMemo(
    () =>
      state.teams.map((team) => ({
        team,
        members: connected.filter((player) => player.teamId === team.id),
      })),
    [connected, state.teams],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <p className="kicker">قبل سحب الفئات</p>
        <h1 className="mt-3 text-4xl font-black">انضمام اللاعبين</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
          امسح رمز الجوال وانضم للفرق. عندما يلتحق الجميع، اضغط ابدأ سحب الفئات.
        </p>
      </header>

      <Panel className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-col items-center gap-3">
          {playLink ? (
            <QrMark value={playLink} label="رمز انضمام الجوالات" />
          ) : (
            <Button onClick={openLink}>
              <Smartphone size={16} />
              إظهار رمز الغرفة
            </Button>
          )}
          {room && (
            <p className="text-3xl font-black tracking-[0.2em]" dir="ltr">
              {room}
            </p>
          )}
        </div>
        <div className="grid gap-3">
          <p className="text-sm font-black">
            {connected.length > 0
              ? `${connected.length} لاعب متصل`
              : "بانتظار انضمام اللاعبين من الجوال"}
            {live ? "" : " · فعّل الرابط"}
            {viewers > 0 ? ` · تلفاز: ${viewers}` : ""}
          </p>
          {playLink && (
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={playLink}
                className="field min-w-0 flex-1 px-3 py-2 text-left text-xs"
                dir="ltr"
                aria-label="رابط الجوال"
              />
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(playLink).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                <Copy size={16} />
                {copied ? "تم" : "نسخ"}
              </Button>
              <Button variant="ghost" onClick={openLink}>
                QR كامل
              </Button>
            </div>
          )}
          <p className="text-xs leading-6 text-muted">
            الفرق جاهزة على الجوال فور فتح هذا التبويب. لا تنتقل لسحب الفئات قبل اختيار كل لاعب
            لفريقه.
          </p>
        </div>
      </Panel>

      <Panel className="grid gap-4 p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Users size={18} /> الفرق المتصلة
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {byTeam.map(({ team, members }) => (
            <div
              key={team.id}
              className="rounded-2xl border-[3px] border-ink bg-paper p-4"
              style={{ boxShadow: `inset 6px 0 0 ${team.color}` }}
            >
              <p className="font-black" style={{ color: team.color }}>
                {team.name}
              </p>
              {members.length === 0 ? (
                <p className="mt-2 text-sm text-muted">لا لاعبين بعد</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1">
                  {members.map((player) => (
                    <span key={player.id} className={`chip px-2 py-1 text-xs ${player.isLeader ? "chip-accent" : ""}`}>
                      {player.name}
                      {player.isLeader ? " ★" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border-[3px] border-ink bg-paper p-4 shadow-[6px_6px_0_var(--ink)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold leading-6">
          بعد انضمام الجميع اضغط ابدأ اللعبة للانتقال إلى سحب الفئات.
          <span className="mt-1 block text-xs font-normal text-muted">
            يمكنك المتابعة بدون جوالات — المقدم يدير يدوياً.
          </span>
        </p>
        <Button
          className="h-14 min-w-52 shrink-0 text-base"
          onClick={() => dispatch({ type: "BEGIN_DRAFT" })}
        >
          ابدأ اللعبة · سحب الفئات
        </Button>
      </div>
    </div>
  );
}

function QrMark({ value, label }: { value: string; label: string }) {
  const qr = encode(value, { ecc: "M", border: 2 });
  const cells = qr.data.flatMap((row, y) =>
    row.flatMap((on, x) => (on ? [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />] : [])),
  );
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className="h-44 w-44 shrink-0 rounded-2xl bg-white p-2"
    >
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <g fill="#1a120b">{cells}</g>
    </svg>
  );
}
