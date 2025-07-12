import {CONFIG} from './config.js';
import {canvas,ctx,wrapAngle,mod,dxT,dyT,dist2T,depositRoad,senseRoad,depositPheromone,sensePheromone} from './world.js';

export class Faction{
  constructor(n,c,j){Object.assign(this,{n,c,j});}
}

export class Nest{
  constructor(x,y,f){Object.assign(this,{x,y,f,stock:0});}
  draw(){
    ctx.fillStyle=this.f.c;
    ctx.beginPath();
    ctx.arc(this.x,this.y,6,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="#fff";
    ctx.font="10px monospace";
    ctx.fillText(this.stock,this.x+8,this.y+3);
  }
}

export class ResourcePile{
  constructor(x,y,cap,type,color){
    Object.assign(this,{x,y,type,color});
    this.chunks=[];
    const R=CONFIG.FOOD_BASE_RADIUS;
    while(this.chunks.length<cap){
      const r=Math.sqrt(Math.random())*R;
      const t=Math.random()*Math.PI*2;
      this.chunks.push({ox:Math.round(r*Math.cos(t)),oy:Math.round(r*Math.sin(t))});
    }
  }
  get empty(){return this.chunks.length===0;}
  takeNear(x,y,rad){
    if(this.empty)return false;
    const r2=rad*rad;
    for(let i=0;i<this.chunks.length;i++){
      const cx=mod(this.x+this.chunks[i].ox,canvas.width);
      const cy=mod(this.y+this.chunks[i].oy,canvas.height);
      if(dist2T(x,y,cx,cy)<=r2){
        this.chunks.splice(i,1);
        return true;
      }
    }
    return false;
  }
  detectChunk(x,y,rad){
    const r2=rad*rad;
    for(const ch of this.chunks){
      const cx=mod(this.x+ch.ox,canvas.width);
      const cy=mod(this.y+ch.oy,canvas.height);
      if(dist2T(x,y,cx,cy)<=r2)return{cx,cy};
    }
    return null;
  }
  draw(){
    ctx.fillStyle=this.color;
    for(const ch of this.chunks){
      ctx.fillRect(mod(this.x+ch.ox,canvas.width),mod(this.y+ch.oy,canvas.height),1,1);
    }
  }
}

export class Obstacle{
  constructor(x,y,r){Object.assign(this,{x,y,r});}
  draw(){
    ctx.fillStyle="#444";
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fill();
  }
}

export class Ant{
  constructor(x,y,f,nest){
    Object.assign(this,{x,y,f,nest});
    this.speed=CONFIG.MIN_SPEED+Math.random()*(CONFIG.MAX_SPEED-CONFIG.MIN_SPEED);
    this.angle=Math.random()*Math.PI*2;
    this.turnJitter=(0.8+Math.random()*0.4)*this.f.j;
    this.state='idle';
    this.ticks=0;
    this.carrying=null;
    this.scanCountdown=Math.floor(Math.random()*CONFIG.HEAVY_SCAN_INTERVAL);
  }
  heavyScan(){this.scanCountdown=CONFIG.HEAVY_SCAN_INTERVAL;return true;}
  update(ants,piles,obstacles,explRatio){
    if(--this.scanCountdown<0)this.heavyScan();
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
      if(rx||ry){this.angle+=wrapAngle(Math.atan2(ry,rx)-this.angle)*CONFIG.REPULSION_STRENGTH;}
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
        if(this.carrying==='food')this.nest.stock++;
        this.carrying=null;
        this.state='explore';
        this.ticks=CONFIG.POST_RETURN_WANDER;
      }
    }
    if(this.carrying==='stone'){
      depositRoad(this.x,this.y,CONFIG.ROAD_DEPOSIT);
    }else if(this.scanCountdown===0){
      const s=senseRoad(this.x,this.y);
      if(s.best>0.05)this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.ROAD_FOLLOW;
    }
    if(this.carrying==='food'){
      depositPheromone(this.x,this.y,CONFIG.PHER_DEPOSIT);
    }else if(this.scanCountdown===0){
      const s=sensePheromone(this.x,this.y);
      if(s.best>0.05)this.angle+=wrapAngle(s.dir-this.angle)*CONFIG.PHER_FOLLOW;
    }
    for(const ob of obstacles){
      const dx=dxT(this.x,ob.x),dy=dyT(this.y,ob.y);
      const rr=(ob.r+2)*(ob.r+2);
      if(dx*dx+dy*dy<rr){
        const desired=Math.atan2(dy,dx)+Math.PI;
        this.angle+=wrapAngle(desired-this.angle)*0.5;
      }
    }
    this.angle+=(Math.random()*2-1)*this.turnJitter;
    this.x=mod(this.x+Math.cos(this.angle)*this.speed,canvas.width);
    this.y=mod(this.y+Math.sin(this.angle)*this.speed,canvas.height);
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
