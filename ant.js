export class Ant {
  constructor(x, y, world, nestSmellThreshold = 200) {
    this.x = x;
    this.y = y;
    this.world = world;
    this.nestSmellThreshold = nestSmellThreshold; // Minimum smell intensity to create nest
    // Assign a random color to each ant
    const hue = Math.floor(Math.random() * 360);
    this.color = `hsl(${hue}, 80%, 50%)`;
    this.firstFoodSmell = null; // {x, y}
    // Track resources
    this.resources = {
      food: 10
    };
    this.carryingFood = false;
    this.nestLocation = null;
  }

  getLocation() {
    return {
      x: this.x,
      y: this.y
    };
  }

  senseDirection(type) {
    const directions = [{
        dx: 0,
        dy: -1
      }, // up
      {
        dx: 0,
        dy: 1
      }, // down
      {
        dx: -1,
        dy: 0
      }, // left
      {
        dx: 1,
        dy: 0
      } // right
    ];
    // Use world.getSmell with delta and this ant as location provider
    const currentSmell = this.world.getSmell(this, 0, 0);
    const currentIntensity =
      currentSmell && currentSmell.type === type ?
      currentSmell.intensity :
      0;

    let bestMove = null;
    let bestIntensity = currentIntensity;

    for (const move of directions) {
      const nx = this.x + move.dx,
        ny = this.y + move.dy;
      if (!this.world.isInside(nx, ny)) continue;
      const smell = this.world.getSmell(this, move.dx, move.dy);
      if (smell && smell.type === type && smell.intensity > bestIntensity) {
        bestIntensity = smell.intensity;
        bestMove = move;
      }
    }
    return bestMove;
  }

  update() {
    const directions = [{
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

    const validMoves = directions.filter(({
      dx,
      dy
    }) => {
      const nx = this.x + dx,
        ny = this.y + dy;
      return this.world.isInside(nx, ny);
    });

    // If carrying food, try to return to nest
    if (this.carryingFood && this.nestLocation) {
      // Lay "home" pheromone at current location
      this.world.layPheromone(this.x, this.y, 'home', 20);

      // Try to follow nest pheromone
      const nestMove = this.senseDirection('nest');
      if (nestMove) {
        this.x += nestMove.dx;
        this.y += nestMove.dy;
      } else {
        // Move towards nest by memory if no pheromone
        const dx = Math.sign(this.nestLocation.x - this.x);
        const dy = Math.sign(this.nestLocation.y - this.y);
        if (dx !== 0 || dy !== 0) {
          // Prefer horizontal/vertical moves
          if (dx !== 0 && this.world.isInside(this.x + dx, this.y)) {
            this.x += dx;
          } else if (dy !== 0 && this.world.isInside(this.x, this.y + dy)) {
            this.y += dy;
          }
        }
      }

      // Check if reached nest
      if (this.x === this.nestLocation.x && this.y === this.nestLocation.y) {
        this.carryingFood = false;
        this.resources.food += 1;
        this.world.layPheromone(this.x, this.y, 'nest', 30);
      }
      return;
    }

    // Not carrying food: search for food
    const bestMove = this.senseDirection('food');

    if (bestMove) {
      if (!this.firstFoodSmell) {
        this.firstFoodSmell = {
          x: this.x + bestMove.dx,
          y: this.y + bestMove.dy
        };
      }
      this.x += bestMove.dx;
      this.y += bestMove.dy;
    } else {
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.x += move.dx;
      this.y += move.dy;
    }

    // Try to pick up food from adjacent cells
    if (!this.carryingFood) {
      const foodLoc = this.world.tryPickupFood(this.x, this.y);
      if (foodLoc) {
        this.carryingFood = true;
        // Lay "nest" pheromone at food location to mark path back
        this.world.layPheromone(foodLoc.x, foodLoc.y, 'nest', 20);
      }
    }

    // Check if current cell's food smell intensity is above threshold and ant has enough food
    const currentSmell = this.world.getSmell(this, 0, 0);
    if (
      currentSmell &&
      currentSmell.type === 'food' &&
      currentSmell.intensity >= this.nestSmellThreshold &&
      this.resources.food >= 10
    ) {
      this.createNest();
      this.resources.food -= 10;
      this.firstFoodSmell = null; // Prevent multiple nests
    }
  }

  createNest() {
    // Always place nest at current position
    this.world.placeNest(this.x, this.y, this.color);
    this.nestLocation = {
      x: this.x,
      y: this.y
    };
    // Optionally lay nest pheromone at nest
    this.world.layPheromone(this.x, this.y, 'nest', 50);
  }
}