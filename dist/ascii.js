(()=>{'use strict';
// Interactive ASCII background (from -ASCII-001-Hero v2), painted on the surround behind the sheet.
const hero=document.querySelector('.ascii-bg'),canvas=hero.querySelector('canvas'),ctx=canvas.getContext('2d'),sheet=document.querySelector('.sheet');
const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
// Only the portfolio's palette tokens, kept low-contrast on the surround: faint muted dots at rest,
// accent paint with a muted rim (no blended in-between colors).
// Marks step through · • + ✦ ✳ ⁕ as paint builds and back down as it dries. Click sparks reuse the same ramp.
const SPARK_LEVEL={'·':.05,'.':.05,'˚':.22,':':.22,'+':.42,'*':.75,'×':.95};
let w=0,h=0,cells=[],bursts=[],raf=0,last=0,until=0;
const pointer={x:-999,y:-999,active:false,moved:0};let down=null;
// The brush tip trails the pointer slightly, so quick flicks bend into curves instead of corners.
const brush={x:0,y:0,down:false,w:0,v:0,len:0,id:0};let cols=0,rows=0,space=18;
const hash=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a)};
function wake(){until=performance.now()+1000;if(!raf)raf=requestAnimationFrame(frame)}
function resize(){w=hero.clientWidth;h=hero.clientHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);if(fctx){fgCanvas.width=canvas.width;fgCanvas.height=canvas.height;fctx.setTransform(d,0,0,d,0,0)}cells=[];space=w<600?16:18;cols=Math.ceil((w-space/2)/space);rows=Math.ceil((h-space/2)/space);for(let y=space/2;y<h;y+=space)for(let x=space/2;x<w;x+=space){const id=cells.length;cells.push({x,y,e:0,dx:0,dy:0,ux:1,uy:0,wet:0,rim:1,seed:hash(id),decay:900+hash(id+17)*1100})}brush.down=false;wake()}

