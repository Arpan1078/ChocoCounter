function mountCounterResize(){
  const foundation=document.querySelector('#v-counter .foundation'),divider=foundation?.querySelector('.counter-divider');
  if(!foundation||!divider)return;
  const key='cd-counter-split-v1',savedValue=localStorage.getItem(key),saved=Number(savedValue);
  let split=savedValue!==null&&Number.isFinite(saved)?Math.min(72,Math.max(45,saved)):65,dragging=false;
  function apply(){foundation.style.setProperty('--counter-catalog-split',`${split}fr`);foundation.style.setProperty('--counter-builder-split',`${100-split}fr`);}
  function enabled(){return matchMedia('(min-width:761px)').matches;}
  function move(clientX){const rect=foundation.getBoundingClientRect(),next=Math.min(72,Math.max(45,(clientX-rect.left)/rect.width*100));if(Number.isFinite(next)){split=next;apply();}}
  divider.addEventListener('pointerdown',event=>{if(!enabled()||!event.isPrimary)return;dragging=true;try{divider.setPointerCapture(event.pointerId);}catch{}divider.classList.add('is-dragging');event.preventDefault();});
  divider.addEventListener('pointermove',event=>{if(dragging)move(event.clientX);});
  divider.addEventListener('pointerup',event=>{if(!dragging)return;dragging=false;divider.classList.remove('is-dragging');if(divider.hasPointerCapture(event.pointerId))divider.releasePointerCapture(event.pointerId);localStorage.setItem(key,String(split));});
  divider.addEventListener('pointercancel',()=>{dragging=false;divider.classList.remove('is-dragging');});
  addEventListener('resize',apply);apply();
}