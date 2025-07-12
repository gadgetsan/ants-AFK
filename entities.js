import {CONFIG} from './config.js';
import {canvas,ctx,wrapAngle,mod,dxT,dyT,dist2T} from './world.js';

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
  constructor(x,y,r,type='circle',x2=0,y2=0){
    this.type=type;
    if(type==='circle'){
      Object.assign(this,{x,y,r});
    }else{
      Object.assign(this,{x1:x,y1:y,x2,y2,w:r});
    }
    this.stone=(type==='circle'?r*5:Math.hypot(x2-x,y2-y));
    this.removed=false;
  }
  draw(){
    ctx.fillStyle="#444";
    if(this.type==='circle'){
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
      ctx.fill();
    }else{
      ctx.strokeStyle="#444";
      ctx.lineWidth=this.w;
      ctx.beginPath();
      ctx.moveTo(this.x1,this.y1);
      ctx.lineTo(this.x2,this.y2);
      ctx.stroke();
    }
  }
  avoid(ant){
    let near=false,desired;
    if(this.type==='circle'){
      const dx=dxT(ant.x,this.x),dy=dyT(ant.y,this.y);
      near=dx*dx+dy*dy<(this.r+2)*(this.r+2);
      desired=Math.atan2(dy,dx)+Math.PI;
    }else{
      const vx=this.x2-this.x1,vy=this.y2-this.y1;
      const len2=vx*vx+vy*vy;
      const t=Math.max(0,Math.min(1,((ant.x-this.x1)*vx+(ant.y-this.y1)*vy)/len2));
      const px=this.x1+vx*t,py=this.y1+vy*t;
      const dx=dxT(ant.x,px),dy=dyT(ant.y,py);
      near=dx*dx+dy*dy<(this.w/2+2)*(this.w/2+2);
      desired=Math.atan2(dy,dx)+Math.PI;
    }
    if(near){
      ant.angle+=wrapAngle(desired-ant.angle)*0.5;
      if(!ant.carrying&&this.stone>0&&ant.scanCountdown===0){
        this.stone--;
        ant.carrying='stone';
        if(this.type==='circle')this.r=Math.max(2,this.r-0.3);
        else this.w=Math.max(1,this.w-0.1);
        if(this.stone<=0)this.removed=true;
      }
    }
  }
}

