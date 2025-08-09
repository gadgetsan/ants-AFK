// world.js
import {
  PheromoneType
} from './pheromones/PheromoneType.js';
import {
  PHEROMONE_TYPES
} from './pheromones/types.js';
import {
  renderPheromoneCheckboxes
} from './UI.js';

// Helper to get PheromoneType by key
function getPheromoneTypeByKey(key) {
  return PHEROMONE_TYPES.find(pt => pt.key === key);
}

export class WorldCell {
  constructor() {
    this.type = 'empty';
  }

  getColor() {
    // Default color for empty cell
    return '#333';
  }
}

export class FoodCell extends WorldCell {
  constructor(amount = 10) {
    super();
    this.type = 'food';
    this.amount = amount;
  }

  getColor() {
    // The greener, the more food: amount 0 => rgb(51,51,51), max (say 20) => rgb(0,255,0)
    const maxAmount = 20;
    const green = Math.min(255, Math.round((this.amount / maxAmount) * 255));
    // Fade from dark to green
    return `rgb(0,${green},0)`;
  }
}

export class PheroCell {
  constructor(type = null) {
    this.type = type; // e.g., 'food', null means no smell
    this.intensity = 0;
    this.maxIntensity = 100;
    this.decayRate = 0.99999;
  }

  add(amount, type = 'food') {
    // If adding a new type, overwrite if intensity is low or type matches
    if (this.type === null || this.type === type || this.intensity < 0.01) {
      this.type = type;
      this.intensity = Math.min(this.maxIntensity, this.intensity + amount);
    }
    // If another type is present and intensity is high, ignore for now (could be extended)
  }

  decay() {
    this.intensity *= this.decayRate;
    if (this.intensity < 0.01) {
      this.intensity = 0;
      this.type = null;
    }
  }

  getColor() {
    if (!this.type || this.intensity <= 0) return 'rgba(0,0,0,0)';
    const pheroType = getPheromoneTypeByKey(this.type);
    if (pheroType) {
      return pheroType.getColor(this.intensity);
    }
    return 'rgba(0,0,0,0)';
  }
}

export class Wind {
  constructor() {
    this.directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    this.dir = this.randomDirection();
    this.strength = this.randomStrength();
    this.changeInterval = this.randomInterval();
    this.counter = 0;
  }

  randomDirection() {
    return this.directions[Math.floor(Math.random() * this.directions.length)];
  }

  randomStrength() {
    // Strength between 0.2 and 0.7
    return 0.2 + Math.random() * 0.5;
  }

  randomInterval() {
    // Change interval between 80 and 150 ticks
    return Math.floor(80 + Math.random() * 70);
  }

  tick() {
    this.counter++;
    if (this.counter > this.changeInterval) {
      this.dir = this.randomDirection();
      this.strength = this.randomStrength();
      this.changeInterval = this.randomInterval();
      this.counter = 0;
    }
  }
}

export class NestCell extends WorldCell {
  constructor(color) {
    super();
    this.type = 'nest';
    this.color = color;
  }

  getColor() {
    return this.color;
  }
}

export class World {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Each cell: { world: WorldCell, phero: PheroCell }
    this.grid = Array.from({
        length: height
      }, () =>
      Array.from({
        length: width
      }, () => ({
        world: new WorldCell(),
        phero: new PheroCell()
      }))
    );

    // Place 50 FoodCells at random locations
    const placed = new Set();
    let count = 0;
    while (count < 50) {
      const fx = Math.floor(Math.random() * this.width);
      const fy = Math.floor(Math.random() * this.height);
      const key = `${fx},${fy}`;
      if (!placed.has(key)) {
        this.grid[fy][fx].world = new FoodCell(Math.floor(Math.random() * 20) + 1);
        placed.add(key);
        count++;
      }
    }

    this.wind = new Wind();
    this.maxSmellDelta = 1; // Only adjacent cells (including self)

    // Add pheromone types to instance
    this.PHEROMONE_TYPES = PHEROMONE_TYPES.map(pt => pt.key);

    // Render UI checkboxes after pheromone types are ready
    renderPheromoneCheckboxes(this.PHEROMONE_TYPES);

