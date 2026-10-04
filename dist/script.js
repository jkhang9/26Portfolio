const pages=[
 {filed:'ON THE CLOCK',hash:'work',name:'Work'},
 {filed:'AFTER HOURS',hash:'playground',name:'Playground'},
 {filed:'OFF THE CLOCK',hash:'about-me',name:'About me'}
];
let current=0;const $=id=>document.getElementById(id),sheet=document.querySelector('.sheet');
function render(index,writeHistory=true){current=(index+pages.length)%pages.length;const p=pages[current];sheet.dataset.page=current;$('work-page').hidden=current!==0;$('play-page').hidden=current!==1;$('about-page').hidden=current!==2;$('frame-scroll').setAttribute('aria-label',p.name+' content');$('frame-scroll').scrollTop=0;$('filed').textContent=p.filed;$('sheet-number').textContent=`00${current+1}`;document.querySelectorAll('[data-index]').forEach(b=>{const active=Number(b.dataset.index)===current;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(writeHistory&&location.hash!=='#'+p.hash)history.pushState(null,'','#'+p.hash);document.title=`${p.name} — Janice Khang`;}
document.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>render(Number(b.dataset.index))));$('explore-playground').addEventListener('click',()=>render(1));
function fromHash(){const aliases={'#introduction':0,'#practice':1,'#off-screen':2};const i=pages.findIndex(p=>'#'+p.hash===location.hash);render(i<0?(aliases[location.hash]??0):i,false)}window.addEventListener('popstate',fromHash);window.addEventListener('hashchange',fromHash);fromHash();

// Brief glyph shuffle; each hover settles on the next symbol.
const asteriskButton=$('asterisk'),asteriskGlyph=asteriskButton.querySelector('span');
const asteriskForms=['✱','✲','✳','✻','✼','✽','✾'];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let asteriskIndex=2,asteriskTimer;
function shuffleAsterisk(){
 clearTimeout(asteriskTimer);
 const start=asteriskIndex;
 asteriskIndex=(asteriskIndex+1)%asteriskForms.length;
 const target=asteriskIndex;
 const show=i=>{asteriskGlyph.textContent=asteriskForms[i]+'\uFE0E';};
 if(reducedMotion.matches){show(target);return;}
 let frame=0;
 function tick(){
  if(frame===5){show(target);return;}
  show((start+frame+1)%asteriskForms.length);
  asteriskTimer=setTimeout(tick,[45,55,65,85,110][frame++]);
 }
 tick();
}
asteriskButton.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')shuffleAsterisk();});
asteriskButton.addEventListener('click',shuffleAsterisk);
asteriskButton.addEventListener('focus',()=>{if(asteriskButton.matches(':focus-visible'))shuffleAsterisk();});

// Scroll indicator in the sheet's right margin (the native scrollbar is hidden so nothing covers content).
// The thumb tracks the scroll position; drag it or click the rail to jump.
(()=>{
 const sc=$('frame-scroll'),rail=document.createElement('div'),thumb=document.createElement('div');
 rail.className='scroll-rail';rail.setAttribute('aria-hidden','true');thumb.className='scroll-thumb';rail.appendChild(thumb);sheet.appendChild(rail);
 let drag=null;
 function update(){
  const max=sc.scrollHeight-sc.clientHeight;rail.hidden=max<2;if(rail.hidden)return;
  const s=sheet.getBoundingClientRect(),f=sc.getBoundingClientRect(),gap=s.right-f.right;
  rail.style.top=(f.top-s.top)+'px';rail.style.height=f.height+'px';rail.style.right=Math.max(0,gap/2-7.5)+'px';
  const h=Math.max(28,f.height*sc.clientHeight/sc.scrollHeight);
  thumb.style.height=h+'px';thumb.style.top=((f.height-h)*sc.scrollTop/max)+'px';
 }
 function jump(y){const f=sc.getBoundingClientRect(),h=thumb.offsetHeight;sc.scrollTop=(y-f.top-h/2)/(f.height-h)*(sc.scrollHeight-sc.clientHeight)}
 rail.addEventListener('pointerdown',e=>{e.preventDefault();rail.setPointerCapture(e.pointerId);rail.classList.add('dragging');
  const t=thumb.getBoundingClientRect();drag=e.target===thumb?e.clientY-t.top-t.height/2:0;if(e.target!==thumb)jump(e.clientY)});
 rail.addEventListener('pointermove',e=>{if(drag!==null)jump(e.clientY-drag)});
 const end=()=>{drag=null;rail.classList.remove('dragging')};rail.addEventListener('pointerup',end);rail.addEventListener('pointercancel',end);
 sc.addEventListener('scroll',update,{passive:true});addEventListener('resize',update);
 new ResizeObserver(update).observe(sc);[...sc.children].forEach(c=>new ResizeObserver(update).observe(c));
 document.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(update)));
 addEventListener('hashchange',()=>requestAnimationFrame(update));addEventListener('load',update);update();
})();

