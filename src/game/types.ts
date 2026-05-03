export type RuneColor = 'plasma' | 'aqua' | 'circuit' | 'photon' | 'pulse' | 'void';

export interface CandyPalette {
  base: string;
  light: string;
  dark: string;
  shine: string;
  rim: string;
}

export const RUNE_COLORS: Record<RuneColor, string> = {
  plasma: '#ff5b8a',
  aqua: '#4ad6ff',
  circuit: '#7be86b',
  photon: '#ffd24a',
  pulse: '#c168ff',
  void: '#ff8a3d',
};

export const CANDY_PALETTES: Record<RuneColor, CandyPalette> = {
  plasma:  { base: '#ff5b8a', light: '#ffb3cb', dark: '#c81f5a', shine: '#fff1f5', rim: '#7a1138' },
  aqua:    { base: '#4ad6ff', light: '#c4f1ff', dark: '#1779b8', shine: '#f0fbff', rim: '#0c4a73' },
  circuit: { base: '#7be86b', light: '#d3f7c8', dark: '#2f9c2c', shine: '#f3fff0', rim: '#1a5b1a' },
  photon:  { base: '#ffd24a', light: '#fff0b8', dark: '#c98a0c', shine: '#fffaeb', rim: '#7a4f04' },
  pulse:   { base: '#c168ff', light: '#e7c6ff', dark: '#7a26b8', shine: '#faf2ff', rim: '#451066' },
  void:    { base: '#ff8a3d', light: '#ffd2b0', dark: '#c4541a', shine: '#fff5ec', rim: '#7a2e08' },
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
