import { Grid } from './grid';
import { generateTriple } from './generator';
import { Renderer, type DragState } from './renderer';
import type { Piece } from './types';

const BEST_KEY = 'glyph-grid:best';

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
  canvas: HTMLCanvasElement;

  private scoreEl: HTMLElement;
  private bestEl: HTMLElement;
  private comboEl: HTMLElement;
  private overlayEl: HTMLElement;
  private finalScoreEl: HTMLElement;

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

    this.best = Number(localStorage.getItem(BEST_KEY) ?? 0);
    this.refreshTray();
    this.bindInput();
    this.bindResize();
    this.bindRestart();
    this.renderer.resize();
    this.updateHud();
    this.loop(performance.now());
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

    const result = this.grid.detectClears();
    const totalLines = result.rows.length + result.cols.length + result.squares.length;

    if (totalLines > 0) {
      const base = result.cellsCleared * 10;
      const bonus = totalLines > 1 ? base * (totalLines - 1) * 0.5 : 0;
      const gained = Math.floor((base + bonus) * this.combo);
      this.score += gained;
      const cells = [
        ...result.rows.flatMap((ry) => Array.from({ length: 9 }, (_, x) => ({ x, y: ry }))),
        ...result.cols.flatMap((cx) => Array.from({ length: 9 }, (_, y) => ({ x: cx, y }))),
        ...result.squares.flatMap((s) => {
          const out: { x: number; y: number }[] = [];
          for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) out.push({ x: s.x + dx, y: s.y + dy });
          return out;
        }),
      ];
      this.renderer.flash = { cells, startedAt: performance.now() };
      this.combo = Math.min(5, this.combo + 1);
      this.comboTimer = 8000;
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

    this.updateHud();
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
    }
  }

  private restart(): void {
    this.grid.reset();
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameOver = false;
    this.drag = null;
    this.refreshTray();
    this.overlayEl.classList.add('hidden');
    this.updateHud();
  }

  private updateHud(): void {
    this.scoreEl.textContent = String(this.score);
    this.bestEl.textContent = String(this.best);
    this.comboEl.textContent = `x${this.combo}`;
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
