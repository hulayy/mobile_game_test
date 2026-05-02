import { Game } from './game/game';

const canvas = document.getElementById('board') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas not found');
new Game(canvas);
