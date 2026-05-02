import { SHAPES } from './shapes';
import type { Piece, RuneColor } from './types';
import type { Grid } from './grid';

const COLORS: ReadonlyArray<RuneColor> = ['plasma', 'aqua', 'circuit', 'photon', 'pulse', 'void'];

function randomColor(): RuneColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomShape(): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { shape, color: randomColor() };
}

export function generateTriple(grid: Grid): Piece[] {
  const triple: Piece[] = [];
  let guaranteed = false;

  for (let i = 0; i < 3; i++) {
    let piece = randomShape();
    if (!guaranteed) {
      let attempts = 0;
      while (!grid.hasAnyValidPlacement(piece.shape) && attempts < 30) {
        piece = randomShape();
        attempts++;
      }
      guaranteed = grid.hasAnyValidPlacement(piece.shape);
    }
    triple.push(piece);
  }

  return triple;
}
