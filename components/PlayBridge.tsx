"use client";

import { useEffect, useRef } from "react";
import { isClientWire, openPlayLink } from "@/lib/playChannel";
import { buildPlaySnapshot } from "@/lib/playSnapshot";
import { useGame } from "./GameProvider";

/** Host-side play relay: publishes play snapshots and applies phone intents. */
export function PlayBridge({ room, live }: { room: string; live: boolean }) {
  const { currentQuestion, dispatch, state } = useGame();
  const linkRef = useRef<ReturnType<typeof openPlayLink> | null>(null);
  const seq = useRef(0);
  const latest = useRef({ state, question: currentQuestion });

  useEffect(() => {
    latest.current = { state, question: currentQuestion };
  }, [currentQuestion, state]);

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
      }
    });

    const publish = () => {
      const current = latest.current;
      seq.current += 1;
      link.send({
        type: "playState",
        seq: seq.current,
        snap: buildPlaySnapshot(current.state, current.question),
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
      snap: buildPlaySnapshot(state, currentQuestion),
    });
  }, [currentQuestion, live, state]);

  return null;
}
