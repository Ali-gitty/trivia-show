import type { SoundName } from "./types";

export class SoundEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private context() {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private beep(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
    slideTo?: number,
  ) {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  play(name: SoundName) {
    if (this.muted) return;
    switch (name) {
      case "tile":
        this.beep(740, 0.08, "sine", 0.08);
        break;
      case "tick":
        this.beep(1200, 0.045, "square", 0.035);
        break;
      case "timeup":
        this.beep(420, 0.45, "sawtooth", 0.07, 0, 90);
        break;
      case "buzz":
        this.beep(220, 0.18, "square", 0.08);
        this.beep(180, 0.22, "square", 0.06, 0.08);
        break;
      case "steal":
        this.beep(740, 0.12, "sawtooth", 0.07);
        this.beep(988, 0.12, "sawtooth", 0.07, 0.12);
        this.beep(740, 0.16, "sawtooth", 0.07, 0.24);
        break;
      case "power":
        this.beep(523, 0.1, "triangle", 0.07);
        this.beep(659, 0.1, "triangle", 0.07, 0.09);
        this.beep(784, 0.16, "triangle", 0.07, 0.18);
        break;
      case "correct":
        this.beep(523, 0.14, "sine", 0.08);
        this.beep(659, 0.14, "sine", 0.08, 0.12);
        this.beep(784, 0.28, "sine", 0.08, 0.24);
        break;
      case "wrong":
        this.beep(150, 0.3, "sawtooth", 0.07, 0, 70);
        break;
      default:
        break;
    }
  }
}