const ACCENT='#c1c7a5',MUTED='#777965',REST_ALPHA=.5;
function ink(x,y,energy){return energy>.6?ACCENT:MUTED}
// The stroke core is accent; its outer rim and drying tail fall back to muted.
function paint(c){return c.rim<.5&&c.e>.6?ACCENT:MUTED}
const ease=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// The mark ramp, light to full: ·  •  +  ✦  ✳  ⁕ — drawn as hairline shapes so they match on every device.
// level 0..1 picks the stage; within a stage the mark eases up from 85% so each step lands softly.
const STAGES=6;
function spokes(n,len,turn=0,g=ctx){g.beginPath();for(let k=0;k<n;k++){const a=turn+k*Math.PI/n,x=Math.cos(a)*len,y=Math.sin(a)*len;g.moveTo(-x,-y);g.lineTo(x,y)}g.stroke()}
function mark(level,spin,g=ctx,lw=.75){
 const at=Math.min(STAGES-1e-6,Math.max(0,level)*STAGES),stage=Math.floor(at),grow=.85+.15*ease(at-stage);
 g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';
 if(stage===0){g.beginPath();g.arc(0,0,.8*grow,0,Math.PI*2);g.fill();return}            // ·
 if(stage===1){g.beginPath();g.arc(0,0,1.6*grow,0,Math.PI*2);g.fill();return}            // •
 g.scale(grow,grow);
 if(stage===2){spokes(2,2.8,0,g);return}                                                          // +
 if(stage===3){const r=3.6,q=.9;g.beginPath();g.moveTo(0,-r);g.quadraticCurveTo(q*.3,-q*.3,r,0);g.quadraticCurveTo(q*.3,q*.3,0,r);g.quadraticCurveTo(-q*.3,q*.3,-r,0);g.quadraticCurveTo(-q*.3,-q*.3,0,-r);g.fill();return} // ✦
 g.rotate(spin*.15);
 if(stage===4){spokes(4,3.8,0,g);return}                                                          // ✳
 spokes(2,2.2,Math.PI/4,g);                                                                       // ⁕
 for(let k=0;k<4;k++){const a=k*Math.PI/2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*3.4,Math.sin(a)*3.4);g.stroke();g.beginPath();g.arc(Math.cos(a)*4.1,Math.sin(a)*4.1,.75,0,Math.PI*2);g.fill()}
}
function tilt(age,seed,strength){
 if(reduced||age<0||age>650)return 0;
 return Math.sin(age/85)*Math.exp(-age/190)*(seed>.5?1:-1)*.42*strength;
}
// A click claims existing cells. There is no second particle rendering pass.
function clickAt(x,y,now){
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];if(now-b.t<900&&Math.hypot(x-b.x,y-b.y)<49)return b}
 return null;
}
function clickGlyph(b,x,y,now,center=false){
 const age=now-b.t,distance=Math.hypot(x-b.x,y-b.y);
 if(center)return age<75?'*':age<250?'×':age<520?(Math.floor((age-250)/85)%2?'×':'+'):age<650?'*':age<760?'+':age<830?':':'.';
 const arrival=65+distance*2.8;
 if(age<arrival)return '.';
 const ring=distance<22?0:distance<37?1:2;
 if(age<520){
  if(ring===2)return age-arrival<125?'˚':'.';
  if(ring===1)return age-arrival<145?'+':':';
  return age-arrival<155?'*':'+';
 }
 const decay=['*','+',':','.','·'];
 return decay[Math.min(4,ring+Math.floor((age-520)/76))];
}
function poke(x,y){
 let nearest=null,dist=Infinity;
 for(const c of cells){const d=Math.hypot(x-c.x,y-c.y);if(d<dist){nearest=c;dist=d}}
 if(nearest){bursts.push({x:nearest.x,y:nearest.y,t:performance.now()});wake()}
}
// One dab of the brush: a soft core with faint bristle streaks. It only sets how wet each
// cell should be; the cell eases towards that level itself, so the paint flows in.
function dab(x,y,r,ux,uy){
 const c0=Math.max(0,Math.floor((x-r)/space)),c1=Math.min(cols-1,Math.floor((x+r)/space));
 const r0=Math.max(0,Math.floor((y-r)/space)),r1=Math.min(rows-1,Math.floor((y+r)/space));
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
  const c=cells[row*cols+col];if(!c)continue;
  const dx=c.x-x,dy=c.y-y,edge=r*(.82+c.seed*.3),d=Math.hypot(dx,dy);if(d>edge)continue;
  const bristle=hash(Math.round((dx*-uy+dy*ux)/7)*12.9898+brush.id*78.233);
  const v=(1-Math.pow(d/edge,2.2))*(.8+.2*bristle);
  if(v<=c.wet)continue;
  c.wet=v;c.rim=d/edge;
  // Paint parts around the stroke and drifts the way the brush travelled.
  const nx=d?dx/d:0,ny=d?dy/d:0,px=nx*.8+ux*.6,py=ny*.8+uy*.6,m=Math.hypot(px,py)||1;
  c.ux=px/m;c.uy=py/m;
 }
}
function stroke(dt,now){
 if(!pointer.active){brush.down=false;return false}
 if(!brush.down){Object.assign(brush,{x:pointer.x,y:pointer.y,down:true,w:0,v:0,len:0,id:brush.id+1})}
 const px=brush.x,py=brush.y,follow=Math.min(1,dt/20);
 brush.x+=(pointer.x-brush.x)*follow;brush.y+=(pointer.y-brush.y)*follow;
 const sx=brush.x-px,sy=brush.y-py,seg=Math.hypot(sx,sy);
 // Thickness follows speed: a slow drag is a fine line, a fast sweep swells wide.
 brush.v+=(seg/Math.max(dt,1)-brush.v)*Math.min(1,dt/70);
 const min=w<600?8:10,max=w<600?30:42,k=Math.min(1,brush.v/2.4);
 const target=min+(max-min)*k*k*(3-2*k);
 const w0=brush.w;
 brush.w+=(target-brush.w)*Math.min(1,dt/90);
 // Resting lifts the brush; the next movement starts a fresh stroke.
 if(seg<.25){if(now-pointer.moved>140)brush.down=false;return brush.w>min+.5||Math.hypot(pointer.x-brush.x,pointer.y-brush.y)>.5}
 const ux=sx/seg,uy=sy/seg,steps=Math.max(1,Math.ceil(seg/4));
 for(let i=1;i<=steps;i++){const t=i/steps;dab(px+sx*t,py+sy*t,w0+(brush.w-w0)*t,ux,uy)}
 brush.len+=seg;
 return true;
}
// Foreground sparkle grid: over the sheet only, on every other background grid point so the two layers
// stay aligned. Moving the cursor lights a loose scatter of cells around its path — wider and denser the
// faster it moves. Each cell pops in as one of five marks (·  small ○  ○  *  ✳) at its own size and
// strength, then steps down that ladder in place as it fades. Nothing stays under a resting cursor.
// Its own small loop sleeps when empty; it is off under reduced motion.
const fgCanvas=document.querySelector('.ascii-fg canvas'),fctx=fgCanvas&&fgCanvas.getContext('2d');
let lit=new Map(),fgRaf=0,prev=null;
const SHAPES=5;
function overSheet(x,y){if(!sheet)return false;const r=sheet.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
function fgWake(){if(fctx&&!fgRaf)fgRaf=requestAnimationFrame(fgFrame)}
function sparkle(g,shape,lw){
 g.lineWidth=lw;g.lineCap='round';g.beginPath();
 if(shape===0){g.arc(0,0,.9,0,Math.PI*2);g.fill();return}                    // ·
 if(shape===1||shape===2){g.arc(0,0,shape===1?1.6:2.7,0,Math.PI*2);g.stroke();return} // ○
 const n=shape===3?3:4,len=shape===3?2.6:4.3;                                  // *  ✳
 for(let k=0;k<n;k++){const a=Math.PI/2+k*Math.PI/n,x=Math.cos(a)*len,y=Math.sin(a)*len;g.moveTo(-x,-y);g.lineTo(x,y)}
 g.stroke();
}
function track(x,y){
 if(!fctx||reduced)return;
 const now=performance.now();
 if(!overSheet(x,y)){prev=null;return}
 const dist=prev?Math.hypot(x-prev.x,y-prev.y):0,dt=prev?Math.max(8,now-prev.t):16;
 prev={x,y,t:now};if(dist<1)return;
 const speed=Math.min(1,dist/dt/1.4),step=space*2,reach=(1.1+speed*1.2)*step,chance=.06+speed*.2;
 const c0=Math.round((x-space/2)/step),r0=Math.round((y-space/2)/step),span=Math.ceil(reach/step);
 for(let row=r0-span;row<=r0+span;row++)for(let col=c0-span;col<=c0+span;col++){
  const cx=space/2+col*step,cy=space/2+row*step,d=Math.hypot(cx-x,cy-y);if(d>reach)continue;
  const key=col+','+row,old=lit.get(key);if(old&&now-old.t<old.life*.5)continue;
  const near=1-d/reach;if(Math.random()>chance*(.35+near))continue;
  // Bigger marks land close to the cursor and on fast strokes; the edges get dots and small rings.
  const shape=Math.max(0,Math.min(SHAPES-1,Math.floor(near*2+speed*1.1+Math.random()*1.9)));
  lit.set(key,{x:cx,y:cy,t:now,shape,life:650+Math.random()*650+speed*300,size:.8+Math.random()*.5,
   alpha:.3+near*.5+Math.random()*.2,color:Math.random()<.22?INK_C:MUTED,tilt:(Math.random()-.5)*.5});
 }
 fgWake();
}
const INK_C='#41482d';
function fgFrame(now){
 fgRaf=0;fctx.clearRect(0,0,w,h);
 for(const [k,c] of lit)if(now-c.t>=c.life)lit.delete(k);
 if(!lit.size)return;
 const r=sheet.getBoundingClientRect();
 fctx.save();fctx.beginPath();fctx.rect(r.left,r.top,r.width,r.height);fctx.clip();
 for(const c of lit.values()){
  const age=now-c.t,k=age/c.life,pop=ease(Math.min(1,age/90));
  const shape=Math.max(0,c.shape-Math.floor(k*(c.shape+1)*.9));   // step down the ladder as it fades
  fctx.globalAlpha=Math.min(1,c.alpha*Math.pow(1-k,1.1)*pop);if(fctx.globalAlpha<.02)continue;
  fctx.fillStyle=fctx.strokeStyle=c.color;
  const sc=c.size*(.6+.4*pop);
  fctx.save();fctx.translate(c.x,c.y);fctx.rotate(c.tilt);fctx.scale(sc,sc);sparkle(fctx,shape,.85/sc);fctx.restore();
 }
 fctx.restore();fctx.globalAlpha=1;
 fgRaf=requestAnimationFrame(fgFrame);
}
function frame(now){raf=0;const dt=Math.min(now-(last||now-16),40);last=now;ctx.clearRect(0,0,w,h);let unsettled=stroke(dt,now);
bursts=bursts.filter(b=>now-b.t<900);
for(let i=0;i<cells.length;i++){
 const c=cells[i];
 // Wet paint flows in quickly, then dries unevenly so the tail feathers out.
 if(c.wet>0||c.e>0){
  if(c.wet>c.e){if(c.e<.065&&c.wet>=.065)c.entered=now;c.e+=(c.wet-c.e)*Math.min(1,dt/45)}else c.e=c.wet;
  c.wet=Math.max(0,c.wet-dt/c.decay);unsettled=true;
 }
 let level=c.e>.025?Math.min(1,(c.e-.025)*1.4):null;
 let color=c.e>.001?paint(c):ink(c.x,c.y,0),alpha=c.e>.001?1:REST_ALPHA;
 const click=clickAt(c.x,c.y,now);
 if(click){
  level=SPARK_LEVEL[clickGlyph(click,c.x,c.y,now,c.x===click.x&&c.y===click.y)]??.1;
  color=ink(c.x,c.y,Math.min(.85,(900-(now-click.t))/380)*(1-Math.hypot(c.x-click.x,c.y-click.y)/78));alpha=1;
 }
 ctx.globalAlpha=alpha;ctx.fillStyle=ctx.strokeStyle=color;
 // Rotate around each cell's anchor. Clicks retain their slots.
 const age=now-(c.entered??-10000);
 const angle=click?0:tilt(age,c.seed,Math.min(1,c.e*3));
 const force=reduced||click?0:Math.sin(c.e*Math.PI)*3.2;
 const tx=c.ux*force,ty=c.uy*force;
 c.dx+=(tx-c.dx)*Math.min(1,dt/55);c.dy+=(ty-c.dy)*Math.min(1,dt/55);
 if(Math.abs(c.dx-tx)+Math.abs(c.dy-ty)>.02||(!reduced&&age<650&&c.e>.025))unsettled=true;
 if(level!=null){
  ctx.save();ctx.translate(c.x+(click?0:c.dx),c.y+(click?0:c.dy));ctx.rotate(angle);
  if(!reduced&&click&&c.x===click.x&&c.y===click.y){const age=now-click.t,scale=age<75?.9:1+Math.sin(Math.min(1,(age-75)/180)*Math.PI)*.08;ctx.scale(scale,scale)}
  mark(level,c.seed*Math.PI);ctx.restore();
 }else{ctx.beginPath();ctx.arc(c.x+c.dx,c.y+c.dy,.72,0,Math.PI*2);ctx.fill()}
 ctx.globalAlpha=1;
}
if(bursts.length||unsettled||now<until)raf=requestAnimationFrame(frame);else last=0;
}
const onSheet=e=>sheet&&sheet.contains(e.target);
function move(e){pointer.x=e.clientX;pointer.y=e.clientY;track(e.clientX,e.clientY);pointer.active=true;pointer.moved=performance.now();if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)down.drag=true;wake()}
// Listen on the window so the sheet stays fully interactive; clicks only spark on the surround.
addEventListener('pointermove',move,{passive:true});addEventListener('pointerdown',e=>{if(e.button!==0)return;move(e);down=onSheet(e)?null:{x:e.clientX,y:e.clientY,drag:false}},{passive:true});
addEventListener('pointerup',e=>{if(down&&!down.drag&&!onSheet(e)){poke(e.clientX,e.clientY)}down=null;if(e.pointerType!=='mouse'){pointer.active=false;wake()}},{passive:true});
function leave(){pointer.active=false;down=null;prev=null;wake()}document.documentElement.addEventListener('pointerleave',()=>{if(!down)leave()});addEventListener('pointercancel',leave);addEventListener('blur',leave);
motion.addEventListener('change',e=>{reduced=e.matches;wake()});window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;pointer.active=false}else wake()});resize();
})();
