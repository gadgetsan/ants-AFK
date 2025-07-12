import {canvas,updateResourceGrid} from './world.js';
import {CONFIG} from './config.js';
import {Sim} from './sim.js';
import {ResourcePile} from './entities.js';

const sim=new Sim();

canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  const y=e.clientY-r.top;
  if(e.shiftKey) sim.piles.push(new ResourcePile(x,y,CONFIG.STONE_PILE_CAPACITY,'stone','rgba(200,200,200,0.9)'));
  else sim.piles.push(new ResourcePile(x,y,CONFIG.FOOD_PILE_CAPACITY,'food','rgba(255,215,0,0.9)'));
  updateResourceGrid(sim.piles);
});
let STEPS_PER_FRAME=5;
addEventListener('keydown',e=>{
  if(e.key==='+') STEPS_PER_FRAME=Math.min(100,STEPS_PER_FRAME*2);
  if(e.key==='-') STEPS_PER_FRAME=Math.max(1,STEPS_PER_FRAME/2);
});
function loop(){
  for(let i=0;i<STEPS_PER_FRAME;i++) sim.update();
  sim.draw();
  requestAnimationFrame(loop);
}
loop();
