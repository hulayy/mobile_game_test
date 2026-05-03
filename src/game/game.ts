import { Grid } from './grid';
import { generateTriple } from './generator';
import { Renderer, type DragState } from './renderer';
import { AudioEngine } from './audio';
import { THEMES } from './themes';
import type { Piece, RuneColor } from './types';

const BEST_KEY = 'glyph-grid:best';
const MUSIC_KEY = 'sugar-drop:music';
const SFX_KEY = 'sugar-drop:sfx';
const LINES_PER_LEVEL = 4;

export class Game {
  grid = new Grid();
  tray: (Piece | null)[] = [null, null, null];
  score = 0;
  best = 0;
  combo = 1;
  comboTimer = 0;
  gameOver = false;
  drag: DragState | null = null;
  renderer: Renderer;
  audio = new AudioEngine();
  canvas: HTMLCanvasElement;
  level = 0;
  linesCleared = 0;

  private scoreEl: HTMLElement;
  private bestEl: HTMLElement;
  private comboEl: HTMLElement;
  private overlayEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private musicBtn: HTMLElement | null;
  private sfxBtn: HTMLElement | null;
  private levelEmojiEl: HTMLElement | null;
  private levelNameEl: HTMLElement | null;
  private levelNumEl: HTMLElement | null;
  private levelStripEl: HTMLElement | null;

  private lastFrame = 0;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.scoreEl = document.getElementById('score')!;
    this.bestEl = document.getElementById('best')!;
    this.comboEl = document.getElementById('combo')!;
    this.overlayEl = document.getElementById('overlay')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.musicBtn = document.getElementById('toggle-music');
    this.sfxBtn = document.getElementById('toggle-sfx');
    this.levelEmojiEl = document.getElementById('level-emoji');
    this.levelNameEl = document.getElementById('level-name');
    this.levelNumEl = document.getElementById('level-num');
    this.levelStripEl = document.getElementById('level-strip');

