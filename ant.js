import {CONFIG} from './config.js';
import {canvas,ctx,wrapAngle,mod,dxT,dyT,dist2T,
        depositRoad,senseRoad,
        depositFoodPheromone,senseFoodPheromone,
        depositStonePheromone,senseStonePheromone} from './world.js';
import {ResourcePile} from './entities.js';

export class Ant{
  constructor(x,y,f,nest){
    Object.assign(this,{x,y,f,nest});
    this.speed=CONFIG.MIN_SPEED+Math.random()*(CONFIG.MAX_SPEED-CONFIG.MIN_SPEED);
    this.angle=Math.random()*Math.PI*2;
    this.turnJitter=(0.8+Math.random()*0.4)*this.f.j;
    this.state='idle';
    this.ticks=0;
    this.carrying=null;
    this.pherTimer=0;
    this.scanCountdown=Math.floor(Math.random()*CONFIG.HEAVY_SCAN_INTERVAL);
    this.prevX=x;
    this.prevY=y;
    this.stuck=0;
  }
  heavyScan(){this.scanCountdown=CONFIG.HEAVY_SCAN_INTERVAL;return true;}
  update(ants,piles,obstacles,explRatio){
    if(--this.scanCountdown<0)this.heavyScan();
    const moved=dist2T(this.prevX,this.prevY,this.x,this.y);
    if(moved<1) this.stuck++; else this.stuck=0;
    if(this.state==='idle'&&explRatio<CONFIG.EXPLORE_MAX_RATIO&&Math.random()<CONFIG.EXPLORE_CHANCE){
      this.state='explore';
      this.ticks=Math.floor(CONFIG.EXPLORE_TIME_MIN+Math.random()*(CONFIG.EXPLORE_TIME_MAX-CONFIG.EXPLORE_TIME_MIN));
    }
    if(this.scanCountdown===0){
      let ax=0,ay=0,c=0,rx=0,ry=0;
      for(const o of ants){
        if(o===this||o.f!==this.f)continue;
        const dx=dxT(this.x,o.x),dy=dyT(this.y,o.y),d2=dx*dx+dy*dy;
        if(d2<CONFIG.COHESION_DIST*CONFIG.COHESION_DIST){ax+=this.x+dx;ay+=this.y+dy;c++;}
        if(d2<CONFIG.REPULSION_DIST*CONFIG.REPULSION_DIST){rx-=dx;ry-=dy;}
      }
      if(c){ax/=c;ay/=c;this.angle+=wrapAngle(Math.atan2(dyT(this.y,ay),dxT(this.x,ax))-this.angle)*CONFIG.COHESION_STRENGTH;}
      if(rx||ry){let mult=1+c/5;this.angle+=wrapAngle(Math.atan2(ry,rx)-this.angle)*CONFIG.REPULSION_STRENGTH*mult;}
    }
    if(this.state==='idle'){
      this.attractNest(-CONFIG.NEST_REPEL_IDLE);
    }
    if(this.state==='explore'){
      this.attractNest(-CONFIG.NEST_REPEL_EXPLORING);
      if(this.scanCountdown===0){
        for(const p of piles){
          if(p.empty)continue;
          if(dist2T(this.x,this.y,p.x,p.y)>(CONFIG.FOOD_DETECT_RADIUS+CONFIG.FOOD_BASE_RADIUS)**2)continue;
          const tgt=p.detectChunk(this.x,this.y,CONFIG.FOOD_DETECT_RADIUS);
          if(tgt){
            const desired=Math.atan2(dyT(this.y,tgt.cy),dxT(this.x,tgt.cx));
            this.angle+=wrapAngle(desired-this.angle)*0.18;
            break;
          }
        }
      }
      if(this.scanCountdown===0){
        for(const p of piles){
          if(p.takeNear(this.x,this.y,CONFIG.FOOD_PICKUP_RADIUS)){
            this.carrying=p.type;
            this.pherTimer=CONFIG.PHER_DURATION;
            this.state='return';
            break;
          }
        }
      }
      if(--this.ticks<=0&&this.state==='explore')this.state='return';
    }
    if(this.state==='return'){
      this.attractNest(CONFIG.NEST_ATTRACTION_RETURN);
      if(dist2T(this.x,this.y,this.nest.x,this.nest.y)<400){
        if(this.carrying==='food'){
          this.nest.stock++;
        }else if(this.carrying==='stone'){
          piles.push(new ResourcePile(this.nest.x,this.nest.y,1,'stone','rgba(200,200,200,0.9)'));
        }
        this.carrying=null;
        this.pherTimer=0;
        this.state='explore';
        this.ticks=CONFIG.POST_RETURN_WANDER;
      }
    }
    if(this.carrying==='stone'){
      depositRoad(this.x,this.y,CONFIG.ROAD_DEPOSIT);
      if(this.pherTimer>0){
        depositStonePheromone(this.x,this.y,CONFIG.PHER_DEPOSIT);
        this.pherTimer--;}
    }else if(this.scanCountdown===0){
      const s=senseRoad(this.x,this.y);
      if(s.best>0.05)this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.ROAD_FOLLOW;
    }
    if(this.carrying==='food'){
      if(this.pherTimer>0){
        depositFoodPheromone(this.x,this.y,CONFIG.PHER_DEPOSIT);
        this.pherTimer--;}
    }else if(this.scanCountdown===0){
      const s=senseFoodPheromone(this.x,this.y);
      if(s.best>0.05)this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.PHER_FOLLOW;
      const ss=senseStonePheromone(this.x,this.y);
      if(ss.best>0.05)this.angle+=wrapAngle(ss.dir-this.angle)*CONFIG.PHER_FOLLOW*0.5;
    }
    for(const ob of obstacles){
      ob.avoid(this,this.stuck>CONFIG.STUCK_THRESHOLD);
    }
    this.angle+=(Math.random()*2-1)*this.turnJitter;
    this.x=mod(this.x+Math.cos(this.angle)*this.speed,canvas.width);
    this.y=mod(this.y+Math.sin(this.angle)*this.speed,canvas.height);
    this.prevX=this.x;
    this.prevY=this.y;
  }
  attractNest(k){
    const dx=dxT(this.x,this.nest.x),dy=dyT(this.y,this.nest.y);
    this.angle+=wrapAngle(Math.atan2(dy,dx)-this.angle)*k;
  }
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
