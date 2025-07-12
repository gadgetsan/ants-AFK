import {CONFIG} from './config.js';

export const canvas=document.getElementById('antCanvas');
export const ctx=canvas.getContext('2d');

let roadW,roadH,roads;
let pherW,pherH,pheromones;

function initRoads(){
  roadW=Math.ceil(canvas.width/CONFIG.ROAD_CELL);
  roadH=Math.ceil(canvas.height/CONFIG.ROAD_CELL);
  roads=new Float32Array(roadW*roadH);
}

function initPheromones(){
  pherW=Math.ceil(canvas.width/CONFIG.PHER_CELL);
  pherH=Math.ceil(canvas.height/CONFIG.PHER_CELL);
  pheromones=new Float32Array(pherW*pherH);
}

export function resize(){
  canvas.width=innerWidth;
  canvas.height=innerHeight;
  initRoads();
  initPheromones();
}
resize();
addEventListener('resize',resize);

export const wrapAngle=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a};
export const mod=(x,range)=>((x%range)+range)%range;
export function dxT(ax,bx){let d=bx-ax,w=canvas.width;if(d>w/2)d-=w;else if(d<-w/2)d+=w;return d;}
export function dyT(ay,by){let d=by-ay,h=canvas.height;if(d>h/2)d-=h;else if(d<-h/2)d+=h;return d;}
export const dist2T=(ax,ay,bx,by)=>{const dx=dxT(ax,bx),dy=dyT(ay,by);return dx*dx+dy*dy;};

function roadIdx(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.ROAD_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.ROAD_CELL);
  return (xi+yi*roadW)%roads.length;
}
export function depositRoad(x,y,a){const i=roadIdx(x,y);roads[i]=Math.min(1,roads[i]+a);}
export function senseRoad(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.ROAD_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.ROAD_CELL);
  let best=0,dir=0;
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const nx=(xi+dx+roadW)%roadW,ny=(yi+dy+roadH)%roadH,v=roads[nx+ny*roadW];
      if(v>best){best=v;dir=Math.atan2(dy,dx);}
    }
  }
  return{best,dir};
}
export function decayRoads(){for(let i=0;i<roads.length;i++)roads[i]*=CONFIG.ROAD_DECAY;}
export function drawRoads(){
  for(let i=0;i<roads.length;i++){
    const v=roads[i];
    if(v>0.05){
      const x=(i%roadW)*CONFIG.ROAD_CELL;
      const y=Math.floor(i/roadW)*CONFIG.ROAD_CELL;
      ctx.fillStyle=`rgba(100,100,100,${v})`;
      ctx.fillRect(x,y,CONFIG.ROAD_CELL,CONFIG.ROAD_CELL);
    }
  }
}

function pherIdx(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.PHER_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.PHER_CELL);
  return (xi+yi*pherW)%pheromones.length;
}
export function depositPheromone(x,y,a){const i=pherIdx(x,y);pheromones[i]=Math.min(1,pheromones[i]+a);}
export function sensePheromone(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.PHER_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.PHER_CELL);
  let best=0,dir=0;
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const nx=(xi+dx+pherW)%pherW,ny=(yi+dy+pherH)%pherH,v=pheromones[nx+ny*pherW];
      if(v>best){best=v;dir=Math.atan2(dy,dx);}
    }
  }
  return{best,dir};
}
export function decayPheromones(){for(let i=0;i<pheromones.length;i++)pheromones[i]*=CONFIG.PHER_DECAY;}
export function drawPheromones(){
  for(let i=0;i<pheromones.length;i++){
    const v=pheromones[i];
    if(v>0.05){
      const x=(i%pherW)*CONFIG.PHER_CELL;
      const y=Math.floor(i/pherW)*CONFIG.PHER_CELL;
      ctx.fillStyle=`rgba(255,50,50,${v})`;
      ctx.fillRect(x,y,CONFIG.PHER_CELL,CONFIG.PHER_CELL);
    }
  }
}
