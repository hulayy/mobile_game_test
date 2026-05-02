export type RuneColor = 'plasma' | 'aqua' | 'circuit' | 'photon' | 'pulse' | 'void';

export const RUNE_COLORS: Record<RuneColor, string> = {
  plasma: '#ff3860',
  aqua: '#00d9ff',
  circuit: '#00ff88',
  photon: '#ffd166',
  pulse: '#b347ff',
  void: '#e8eef7',
};

export interface Cell {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  cells: ReadonlyArray<Cell>;
  width: number;
  height: number;
}

export interface Piece {
  shape: Shape;
  color: RuneColor;
}

export interface ClearResult {
  rows: number[];
  cols: number[];
  squares: Cell[];
  cellsCleared: number;
}
