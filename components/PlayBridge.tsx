"use client";

import { useEffect, useRef } from "react";
import { draftPlan } from "@/lib/gameReducer";
import { isClientWire, openPlayLink } from "@/lib/playChannel";
import { buildPlaySnapshot } from "@/lib/playSnapshot";
import type { TeamPowerKind } from "@/lib/types";
import { useGame } from "./GameProvider";

/** Host-side play relay: publishes play snapshots and applies phone intents. */
export function PlayBridge({ room, live }: { room: string; live: boolean }) {
  const { categories, currentQuestion, dispatch, pickCategory, state, usePower: applyPower } = useGame();
  const linkRef = useRef<ReturnType<typeof openPlayLink> | null>(null);
  const seq = useRef(0);
  const latest = useRef({ state, question: currentQuestion, categories });
  const applyPowerRef = useRef(applyPower);
  const pickCategoryRef = useRef(pickCategory);

  useEffect(() => {
    latest.current = { state, question: currentQuestion, categories };
  }, [categories, currentQuestion, state]);

  useEffect(() => {
    applyPowerRef.current = applyPower;
    pickCategoryRef.current = pickCategory;
  }, [applyPower, pickCategory]);

  useEffect(() => {
    if (!live || !room) return;
    const link = openPlayLink(room, () => undefined);
    linkRef.current = link;
    const unsub = link.subscribe((message) => {
      if (!isClientWire(message)) return;
      if (message.type === "hello" || message.type === "ping") {
        dispatch({ type: "PLAYER_PING", playerId: message.playerId, at: message.at });
        return;
      }
      if (message.type === "join") {
        dispatch({
          type: "PLAYER_JOIN",
          playerId: message.playerId,
          name: message.name,
          teamId: message.teamId,
          at: message.at,
        });
        return;
      }
      if (message.type === "leave") {
        dispatch({ type: "PLAYER_LEAVE", playerId: message.playerId });
        return;
      }
      if (message.type === "setLeader") {
        dispatch({
          type: "PLAYER_SET_LEADER",
          teamId: message.teamId,
          targetId: message.targetId,
        });
        return;
      }
      if (message.type === "buzz") {
        dispatch({ type: "PLAYER_BUZZ", playerId: message.playerId, at: message.at });
        return;
      }
      if (message.type === "submit") {
        dispatch({
          type: "PLAYER_SUBMIT",
          playerId: message.playerId,
          kind: message.kind,
          text: message.text,
          number: message.number,
          at: message.at,
        });
        return;
      }
      if (message.type === "pickCategory") {
        const current = latest.current.state;
        const plan = draftPlan(current);
        if (!plan || plan.teamIndex == null) return;
        const player = current.players.find(
          (item) => item.id === message.playerId && item.connected && item.isLeader,
        );
        if (!player) return;
        if (current.teams[plan.teamIndex]?.id !== player.teamId) return;
        if (!latest.current.categories.includes(message.category)) return;
        if (current.draftPicks.some((pick) => pick.category === message.category)) return;
        pickCategoryRef.current(message.category);
        return;
      }
      if (message.type === "usePower") {
        const current = latest.current.state;
        const player = current.players.find(
          (item) => item.id === message.playerId && item.connected && item.isLeader,
        );
        if (!player) return;
        const teamIndex = current.teams.findIndex((team) => team.id === player.teamId);
        if (teamIndex < 0) return;
        applyPowerRef.current(teamIndex, message.kind as TeamPowerKind);
      }
    });

    const publish = () => {
      const current = latest.current;
      seq.current += 1;
      link.send({
        type: "playState",
        seq: seq.current,
        snap: buildPlaySnapshot(current.state, current.question, current.categories),
      });
    };
    publish();
    const beat = window.setInterval(publish, 1000);
    const stale = window.setInterval(() => {
      dispatch({ type: "MARK_PLAYERS_STALE", now: Date.now(), timeoutMs: 7000 });
    }, 2000);

    return () => {
      window.clearInterval(beat);
      window.clearInterval(stale);
      unsub();
      link.close();
      linkRef.current = null;
    };
  }, [dispatch, live, room]);

  useEffect(() => {
    const link = linkRef.current;
    if (!live || !link) return;
    seq.current += 1;
    link.send({
      type: "playState",
      seq: seq.current,
      snap: buildPlaySnapshot(state, currentQuestion, categories),
    });
  }, [categories, currentQuestion, live, state]);

  return null;
}
