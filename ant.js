export class Ant {
  constructor(x, y, world) {
    this.x = x;
    this.y = y;
    this.world = world;
    // Assign a random color to each ant
    const hue = Math.floor(Math.random() * 360);
    this.color = `hsl(${hue}, 80%, 50%)`;
    this.firstFoodSmell = null; // {x, y}
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
    const currentCell = this.world.getCell(this.x, this.y);
    const currentIntensity =
      currentCell && currentCell.phero && currentCell.phero.type === type ?
      currentCell.phero.intensity :
      0;

    let bestMove = null;
    let bestIntensity = currentIntensity;

    for (const move of directions) {
      const nx = this.x + move.dx,
        ny = this.y + move.dy;
      if (!this.world.isInside(nx, ny)) continue;
      const cell = this.world.getCell(nx, ny);
      if (cell && cell.phero.type === type && cell.phero.intensity > bestIntensity) {
        bestIntensity = cell.phero.intensity;
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

    const bestMove = this.senseDirection('food');

    // Track first food smell location
    if (bestMove) {
      if (!this.firstFoodSmell) {
        this.firstFoodSmell = {
          x: this.x + bestMove.dx,
          y: this.y + bestMove.dy
        };
        this.createNest();
      }
      this.x += bestMove.dx;
      this.y += bestMove.dy;
    } else {
      // No gradient detected, move randomly
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.x += move.dx;
      this.y += move.dy;
    }
  }

  createNest() {
    // Place nest at first food smell location, or current position if not set
    const nestPos = this.firstFoodSmell || {
      x: this.x,
      y: this.y
    };
    this.world.placeNest(nestPos.x, nestPos.y, this.color);
  }
}