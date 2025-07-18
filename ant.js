export class Ant {
  constructor(x, y, world) {
    this.x = x;
    this.y = y;
    this.world = world;
  }

  update() {
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }   // right
    ];

    const validMoves = directions.filter(({ dx, dy }) => {
      return this.world.isInside(this.x + dx, this.y + dy);
    });

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    this.x += move.dx;
    this.y += move.dy;
  }
}
