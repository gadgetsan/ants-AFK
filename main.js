// main.js
import { World } from './world.js';
import { Ant } from './ant.js';

const canvas = document.getElementById('antCanvas');
const ctx = canvas.getContext('2d');

let world, ant;
const cellSize = 5; // Change this value to set cell size

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Always use integer grid size
  const gridWidth = Math.floor(canvas.width / cellSize);
  const gridHeight = Math.floor(canvas.height / cellSize);

  console.log(`Resizing canvas to ${canvas.width}x${canvas.height} with cell size ${cellSize}`);
  console.log(`Grid size: ${gridWidth}x${gridHeight}`);
  world = new World(gridWidth, gridHeight, cellSize);
  ant = new Ant(
    Math.floor(gridWidth / 2),
    Math.floor(gridHeight / 2),
    world,
    cellSize
  );
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function gameLoop() {
  world.tick(); // Update world state
  ant.update();
  world.draw(ctx, ant);
  requestAnimationFrame(gameLoop);
}

gameLoop();
