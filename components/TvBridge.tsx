"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Copy, Monitor, Tv } from "lucide-react";
import { encode } from "uqr";
import { STORAGE } from "@/lib/bank";
import { createRoomCode, openScreenLink, screenUrl, type RelayStatus } from "@/lib/screenChannel";
import { buildSnapshot } from "@/lib/screenSnapshot";
import { useTheme } from "./ThemeProvider";
import { useGame } from "./GameProvider";
import { Button, Dialog, Panel } from "./ui";

type TvApi = {
  live: boolean;
  viewers: number;
  openLink: () => void;
};

const TvContext = createContext<TvApi | null>(null);

function subscribeScreen(onChange: () => void) {
  window.addEventListener("trivia-screen", onChange);
  return () => window.removeEventListener("trivia-screen", onChange);
}

function notifyScreen() {
  window.dispatchEvent(new Event("trivia-screen"));
}

function readArmedRoom() {
  const room = sessionStorage.getItem(STORAGE.screenRoom) ?? "";
  return sessionStorage.getItem(STORAGE.screenLive) === "1" ? room : "";
}

export function useTv() {
  const value = useContext(TvContext);
  if (!value) throw new Error("useTv must be used inside TvBridge");
  return value;
}

export function TvBridge({ children }: { children: ReactNode }) {
  const { currentQuestion, state } = useGame();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const room = useSyncExternalStore(subscribeScreen, readArmedRoom, () => "");
  const live = Boolean(room);
  const [viewers, setViewers] = useState(0);
  const [relay, setRelay] = useState<RelayStatus>("off");
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const linkRef = useRef<ReturnType<typeof openScreenLink> | null>(null);
  const seen = useRef(new Map<string, number>());
  const seq = useRef(0);
  const latest = useRef({ state, question: currentQuestion, palette: theme.palette });

  useEffect(() => {
    latest.current = { state, question: currentQuestion, palette: theme.palette };
  }, [currentQuestion, state, theme.palette]);

  useEffect(() => {
    if (!live || !room) return;
    const link = openScreenLink(room, setRelay);
    linkRef.current = link;
    const unsubscribe = link.subscribe((message) => {
      if (message.type === "watch") seen.current.set(message.id, message.at);
    });
    const publish = () => {
      const current = latest.current;
      seq.current += 1;
      link.send({
        type: "state",
        seq: seq.current,
        snap: buildSnapshot(current.state, current.question, current.palette),
      });
    };
    publish();
    const beat = window.setInterval(publish, 1500);
    const watch = window.setInterval(() => {
      const now = Date.now();
      let count = 0;
      for (const [id, at] of seen.current) {
        if (now - at > 7000) seen.current.delete(id);
        else count += 1;
      }
      setViewers(count);
    }, 1000);
    return () => {
      window.clearInterval(beat);
      window.clearInterval(watch);
      unsubscribe();
      link.close();
      linkRef.current = null;
      setRelay("off");
      setViewers(0);
    };
  }, [live, room]);

  useEffect(() => {
    const link = linkRef.current;
    if (!live || !link) return;
    seq.current += 1;
    link.send({
      type: "state",
      seq: seq.current,
      snap: buildSnapshot(state, currentQuestion, theme.palette),
    });
  }, [currentQuestion, live, state, theme.palette]);

  const url = room ? screenUrl(room) : "";

  const openLink = useCallback(() => {
    const next = room || createRoomCode();
    sessionStorage.setItem(STORAGE.screenRoom, next);
    sessionStorage.setItem(STORAGE.screenLive, "1");
    notifyScreen();
    setOpen(true);
    setBlocked(false);
  }, [room]);

  const stop = () => {
    sessionStorage.removeItem(STORAGE.screenLive);
    notifyScreen();
    setViewers(0);
  };

  const api = useMemo<TvApi>(
    () => ({
      live,
      viewers,
      openLink,
    }),
    [live, openLink, viewers],
  );

  return (
    <TvContext.Provider value={api}>
      {children}
      {open && (
        <Dialog titleId="tv-link-title" onClose={() => setOpen(false)}>
          <Panel className="grid max-h-[min(92dvh,46rem)] w-full max-w-xl gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kicker">عرض منفصل</p>
                <h2 id="tv-link-title" className="mt-2 text-2xl font-black">شاشة التلفاز</h2>
              </div>
              <Tv aria-hidden />
            </div>
            <p className="text-sm leading-7 text-muted">
              انقل نافذة الشاشة إلى التلفاز، وأبقِ هذه النافذة على الآيباد. معاينة الإجابة ومعيار التحكيم يظهران هنا فقط، ويصلان إلى التلفاز بعد الكشف للجميع.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {url && <QrMark value={url} />}
              <div className="grid gap-2">
                <p className="text-xs text-muted">رمز الشاشة</p>
                <p className="text-4xl font-black tracking-[0.2em]">{room}</p>
                <p className="chip px-3 py-1 text-sm">
                  {viewers > 0 ? "التلفاز متصل" : "بانتظار نافذة الشاشة"}
                  {relay === "live" ? " · الرابط الخارجي جاهز" : relay === "connecting" ? " · جارٍ وصل الرابط" : ""}
                </p>
              </div>
            </div>
            <input readOnly value={url} className="field px-3 py-2 text-left text-sm" aria-label="رابط الشاشة" dir="ltr" />
            {blocked && (
              <p className="note-danger px-3 py-2 text-sm">اسمح بالنوافذ المنبثقة في سفاري، ثم أعد فتح نافذة الشاشة.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const opened = window.open(url, "trivia-tv");
                  setBlocked(!opened);
                }}
              >
                <Monitor size={16} />
                فتح نافذة الشاشة
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(url).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                <Copy size={16} />
                {copied ? "تم النسخ" : "نسخ الرابط"}
              </Button>
              <Button variant="danger" onClick={stop}>
                إيقاف البث
              </Button>
            </div>
          </Panel>
        </Dialog>
      )}
    </TvContext.Provider>
  );
}

function QrMark({ value }: { value: string }) {
  const qr = encode(value, { ecc: "M", border: 2 });
  const cells = qr.data.flatMap((row, y) =>
    row.flatMap((on, x) => (on ? [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />] : [])),
  );
  return (
    <svg
      role="img"
      aria-label="رمز الاستجابة للشاشة"
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className="h-40 w-40 shrink-0 rounded-2xl bg-white p-2"
    >
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <g fill="#1a120b">{cells}</g>
    </svg>
  );
}
