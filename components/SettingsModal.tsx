"use client";

import { useState, type ReactNode } from "react";
import { Settings2, Timer, Volume2, VolumeX, Palette, X } from "lucide-react";
import { DEFAULT_HOST_SETTINGS } from "@/lib/types";
import { useGame } from "./GameProvider";
import { ThemePicker } from "./ThemePicker";
import { Button, Panel } from "./ui";

type Tab = "timers" | "theme" | "sound";

export function SettingsModal() {
  const { dispatch, state, toggleMute } = useGame();
  const [tab, setTab] = useState<Tab>("timers");
  if (!state.settingsOpen) return null;

  return (
    <div className="scrim fixed inset-0 z-50 grid place-items-center p-3">
      <Panel className="grid w-full max-w-xl overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b-[3px] border-ink p-4">
          <div className="flex items-center gap-2">
            <Settings2 size={18} />
            <h2 className="text-xl font-black">إعدادات المقدم</h2>
          </div>
          <button type="button" aria-label="إغلاق" onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}>
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b-[3px] border-ink p-3">
          <TabButton active={tab === "timers"} onClick={() => setTab("timers")} icon={<Timer size={14} />} label="المؤقتات" />
          <TabButton active={tab === "theme"} onClick={() => setTab("theme")} icon={<Palette size={14} />} label="الطابع" />
          <TabButton active={tab === "sound"} onClick={() => setTab("sound")} icon={<Volume2 size={14} />} label="الصوت" />
        </div>

        <div className="grid gap-4 p-4">
          {tab === "timers" && (
            <>
              <p className="text-sm text-muted">تُطبَّق القيم على الأسئلة التالية في الوضع الكلاسيكي.</p>
              <label className="grid gap-2 text-sm font-bold">
                الوقت الأساسي (ثانية)
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={state.settings.primarySeconds}
                  onChange={(event) =>
                    dispatch({ type: "SET_SETTINGS", settings: { primarySeconds: Number(event.target.value) } })
                  }
                  className="field px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                فرصة الفريق الآخر (ثانية)
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={state.settings.stealSeconds}
                  onChange={(event) =>
                    dispatch({ type: "SET_SETTINGS", settings: { stealSeconds: Number(event.target.value) } })
                  }
                  className="field px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    dispatch({
                      type: "SET_SETTINGS",
                      settings: { primarySeconds: 45, stealSeconds: 10 },
                    })
                  }
                >
                  سريع 45 / 10
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => dispatch({ type: "SET_SETTINGS", settings: { ...DEFAULT_HOST_SETTINGS } })}
                >
                  افتراضي 60 / 15
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    dispatch({
                      type: "SET_SETTINGS",
                      settings: { primarySeconds: 90, stealSeconds: 20 },
                    })
                  }
                >
                  مريح 90 / 20
                </Button>
              </div>
            </>
          )}

          {tab === "theme" && <ThemePicker embedded />}

          {tab === "sound" && (
            <>
              <p className="text-sm text-muted">يؤثر على أصوات الجرس، المؤقت، والإجابات.</p>
              <Button onClick={toggleMute}>
                {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {state.muted ? "الصوت مغلق — اضغط للتشغيل" : "الصوت يعمل — اضغط للكتم"}
              </Button>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`board-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${
        active ? "board-btn-accent" : "board-btn-ghost"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
