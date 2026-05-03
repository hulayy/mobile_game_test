type Wave = OscillatorType;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicStarted = false;
  private musicStep = 0;
  private musicEnabled = true;
  private sfxEnabled = true;

  init(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);
  }

  resume(): void {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(on ? 0.18 : 0, this.ctx.currentTime + 0.2);
    }
    if (on) this.startMusic();
  }

  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on;
  }

  isMusicEnabled(): boolean { return this.musicEnabled; }
  isSfxEnabled(): boolean { return this.sfxEnabled; }

  private tone(
    freq: number,
    duration: number,
    wave: Wave = 'sine',
    gain = 0.3,
    when = 0,
    bend?: number,
  ): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (bend !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, bend), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private noise(duration: number, gain = 0.15, when = 0, hp = 800): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  pickup(): void {
    this.resume();
    this.tone(520, 0.08, 'triangle', 0.25, 0, 700);
  }

  place(style: 'pop' | 'wood' | 'stone' | 'splash' | 'crunch' = 'pop'): void {
    this.resume();
    switch (style) {
      case 'pop':
        // chunky pop with bass thud
        this.tone(110, 0.20, 'sine', 0.55, 0, 42);
        this.tone(380, 0.05, 'square', 0.18, 0, 200);
        this.tone(660, 0.07, 'triangle', 0.16, 0.01, 440);
        this.noise(0.06, 0.10, 0, 1200);
        break;
      case 'wood':
        // wooden knock
        this.tone(85, 0.22, 'sine', 0.55, 0, 38);
        this.tone(220, 0.10, 'triangle', 0.30, 0, 120);
        this.tone(540, 0.04, 'square', 0.16, 0, 320);
        this.noise(0.08, 0.16, 0, 600);
        break;
      case 'stone':
        // heavy stone clack with deep rumble
        this.tone(70, 0.30, 'sine', 0.65, 0, 30);
        this.tone(180, 0.08, 'square', 0.28, 0, 90);
        this.tone(420, 0.03, 'square', 0.18, 0, 260);
        this.noise(0.12, 0.22, 0, 250);
        break;
      case 'splash':
        // wet splash
        this.tone(160, 0.18, 'sine', 0.45, 0, 60);
        this.tone(800, 0.10, 'sine', 0.10, 0, 1800);
        this.noise(0.18, 0.20, 0, 2400);
        break;
      case 'crunch':
        // ice crunch
        this.tone(95, 0.22, 'sine', 0.50, 0, 38);
        this.tone(2400, 0.05, 'square', 0.10, 0, 3600);
        this.noise(0.16, 0.28, 0, 3200);
        break;
    }
  }

  invalid(): void {
    this.resume();
    this.tone(180, 0.18, 'sawtooth', 0.18, 0, 100);
  }

  clearLines(combo: number, lines: number): void {
    this.resume();
    const baseNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C E G C E
    const notes = baseNotes.slice(0, Math.min(5, 2 + lines));
    const startBend = Math.min(combo - 1, 4) * 0.5;
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i] * (1 + startBend * 0.05), 0.18, 'triangle', 0.22, i * 0.06);
      this.tone(notes[i] * 2 * (1 + startBend * 0.05), 0.12, 'sine', 0.12, i * 0.06);
    }
    this.noise(0.25, 0.08, 0, 1500);
  }

  combo(level: number): void {
    if (level <= 1) return;
    this.resume();
    const f = 660 + level * 120;
    this.tone(f, 0.15, 'triangle', 0.22, 0, f * 1.6);
    this.tone(f * 1.5, 0.12, 'sine', 0.14, 0.04);
  }

  levelUp(): void {
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], 0.22, 'triangle', 0.24, i * 0.07);
      this.tone(notes[i] * 2, 0.16, 'sine', 0.14, i * 0.07);
    }
    this.noise(0.4, 0.07, 0, 1800);
  }

  gameOver(): void {
    this.resume();
    const notes = [523.25, 392, 329.63, 261.63];
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], 0.32, 'triangle', 0.22, i * 0.16);
    }
  }

  startMusic(): void {
    if (!this.ctx || this.musicStarted || !this.musicEnabled) return;
    this.musicStarted = true;
    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    const stepMs = 280;
    const tick = () => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
      this.playMusicStep(this.musicStep);
      this.musicStep = (this.musicStep + 1) % 32;
      window.setTimeout(tick, stepMs);
    };
    tick();
  }

  private playMusicStep(step: number): void {
    if (!this.ctx || !this.musicGain) return;
    // I-V-vi-IV in C-major (C, G, Am, F) - 8 steps each
    const chordIdx = Math.floor(step / 8);
    const chords: number[][] = [
      [261.63, 329.63, 392.0],   // C
      [392.0, 493.88, 587.33],   // G
      [440.0, 523.25, 659.25],   // Am
      [349.23, 440.0, 523.25],   // F
    ];
    const root = chords[chordIdx];
    const beat = step % 8;
    const t0 = this.ctx.currentTime;

    // pad chord on beats 0 and 4
    if (beat === 0 || beat === 4) {
      for (const f of root) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
        osc.connect(g).connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + 1.3);
      }
    }

    // melody bouncy notes - candy-style cute pluck
    const melodyPattern: (number | null)[] = [0, null, 2, null, 1, 2, null, 1];
    const m = melodyPattern[beat];
    if (m !== null) {
      const f = root[m] * 2;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g).connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    }

    // soft kick on 0 and 4
    if (beat === 0 || beat === 4) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t0);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g).connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    }
  }
}