    this.best = Number(localStorage.getItem(BEST_KEY) ?? 0);
    this.audio.setMusicEnabled(localStorage.getItem(MUSIC_KEY) !== '0');
    this.audio.setSfxEnabled(localStorage.getItem(SFX_KEY) !== '0');
    this.renderer.setTheme(THEMES[0]);
    this.refreshTray();
    this.bindInput();
    this.bindResize();
    this.bindRestart();
    this.bindAudioControls();
    this.bindFirstInteraction();
    this.renderer.resize();
    this.updateHud();
    this.updateAudioButtons();
    this.updateLevelStrip(false);
    this.loop(performance.now());
  }

  private bindFirstInteraction(): void {
    const onFirst = () => {
      this.audio.resume();
      if (this.audio.isMusicEnabled()) this.audio.startMusic();
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
      window.removeEventListener('touchstart', onFirst);
    };
    window.addEventListener('pointerdown', onFirst, { once: false });
    window.addEventListener('keydown', onFirst, { once: false });
    window.addEventListener('touchstart', onFirst, { once: false });
  }

  private bindAudioControls(): void {
    this.musicBtn?.addEventListener('click', () => {
      const next = !this.audio.isMusicEnabled();
      this.audio.setMusicEnabled(next);
      localStorage.setItem(MUSIC_KEY, next ? '1' : '0');
      this.updateAudioButtons();
    });
    this.sfxBtn?.addEventListener('click', () => {
      const next = !this.audio.isSfxEnabled();
      this.audio.setSfxEnabled(next);
      localStorage.setItem(SFX_KEY, next ? '1' : '0');
      this.updateAudioButtons();
    });
  }

  private updateAudioButtons(): void {
    if (this.musicBtn) {
      this.musicBtn.classList.toggle('off', !this.audio.isMusicEnabled());
    }
    if (this.sfxBtn) {
      this.sfxBtn.classList.toggle('off', !this.audio.isSfxEnabled());
    }
  }

  private bindResize(): void {
    const onResize = () => this.renderer.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  private bindRestart(): void {
    const btn = document.getElementById('restart');
    btn?.addEventListener('click', () => this.restart());
  }

  private bindInput(): void {
    const c = this.canvas;
    const getPos = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    c.addEventListener('pointerdown', (e) => {
      if (this.gameOver) return;
      const { x, y } = getPos(e);
      const slot = this.renderer.hitTestTray(x, y, this.tray);
      if (slot < 0) return;
      const piece = this.tray[slot];
      if (!piece) return;
      c.setPointerCapture(e.pointerId);
      this.drag = { piece, pointerX: x, pointerY: y, origin: { x: slot, y: 0 } };
      this.audio.pickup();
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const { x, y } = getPos(e);
      this.drag.pointerX = x;
      this.drag.pointerY = y;
    });

    const release = (e: PointerEvent) => {
      if (!this.drag) return;
      try { c.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      const drag = this.drag;
      const snap = this.renderer.snapTarget(drag);
      if (snap && this.grid.canPlace(drag.piece.shape, snap.x, snap.y)) {
        this.commitPlacement(drag.origin.x, snap.x, snap.y);
      } else {
        this.audio.invalid();
      }
      this.drag = null;
    };

    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }

  private commitPlacement(slot: number, x: number, y: number): void {
    const piece = this.tray[slot];
    if (!piece) return;
    const placed = this.grid.place(piece, x, y);
    this.tray[slot] = null;
    this.score += placed.length;
    this.audio.place(THEMES[this.level].placeSound);
    this.renderer.spawnPlacedPulse(placed);
    this.renderer.spawnDustPuff(placed);

    // capture colors before clearing
    const beforeCells: (RuneColor | null)[][] = this.grid.cells.map((row) => row.slice());
    const result = this.grid.detectClears();
    const totalLines = result.rows.length + result.cols.length + result.squares.length;

    if (totalLines > 0) {
      const base = result.cellsCleared * 10;
      const bonus = totalLines > 1 ? base * (totalLines - 1) * 0.5 : 0;
      const gained = Math.floor((base + bonus) * this.combo);
      this.score += gained;

      const cellSet = new Set<number>();
      const cellsWithColor: { x: number; y: number; color: RuneColor }[] = [];
      const add = (cx: number, cy: number) => {
        const key = cy * 9 + cx;
        if (cellSet.has(key)) return;
        cellSet.add(key);
        const col = beforeCells[cy][cx] ?? 'plasma';
        cellsWithColor.push({ x: cx, y: cy, color: col });
      };
      for (const ry of result.rows) for (let cx = 0; cx < 9; cx++) add(cx, ry);
      for (const cx of result.cols) for (let cy = 0; cy < 9; cy++) add(cx, cy);
      for (const s of result.squares) {
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) add(s.x + dx, s.y + dy);
      }

      this.renderer.flash = { cells: cellsWithColor, startedAt: performance.now() };
      this.renderer.spawnClearBurst(cellsWithColor);

      this.combo = Math.min(5, this.combo + 1);
      this.comboTimer = 8000;

      this.audio.clearLines(this.combo, totalLines);
      if (this.combo > 1) this.audio.combo(this.combo);

      this.linesCleared += totalLines;
      const newLevel = Math.floor(this.linesCleared / LINES_PER_LEVEL) % THEMES.length;
      if (newLevel !== this.level) {
        this.level = newLevel;
        const theme = THEMES[this.level];
        this.renderer.setTheme(theme);
        this.renderer.spawnLevelBanner(theme);
        this.audio.levelUp();
        this.updateLevelStrip(true);
      }

      // float text "+score"
      const cx = cellsWithColor.reduce((a, c) => a + c.x, 0) / cellsWithColor.length;
      const cy = cellsWithColor.reduce((a, c) => a + c.y, 0) / cellsWithColor.length;
      this.renderer.spawnFloatText(cx + 0.5, cy + 0.5, `+${gained}`, '#fff5fb');
      if (this.combo > 1) {
        this.renderer.spawnFloatText(cx + 0.5, cy - 0.2, `COMBO x${this.combo}!`, '#ffd24a');
      }
    } else {
      this.comboTimer -= 800;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (this.tray.every((p) => p === null)) {
      this.refreshTray();
    }

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }

    this.updateHud(true);
    this.checkGameOver();
  }

  private refreshTray(): void {
    const triple = generateTriple(this.grid);
    this.tray = [triple[0], triple[1], triple[2]];
  }

  private checkGameOver(): void {
    const remaining = this.tray.filter((p): p is Piece => p !== null);
    if (remaining.length === 0) return;
    const anyFits = remaining.some((p) => this.grid.hasAnyValidPlacement(p.shape));
    if (!anyFits) {
      this.gameOver = true;
      this.finalScoreEl.textContent = String(this.score);
      this.overlayEl.classList.remove('hidden');
      this.audio.gameOver();
    }
  }

  private restart(): void {
    this.grid.reset();
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameOver = false;
    this.drag = null;
    this.level = 0;
    this.linesCleared = 0;
    this.renderer.setTheme(THEMES[0]);
    this.refreshTray();
    this.overlayEl.classList.add('hidden');
    this.updateHud();
    this.updateLevelStrip(false);
  }

  private updateLevelStrip(bump: boolean): void {
    const theme = THEMES[this.level];
    if (this.levelEmojiEl) this.levelEmojiEl.textContent = theme.emoji;
    if (this.levelNameEl) this.levelNameEl.textContent = theme.name;
    if (this.levelNumEl) this.levelNumEl.textContent = String(this.level + 1);
    if (bump && this.levelStripEl) {
      this.levelStripEl.classList.remove('bump');
      void this.levelStripEl.offsetWidth;
      this.levelStripEl.classList.add('bump');
      window.setTimeout(() => this.levelStripEl?.classList.remove('bump'), 600);
    }
  }

  private updateHud(bump = false): void {
    this.scoreEl.textContent = String(this.score);
    this.bestEl.textContent = String(this.best);
    this.comboEl.textContent = `x${this.combo}`;
    if (bump) {
      this.scoreEl.classList.remove('bump');
      // force reflow to restart animation
      void this.scoreEl.offsetWidth;
      this.scoreEl.classList.add('bump');
      window.setTimeout(() => this.scoreEl.classList.remove('bump'), 220);
    }
  }

  private loop = (t: number) => {
    const dt = this.lastFrame ? t - this.lastFrame : 0;
    this.lastFrame = t;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateHud();
      }
    }
    this.renderer.drawFrame(this.grid, this.tray, this.drag, t);
    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
