// world.js
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
    // Visualize as blue overlay for 'food', can extend for other types
    if (this.type === 'food') {
      const blue = Math.min(255, Math.round(this.intensity * 2.5));
      return `rgba(0,0,255,${blue / 255 * 0.5})`;
    }
    // Add more smell types here as needed
    return 'rgba(0,0,0,0)';
  }
}

export class Wind {
  constructor() {
    this.directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1]
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

export class World {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Each cell: { world: WorldCell, phero: PheroCell }
    this.grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
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
  }

  isInside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getCell(x, y) {
    return this.isInside(x, y) ? this.grid[y][x] : null;
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
    const newPheros = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ type: null, intensity: 0 }))
    );

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        const dirs = [
          [0, -1], [1, 0], [0, 1], [-1, 0]
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
          const nx = x + dx, ny = y + dy;
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
        const { type, intensity } = newPheros[y][x];
        phero.type = type;
        phero.intensity = intensity;
        phero.decay();
      }
    }
  }

  draw(ctx, ant) {
    const cellSize = ctx.canvas.width / this.width;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        const { world, phero } = cell;
        // Draw world cell only if not empty or if ant is present
        if (ant.x === x && ant.y === y) {
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (world && world.type !== 'empty') {
          ctx.fillStyle = world.getColor();
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
        // Overlay smell if present
        if (phero.intensity > 0) {
          ctx.fillStyle = phero.getColor();
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }
}
