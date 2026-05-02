import { GRID_SIZE, Grid } from './grid';
import { RUNE_COLORS } from './types';
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
  cells: Cell[];
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
    const gridY = padding;
    const trayY = gridY + gridPx + 24;
    const trayCellSize = Math.max(14, Math.floor(cellSize * 0.55));
    const traySlotWidth = Math.floor(cssWidth / 3);

    this.layout = { cellSize, gridX, gridY, gridPx, trayY, trayCellSize, traySlotWidth };
  }

  drawFrame(grid: Grid, tray: (Piece | null)[], drag: DragState | null, now: number): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    this.drawGrid(grid, drag);
    this.drawTray(tray, drag);
    if (drag) this.drawDraggingPiece(drag, grid);
    if (this.flash) this.drawFlash(now);
  }

  private drawGrid(grid: Grid, drag: DragState | null): void {
    const ctx = this.ctx;
    const { cellSize, gridX, gridY, gridPx } = this.layout;

    ctx.fillStyle = '#0f1524';
    ctx.fillRect(gridX, gridY, gridPx, gridPx);

    ctx.strokeStyle = '#1a2235';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = gridX + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, gridY);
      ctx.lineTo(p, gridY + gridPx);
      ctx.stroke();
      const q = gridY + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(gridX, q);
      ctx.lineTo(gridX + gridPx, q);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2a3550';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= GRID_SIZE; i += 3) {
      const p = gridX + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, gridY);
      ctx.lineTo(p, gridY + gridPx);
      ctx.stroke();
      const q = gridY + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(gridX, q);
      ctx.lineTo(gridX + gridPx, q);
      ctx.stroke();
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const c = grid.cells[y][x];
        if (c) this.drawCell(gridX + x * cellSize, gridY + y * cellSize, cellSize, c, 1);
      }
    }

    if (drag) {
      const snap = this.snapTarget(drag);
      if (snap && grid.canPlace(drag.piece.shape, snap.x, snap.y)) {
        for (const c of drag.piece.shape.cells) {
          this.drawCellGhost(
            gridX + (snap.x + c.x) * cellSize,
            gridY + (snap.y + c.y) * cellSize,
            cellSize,
            drag.piece.color,
          );
        }
      }
    }
  }

  private drawTray(tray: (Piece | null)[], drag: DragState | null): void {
    const { traySlotWidth, trayY, trayCellSize } = this.layout;
    for (let i = 0; i < 3; i++) {
      const piece = tray[i];
      if (!piece) continue;
      if (drag && drag.origin.x === i) continue;
      const slotCenterX = i * traySlotWidth + traySlotWidth / 2;
      const slotCenterY = trayY + 60;
      const offsetX = slotCenterX - (piece.shape.width * trayCellSize) / 2;
      const offsetY = slotCenterY - (piece.shape.height * trayCellSize) / 2;
      for (const c of piece.shape.cells) {
        this.drawCell(
          offsetX + c.x * trayCellSize,
          offsetY + c.y * trayCellSize,
          trayCellSize,
          piece.color,
          0.85,
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
      this.drawCell(
        baseX + c.x * cellSize,
        baseY + c.y * cellSize,
        cellSize,
        drag.piece.color,
        valid ? 1 : 0.5,
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

  private drawCell(px: number, py: number, size: number, color: RuneColor, alpha: number): void {
    const ctx = this.ctx;
    const hex = RUNE_COLORS[color];
    const inset = Math.max(1, Math.floor(size * 0.06));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = hex;
    ctx.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + inset, py + inset, size - inset * 2, Math.max(1, Math.floor(size * 0.08)));
    ctx.restore();
  }

  private drawCellGhost(px: number, py: number, size: number, color: RuneColor): void {
    const ctx = this.ctx;
    const hex = RUNE_COLORS[color];
    const inset = Math.max(1, Math.floor(size * 0.06));
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = hex;
    ctx.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + inset + 0.5, py + inset + 0.5, size - inset * 2 - 1, size - inset * 2 - 1);
    ctx.restore();
  }

  private drawFlash(now: number): void {
    if (!this.flash) return;
    const elapsed = now - this.flash.startedAt;
    const dur = 320;
    if (elapsed > dur) { this.flash = null; return; }
    const t = elapsed / dur;
    const alpha = 1 - t;
    const { cellSize, gridX, gridY } = this.layout;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (const c of this.flash.cells) {
      const grow = t * cellSize * 0.6;
      ctx.fillRect(
        gridX + c.x * cellSize - grow / 2,
        gridY + c.y * cellSize - grow / 2,
        cellSize + grow,
        cellSize + grow,
      );
    }
    ctx.restore();
  }
}
