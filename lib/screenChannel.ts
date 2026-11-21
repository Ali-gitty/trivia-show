import { STORAGE } from "./bank";
import {
  connectPacket,
  parsePackets,
  parsePublish,
  pingPacket,
  publishPacket,
  subscribePacket,
} from "./mqtt";
import { isSnapshot, type ScreenSnapshot } from "./screenSnapshot";

export type RelayStatus = "connecting" | "live" | "off";

export type ScreenWire =
  | { type: "state"; seq: number; snap: ScreenSnapshot }
  | { type: "watch"; id: string; at: number };

const BROKERS = ["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt"];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function screenUrl(room: string) {
  const path = window.location.pathname.replace(/\/screen\/.*$/, "/");
  const root = path.endsWith("/") ? path : `${path.slice(0, path.lastIndexOf("/") + 1)}`;
  return `${window.location.origin}${root}screen/?room=${encodeURIComponent(room)}`;
}

export function readRoomParam() {
  const room = new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
  return /^[A-Z0-9]{4,8}$/.test(room) ? room : "";
}

export function viewerId() {
  const existing = sessionStorage.getItem(STORAGE.screenViewer);
  if (existing) return existing;
  const next = createRoomCode();
  sessionStorage.setItem(STORAGE.screenViewer, next);
  return next;
}

function isWire(value: unknown): value is ScreenWire {
  if (!value || typeof value !== "object") return false;
  const wire = value as ScreenWire;
  if (wire.type === "watch") return typeof wire.id === "string" && typeof wire.at === "number";
  return wire.type === "state" && typeof wire.seq === "number" && isSnapshot(wire.snap);
}

export function openScreenLink(room: string, onRelay: (status: RelayStatus) => void) {
  const topic = `trivia-show/screen/${room}`;
  const channel = new BroadcastChannel(`trivia-screen:${room}`);
  const listeners = new Set<(message: ScreenWire) => void>();
  let closed = false;
  let socket: WebSocket | null = null;
  let buffer = new Uint8Array();
  let ping: number | null = null;
  let retry: number | null = null;
  let brokerIndex = 0;

  const deliver = (message: ScreenWire) => {
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
      ws.send(connectPacket(`tv${Math.random().toString(36).slice(2, 12)}`));
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
            // Public brokers can carry unrelated noise on a shared prefix. Ignore it.
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
    send(message: ScreenWire) {
      channel.postMessage(message);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(publishPacket(topic, JSON.stringify(message)));
      }
    },
    subscribe(listener: (message: ScreenWire) => void) {
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
