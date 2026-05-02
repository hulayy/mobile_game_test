import { GRID_SIZE, Grid } from './grid';
import { CANDY_PALETTES } from './types';
import type { Cell, Piece, RuneColor } from './types';

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

  flash: ClearFlash | null = null;
  particles: Particle[] = [];
  pulses: PlacedPulse[] = [];
  floats: FloatText[] = [];

  private bgGradientCache: { w: number; h: number; grad: CanvasGradient } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
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
    ctx.clearRect(0, 0, cssW, cssH);

    this.drawBackground(cssW, cssH, now);
    this.drawGrid(grid, drag, now);
    this.drawTray(tray, drag, now);
    if (drag) this.drawDraggingPiece(drag, grid);
    if (this.flash) this.drawFlash(now);
    this.updateAndDrawParticles(now);
    this.updateAndDrawFloats(now);
  }

  private drawBackground(w: number, h: number, now: number): void {
    const ctx = this.ctx;
    if (!this.bgGradientCache || this.bgGradientCache.w !== w || this.bgGradientCache.h !== h) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ffd6a8');
      grad.addColorStop(0.5, '#ffb6d5');
      grad.addColorStop(1, '#b18bff');
      this.bgGradientCache = { w, h, grad };
    }
    ctx.fillStyle = this.bgGradientCache.grad;
    ctx.fillRect(0, 0, w, h);

    // floating sparkle dots
    const t = now / 1000;
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 73 + Math.sin(t * 0.3 + i) * 30) % w + w) % w;
      const sy = ((i * 131 + (t * 22 + i * 17)) % h + h) % h;
      const a = 0.18 + 0.12 * Math.sin(t * 1.4 + i);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrid(grid: Grid, drag: DragState | null, now: number): void {
    const ctx = this.ctx;
    const { cellSize, gridX, gridY, gridPx } = this.layout;

    // board panel
    const radius = Math.max(10, Math.floor(cellSize * 0.35));
    ctx.save();
    ctx.shadowColor = 'rgba(80, 30, 90, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    this.roundRect(gridX - 10, gridY - 10, gridPx + 20, gridPx + 20, radius);
    const panel = ctx.createLinearGradient(0, gridY, 0, gridY + gridPx);
    panel.addColorStop(0, '#fff7ec');
    panel.addColorStop(1, '#ffe1ee');
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.restore();

    // inner board
    ctx.save();
    this.roundRect(gridX, gridY, gridPx, gridPx, radius * 0.7);
    const inner = ctx.createLinearGradient(0, gridY, 0, gridY + gridPx);
    inner.addColorStop(0, '#fde3c4');
    inner.addColorStop(1, '#f8c8df');
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.restore();

    // checkerboard cells
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const checker = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0;
        ctx.fillStyle = checker ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(gridX + x * cellSize, gridY + y * cellSize, cellSize, cellSize);
      }
    }

    // 3x3 separator lines
    ctx.strokeStyle = 'rgba(120, 40, 90, 0.25)';
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

    // placed candies (with placed pulse animation)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const c = grid.cells[y][x];
        if (!c) continue;
        let scale = 1;
        for (const p of this.pulses) {
          if (p.cells.some((pc) => pc.x === x && pc.y === y)) {
            const t = (now - p.startedAt) / 280;
            if (t >= 0 && t <= 1) {
              const e = 1 - (1 - t) * (1 - t);
              scale = 0.6 + 0.5 * e + 0.06 * Math.sin(t * Math.PI);
              if (t > 0.7) scale = 1 + 0.06 * (1 - (t - 0.7) / 0.3);
            }
          }
        }
        this.drawCandy(gridX + x * cellSize, gridY + y * cellSize, cellSize, c, 1, scale, now);
      }
    }
    // cleanup pulses
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

    // tray background
    const cssW = this.canvas.clientWidth;
    const trayH = trayCellSize * 4 + 24;
    ctx.save();
    this.roundRect(8, trayY - 8, cssW - 16, trayH, 20);
    const grad = ctx.createLinearGradient(0, trayY, 0, trayY + trayH);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
    ctx.fillStyle = grad;
    ctx.fill();
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

    // shadow
    ctx.save();
    ctx.shadowColor = 'rgba(60, 20, 60, 0.35)';
    ctx.shadowBlur = Math.max(4, size * 0.18);
    ctx.shadowOffsetY = Math.max(2, size * 0.08);
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
    ctx.lineWidth = Math.max(1, drawSize * 0.04);
    ctx.globalAlpha = alpha * 0.45;
    ctx.stroke();

    // top glossy highlight
    ctx.globalAlpha = alpha * 0.85;
    const glossH = drawSize * 0.42;
    const glossGrad = ctx.createLinearGradient(x, y, x, y + glossH);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    this.roundRect(x + drawSize * 0.12, y + drawSize * 0.08, drawSize * 0.76, glossH, r * 0.7);
    ctx.fillStyle = glossGrad;
    ctx.fill();

    // sparkle
    const sparklePhase = (now / 600 + (px + py) * 0.01) % (Math.PI * 2);
    const sparkleAlpha = Math.max(0, Math.sin(sparklePhase));
    ctx.globalAlpha = alpha * 0.9 * sparkleAlpha;
    ctx.fillStyle = pal.shine;
    ctx.beginPath();
    ctx.arc(x + drawSize * 0.32, y + drawSize * 0.28, drawSize * 0.07, 0, Math.PI * 2);
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
    ctx.globalAlpha = 0.8;
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
      const grow = t * cellSize * 0.8;
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

  private updateAndDrawParticles(now: number): void {
    const ctx = this.ctx;
    const dt = 1 / 60;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += 16.6;
      if (p.life >= p.maxLife) continue;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      next.push(p);
    }
    this.particles = next;
    void now;
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