    this.frameDrawCounter = 0; // Add frame counter
  }

  updatePheroMaxIntensities() {
    // Compute max intensity for each pheromone type and store in each type
    for (const pt of PHEROMONE_TYPES) {
      pt.maxIntensity = 0;
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const phero = this.grid[y][x].phero;
        if (phero.type) {
          const pt = getPheromoneTypeByKey(phero.type);
          if (pt && phero.intensity > pt.maxIntensity) {
            pt.maxIntensity = phero.intensity;
          }
        }
      }
    }
  }

  isInside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getCell(x, y) {
    return this.isInside(x, y) ? this.grid[y][x] : null;
  }

  getSmell(objWithLocation, dx = 0, dy = 0) {
    // objWithLocation must have getLocation() returning {x, y}
    if (Math.abs(dx) > this.maxSmellDelta || Math.abs(dy) > this.maxSmellDelta) return null;
    const {
      x,
      y
    } = objWithLocation.getLocation();
    const nx = x + dx,
      ny = y + dy;
    if (!this.isInside(nx, ny)) return null;
    return this.grid[ny][nx].phero;
  }

  placeNest(x, y, color) {
    // Place a cross-shaped nest centered at (x, y)
    const positions = [
      [x, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
      [x + 1, y]
    ];
    //console.log(`Placing nest at (${x}, ${y}) with color ${color}`);
    for (const [nx, ny] of positions) {
      if (this.isInside(nx, ny)) {
        this.grid[ny][nx].world = new NestCell(color);
      }
    }
  }

  tryPickupFood(x, y) {
    // Check adjacent cells (including self) for food
    const directions = [{
        dx: 0,
        dy: 0
      },
      {
        dx: 0,
        dy: -1
      },
      {
        dx: 0,
        dy: 1
      },
      {
        dx: -1,
        dy: 0
      },
      {
        dx: 1,
        dy: 0
      }
    ];
    for (const {
        dx,
        dy
      } of directions) {
      const nx = x + dx,
        ny = y + dy;
      if (this.isInside(nx, ny)) {
        const cell = this.grid[ny][nx];
        if (cell.world.type === 'food' && cell.world.amount > 0) {
          cell.world.amount -= 1;
          return {
            x: nx,
            y: ny
          };
        }
      }
    }
    return null;
  }

  layPheromone(x, y, type, intensity) {
    if (this.isInside(x, y)) {
      this.grid[y][x].phero.add(intensity, type);
    }
  }

  tick() {
    // Update wind
    this.wind.tick();

    // 1. Food emits smell
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (cell.world.type === 'food' && cell.world.amount > 0) {
          cell.phero.add(10, 'food'); // Specify smell type
        }
      }
    }

    // 2. Propagate smell (wind-biased diffusion)
    const newPheros = Array.from({
        length: this.height
      }, () =>
      Array.from({
        length: this.width
      }, () => ({
        type: null,
        intensity: 0
      }))
    );

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        const dirs = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ];
        const windIndex = dirs.findIndex(([dx, dy]) =>
          dx === this.wind.dir[0] && dy === this.wind.dir[1]
        );
        const share = cell.phero.intensity * 0.2;
        const remain = cell.phero.intensity * 0.8;
        // Add remain to self
        if (cell.phero.type) {
          newPheros[y][x].type = cell.phero.type;
          newPheros[y][x].intensity += remain;
        }
        // Distribute share to neighbors, wind gets extra
        for (let i = 0; i < dirs.length; i++) {
          const [dx, dy] = dirs[i];
          const nx = x + dx,
            ny = y + dy;
          if (this.isInside(nx, ny)) {
            let portion = share / 4;
            if (i === windIndex) {
              portion += share * this.wind.strength * 0.5;
            } else {
              portion -= share * this.wind.strength * 0.5 / 3;
            }
            if (cell.phero.type) {
              // If type is already set, add to it; otherwise, set it
              if (
                newPheros[ny][nx].type === null ||
                newPheros[ny][nx].type === cell.phero.type ||
                newPheros[ny][nx].intensity < 0.01
              ) {
                newPheros[ny][nx].type = cell.phero.type;
                newPheros[ny][nx].intensity += Math.max(0, portion);
              }
              // If another type is present, ignore for now (could be extended)
            }
          }
        }
      }
    }

    // 3. Update intensities and decay
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const phero = this.grid[y][x].phero;
        const {
          type,
          intensity
        } = newPheros[y][x];
        phero.type = type;
        phero.intensity = intensity;
        phero.decay();
      }
    }
  }

  draw(ctx, ants, enabledPheromones = null) {
    const cellSize = ctx.canvas.width / this.width;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Update pheromone max intensities every 10 frames
    this.frameDrawCounter++;
    if (this.frameDrawCounter % 10 === 0) {
      this.updatePheroMaxIntensities();
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        const {
          world,
          phero
        } = cell;
        // Draw world cell only if not empty
        if (world && world.type !== 'empty') {
          ctx.fillStyle = world.getColor();
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
        // Overlay smell if present and enabled
        if (
          phero.intensity > 0 &&
          (!enabledPheromones || enabledPheromones.has(phero.type))
        ) {
          const pt = getPheromoneTypeByKey(phero.type);
          const maxIntensity = pt ? pt.maxIntensity || phero.maxIntensity : 0;
          ctx.fillStyle = pt ? pt.getColor(phero.intensity, maxIntensity) : 'rgba(0,0,0,0)';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    // Draw all ants with their unique color
    ants.forEach(ant => {
      ctx.fillStyle = ant.color || '#ff4444';
      ctx.fillRect(ant.x * cellSize, ant.y * cellSize, cellSize, cellSize);
    });
  }
}