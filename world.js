import {CONFIG} from './config.js';

// ---------------------------------------------------------------------------
// Canvas helpers and pheromone/road maps
// ---------------------------------------------------------------------------

export const canvas=document.getElementById('antCanvas');
export const ctx=canvas.getContext('2d');

// unified world grid -------------------------------------------------------
let gridW,gridH;
let roads,pherFood,pherStone,obstacles,resFood,resStone;

function initGrid(){
  gridW=Math.ceil(canvas.width/CONFIG.GRID_CELL);
  gridH=Math.ceil(canvas.height/CONFIG.GRID_CELL);
  roads=new Float32Array(gridW*gridH);
  pherFood=new Float32Array(gridW*gridH);
  pherStone=new Float32Array(gridW*gridH);
  obstacles=new Uint8Array(gridW*gridH);
  resFood=new Uint16Array(gridW*gridH);
  resStone=new Uint16Array(gridW*gridH);
}

export function resize(){
  // Called whenever the window size changes
  canvas.width=innerWidth;
  canvas.height=innerHeight;
  initGrid();
}
resize();
addEventListener('resize',resize);

// Utility math helpers -----------------------------------------------------
export const wrapAngle=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a};
export const mod=(x,range)=>((x%range)+range)%range;
export function dxT(ax,bx){
  // toroidal distance in x
  let d=bx-ax,w=canvas.width;if(d>w/2)d-=w;else if(d<-w/2)d+=w;return d;
}
export function dyT(ay,by){
  // toroidal distance in y
  let d=by-ay,h=canvas.height;if(d>h/2)d-=h;else if(d<-h/2)d+=h;return d;
}
export const dist2T=(ax,ay,bx,by)=>{
  const dx=dxT(ax,bx),dy=dyT(ay,by);return dx*dx+dy*dy;
};

// road pheromones -----------------------------------------------------------
export function gridIdx(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.GRID_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.GRID_CELL);
  return xi+yi*gridW;
}
export function depositRoad(x,y,a){
  // drop a road pheromone where the ant is walking
  const i=gridIdx(x,y);roads[i]=Math.min(1,roads[i]+a);
}
export function senseRoad(x,y){
  // examine neighbouring cells to see which direction contains the
  // strongest road pheromone concentration
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.GRID_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.GRID_CELL);
  let best=0,dir=0;
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const nx=(xi+dx+gridW)%gridW,ny=(yi+dy+gridH)%gridH,v=roads[nx+ny*gridW];
      if(v>best){best=v;dir=Math.atan2(dy,dx);}
    }
  }
  return{best,dir};
}
export function decayRoads(){
  for(let i=0;i<roads.length;i++) roads[i]*=CONFIG.ROAD_DECAY;
}
export function drawRoads(){
  for(let i=0;i<roads.length;i++){
    const v=roads[i];
    if(v>0.05){
      const x=(i%gridW)*CONFIG.GRID_CELL;
      const y=Math.floor(i/gridW)*CONFIG.GRID_CELL;
      ctx.fillStyle=`rgba(100,100,100,${v})`;
      ctx.fillRect(x,y,CONFIG.GRID_CELL,CONFIG.GRID_CELL);
    }
  }
}

// pheromone maps -----------------------------------------------------------
// get array index for pheromone cell
function pherIdx(x,y){
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.GRID_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.GRID_CELL);
  return xi+yi*gridW;
}
export function depositFoodPheromone(x,y,a){
  // leave a food pheromone on the map
  const i=pherIdx(x,y);pherFood[i]=Math.min(1,pherFood[i]+a);
}
export function depositStonePheromone(x,y,a){
  // leave a stone pheromone on the map
  const i=pherIdx(x,y);pherStone[i]=Math.min(1,pherStone[i]+a);
}
// scan neighbouring cells for the strongest food pheromone
export function senseFoodPheromone(x,y){
  // check nearby cells for food pheromone
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.GRID_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.GRID_CELL);
  let best=0,dir=0;
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const nx=(xi+dx+gridW)%gridW,ny=(yi+dy+gridH)%gridH,v=pherFood[nx+ny*gridW];
      if(v>best){best=v;dir=Math.atan2(dy,dx);}
    }
  }
  return{best,dir};
}
// scan neighbouring cells for the strongest stone pheromone
export function senseStonePheromone(x,y){
  // check nearby cells for stone pheromone
  const xi=Math.floor(mod(x,canvas.width)/CONFIG.GRID_CELL);
  const yi=Math.floor(mod(y,canvas.height)/CONFIG.GRID_CELL);
  let best=0,dir=0;
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const nx=(xi+dx+gridW)%gridW,ny=(yi+dy+gridH)%gridH,v=pherStone[nx+ny*gridW];
      if(v>best){best=v;dir=Math.atan2(dy,dx);}
    }
  }
  return{best,dir};
}
// fade pheromones each tick
export function decayPheromones(){
  for(let i=0;i<pherFood.length;i++){
    pherFood[i]*=CONFIG.PHER_DECAY;
    pherStone[i]*=CONFIG.PHER_DECAY;
  }
}
// render pheromone heatmaps
export function drawPheromones(){
  for(let i=0;i<pherFood.length;i++){
    const vf=pherFood[i],vs=pherStone[i];
    if(vf>0.05||vs>0.05){
      const x=(i%gridW)*CONFIG.GRID_CELL;
      const y=Math.floor(i/gridW)*CONFIG.GRID_CELL;
      if(vf>0.05){
        ctx.fillStyle=`rgba(255,215,0,${vf})`;
        ctx.fillRect(x,y,CONFIG.GRID_CELL,CONFIG.GRID_CELL);
      }
      if(vs>0.05){
        ctx.fillStyle=`rgba(180,180,180,${vs})`;
        ctx.fillRect(x,y,CONFIG.GRID_CELL,CONFIG.GRID_CELL);
      }
    }
  }
}

