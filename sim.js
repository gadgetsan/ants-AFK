import {CONFIG} from './config.js';
import {ctx,canvas,decayRoads,decayPheromones,drawRoads,drawPheromones,
        drawObstacles,updateObstacleGrid,updateResourceGrid,mod} from './world.js';
import {Faction,Nest,ResourcePile,Obstacle} from './entities.js';
import {Ant} from './ant.js';

// ---------------------------------------------------------------------------
// Simulation orchestrating ants, resources and obstacles
// ---------------------------------------------------------------------------

export class Sim{
  // create the world and populate it
  constructor(){
    this.factions=[
      new Faction('Red','rgba(255,80,80,0.9)',CONFIG.RANDOM_TURN_JITTER*1.4),
      new Faction('Green','rgba(80,255,80,0.9)',CONFIG.RANDOM_TURN_JITTER*0.8),
      new Faction('Blue','rgba(80,80,255,0.9)',CONFIG.RANDOM_TURN_JITTER*1.2)
    ];
    this.nests=this.buildNests();
    this.ants=this.buildAnts();
    this.piles=this.buildPiles();
    this.obstacles=this.buildObstacles();
    updateObstacleGrid(this.obstacles);
    updateResourceGrid(this.piles);
  }
  // create nests arranged around the centre
  buildNests(){
    const arr=[],m=110;
    this.factions.forEach((f,i)=>{
      const a=i/this.factions.length*Math.PI*2;
      arr.push(new Nest(
        canvas.width/2+(canvas.width/2-m)*Math.cos(a),
        canvas.height/2+(canvas.height/2-m)*Math.sin(a),
        f
      ));
    });
    return arr;
  }
  // create ant instances distributed around their nests
  buildAnts(){
    const a=[];
    for(let i=0;i<CONFIG.ANT_COUNT;i++){
      const f=this.factions[i%this.factions.length];
      const n=this.nests.find(n=>n.f===f);
      const off=()=> (Math.random()-0.5)*30;
      a.push(new Ant(n.x+off(),n.y+off(),f,n));
    }
    return a;
  }
  // randomly scatter resource piles across the map
  buildPiles(){
    const arr=[];
    for(let i=0;i<CONFIG.FOOD_PILES;i++){
      arr.push(new ResourcePile(
        Math.random()*canvas.width,
        Math.random()*canvas.height,
        CONFIG.FOOD_PILE_CAPACITY,
        'food','rgba(255,215,0,0.9)'
      ));
    }
    for(let i=0;i<CONFIG.STONE_PILES;i++){
      arr.push(new ResourcePile(
        Math.random()*canvas.width,
        Math.random()*canvas.height,
        CONFIG.STONE_PILE_CAPACITY,
        'stone','rgba(200,200,200,0.9)'
      ));
    }
    return arr;
  }
  // generate mostly line-shaped obstacles
  buildObstacles(){
    const arr=[];
    const lineCount=Math.floor(CONFIG.OBSTACLE_COUNT*0.9);
    for(let i=0;i<lineCount;i++){
      const x1=Math.random()*canvas.width;
      const y1=Math.random()*canvas.height;
      const len=CONFIG.OBSTACLE_LINE_MIN+Math.random()*(CONFIG.OBSTACLE_LINE_MAX-CONFIG.OBSTACLE_LINE_MIN);
      const a=Math.random()*Math.PI*2;
      const x2=mod(x1+Math.cos(a)*len,canvas.width);
      const y2=mod(y1+Math.sin(a)*len,canvas.height);
      arr.push(new Obstacle(x1,y1,3,'line',x2,y2));
    }
    for(let i=lineCount;i<CONFIG.OBSTACLE_COUNT;i++){
      const r=CONFIG.OBSTACLE_MIN_RADIUS+Math.random()*(CONFIG.OBSTACLE_MAX_RADIUS-CONFIG.OBSTACLE_MIN_RADIUS);
      arr.push(new Obstacle(Math.random()*canvas.width,Math.random()*canvas.height,r));
    }
    return arr;
  }
  // progress the simulation one tick
  update(){
    const explorers=this.ants.filter(a=>a.state==='explore').length;
    const ratio=explorers/this.ants.length;
    decayRoads();
    decayPheromones();
    // remove dug-out obstacles before ants react to them
    this.obstacles=this.obstacles.filter(o=>!o.removed);
    updateObstacleGrid(this.obstacles);
    updateResourceGrid(this.piles);
    this.ants.forEach(a=>a.update(this.ants,this.piles,this.obstacles,ratio));
    this.piles=this.piles.filter(p=>!p.empty);
    const fCount=this.piles.filter(p=>p.type==='food').length;
    const sCount=this.piles.filter(p=>p.type==='stone').length;
    if(fCount<CONFIG.FOOD_PILES*0.8){
      this.piles.push(new ResourcePile(Math.random()*canvas.width,Math.random()*canvas.height,CONFIG.FOOD_PILE_CAPACITY,'food','rgba(255,215,0,0.9)'));
    }
    if(sCount<CONFIG.STONE_PILES*0.8){
      this.piles.push(new ResourcePile(Math.random()*canvas.width,Math.random()*canvas.height,CONFIG.STONE_PILE_CAPACITY,'stone','rgba(200,200,200,0.9)'));
    }
    updateResourceGrid(this.piles);
  }
  // render the entire simulation state to the canvas
  draw(){
    ctx.fillStyle=`rgba(17,17,17,${CONFIG.TRAIL_FADE})`;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    drawRoads();
    drawPheromones();
    drawObstacles();
    this.piles.forEach(p=>p.draw());
    this.nests.forEach(n=>n.draw());
    this.ants.forEach(a=>a.draw());
  }
}
