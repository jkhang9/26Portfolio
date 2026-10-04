(()=>{'use strict';
// Interactive ASCII background (from -ASCII-001-Hero v2), painted on the surround behind the sheet.
const hero=document.querySelector('.ascii-bg'),canvas=hero.querySelector('canvas'),ctx=canvas.getContext('2d'),sheet=document.querySelector('.sheet');
const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
// Only the portfolio's palette tokens, kept low-contrast on the surround: faint muted dots at rest,
// accent paint with a muted rim (no blended in-between colors).
// Marks step through · • + ✦ ✳ ⁕ as paint builds and back down as it dries. Click sparks reuse the same ramp.
let w=0,h=0,cells=[],bursts=[],raf=0,last=0,until=0;
const pointer={x:-999,y:-999,active:false,moved:0};let down=null;
// The brush tip trails the pointer slightly, so quick flicks bend into curves instead of corners.
const brush={x:0,y:0,down:false,w:0,v:0,len:0,id:0};let cols=0,rows=0,space=18;
const hash=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a)};
function wake(){until=performance.now()+1000;if(!raf)raf=requestAnimationFrame(frame)}
function resize(){w=hero.clientWidth;h=hero.clientHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);if(fctx){fgCanvas.width=canvas.width;fgCanvas.height=canvas.height;fctx.setTransform(d,0,0,d,0,0)}cells=[];space=w<600?16:18;cols=Math.ceil((w-space/2)/space);rows=Math.ceil((h-space/2)/space);for(let y=space/2;y<h;y+=space)for(let x=space/2;x<w;x+=space){const id=cells.length;cells.push({x,y,e:0,dx:0,dy:0,ux:1,uy:0,wet:0,rim:1,seed:hash(id),decay:420+hash(id+17)*480})}brush.down=false;wake()}

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
// Click sparkle: three marks on the dot grid next to the click. Like the brush trail, each mark follows a
// continuous eased level and is drawn with the trail's own ramp (· • + ✦ ✳ ⁕, growing within each stage),
// so the speed is even frame to frame. Near the peak it becomes its own final asterisk (one of seventeen).
// U+FE0E asks for the text (not emoji) form; Asterisk Symbols covers ✱✲✳✻✼✽ and system symbol fonts the rest.
const SPARK_LIFE=900,SPARK_FONT='"Asterisk Symbols","Apple Symbols","Segoe UI Symbol","Noto Sans Symbols 2","Noto Sans Symbols","DejaVu Sans","Commit Mono",sans-serif';
const VS='︎',FINALS=['*','✱','✳','✲','✽','✻','✼','⁕','✣','✤','✥','✦','✧','✶','✷','✸','✵'];
const RISE=200,FALL=380,PEAK_AT=.86;
const easeOut=t=>1-Math.pow(1-t,3),easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function sparkLevel(t){
 if(t<0)return null;
 if(t<RISE)return easeOut(t/RISE);
 const k=(t-RISE)/FALL;return k>=1?null:1-easeInOut(k);
}
function sparkle(g,b,now){
 const age=now-b.t;
 for(const p of b.pts){
  const lv=sparkLevel(age-p.d);if(lv==null||lv<.02)continue;
  g.save();g.translate(b.x+p.x,b.y+p.y);
  if(lv>=PEAK_AT){
   const k=.8+.2*(lv-PEAK_AT)/(1-PEAK_AT);
   g.textAlign='center';g.textBaseline='middle';g.font=`400 ${(p.s*k).toFixed(1)}px ${SPARK_FONT}`;g.fillText(p.peak+VS,0,0);
  }else mark(Math.min(lv/PEAK_AT,.999),p.seed,g);
  g.restore();
 }
}
// Grid cells within two of the click, minus the click itself and the wedge the arrow cursor covers
// (down-right of its tip).
const SPOTS=[];for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)if(!(c>=0&&r>=0)&&Math.hypot(c,r)<=2.3)SPOTS.push([c,r]);
function poke(x,y){
 // Snap to the dot grid and pick three cells that never line up, so the sparkle opens on several sides.
 const col=Math.round((x-space/2)/space),row=Math.round((y-space/2)/space);
 const any=()=>SPOTS[Math.floor(Math.random()*SPOTS.length)];
 let pick;
 for(let n=0;n<40;n++){
  const [a,b,c]=[any(),any(),any()];
  const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]));             // 0 when collinear
  const near=[[a,b],[b,c],[a,c]].every(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])>=1);    // no repeats
  const sides=new Set([a,b,c].map(([dc,dr])=>Math.sign(dc)+','+Math.sign(dr))).size;  // spread around the click
  if(area>=1&&near&&sides>=2){pick=[a,b,c];break}
 }
 pick=pick||[[-1,0],[0,-1],[-2,-1]];
 pick.sort((p,q)=>Math.hypot(...p)-Math.hypot(...q));
 const mk=([dc,dr],d,s)=>({x:space/2+(col+dc)*space-x,y:space/2+(row+dr)*space-y,d,s:s+(Math.random()-.5)*3,peak:FINALS[Math.floor(Math.random()*FINALS.length)],seed:Math.random()*Math.PI});
 bursts.push({x,y,t:performance.now(),pts:[mk(pick[0],0,16),mk(pick[1],40,12),mk(pick[2],80,12)]});
 if(!raf)raf=requestAnimationFrame(frame);wake();
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
 // The brush keeps the fine, slow-drag width at every speed, so strokes stay a light scatter.
 brush.v+=(seg/Math.max(dt,1)-brush.v)*Math.min(1,dt/70);
 const min=w<600?8:10,target=min;
 const w0=brush.w;
 brush.w+=(target-brush.w)*Math.min(1,dt/90);
 // Resting lifts the brush; the next movement starts a fresh stroke.
 if(seg<.25){if(now-pointer.moved>140)brush.down=false;return brush.w>min+.5||Math.hypot(pointer.x-brush.x,pointer.y-brush.y)>.5}
 const ux=sx/seg,uy=sy/seg,steps=Math.max(1,Math.ceil(seg/4));
 for(let i=1;i<=steps;i++){const t=i/steps;dab(px+sx*t,py+sy*t,w0+(brush.w-w0)*t,ux,uy)}
 brush.len+=seg;
 return true;
}
// Foreground mirror: the same brush, seen through the sheet. Painted cells that sit under the sheet are
// drawn again on a canvas above it in the surround green at full opacity (the inverse of the light-on-green
// background). Resting dots are not mirrored, so the paper stays clean until it is touched.
const fgCanvas=document.querySelector('.ascii-fg canvas'),fctx=fgCanvas&&fgCanvas.getContext('2d');
const SURROUND='#565c3a';
function frame(now){raf=0;const dt=Math.min(now-(last||now-16),40);last=now;ctx.clearRect(0,0,w,h);let unsettled=stroke(dt,now);
if(fctx){fctx.clearRect(0,0,w,h);const r=sheet.getBoundingClientRect();fctx.save();fctx.beginPath();fctx.rect(r.left,r.top,r.width,r.height);fctx.clip();fctx.fillStyle=fctx.strokeStyle=SURROUND}
bursts=bursts.filter(b=>now-b.t<SPARK_LIFE);
for(let i=0;i<cells.length;i++){
 const c=cells[i];
 // Wet paint flows in quickly, then dries unevenly so the tail feathers out.
 if(c.wet>0||c.e>0){
  if(c.wet>c.e){if(c.e<.065&&c.wet>=.065)c.entered=now;c.e+=(c.wet-c.e)*Math.min(1,dt/45)}else c.e=c.wet;
  c.wet=Math.max(0,c.wet-dt/c.decay);unsettled=true;
 }
 let level=c.e>.025?Math.min(1,(c.e-.025)*1.4):null;
 let color=c.e>.001?paint(c):ink(c.x,c.y,0),alpha=c.e>.001?1:REST_ALPHA;
 ctx.globalAlpha=alpha;ctx.fillStyle=ctx.strokeStyle=color;
 // Rotate around each cell's anchor.
 const age=now-(c.entered??-10000);
 const angle=tilt(age,c.seed,Math.min(1,c.e*3));
 const force=reduced?0:Math.sin(c.e*Math.PI)*3.2;
 const tx=c.ux*force,ty=c.uy*force;
 c.dx+=(tx-c.dx)*Math.min(1,dt/55);c.dy+=(ty-c.dy)*Math.min(1,dt/55);
 if(Math.abs(c.dx-tx)+Math.abs(c.dy-ty)>.02||(!reduced&&age<650&&c.e>.025))unsettled=true;
 if(level!=null){
  ctx.save();ctx.translate(c.x+c.dx,c.y+c.dy);ctx.rotate(angle);
  mark(level,c.seed*Math.PI);
  // Copy the cell onto the sheet layer, then put its transform back so later drawing (sparkles) isn't offset.
  if(fctx){fctx.save();fctx.setTransform(ctx.getTransform());mark(level,c.seed*Math.PI,fctx);fctx.restore()}
  ctx.restore();
 }else{ctx.beginPath();ctx.arc(c.x+c.dx,c.y+c.dy,.72,0,Math.PI*2);ctx.fill()}
 ctx.globalAlpha=1;
}
// Sparkles sit on top of the dots: accent on the surround, surround green on the sheet.
if(bursts.length){ctx.globalAlpha=1;ctx.fillStyle=ctx.strokeStyle=ACCENT;for(const b of bursts)sparkle(ctx,b,now);if(fctx){fctx.globalAlpha=1;fctx.fillStyle=fctx.strokeStyle=SURROUND;for(const b of bursts)sparkle(fctx,b,now)}}
if(fctx){fctx.restore()}
if(bursts.length||unsettled||now<until)raf=requestAnimationFrame(frame);else last=0;
}
// Clicks spark anywhere except on controls, so links, tabs and buttons behave exactly as before.
const onControl=e=>!!(e.target.closest&&e.target.closest('a,button,input,textarea,select,label,summary,[role="button"]'));
function move(e){pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;pointer.moved=performance.now();if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)down.drag=true;wake()}
// Listen on the window so the sheet stays fully interactive; sparks on the sheet are mirrored in green.
addEventListener('pointermove',move,{passive:true});// Sparkle on press, so clicks made while the cursor is moving still count.
addEventListener('pointerdown',e=>{if(e.button!==0)return;move(e);down=onControl(e)?null:{x:e.clientX,y:e.clientY,drag:false};if(down)poke(e.clientX,e.clientY)},{passive:true});
addEventListener('pointerup',e=>{down=null;if(e.pointerType!=='mouse'){pointer.active=false;wake()}},{passive:true});
function leave(){pointer.active=false;down=null;wake()}document.documentElement.addEventListener('pointerleave',()=>{if(!down)leave()});addEventListener('pointercancel',leave);addEventListener('blur',leave);
motion.addEventListener('change',e=>{reduced=e.matches;wake()});window.addEventListener('resize',resize);document.fonts&&document.fonts.load('16px "Asterisk Symbols"','✱✲✳✻✼✽').catch(()=>{});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;pointer.active=false}else wake()});resize();
})();