// obstacle grid ------------------------------------------------------------
function markCircle(ob){
  const cell=CONFIG.GRID_CELL;
  const minX=Math.floor((ob.x-ob.r)/cell);
  const maxX=Math.floor((ob.x+ob.r)/cell);
  const minY=Math.floor((ob.y-ob.r)/cell);
  const maxY=Math.floor((ob.y+ob.r)/cell);
  for(let xi=minX;xi<=maxX;xi++){
    for(let yi=minY;yi<=maxY;yi++){
      const gx=mod(xi,gridW),gy=mod(yi,gridH);
      const cx=gx*cell+cell/2,cy=gy*cell+cell/2;
      const dx=dxT(cx,ob.x),dy=dyT(cy,ob.y);
      if(dx*dx+dy*dy<=ob.r*ob.r) obstacles[gx+gy*gridW]=1;
    }
  }
}

function markLine(ob){
  const cell=CONFIG.GRID_CELL;
  const minX=Math.floor((Math.min(ob.x1,ob.x2)-ob.w/2)/cell);
  const maxX=Math.floor((Math.max(ob.x1,ob.x2)+ob.w/2)/cell);
  const minY=Math.floor((Math.min(ob.y1,ob.y2)-ob.w/2)/cell);
  const maxY=Math.floor((Math.max(ob.y1,ob.y2)+ob.w/2)/cell);
  const vx=ob.x2-ob.x1,vy=ob.y2-ob.y1;
  const len2=vx*vx+vy*vy;
  for(let xi=minX;xi<=maxX;xi++){
    for(let yi=minY;yi<=maxY;yi++){
      const gx=mod(xi,gridW),gy=mod(yi,gridH);
      const cx=gx*cell+cell/2,cy=gy*cell+cell/2;
      let t=((cx-ob.x1)*vx+(cy-ob.y1)*vy)/len2;
      t=Math.max(0,Math.min(1,t));
      const px=ob.x1+vx*t,py=ob.y1+vy*t;
      const dx=dxT(cx,px),dy=dyT(cy,py);
      const inHole=ob.holes&&ob.holes.some(h=>t>=h.start&&t<=h.end);
      if(!inHole&&dx*dx+dy*dy<=(ob.w/2)*(ob.w/2)) obstacles[gx+gy*gridW]=1;
    }
  }
}

export function updateObstacleGrid(obs){
  obstacles.fill(0);
  for(const ob of obs){
    if(ob.type==='circle') markCircle(ob); else markLine(ob);
  }
}

export function isBlocked(x,y){
  return obstacles[gridIdx(x,y)]>0;
}

// render obstacles based solely on the grid
export function drawObstacles(){
  ctx.fillStyle="#444";
  for(let i=0;i<obstacles.length;i++){
    if(!obstacles[i]) continue;
    const x=(i%gridW)*CONFIG.GRID_CELL;
    const y=Math.floor(i/gridW)*CONFIG.GRID_CELL;
    ctx.fillRect(x,y,CONFIG.GRID_CELL,CONFIG.GRID_CELL);
  }
}

// resource grid -------------------------------------------------------------
export function addResource(x,y,type){
  const i=gridIdx(x,y);
  if(type==='food') resFood[i]++; else resStone[i]++;
}

export function removeResource(x,y,type){
  const i=gridIdx(x,y);
  if(type==='food'){ if(resFood[i]>0) resFood[i]--; }
  else{ if(resStone[i]>0) resStone[i]--; }
}

export function resourceAt(x,y,type){
  const i=gridIdx(x,y);
  return type==='food'? resFood[i] : resStone[i];
}

export function updateResourceGrid(piles){
  resFood.fill(0); resStone.fill(0);
  for(const p of piles){
    for(const ch of p.chunks){
      const x=mod(p.x+ch.ox,canvas.width);
      const y=mod(p.y+ch.oy,canvas.height);
      const i=gridIdx(x,y);
      if(p.type==='food') resFood[i]++; else resStone[i]++;
    }
  }
}
