import {CONFIG} from './config.js';
import {canvas,ctx,wrapAngle,mod,dxT,dyT,dist2T,
        addResource,removeResource,updateObstacleGrid} from './world.js';

// ---------------------------------------------------------------------------
// Game entity helpers
// ---------------------------------------------------------------------------

// Represents a colony or team of ants
export class Faction{
  constructor(n,c,j){Object.assign(this,{n,c,j});}
}

// Central base used by a faction
export class Nest{
  constructor(x,y,f){Object.assign(this,{x,y,f,stock:0});}
  // draw nest circle and stock count
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
  // Generic pile of resources that ants can collect
  constructor(x,y,cap,type,color){
    Object.assign(this,{x,y,type,color});
    this.chunks=[];
    const R=CONFIG.FOOD_BASE_RADIUS;
    while(this.chunks.length<cap){
      const r=Math.sqrt(Math.random())*R;
      const t=Math.random()*Math.PI*2;
      const ox=Math.round(r*Math.cos(t));
      const oy=Math.round(r*Math.sin(t));
      this.chunks.push({ox,oy});
      addResource(mod(x+ox,canvas.width),mod(y+oy,canvas.height),type);
    }
  }
  get empty(){return this.chunks.length===0;}
  // remove a chunk near (x,y)
  takeNear(x,y,rad){
    if(this.empty)return false;
    const r2=rad*rad;
    for(let i=0;i<this.chunks.length;i++){
      const cx=mod(this.x+this.chunks[i].ox,canvas.width);
      const cy=mod(this.y+this.chunks[i].oy,canvas.height);
      if(dist2T(x,y,cx,cy)<=r2){
        const ch=this.chunks.splice(i,1)[0];
        removeResource(mod(this.x+ch.ox,canvas.width),mod(this.y+ch.oy,canvas.height),this.type);
        return true;
      }
    }
    return false;
  }
  // find any chunk near (x,y)
  detectChunk(x,y,rad){
    const r2=rad*rad;
    for(const ch of this.chunks){
      const cx=mod(this.x+ch.ox,canvas.width);
      const cy=mod(this.y+ch.oy,canvas.height);
      if(dist2T(x,y,cx,cy)<=r2)return{cx,cy};
    }
    return null;
  }
  // render each resource chunk
  draw(){
    ctx.fillStyle=this.color;
    for(const ch of this.chunks){
      ctx.fillRect(mod(this.x+ch.ox,canvas.width),mod(this.y+ch.oy,canvas.height),1,1);
    }
  }
}

export class Obstacle{
  // Static obstacle that ants can dig through
  constructor(x,y,r,type='circle',x2=0,y2=0){
    this.type=type;
    if(type==='circle'){
      Object.assign(this,{x,y,r});
    }else{
      Object.assign(this,{x1:x,y1:y,x2,y2,w:r});
      this.holes=[];
    }
    this.stone=(type==='circle'?r*5:Math.hypot(x2-x,y2-y));
    this.removed=false;
  }
  // render circle or line with holes
  draw(){
    ctx.fillStyle="#444";
    if(this.type==='circle'){
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
      ctx.fill();
    }else{
      ctx.strokeStyle="#444";
      ctx.lineWidth=this.w;
      const segs=[];
      let last=0;
      const sorted=this.holes.sort((a,b)=>a.start-b.start);
      for(const h of sorted){
        if(h.start>last) segs.push([last,h.start]);
        last=Math.max(last,h.end);
      }
      if(last<1) segs.push([last,1]);
      ctx.beginPath();
      for(const s of segs){
        const sx=this.x1+(this.x2-this.x1)*s[0];
        const sy=this.y1+(this.y2-this.y1)*s[0];
        const ex=this.x1+(this.x2-this.x1)*s[1];
        const ey=this.y1+(this.y2-this.y1)*s[1];
        ctx.moveTo(sx,sy);
        ctx.lineTo(ex,ey);
      }
      ctx.stroke();
    }
  }
  // merge a new hole interval into the line obstacle
  addHole(start,end){
    start=Math.max(0,start); end=Math.min(1,end);
    if(start>=end) return;
    const newH={start,end};
    const merged=[];
    for(const h of this.holes){
      if(end<h.start||start>h.end){
        merged.push(h);
      }else{
        start=Math.min(start,h.start);
        end=Math.max(end,h.end);
      }
    }
    merged.push({start,end});
    merged.sort((a,b)=>a.start-b.start);
    this.holes=merged;
    if(this.holes.length===1&&this.holes[0].start<=0&&this.holes[0].end>=1){
      this.removed=true;
    }
    updateObstacleGrid([this]);
  }
  // steer the ant away from the obstacle and optionally dig
  avoid(ant,forceDig=false){
    if(this.removed) return;
    let near=false,desired;
    let hitT=0;
    if(this.type==='circle'){
      const dx=dxT(ant.x,this.x),dy=dyT(ant.y,this.y);
      near=dx*dx+dy*dy<(this.r+CONFIG.DIG_DETECTION)*(this.r+CONFIG.DIG_DETECTION);
      desired=Math.atan2(dy,dx)+Math.PI;
    }else{
      const vx=this.x2-this.x1,vy=this.y2-this.y1;
      const len2=vx*vx+vy*vy;
      const t=Math.max(0,Math.min(1,((ant.x-this.x1)*vx+(ant.y-this.y1)*vy)/len2));
      const px=this.x1+vx*t,py=this.y1+vy*t;
      const dx=dxT(ant.x,px),dy=dyT(ant.y,py);
      const dist2=dx*dx+dy*dy;
      const inHole=this.holes.some(h=>t>=h.start&&t<=h.end && dist2<(this.w/2)*(this.w/2));
      near=dist2<(this.w/2+CONFIG.DIG_DETECTION)*(this.w/2+CONFIG.DIG_DETECTION) && !inHole;
      desired=Math.atan2(dy,dx)+Math.PI;
      hitT=t;
    }
    // steer away and optionally dig into the obstacle when close
    if(near){
      ant.angle+=wrapAngle(desired-ant.angle)*0.5;
      if(!ant.carrying&&this.stone>0&&(forceDig||ant.scanCountdown===0)){
        this.stone--;
        ant.carrying='stone';
        ant.state='return';
        ant.pherTimer=CONFIG.PHER_DURATION;
        if(this.type==='circle'){
          this.r=Math.max(2,this.r-CONFIG.DIG_AMOUNT);
          if(this.r<=2) this.removed=true;
        }else{
          this.addHole(hitT-CONFIG.DIG_HOLE/2,hitT+CONFIG.DIG_HOLE/2);
        }
        updateObstacleGrid([this]);
        if(this.stone<=0) this.removed=true;
      }
    }
  }
}

