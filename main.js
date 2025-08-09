// main.js
import {
  World
} from './world.js';
import {
  Ant
} from './ant.js';

const canvas = document.getElementById('antCanvas');
const ctx = canvas.getContext('2d');

let world;
let ants = [];
const cellSize = 5; // Change this value to set cell size
const ANT_COUNT = 5;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Always use integer grid size
  const gridWidth = Math.floor(canvas.width / cellSize);
  const gridHeight = Math.floor(canvas.height / cellSize);

  console.log(`Resizing canvas to ${canvas.width}x${canvas.height} with cell size ${cellSize}`);
  console.log(`Grid size: ${gridWidth}x${gridHeight}`);
  world = new World(gridWidth, gridHeight, cellSize);

  // Create multiple ants at random positions
  ants = [];
  for (let i = 0; i < ANT_COUNT; i++) {
    const x = Math.floor(Math.random() * gridWidth);
    const y = Math.floor(Math.random() * gridHeight);
    ants.push(new Ant(x, y, world, cellSize));
  }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function gameLoop() {
  world.tick();
  ants.forEach(ant => ant.update());
  world.draw(ctx, ants, window.enabledPheromones); // Pass enabled pheromones
  requestAnimationFrame(gameLoop);
}
gameLoop();