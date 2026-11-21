"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useGame } from "./GameProvider";
import { Button } from "./ui";

export function Podium() {
  const { dispatch, state } = useGame();
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const winners = ranked.filter((team) => team.score === top);
  const played = state.board.filter((tile) => tile.status === "played").length;
  const skipped = state.board.filter((tile) => tile.status === "skipped").length;
  const spread = ranked.length ? ranked[0].score - ranked[ranked.length - 1].score : 0;
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        x: (index * 37) % 100,
        delay: (index % 8) * 0.08,
        color: ["#ef7b24", "#157a9c", "#e11d2e", "#2f9e44", "#ff4d6d"][index % 5],
      })),
    [],
  );

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        {bits.map((bit) => (
          <motion.span
            key={bit.id}
            className="absolute top-0 h-2 w-3 rounded-sm"
            style={{ left: `${bit.x}%`, background: bit.color }}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: "100vh", opacity: [0, 1, 1, 0], rotate: 220 }}
            transition={{ duration: 2.4, delay: bit.delay, ease: "easeIn" }}
          />
        ))}
      </div>
      <p className="kicker">المنصة</p>
      <h1 className="text-center text-4xl font-black">
        {winners.length > 1 ? "تعادل على الصدارة" : `الفائز: ${winners[0]?.name ?? "—"}`}
      </h1>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {ranked.slice(0, 3).map((team, index) => (
          <motion.article
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.08 }}
            className="board-card p-5 text-center"
            style={{ boxShadow: index === 0 ? `8px 8px 0 ${team.color}` : undefined }}
          >
            <p className="text-sm text-muted">المركز {index + 1}</p>
            <h2 className="mt-1 text-2xl font-black" style={{ color: team.color }}>
              {team.name}
            </h2>
            <p className="text-4xl font-black">{team.score}</p>
          </motion.article>
        ))}
      </div>
      {ranked.length > 3 && (
        <ul className="grid w-full gap-2">
          {ranked.slice(3).map((team, index) => (
            <li key={team.id} className="chip flex items-center justify-between px-4 py-2">
              <span>
                {index + 4}. {team.name}
              </span>
              <strong>{team.score}</strong>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid w-full grid-cols-3 gap-2 text-center text-sm">
        <div className="board-card p-3">
          <dt className="text-muted">أُغلقت</dt>
          <dd className="text-xl font-black">{played}</dd>
        </div>
        <div className="board-card p-3">
          <dt className="text-muted">تُخطيت</dt>
          <dd className="text-xl font-black">{skipped}</dd>
        </div>
        <div className="board-card p-3">
          <dt className="text-muted">فارق النقاط</dt>
          <dd className="text-xl font-black">{spread}</dd>
        </div>
      </dl>
      <Button onClick={() => dispatch({ type: "REPLAY" })}>مباراة جديدة</Button>
    </div>
  );
}
