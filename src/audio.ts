import type { Run } from "./physics";

/** Synthesized effects avoid downloads and start only after a user gesture. */
export class SkiAudio {
  muted = false;
  private ctx?: AudioContext;
  private master?: GainNode;
  private snow?: GainNode;
  private filter?: BiquadFilterNode;
  unlock() {
    try {
      if (!this.ctx) {
        const Audio =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!Audio) return;
        this.ctx = new Audio();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.65;
        this.master.connect(this.ctx.destination);
        const buffer = this.ctx.createBuffer(
          1,
          this.ctx.sampleRate * 2,
          this.ctx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + Math.random() * 0.1 - 0.05) / 1.02;
          data[i] = last * 3.5;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 900;
        this.snow = this.ctx.createGain();
        this.snow.gain.value = 0;
        noise.connect(this.filter);
        this.filter.connect(this.snow);
        this.snow.connect(this.master);
        noise.start();
      }
      void this.ctx.resume().catch(() => {});
    } catch {
      /* Audio is optional; a rejected device never prevents skiing. */
    }
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.65,
        this.ctx.currentTime,
        0.04,
      );
  }
  update(s: Run, playing: boolean) {
    if (!this.ctx || !this.snow || !this.filter) return;
    this.snow.gain.setTargetAtTime(
      playing ? 0.04 + s.speed * 0.004 + Math.abs(s.heading) * 0.18 : 0,
      this.ctx.currentTime,
      0.15,
    );
    this.filter.frequency.setTargetAtTime(
      650 + s.speed * 25 + Math.abs(s.heading) * 2600,
      this.ctx.currentTime,
      0.15,
    );
  }
  play(event: string, combo = 1) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const note = (
      frequency: number,
      offset: number,
      duration: number,
      volume = 0.12,
      type: OscillatorType = "sine",
    ) => {
      const osc = this.ctx!.createOscillator(),
        gain = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(volume, now + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(now + offset);
      osc.stop(now + offset + duration + 0.03);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    };
    if (event === "gate") {
      note(660 + combo * 70, 0, 0.16);
      note(990 + combo * 70, 0.07, 0.25, 0.08);
    }
    if (event === "lamp") {
      note(1047, 0, 0.28, 0.09);
      note(1319, 0.06, 0.3, 0.07);
      note(1568, 0.13, 0.4, 0.055);
    }
    if (event === "miss") note(220, 0, 0.15, 0.05, "triangle");
    if (event === "crash") {
      note(95, 0, 0.25, 0.17, "triangle");
      note(62, 0.08, 0.3, 0.1, "triangle");
    }
    if (event === "start") {
      note(523, 0, 0.18, 0.1);
      note(784, 0.12, 0.25, 0.1);
    }
    if (event === "finish")
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.14, 0.65, 0.1));
  }
}
