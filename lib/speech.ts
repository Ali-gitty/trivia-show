export const SPEECH_SAMPLE = "مرحباً، هذه قراءة فعاليات البيت. يمكن تغيير السرعة من الإعدادات.";

export type SpeechPiece = {
  question: string;
  hint: string;
  options: string[];
  answer: string;
  hintVisible: boolean;
  optionsVisible: boolean;
  answerRevealed: boolean;
};

export function publicAnnouncement(input: SpeechPiece) {
  if (input.answerRevealed && input.answer.trim()) {
    return { key: "answer", text: `الإجابة. ${input.answer.trim()}` };
  }
  if (input.optionsVisible && input.options.length) {
    const list = input.options.map((option, index) => `${index + 1}. ${option}`).join("، ");
    return { key: "options", text: `الخيارات. ${list}` };
  }
  if (input.hintVisible && input.hint.trim()) {
    return { key: "hint", text: `تلميح. ${input.hint.trim()}` };
  }
  return { key: "question", text: input.question.trim() };
}

export function visibleReading(input: SpeechPiece) {
  const parts = [input.question.trim()];
  if (input.hintVisible && input.hint.trim()) parts.push(`تلميح. ${input.hint.trim()}`);
  if (input.optionsVisible && input.options.length) {
    parts.push(`الخيارات. ${input.options.map((option, index) => `${index + 1}. ${option}`).join("، ")}`);
  }
  if (input.answerRevealed && input.answer.trim()) parts.push(`الإجابة. ${input.answer.trim()}`);
  return parts.filter(Boolean).join(" ");
}

function arabicVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("ar"));
}

export function preferredArabicVoice() {
  const voices = arabicVoices();
  return (
    voices.find((voice) => /majed|maged|ماجد/i.test(voice.name)) ||
    voices.find((voice) => voice.lang.toLowerCase() === "ar-sa") ||
    voices[0] ||
    null
  );
}

let voiceLabel = "";

export function subscribeArabicVoices(onChange: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", onChange);
  return () => synth.removeEventListener("voiceschanged", onChange);
}

export function arabicVoiceLabel() {
  if (typeof window === "undefined" || !window.speechSynthesis) return voiceLabel;
  const next = preferredArabicVoice()?.name ?? "";
  if (next !== voiceLabel) voiceLabel = next;
  return voiceLabel;
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let speechTicket = 0;

export function stopSpeech() {
  speechTicket += 1;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakArabic(text: string, rate: number) {
  if (!speechSupported()) return false;
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return false;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(line);
  const voice = preferredArabicVoice();
  utterance.lang = voice?.lang || "ar-SA";
  utterance.rate = rate;
  utterance.pitch = 1;
  if (voice) utterance.voice = voice;
  const ticket = ++speechTicket;
  const say = () => {
    if (ticket !== speechTicket) return;
    synth.resume();
    synth.speak(utterance);
  };
  if (synth.speaking || synth.pending) {
    synth.cancel();
    window.setTimeout(say, 60);
  } else {
    say();
  }
  return true;
}
