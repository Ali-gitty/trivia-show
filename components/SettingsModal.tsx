"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { AudioLines, Settings2, Timer, Volume2, VolumeX, Palette, X } from "lucide-react";
import { arabicVoiceLabel, speakArabic, SPEECH_SAMPLE, speechSupported, stopSpeech, subscribeArabicVoices } from "@/lib/speech";
import { clampSpeechRate } from "@/lib/types";
import { useGame } from "./GameProvider";
import { ThemePicker } from "./ThemePicker";
import { Button, Dialog, Panel } from "./ui";

type Tab = "timers" | "theme" | "sound";

function useArabicVoice() {
  return useSyncExternalStore(subscribeArabicVoices, arabicVoiceLabel, () => "");
}

export function SettingsModal() {
  const { dispatch, state, toggleMute } = useGame();
  const [tab, setTab] = useState<Tab>("timers");
  const voice = useArabicVoice();
  const canSpeak = speechSupported();
  if (!state.settingsOpen) return null;

  const close = () => dispatch({ type: "TOGGLE_SETTINGS" });

  return (
    <Dialog titleId="settings-title" onClose={close}>
      <Panel className="grid max-h-[min(92dvh,40rem)] w-full max-w-xl grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b-[3px] border-ink p-4">
          <div className="flex items-center gap-2">
            <Settings2 size={18} />
            <h2 id="settings-title" className="text-xl font-black">إعدادات المقدم</h2>
          </div>
          <button type="button" aria-label="إغلاق" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b-[3px] border-ink p-3">
          <TabButton active={tab === "timers"} onClick={() => setTab("timers")} icon={<Timer size={14} />} label="المؤقتات" />
          <TabButton active={tab === "theme"} onClick={() => setTab("theme")} icon={<Palette size={14} />} label="الطابع" />
          <TabButton active={tab === "sound"} onClick={() => setTab("sound")} icon={<Volume2 size={14} />} label="الصوت" />
        </div>

        <div className="grid content-start gap-4 overflow-y-auto p-4">
          {tab === "timers" && (
            <>
              <p className="text-sm text-muted">
                إعداد المباراة الحالي: {state.settings.format} · {state.settings.categoryCount} فئات ·{" "}
                {state.settings.pointTiers.join(" / ")}. غيّر الإعداد من شاشة البداية؛ هنا تعدّل المؤقتات فقط للإعداد المخصص
                أو للأسئلة التالية.
              </p>
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
            </>
          )}

          {tab === "theme" && <ThemePicker embedded />}

          {tab === "sound" && (
            <>
              <p className="text-sm text-muted">كتم الجرس والمؤقت لا يوقف القراءة. القراءة تُسمع من هذا الجهاز فقط.</p>
              <Button onClick={toggleMute}>
                {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {state.muted ? "الصوت مغلق — اضغط للتشغيل" : "الصوت يعمل — اضغط للكتم"}
              </Button>
              <div className="grid gap-3 rounded-2xl border-[3px] border-ink bg-paper p-3">
                <p className="text-sm font-black">قراءة عربية للجميع</p>
                <p className="text-sm text-muted">
                  تقرأ السؤال، ثم الخيارات والإجابة عندما تظهر للجميع. معاينة المقدم لا تُقرأ.
                </p>
                <Button
                  disabled={!canSpeak}
                  onClick={() => {
                    const speech = !state.settings.speech;
                    dispatch({ type: "SET_SETTINGS", settings: { speech } });
                    if (speech) speakArabic(SPEECH_SAMPLE, state.settings.speechRate);
                    else stopSpeech();
                  }}
                >
                  <AudioLines size={16} />
                  {state.settings.speech ? "القراءة تعمل — اضغط للإيقاف" : "القراءة متوقفة — اضغط للتشغيل"}
                </Button>
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center justify-between gap-3">
                    سرعة القراءة
                    <span className="tabular-nums text-accent">{state.settings.speechRate.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min={0.7}
                    max={1.35}
                    step={0.05}
                    value={state.settings.speechRate}
                    disabled={!canSpeak}
                    onChange={(event) =>
                      dispatch({
                        type: "SET_SETTINGS",
                        settings: { speechRate: clampSpeechRate(Number(event.target.value)) },
                      })
                    }
                  />
                  <span className="flex justify-between text-xs font-bold text-muted">
                    <span>أبطأ وأوضح</span>
                    <span>أسرع</span>
                  </span>
                </label>
                <Button
                  variant="ghost"
                  disabled={!canSpeak}
                  onClick={() => speakArabic(SPEECH_SAMPLE, state.settings.speechRate)}
                >
                  جرّب هذه السرعة
                </Button>
                <p className="text-xs text-muted">
                  {voice
                    ? `الصوت: ${voice}`
                    : "إن لم تظهر قراءة عربية، فعّل صوتاً عربياً من إعدادات الآيباد: تسهيلات الاستخدام، ثم المحتوى المنطوق، ثم الأصوات."}
                </p>
              </div>
            </>
          )}
        </div>
      </Panel>
    </Dialog>
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
