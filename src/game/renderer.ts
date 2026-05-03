import { GRID_SIZE, Grid } from './grid';
import { CANDY_PALETTES } from './types';
import type { Cell, Piece, RuneColor } from './types';
import { THEMES, type Theme, type AmbientKind } from './themes';

export interface Layout {
  cellSize: number;
  gridX: number;
  gridY: number;
  gridPx: number;
  trayY: number;
  trayCellSize: number;
  traySlotWidth: number;
}

export interface DragState {
  piece: Piece;
  pointerX: number;
  pointerY: number;
  origin: { x: number; y: number };
}

export interface ClearFlash {
  cells: { x: number; y: number; color: RuneColor }[];
  startedAt: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rot: number;
  vrot: number;
  shape: 'rect' | 'puff';
  gravity: number;
}

interface PlacedPulse {
  cells: { x: number; y: number }[];
  startedAt: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  startedAt: number;
}

interface AmbientParticle {
  kind: AmbientKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  phase: number;
  baseX: number;
  alpha: number;
}

interface LevelBanner {
  theme: Theme;
  startedAt: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  layout: Layout = {
    cellSize: 0,
    gridX: 0,
    gridY: 0,
    gridPx: 0,
    trayY: 0,
    trayCellSize: 0,
    traySlotWidth: 0,
  };

  theme: Theme = THEMES[0];
  flash: ClearFlash | null = null;
  particles: Particle[] = [];
  pulses: PlacedPulse[] = [];
  floats: FloatText[] = [];
  levelBanner: LevelBanner | null = null;

