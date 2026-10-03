const pages=[
 {filed:'ON THE CLOCK',hash:'work',name:'Work'},
 {filed:'AFTER HOURS',hash:'playground',name:'Playground'},
 {filed:'OFF THE CLOCK',hash:'about-me',name:'About me'}
];
let current=0;const $=id=>document.getElementById(id),sheet=document.querySelector('.sheet');
function render(index,writeHistory=true){current=(index+pages.length)%pages.length;const p=pages[current];sheet.dataset.page=current;$('specimen-page').hidden=current===2;$('about-page').hidden=current!==2;$('specimen-page').setAttribute('aria-label',p.name);$('frame-scroll').setAttribute('aria-label',p.name+' content');$('frame-scroll').scrollTop=0;$('filed').textContent=p.filed;$('sheet-number').textContent=`00${current+1}`;document.querySelectorAll('[data-index]').forEach(b=>{const active=Number(b.dataset.index)===current;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(writeHistory&&location.hash!=='#'+p.hash)history.pushState(null,'','#'+p.hash);document.title=`${p.name} — Janice Khang`;}
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
