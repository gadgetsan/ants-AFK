import {CONFIG} from './config.js';
import {canvas,ctx,wrapAngle,mod,dxT,dyT,dist2T,
        depositRoad,senseRoad,
        depositFoodPheromone,senseFoodPheromone,
        depositStonePheromone,senseStonePheromone} from './world.js';
import {ResourcePile} from './entities.js';

// ---------------------------------------------------------------------------
// Ant class
// ---------------------------------------------------------------------------
// Controls one ant's behaviour: flocking, resource gathering, pheromone
// handling and obstacle avoidance.

export class Ant{
  /**
   * Create a new ant.
   * @param {number} x Starting x coordinate
   * @param {number} y Starting y coordinate
   * @param {Faction} f Controlling faction
   * @param {Nest} nest Ant's home nest
   */
  constructor(x,y,f,nest){
    Object.assign(this,{x,y,f,nest});
    this.speed=CONFIG.MIN_SPEED+Math.random()*(CONFIG.MAX_SPEED-CONFIG.MIN_SPEED);
    this.angle=Math.random()*Math.PI*2;
    this.turnJitter=(0.8+Math.random()*0.4)*this.f.j;
    this.state='idle';
    this.ticks=0;
    this.carrying=null;        // 'food' or 'stone'
    this.dropX=0;              // dump location when carrying stone
    this.dropY=0;
    this.pherTimer=0;          // remaining ticks to emit pheromones
    this.scanCountdown=Math.floor(Math.random()*CONFIG.HEAVY_SCAN_INTERVAL);
    this.prevX=x;
    this.prevY=y;
    this.stuck=0;
  }

  /** Force an immediate sensor scan. */
  heavyScan(){
    this.scanCountdown=CONFIG.HEAVY_SCAN_INTERVAL;
    return true;
  }

  /** Reduce scan timer and return true when a scan should occur. */
  maybeScan(){
    if(--this.scanCountdown<0) return this.heavyScan();
    return this.scanCountdown===0;
  }

  /** Apply cohesion and repulsion with nearby friendly ants. */
  applyFlocking(ants){
    let ax=0,ay=0,c=0,rx=0,ry=0;
    for(const o of ants){
      if(o===this||o.f!==this.f) continue;
      const dx=dxT(this.x,o.x),dy=dyT(this.y,o.y),d2=dx*dx+dy*dy;
      if(d2<CONFIG.COHESION_DIST*CONFIG.COHESION_DIST){
        ax+=this.x+dx; ay+=this.y+dy; c++;
      }
      if(d2<CONFIG.REPULSION_DIST*CONFIG.REPULSION_DIST){
        rx-=dx; ry-=dy;
      }
    }
    if(c){
      ax/=c; ay/=c;
      this.angle+=wrapAngle(Math.atan2(dyT(this.y,ay),dxT(this.x,ax))-this.angle)*CONFIG.COHESION_STRENGTH;
    }
    if(rx||ry){
      const mult=1+c/5;
      this.angle+=wrapAngle(Math.atan2(ry,rx)-this.angle)*CONFIG.REPULSION_STRENGTH*mult;
    }
  }

  /** Behaviour while not exploring or returning. */
  updateIdle(explRatio){
    if(explRatio<CONFIG.EXPLORE_MAX_RATIO && Math.random()<CONFIG.EXPLORE_CHANCE){
      this.state='explore';
      this.ticks=Math.floor(CONFIG.EXPLORE_TIME_MIN+Math.random()*(CONFIG.EXPLORE_TIME_MAX-CONFIG.EXPLORE_TIME_MIN));
    }
    this.attractNest(-CONFIG.NEST_REPEL_IDLE);
  }

  /** Searching for food or stone piles. */
  updateExplore(piles){
    this.attractNest(-CONFIG.NEST_REPEL_EXPLORING);
    if(this.scanCountdown===0){
      for(const p of piles){
        if(p.empty) continue;
        if(dist2T(this.x,this.y,p.x,p.y)>(CONFIG.FOOD_DETECT_RADIUS+CONFIG.FOOD_BASE_RADIUS)**2) continue;
        const tgt=p.detectChunk(this.x,this.y,CONFIG.FOOD_DETECT_RADIUS);
        if(tgt){
          const desired=Math.atan2(dyT(this.y,tgt.cy),dxT(this.x,tgt.cx));
          this.angle+=wrapAngle(desired-this.angle)*0.18;
          break;
        }
      }
      for(const p of piles){
        if(p.takeNear(this.x,this.y,CONFIG.FOOD_PICKUP_RADIUS)){
          this.carrying=p.type;
          this.pherTimer=CONFIG.PHER_DURATION;
          this.state='return';
          break;
        }
      }
    }
    if(--this.ticks<=0 && this.state==='explore') this.state='return';
  }

