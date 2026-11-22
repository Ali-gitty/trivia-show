import { STORAGE } from "./bank";
import {
  connectPacket,
  parsePackets,
  parsePublish,
  pingPacket,
  publishPacket,
  subscribePacket,
} from "./mqtt";
import { createRoomCode, type RelayStatus } from "./screenChannel";
import { isPlaySnapshot, type PlaySnapshot } from "./playSnapshot";

export type { RelayStatus };

export type PlayHostWire = { type: "playState"; seq: number; snap: PlaySnapshot };

export type PlayClientWire =
  | { type: "hello"; playerId: string; at: number }
  | { type: "ping"; playerId: string; at: number }
  | { type: "join"; playerId: string; name: string; teamId: string; at: number }
  | { type: "setLeader"; playerId: string; teamId: string; targetId: string; at: number }
  | { type: "buzz"; playerId: string; at: number }
  | {
      type: "submit";
      playerId: string;
      kind: "text" | "option" | "number";
      text: string;
      number: number | null;
      at: number;
    }
  | { type: "pickCategory"; playerId: string; category: string; at: number }
  | { type: "usePower"; playerId: string; kind: "time" | "choice" | "range" | "cut" | "skip"; at: number }
  | { type: "leave"; playerId: string; at: number };

export type PlayWire = PlayHostWire | PlayClientWire;

const BROKERS = ["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt"];

export function playUrl(room: string) {
  const path = window.location.pathname.replace(/\/(screen|play)\/.*$/, "/");
  const root = path.endsWith("/") ? path : `${path.slice(0, path.lastIndexOf("/") + 1)}`;
  return `${window.location.origin}${root}play/?room=${encodeURIComponent(room)}`;
}

export function playerId() {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(STORAGE.playPlayer);
  if (existing) return existing;
  const next = `p${createRoomCode()}`;
  sessionStorage.setItem(STORAGE.playPlayer, next);
  return next;
}

function isHostWire(value: unknown): value is PlayHostWire {
  if (!value || typeof value !== "object") return false;
  const wire = value as PlayHostWire;
  return wire.type === "playState" && typeof wire.seq === "number" && isPlaySnapshot(wire.snap);
}

function isClientWire(value: unknown): value is PlayClientWire {
  if (!value || typeof value !== "object") return false;
  const wire = value as PlayClientWire;
  if (typeof (wire as { playerId?: unknown }).playerId !== "string") return false;
  if (typeof (wire as { at?: unknown }).at !== "number") return false;
  if (wire.type === "hello" || wire.type === "ping" || wire.type === "leave" || wire.type === "buzz") {
    return true;
  }
  if (wire.type === "join") {
    return typeof wire.name === "string" && typeof wire.teamId === "string";
  }
  if (wire.type === "setLeader") {
    return typeof wire.teamId === "string" && typeof wire.targetId === "string";
  }
  if (wire.type === "submit") {
    return (
      (wire.kind === "text" || wire.kind === "option" || wire.kind === "number") &&
      typeof wire.text === "string" &&
      (wire.number == null || typeof wire.number === "number")
    );
  }
  if (wire.type === "pickCategory") {
    return typeof wire.category === "string" && wire.category.length > 0;
  }
  if (wire.type === "usePower") {
    return (
      wire.kind === "time" ||
      wire.kind === "choice" ||
      wire.kind === "range" ||
      wire.kind === "cut" ||
      wire.kind === "skip"
    );
  }
  return false;
}

function isWire(value: unknown): value is PlayWire {
  return isHostWire(value) || isClientWire(value);
}

export function openPlayLink(room: string, onRelay: (status: RelayStatus) => void) {
  const topic = `trivia-show/play/${room}`;
  const channel = new BroadcastChannel(`trivia-play:${room}`);
  const listeners = new Set<(message: PlayWire) => void>();
  let closed = false;
  let socket: WebSocket | null = null;
  let buffer = new Uint8Array();
  let ping: number | null = null;
  let retry: number | null = null;
  let brokerIndex = 0;

  const deliver = (message: PlayWire) => {
    listeners.forEach((listener) => listener(message));
  };

  channel.onmessage = (event) => {
    if (isWire(event.data)) deliver(event.data);
  };

  const clearPing = () => {
    if (ping != null) window.clearInterval(ping);
    ping = null;
  };

  const connect = () => {
    if (closed) return;
    onRelay("connecting");
    buffer = new Uint8Array();
    const ws = new WebSocket(BROKERS[brokerIndex % BROKERS.length], ["mqtt"]);
    ws.binaryType = "arraybuffer";
    socket = ws;
    ws.onopen = () => {
      ws.send(connectPacket(`pl${Math.random().toString(36).slice(2, 12)}`));
    };
    ws.onmessage = (event) => {
      const chunk = new Uint8Array(event.data as ArrayBuffer);
      const merged = new Uint8Array(buffer.length + chunk.length);
      merged.set(buffer);
      merged.set(chunk, buffer.length);
      const parsed = parsePackets(merged);
      buffer = parsed.rest;
      for (const item of parsed.packets) {
        if (item.type === 2) {
          if (item.body[1] !== 0) {
            ws.close();
            return;
          }
          ws.send(subscribePacket(topic));
          onRelay("live");
          clearPing();
          ping = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(pingPacket());
          }, 20000);
        } else if (item.type === 3) {
          try {
            const { payload } = parsePublish(item.body);
            const message = JSON.parse(payload) as unknown;
            if (isWire(message)) deliver(message);
          } catch {
            // Ignore broker noise.
          }
        }
      }
    };
    ws.onerror = () => undefined;
    ws.onclose = () => {
      clearPing();
      if (closed || socket !== ws) return;
      brokerIndex += 1;
      if (brokerIndex >= BROKERS.length) {
        onRelay("off");
        brokerIndex = 0;
        retry = window.setTimeout(connect, 12000);
        return;
      }
      connect();
    };
  };

  connect();

  return {
    send(message: PlayWire) {
      channel.postMessage(message);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(publishPacket(topic, JSON.stringify(message)));
      }
    },
    subscribe(listener: (message: PlayWire) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      clearPing();
      if (retry != null) window.clearTimeout(retry);
      channel.onmessage = null;
      channel.close();
      socket?.close();
      socket = null;
    },
  };
}

export { isClientWire, isHostWire };