  private ambient: AmbientParticle[] = [];
  private ambientSeeded = false;
  private bgGradientCache: { w: number; h: number; grad: CanvasGradient } | null = null;
  private lastFrameT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.ambient = [];
    this.ambientSeeded = false;
    this.bgGradientCache = null;
  }

  resize(): void {
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const padding = 16;
    const trayHeightFraction = 0.22;
    const trayH = cssHeight * trayHeightFraction;
    const availW = cssWidth - padding * 2;
    const availH = cssHeight - padding * 2 - trayH;
    const cellSize = Math.floor(Math.min(availW, availH) / GRID_SIZE);
    const gridPx = cellSize * GRID_SIZE;
    const gridX = Math.floor((cssWidth - gridPx) / 2);
    const gridY = padding + 4;
    const trayY = gridY + gridPx + 24;
    const trayCellSize = Math.max(14, Math.floor(cellSize * 0.6));
    const traySlotWidth = Math.floor(cssWidth / 3);

    this.layout = { cellSize, gridX, gridY, gridPx, trayY, trayCellSize, traySlotWidth };
    this.bgGradientCache = null;
  }

  drawFrame(grid: Grid, tray: (Piece | null)[], drag: DragState | null, now: number): void {
    const ctx = this.ctx;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    const dt = this.lastFrameT ? Math.min(50, now - this.lastFrameT) : 16.6;
    this.lastFrameT = now;

    ctx.clearRect(0, 0, cssW, cssH);

    this.drawBackground(cssW, cssH, now, dt);
    this.drawGrid(grid, drag, now);
    this.drawTray(tray, drag, now);
    if (drag) this.drawDraggingPiece(drag, grid);
    if (this.flash) this.drawFlash(now);
    this.updateAndDrawParticles();
    this.updateAndDrawFloats(now);
    this.drawLevelBanner(now);
  }

  private drawBackground(w: number, h: number, now: number, dt: number): void {
    const ctx = this.ctx;
    if (!this.bgGradientCache || this.bgGradientCache.w !== w || this.bgGradientCache.h !== h) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      for (const [offset, color] of this.theme.bgStops) grad.addColorStop(offset, color);
      this.bgGradientCache = { w, h, grad };
    }
    ctx.fillStyle = this.bgGradientCache.grad;
    ctx.fillRect(0, 0, w, h);

    if (!this.ambientSeeded) {
      for (let i = 0; i < this.theme.ambientCount; i++) {
        this.ambient.push(this.createAmbient(w, h, true));
      }
      this.ambientSeeded = true;
    }

    this.updateAndDrawAmbient(w, h, dt);
    void now;
  }

  private createAmbient(w: number, h: number, randomY: boolean): AmbientParticle {
    const k = this.theme.ambient;
    const cs = this.theme.ambientColors;
    const color = cs[Math.floor(Math.random() * cs.length)];
    const x = Math.random() * w;
    switch (k) {
      case 'sparkle':
        return {
          kind: k, x, y: Math.random() * h, vx: 0, vy: 0,
          size: 1.5 + Math.random() * 2.5, color, rot: 0, vrot: 0,
          phase: Math.random() * Math.PI * 2, baseX: x,
          alpha: 0.25 + Math.random() * 0.5,
        };
      case 'leaves':
        return {
          kind: k, x, y: randomY ? Math.random() * h : -20,
          vx: (Math.random() - 0.5) * 25, vy: 30 + Math.random() * 35,
          size: 5 + Math.random() * 7, color,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 2.4,
          phase: Math.random() * Math.PI * 2, baseX: x,
          alpha: 0.7 + Math.random() * 0.3,
        };
      case 'embers':
        return {
          kind: k, x, y: randomY ? Math.random() * h : h + 20,
          vx: (Math.random() - 0.5) * 14, vy: -45 - Math.random() * 55,
          size: 1.6 + Math.random() * 2.4, color, rot: 0, vrot: 0,
          phase: Math.random() * Math.PI * 2, baseX: x,
          alpha: 0.6 + Math.random() * 0.4,
        };
      case 'bubbles':
        return {
          kind: k, x, y: randomY ? Math.random() * h : h + 20,
          vx: 0, vy: -25 - Math.random() * 35,
          size: 4 + Math.random() * 10, color, rot: 0, vrot: 0,
          phase: Math.random() * Math.PI * 2, baseX: x,
          alpha: 0.45 + Math.random() * 0.35,
        };
      case 'snow':
        return {
          kind: k, x, y: randomY ? Math.random() * h : -20,
          vx: (Math.random() - 0.5) * 18, vy: 28 + Math.random() * 35,
          size: 1.6 + Math.random() * 2.6, color, rot: 0, vrot: 0,
          phase: Math.random() * Math.PI * 2, baseX: x,
          alpha: 0.7 + Math.random() * 0.3,
        };
    }
  }

  private updateAndDrawAmbient(w: number, h: number, dt: number): void {
    const sec = dt / 1000;
    for (let i = 0; i < this.ambient.length; i++) {
      const p = this.ambient[i];
      p.phase += sec;
      let dead = false;
      switch (p.kind) {
        case 'sparkle':
          p.x += Math.sin(p.phase * 0.4) * 0.4;
          p.y += Math.cos(p.phase * 0.35) * 0.25;
          break;
        case 'leaves':
          p.x += p.vx * sec + Math.sin(p.phase * 1.5) * 0.7;
          p.y += p.vy * sec;
          p.rot += p.vrot * sec;
          if (p.y > h + 30) dead = true;
          break;
        case 'embers':
          p.x += p.vx * sec + Math.sin(p.phase * 3) * 0.45;
          p.y += p.vy * sec;
          p.alpha = 0.55 + 0.45 * Math.sin(p.phase * 6);
          if (p.y < -30) dead = true;
          break;
        case 'bubbles':
          p.x = p.baseX + Math.sin(p.phase * 1.6) * 9;
          p.y += p.vy * sec;
          if (p.y < -30) dead = true;
          break;
        case 'snow':
          p.x += p.vx * sec + Math.sin(p.phase) * 0.5;
          p.y += p.vy * sec;
          if (p.y > h + 30) dead = true;
          break;
      }
      this.drawAmbient(p);
      if (dead) this.ambient[i] = this.createAmbient(w, h, false);
    }
  }

  private drawAmbient(p: AmbientParticle): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    switch (p.kind) {
      case 'sparkle':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'leaves':
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,10,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
        break;
      case 'embers': {
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff5b0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bubbles':
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'snow':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  private drawGrid(grid: Grid, drag: DragState | null, now: number): void {
    const ctx = this.ctx;
    const { cellSize, gridX, gridY, gridPx } = this.layout;
    const t = this.theme;

    const radius = Math.max(10, Math.floor(cellSize * 0.35));

    // outer panel with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    this.roundRect(gridX - 12, gridY - 12, gridPx + 24, gridPx + 24, radius);
    const panel = ctx.createLinearGradient(0, gridY - 12, 0, gridY + gridPx + 12);
    panel.addColorStop(0, t.panelOuter[0]);
    panel.addColorStop(1, t.panelOuter[1]);
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.restore();

    // inner board
    ctx.save();
    this.roundRect(gridX, gridY, gridPx, gridPx, radius * 0.7);
    const inner = ctx.createLinearGradient(0, gridY, 0, gridY + gridPx);
    inner.addColorStop(0, t.panelInner[0]);
    inner.addColorStop(1, t.panelInner[1]);
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.restore();

    // cells: checker wash + recessed wells for empty cells
    const wellInset = Math.max(1, Math.floor(cellSize * 0.06));
    const wellR = Math.max(3, Math.floor(cellSize * 0.18));
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cx = gridX + x * cellSize;
        const cy = gridY + y * cellSize;
        const checker = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0;
        ctx.fillStyle = checker ? t.cellLight : t.cellDark;
        ctx.fillRect(cx, cy, cellSize, cellSize);

        if (!grid.cells[y][x]) {
          // recessed well: top shadow + bottom highlight = inner bevel
          this.roundRect(
            cx + wellInset,
            cy + wellInset,
            cellSize - wellInset * 2,
            cellSize - wellInset * 2,
            wellR,
          );
          const wellGrad = ctx.createLinearGradient(0, cy + wellInset, 0, cy + cellSize - wellInset);
          wellGrad.addColorStop(0, t.wellBottom);
          wellGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
          wellGrad.addColorStop(1, t.wellTop);
          ctx.fillStyle = wellGrad;
          ctx.fill();
        }
      }
    }

    // minor grid lines (per cell, skip 3x3 boundaries)
    ctx.strokeStyle = t.gridMinor;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      if (i % 3 === 0) continue;
      const p = gridX + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, gridY + 4);
      ctx.lineTo(p, gridY + gridPx - 4);
      ctx.stroke();
      const q = gridY + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(gridX + 4, q);
      ctx.lineTo(gridX + gridPx - 4, q);
      ctx.stroke();
    }

    // 3x3 separator lines
    ctx.strokeStyle = t.gridMajor;
    ctx.lineWidth = 2;
    for (let i = 3; i < GRID_SIZE; i += 3) {
      const p = gridX + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, gridY + 4);
      ctx.lineTo(p, gridY + gridPx - 4);
      ctx.stroke();
      const q = gridY + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(gridX + 4, q);
      ctx.lineTo(gridX + gridPx - 4, q);
      ctx.stroke();
    }

    // placed candies with placed-pulse animation
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const c = grid.cells[y][x];
        if (!c) continue;
        let scale = 1;
        for (const p of this.pulses) {
          if (p.cells.some((pc) => pc.x === x && pc.y === y)) {
            const tt = (now - p.startedAt) / 280;
            if (tt >= 0 && tt <= 1) {
              const e = 1 - (1 - tt) * (1 - tt);
              scale = 0.55 + 0.5 * e;
              if (tt > 0.7) scale = 1 + 0.07 * (1 - (tt - 0.7) / 0.3);
            }
          }
        }
        this.drawCandy(gridX + x * cellSize, gridY + y * cellSize, cellSize, c, 1, scale, now);
      }
    }
    this.pulses = this.pulses.filter((p) => now - p.startedAt < 320);

    // ghost preview
    if (drag) {
      const snap = this.snapTarget(drag);
      if (snap && grid.canPlace(drag.piece.shape, snap.x, snap.y)) {
        for (const c of drag.piece.shape.cells) {
          this.drawCandyGhost(
            gridX + (snap.x + c.x) * cellSize,
            gridY + (snap.y + c.y) * cellSize,
            cellSize,
            drag.piece.color,
          );
        }
      }
    }
  }

  private drawTray(tray: (Piece | null)[], drag: DragState | null, now: number): void {
    const { traySlotWidth, trayY, trayCellSize } = this.layout;
    const ctx = this.ctx;

    const cssW = this.canvas.clientWidth;
    const trayH = trayCellSize * 4 + 24;
    ctx.save();
    this.roundRect(8, trayY - 8, cssW - 16, trayH, 22);
    const grad = ctx.createLinearGradient(0, trayY, 0, trayY + trayH);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    this.roundRect(8, trayY - 8, cssW - 16, trayH, 22);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const piece = tray[i];
      if (!piece) continue;
      if (drag && drag.origin.x === i) continue;
      const slotCenterX = i * traySlotWidth + traySlotWidth / 2;
      const slotCenterY = trayY + 60;
      const offsetX = slotCenterX - (piece.shape.width * trayCellSize) / 2;
      const offsetY = slotCenterY - (piece.shape.height * trayCellSize) / 2;
      const bob = Math.sin(now / 600 + i * 1.3) * 2;
      for (const c of piece.shape.cells) {
        this.drawCandy(
          offsetX + c.x * trayCellSize,
          offsetY + c.y * trayCellSize + bob,
          trayCellSize,
          piece.color,
          1,
          1,
          now,
        );
      }
    }
  }

  private drawDraggingPiece(drag: DragState, grid: Grid): void {
    const { cellSize } = this.layout;
    const liftPx = 60;
    const baseX = drag.pointerX - (drag.piece.shape.width * cellSize) / 2;
    const baseY = drag.pointerY - drag.piece.shape.height * cellSize - liftPx;
    const snap = this.snapTarget(drag);
    const valid = snap !== null && grid.canPlace(drag.piece.shape, snap.x, snap.y);
    for (const c of drag.piece.shape.cells) {
      this.drawCandy(
        baseX + c.x * cellSize,
        baseY + c.y * cellSize,
        cellSize,
        drag.piece.color,
        valid ? 1 : 0.55,
        1.05,
        performance.now(),
      );
    }
  }

  snapTarget(drag: DragState): Cell | null {
    const { cellSize, gridX, gridY } = this.layout;
    const liftPx = 60;
    const baseX = drag.pointerX - (drag.piece.shape.width * cellSize) / 2;
    const baseY = drag.pointerY - drag.piece.shape.height * cellSize - liftPx;
    const gx = Math.round((baseX - gridX) / cellSize);
    const gy = Math.round((baseY - gridY) / cellSize);
    if (gx < 0 || gy < 0 || gx + drag.piece.shape.width > GRID_SIZE || gy + drag.piece.shape.height > GRID_SIZE) {
      return null;
    }
    return { x: gx, y: gy };
  }

  hitTestTray(px: number, py: number, tray: (Piece | null)[]): number {
    const { traySlotWidth, trayY, trayCellSize } = this.layout;
    if (py < trayY) return -1;
    for (let i = 0; i < 3; i++) {
      const piece = tray[i];
      if (!piece) continue;
      const slotCenterX = i * traySlotWidth + traySlotWidth / 2;
      const slotCenterY = trayY + 60;
      const w = piece.shape.width * trayCellSize;
      const h = piece.shape.height * trayCellSize;
      const x0 = slotCenterX - w / 2 - 12;
      const y0 = slotCenterY - h / 2 - 12;
      if (px >= x0 && px <= x0 + w + 24 && py >= y0 && py <= y0 + h + 24) return i;
    }
    return -1;
  }

  private drawCandy(
    px: number,
    py: number,
    size: number,
    color: RuneColor,
    alpha: number,
    scale: number,
    now: number,
  ): void {
    const ctx = this.ctx;
    const pal = CANDY_PALETTES[color];
    const inset = Math.max(2, Math.floor(size * 0.08));
    const innerSize = size - inset * 2;
    const cx = px + size / 2;
    const cy = py + size / 2;
    const drawSize = innerSize * scale;
    const x = cx - drawSize / 2;
    const y = cy - drawSize / 2;
    const r = Math.max(4, Math.floor(drawSize * 0.28));

    ctx.save();
    ctx.globalAlpha = alpha;

    // drop shadow base
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(4, size * 0.22);
    ctx.shadowOffsetY = Math.max(2, size * 0.10);
    this.roundRect(x, y, drawSize, drawSize, r);
    ctx.fillStyle = pal.dark;
    ctx.fill();
    ctx.restore();

    // body gradient
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + drawSize);
    bodyGrad.addColorStop(0, pal.light);
    bodyGrad.addColorStop(0.5, pal.base);
    bodyGrad.addColorStop(1, pal.dark);
    this.roundRect(x, y, drawSize, drawSize, r);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // inner rim
    this.roundRect(x + 1, y + 1, drawSize - 2, drawSize - 2, r - 1);
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = Math.max(1, drawSize * 0.045);
    ctx.globalAlpha = alpha * 0.5;
    ctx.stroke();

    // top glossy highlight
    ctx.globalAlpha = alpha * 0.85;
    const glossH = drawSize * 0.45;
    const glossGrad = ctx.createLinearGradient(x, y, x, y + glossH);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    this.roundRect(x + drawSize * 0.10, y + drawSize * 0.07, drawSize * 0.80, glossH, r * 0.8);
    ctx.fillStyle = glossGrad;
    ctx.fill();

    // sparkle
    const sparklePhase = (now / 600 + (px + py) * 0.01) % (Math.PI * 2);
    const sparkleAlpha = Math.max(0, Math.sin(sparklePhase));
    ctx.globalAlpha = alpha * 0.95 * sparkleAlpha;
    ctx.fillStyle = pal.shine;
    ctx.beginPath();
    ctx.arc(x + drawSize * 0.32, y + drawSize * 0.28, drawSize * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + drawSize * 0.7, y + drawSize * 0.36, drawSize * 0.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCandyGhost(px: number, py: number, size: number, color: RuneColor): void {
    const ctx = this.ctx;
    const pal = CANDY_PALETTES[color];
    const inset = Math.max(2, Math.floor(size * 0.08));
    const r = Math.max(4, Math.floor((size - inset * 2) * 0.28));
    ctx.save();
    ctx.globalAlpha = 0.45;
    this.roundRect(px + inset, py + inset, size - inset * 2, size - inset * 2, r);
    ctx.fillStyle = pal.light;
    ctx.fill();
    ctx.globalAlpha = 0.85;
    this.roundRect(px + inset, py + inset, size - inset * 2, size - inset * 2, r);
    ctx.strokeStyle = pal.base;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawFlash(now: number): void {
    if (!this.flash) return;
    const elapsed = now - this.flash.startedAt;
    const dur = 420;
    if (elapsed > dur) { this.flash = null; return; }
    const t = elapsed / dur;
    const alpha = 1 - t;
    const { cellSize, gridX, gridY } = this.layout;
    const ctx = this.ctx;
    ctx.save();
    for (const c of this.flash.cells) {
      const pal = CANDY_PALETTES[c.color];
      const grow = t * cellSize * 0.85;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(
        gridX + c.x * cellSize + cellSize / 2,
        gridY + c.y * cellSize + cellSize / 2,
        cellSize * 0.5 + grow,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = pal.light;
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(
        gridX + c.x * cellSize + cellSize / 2,
        gridY + c.y * cellSize + cellSize / 2,
        cellSize * 0.25 + grow * 0.5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  }

  spawnPlacedPulse(cells: { x: number; y: number }[]): void {
    this.pulses.push({ cells, startedAt: performance.now() });
  }

  spawnDustPuff(cells: { x: number; y: number }[]): void {
    const { cellSize, gridX, gridY } = this.layout;
    const color = this.theme.dustColor;
    for (const c of cells) {
      const cx = gridX + c.x * cellSize + cellSize / 2;
      const cy = gridY + c.y * cellSize + cellSize * 0.7;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (i / (count - 1) - 0.5) * Math.PI * 0.9;
        const speed = 50 + Math.random() * 60;
        this.particles.push({
          x: cx + (Math.random() - 0.5) * cellSize * 0.4,
          y: cy + (Math.random() - 0.5) * cellSize * 0.15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.55 - 30,
          life: 0,
          maxLife: 380 + Math.random() * 220,
          color,
          size: 3.5 + Math.random() * 4,
          rot: 0,
          vrot: 0,
          shape: 'puff',
          gravity: 120,
        });
      }
    }
  }

  spawnClearBurst(cells: { x: number; y: number; color: RuneColor }[]): void {
    const { cellSize, gridX, gridY } = this.layout;
    for (const c of cells) {
      const pal = CANDY_PALETTES[c.color];
      const cx = gridX + c.x * cellSize + cellSize / 2;
      const cy = gridY + c.y * cellSize + cellSize / 2;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 120 + Math.random() * 180;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 80,
          life: 0,
          maxLife: 600 + Math.random() * 300,
          color: i % 2 === 0 ? pal.base : pal.light,
          size: 4 + Math.random() * 4,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 8,
          shape: 'rect',
          gravity: 600,
        });
      }
    }
  }

  spawnFloatText(gridCx: number, gridCy: number, text: string, color: string): void {
    const { cellSize, gridX, gridY } = this.layout;
    this.floats.push({
      x: gridX + gridCx * cellSize,
      y: gridY + gridCy * cellSize,
      text,
      color,
      startedAt: performance.now(),
    });
  }

  spawnLevelBanner(theme: Theme): void {
    this.levelBanner = { theme, startedAt: performance.now() };
  }

  private drawLevelBanner(now: number): void {
    if (!this.levelBanner) return;
    const elapsed = now - this.levelBanner.startedAt;
    const dur = 1900;
    if (elapsed > dur) { this.levelBanner = null; return; }
    const t = elapsed / dur;
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    let alpha = 1;
    if (t < 0.12) alpha = t / 0.12;
    else if (t > 0.78) alpha = 1 - (t - 0.78) / 0.22;

    let scale = 1;
    if (t < 0.15) {
      const u = t / 0.15;
      scale = 0.6 + 0.5 * (1 - (1 - u) * (1 - u));
      if (u > 0.7) scale = 1.05 - 0.05 * ((u - 0.7) / 0.3);
    }

    const cx = w / 2;
    const cy = h * 0.36;
    const bw = Math.min(360, w - 36);
    const bh = 116;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    this.roundRect(-bw / 2, -bh / 2, bw, bh, 24);
    const cardGrad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    cardGrad.addColorStop(0, 'rgba(255,255,255,0.97)');
    cardGrad.addColorStop(1, 'rgba(255,235,248,0.95)');
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    this.roundRect(-bw / 2, -bh / 2, bw, bh, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    const banner = this.levelBanner.theme;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText(banner.emoji, 0, -20);

    ctx.font = '800 22px "Baloo 2", system-ui, sans-serif';
    ctx.fillStyle = '#4a1d4a';
    ctx.fillText(banner.name, 0, 24);

    ctx.restore();
  }

  private updateAndDrawParticles(): void {
    const ctx = this.ctx;
    const dt = 1 / 60;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += 16.6;
      if (p.life >= p.maxLife) continue;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      const lifeT = p.life / p.maxLife;
      const alpha = 1 - lifeT;
      ctx.save();
      if (p.shape === 'puff') {
        ctx.globalAlpha = alpha * 0.55;
        const r = p.size * (1 + lifeT * 2.5);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
      next.push(p);
    }
    this.particles = next;
  }

  private updateAndDrawFloats(now: number): void {
    const ctx = this.ctx;
    const dur = 900;
    const next: FloatText[] = [];
    for (const f of this.floats) {
      const t = (now - f.startedAt) / dur;
      if (t >= 1) continue;
      const e = 1 - (1 - t) * (1 - t);
      const y = f.y - 40 * e;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 28px "Baloo 2", "Comic Sans MS", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(60, 20, 60, 0.85)';
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
      ctx.restore();
      next.push(f);
    }
    this.floats = next;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
}