  /** Walk back to the nest and deposit carried items. */
  updateReturn(piles){
    this.attractNest(CONFIG.NEST_ATTRACTION_RETURN);
    if(dist2T(this.x,this.y,this.nest.x,this.nest.y)<400){
      if(this.carrying==='food'){
        this.nest.stock++;
        this.carrying=null;
        this.pherTimer=0;
        this.state='explore';
        this.ticks=CONFIG.POST_RETURN_WANDER;
      }else if(this.carrying==='stone'){
        const a=Math.random()*Math.PI*2;
        const d=CONFIG.STONE_DROP_MIN+Math.random()*(CONFIG.STONE_DROP_MAX-CONFIG.STONE_DROP_MIN);
        this.dropX=mod(this.nest.x+Math.cos(a)*d,canvas.width);
        this.dropY=mod(this.nest.y+Math.sin(a)*d,canvas.height);
        this.state='dump';
      }
    }
  }

  /** Move towards a previously chosen stone drop location. */
  updateDump(piles){
    const dx=dxT(this.x,this.dropX),dy=dyT(this.y,this.dropY);
    this.angle+=wrapAngle(Math.atan2(dy,dx)-this.angle)*CONFIG.NEST_ATTRACTION_RETURN;
    if(dx*dx+dy*dy<400){
      piles.push(new ResourcePile(this.dropX,this.dropY,1,'stone','rgba(200,200,200,0.9)'));
      this.carrying=null;
      this.pherTimer=0;
      this.state='explore';
      this.ticks=CONFIG.POST_RETURN_WANDER;
    }
  }

  /** Deposit and sense pheromones and roads depending on carried resource. */
  handlePheromones(){
    if(this.carrying==='stone'){
      depositRoad(this.x,this.y,CONFIG.ROAD_DEPOSIT);
      if(this.pherTimer>0){
        depositStonePheromone(this.x,this.y,CONFIG.PHER_DEPOSIT);
        this.pherTimer--;
      }
    }else if(this.scanCountdown===0){
      const s=senseRoad(this.x,this.y);
      if(s.best>0.05) this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.ROAD_FOLLOW;
    }

    if(this.carrying==='food'){
      if(this.pherTimer>0){
        depositFoodPheromone(this.x,this.y,CONFIG.PHER_DEPOSIT);
        this.pherTimer--;
      }
    }else if(this.scanCountdown===0){
      const s=senseFoodPheromone(this.x,this.y);
      if(s.best>0.05) this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.PHER_FOLLOW;
      const ss=senseStonePheromone(this.x,this.y);
      if(ss.best>0.05) this.angle+=wrapAngle(ss.dir-this.angle)*CONFIG.PHER_FOLLOW*0.5;
    }
  }

  /** Apply obstacle avoidance and optional digging. */
  avoidObstacles(obstacles){
    for(const ob of obstacles){
      ob.avoid(this,this.stuck>CONFIG.STUCK_THRESHOLD);
    }
  }

  /** Update position and track whether the ant became stuck. */
  applyMotion(startX,startY){
    this.angle+=(Math.random()*2-1)*this.turnJitter;
    this.x=mod(this.x+Math.cos(this.angle)*this.speed,canvas.width);
    this.y=mod(this.y+Math.sin(this.angle)*this.speed,canvas.height);
    const moved=dist2T(startX,startY,this.x,this.y);
    this.stuck = moved<1 ? this.stuck+1 : 0;
    this.prevX=this.x;
    this.prevY=this.y;
  }

  /** Update all behavioural logic for a single tick. */
  update(ants,piles,obstacles,explRatio){
    const scanned=this.maybeScan();
    const startX=this.x,startY=this.y;

    if(this.state==='idle') this.updateIdle(explRatio);
    if(this.state==='explore') this.updateExplore(piles);
    if(this.state==='return') this.updateReturn(piles);
    if(this.state==='dump') this.updateDump(piles);

    if(scanned) this.applyFlocking(ants);
    this.handlePheromones();
    this.avoidObstacles(obstacles);
    this.applyMotion(startX,startY);
  }

  /** Steer towards or away from the home nest. */
  attractNest(k){
    const dx=dxT(this.x,this.nest.x),dy=dyT(this.y,this.nest.y);
    this.angle+=wrapAngle(Math.atan2(dy,dx)-this.angle)*k;
  }

  /** Draw the ant and any carried resource. */
  draw(){
    ctx.fillStyle=this.f.c;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.carrying?3:2,0,Math.PI*2);
    ctx.fill();
    if(this.carrying==='food'){
      ctx.fillStyle="#fff";
      ctx.fillRect(this.x,this.y,1,1);
    }
    if(this.carrying==='stone'){
      ctx.fillStyle="#aaa";
      ctx.fillRect(this.x-1,this.y-1,3,3);
    }
  }
}
