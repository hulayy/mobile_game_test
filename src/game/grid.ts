import type { Cell, ClearResult, Piece, RuneColor, Shape } from './types';

export const GRID_SIZE = 9;
const SUB_SIZE = 3;

export class Grid {
  cells: (RuneColor | null)[][];

  constructor() {
    this.cells = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null as RuneColor | null),
    );
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
  }

  canPlace(shape: Shape, ox: number, oy: number): boolean {
    for (const c of shape.cells) {
      const x = ox + c.x;
      const y = oy + c.y;
      if (!this.inBounds(x, y)) return false;
      if (this.cells[y][x] !== null) return false;
    }
    return true;
  }

  hasAnyValidPlacement(shape: Shape): boolean {
    for (let y = 0; y <= GRID_SIZE - shape.height; y++) {
      for (let x = 0; x <= GRID_SIZE - shape.width; x++) {
        if (this.canPlace(shape, x, y)) return true;
      }
    }
    return false;
  }

  place(piece: Piece, ox: number, oy: number): Cell[] {
    const placed: Cell[] = [];
    for (const c of piece.shape.cells) {
      const x = ox + c.x;
      const y = oy + c.y;
      this.cells[y][x] = piece.color;
      placed.push({ x, y });
    }
    return placed;
  }

  detectClears(): ClearResult {
    const rows: number[] = [];
    const cols: number[] = [];
    const squares: Cell[] = [];
    const toClear = new Set<number>();
    const idx = (x: number, y: number) => y * GRID_SIZE + x;

    for (let y = 0; y < GRID_SIZE; y++) {
      let full = true;
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.cells[y][x] === null) { full = false; break; }
      }
      if (full) {
        rows.push(y);
        for (let x = 0; x < GRID_SIZE; x++) toClear.add(idx(x, y));
      }
    }

    for (let x = 0; x < GRID_SIZE; x++) {
      let full = true;
      for (let y = 0; y < GRID_SIZE; y++) {
        if (this.cells[y][x] === null) { full = false; break; }
      }
      if (full) {
        cols.push(x);
        for (let y = 0; y < GRID_SIZE; y++) toClear.add(idx(x, y));
      }
    }

    for (let by = 0; by < GRID_SIZE; by += SUB_SIZE) {
      for (let bx = 0; bx < GRID_SIZE; bx += SUB_SIZE) {
        let full = true;
        outer: for (let dy = 0; dy < SUB_SIZE; dy++) {
          for (let dx = 0; dx < SUB_SIZE; dx++) {
            if (this.cells[by + dy][bx + dx] === null) { full = false; break outer; }
          }
        }
        if (full) {
          squares.push({ x: bx, y: by });
          for (let dy = 0; dy < SUB_SIZE; dy++) {
            for (let dx = 0; dx < SUB_SIZE; dx++) toClear.add(idx(bx + dx, by + dy));
          }
        }
      }
    }

    for (const i of toClear) {
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE);
      this.cells[y][x] = null;
    }

    return { rows, cols, squares, cellsCleared: toClear.size };
  }

  reset(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.cells[y][x] = null;
      }
    }
  }
}
