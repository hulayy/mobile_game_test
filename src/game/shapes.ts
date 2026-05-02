import type { Cell, Shape } from './types';

function shape(id: string, cells: ReadonlyArray<[number, number]>): Shape {
  const mapped: Cell[] = cells.map(([x, y]) => ({ x, y }));
  const width = Math.max(...mapped.map((c) => c.x)) + 1;
  const height = Math.max(...mapped.map((c) => c.y)) + 1;
  return { id, cells: mapped, width, height };
}

export const SHAPES: ReadonlyArray<Shape> = [
  shape('dot', [[0, 0]]),
  shape('h2', [[0, 0], [1, 0]]),
  shape('v2', [[0, 0], [0, 1]]),
  shape('h3', [[0, 0], [1, 0], [2, 0]]),
  shape('v3', [[0, 0], [0, 1], [0, 2]]),
  shape('h4', [[0, 0], [1, 0], [2, 0], [3, 0]]),
  shape('v4', [[0, 0], [0, 1], [0, 2], [0, 3]]),
  shape('h5', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]),
  shape('v5', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]),
  shape('sq2', [[0, 0], [1, 0], [0, 1], [1, 1]]),
  shape('sq3', [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]),
  shape('L1', [[0, 0], [0, 1], [1, 1]]),
  shape('L2', [[1, 0], [0, 1], [1, 1]]),
  shape('L3', [[0, 0], [1, 0], [0, 1]]),
  shape('L4', [[0, 0], [1, 0], [1, 1]]),
  shape('L_big_a', [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]),
  shape('L_big_b', [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]]),
  shape('L_big_c', [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]]),
  shape('L_big_d', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]),
  shape('T_up', [[0, 0], [1, 0], [2, 0], [1, 1]]),
  shape('T_down', [[1, 0], [0, 1], [1, 1], [2, 1]]),
  shape('T_left', [[1, 0], [0, 1], [1, 1], [1, 2]]),
  shape('T_right', [[0, 0], [0, 1], [1, 1], [0, 2]]),
  shape('S', [[1, 0], [2, 0], [0, 1], [1, 1]]),
  shape('Z', [[0, 0], [1, 0], [1, 1], [2, 1]]),
];
