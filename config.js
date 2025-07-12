// Global simulation parameters.  Values here directly influence ant
// behaviour, obstacle generation and pheromone/road logic.
export const CONFIG={
  // Colony behaviour ------------------------------------------------------
  ANT_COUNT:200,               // total number of ants in the world
  SPEED_SCALE:4,
  MIN_SPEED:0.05*4,
  MAX_SPEED:0.15*4,
  RANDOM_TURN_JITTER:0.12,     // baseline random movement factor

  // Flocking --------------------------------------------------------------
  COHESION_DIST:60,
  COHESION_STRENGTH:0.015,
  REPULSION_DIST:20,
  REPULSION_STRENGTH:0.28,

  // Nest attraction/repulsion --------------------------------------------
  NEST_ATTRACTION_IDLE:0.02,
  NEST_ATTRACTION_RETURN:0.08,
  NEST_REPEL_IDLE:0.02,
  NEST_REPEL_EXPLORING:0.03,

  // Visual fade -----------------------------------------------------------
  TRAIL_FADE:0.18,

  // Exploration -----------------------------------------------------------
  EXPLORE_MAX_RATIO:0.20,
  EXPLORE_CHANCE:0.001,
  EXPLORE_TIME_MIN:1200,
  EXPLORE_TIME_MAX:4800,

  // Resources -------------------------------------------------------------
  FOOD_PILES:25,
  FOOD_PILE_CAPACITY:120,
  STONE_PILES:12,
  STONE_PILE_CAPACITY:80,

  // World grid ------------------------------------------------------------
  // Cell size for all grid based features such as pheromones,
  // roads and obstacle information
  GRID_CELL:6,
  // Road pheromones -------------------------------------------------------
  ROAD_DECAY:0.985,
  ROAD_DEPOSIT:0.4,
  ROAD_FOLLOW:0.2,

  // Resource pheromones ---------------------------------------------------
  PHER_DECAY:0.98,
  PHER_DEPOSIT:0.3,
  PHER_FOLLOW:0.15,

  // Obstacles -------------------------------------------------------------
  OBSTACLE_COUNT:50,
  OBSTACLE_MIN_RADIUS:20,
  OBSTACLE_MAX_RADIUS:40,
  OBSTACLE_LINE_MIN:200,
  OBSTACLE_LINE_MAX:500,

  // Misc -----------------------------------------------------------------
  POST_RETURN_WANDER:400,
  FOOD_PICKUP_RADIUS:4,
  FOOD_DETECT_RADIUS:38,
  FOOD_BASE_RADIUS:18,
  HEAVY_SCAN_INTERVAL:3,
  PHER_DURATION:600,           // how long ants emit pheromones while carrying
  STUCK_THRESHOLD:40,          // ticks before ant starts digging

  // Digging ---------------------------------------------------------------
  DIG_DETECTION:4,             // distance from obstacle edge before digging
  DIG_AMOUNT:2,                // amount removed from obstacle per dig
  DIG_HOLE:0.05,               // proportional hole size when digging lines
  STONE_DROP_MIN:300,
  STONE_DROP_MAX:500,
};
