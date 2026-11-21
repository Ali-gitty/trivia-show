"use client";

import { useState } from "react";
import { useGame } from "./GameProvider";
import { Button, Panel } from "./ui";

export function ScoreEditor() {
  const { dispatch, state } = useGame();
  const team = state.teams.find((item) => item.id === state.scoreEditorTeamId);
  const [exact, setExact] = useState("");
  if (!team) return null;

  return (
    <div className="scrim fixed inset-0 z-50 grid place-items-center p-4">
      <Panel className="w-full max-w-md p-5">
        <h2 className="text-xl font-black">تعديل نقاط {team.name}</h2>
        <p className="mt-1 text-3xl font-black" style={{ color: team.color }}>
          {team.score}
        </p>
        <p className="mt-2 text-xs text-muted">النقاط لا تنزل تحت الصفر.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => dispatch({ type: "ADJUST_SCORE", teamId: team.id, delta: 50 })}>+50</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: "ADJUST_SCORE", teamId: team.id, delta: -50 })}>
            −50
          </Button>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(exact);
            if (!Number.isFinite(value)) return;
            dispatch({ type: "ADJUST_SCORE", teamId: team.id, exact: value });
            setExact("");
          }}
        >
          <input
            inputMode="numeric"
            value={exact}
            onChange={(event) => setExact(event.target.value)}
            placeholder="قيمة محددة"
            className="field flex-1 px-3 py-2"
          />
          <Button type="submit">حفظ</Button>
        </form>
        <Button className="mt-4" variant="ghost" onClick={() => dispatch({ type: "OPEN_SCORE", teamId: null })}>
          إغلاق
        </Button>
      </Panel>
    </div>
  );
}
