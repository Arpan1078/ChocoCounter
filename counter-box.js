/* Both renders are 1536x1024 top-down photos of the actual box, straight overhead.
   Slot centers below were measured directly from the cavity pixels in each image
   (dark-floor bounding-box centers of the 2x3 / 2x5 grid), not assumed generically.
   With a true top-down view there is no perspective to fake: every chocolate is the
   same size and sits centered in its cavity with a light contact shadow for depth.
   The processed top-view chocolate photos (assets/chocolates-top/processed/) are
   background-removed and re-trimmed to a uniform small margin (see the processing
   notes in counter-products.js), so their opaque content fills a consistent ~86%
   of their own square canvas; the older angled catalog photos used as a fallback
   for any chocolate with no top-view asset have far more padding (~66%).
   topScale/fallbackScale size each source so the chocolate itself (not the image's
   own empty margin) lands at ~70% of the measured cavity width either way. */
const COUNTER_BOX_LAYOUTS = {
  6: { image:'assets/box/top-view-6.png', ratio:'1536/1024', columns:3, topScale:16.3, fallbackScale:21.3, slots:[
    {x:21.68,y:32.86},{x:46.61,y:32.86},{x:72.14,y:32.86},
    {x:21.68,y:64.79},{x:46.61,y:64.79},{x:72.14,y:64.79}
  ] },
  10: { image:'assets/box/top-down-10.png', ratio:'1536/1024', columns:5, topScale:13, fallbackScale:16.9, slots:[
    {x:15.59,y:34.62},{x:32.81,y:34.62},{x:49.97,y:34.62},{x:67.12,y:34.62},{x:84.21,y:34.62},
    {x:15.59,y:58.74},{x:32.81,y:58.74},{x:49.97,y:58.74},{x:67.12,y:58.74},{x:84.21,y:58.74}
  ] }
};

// Temporary trays can later be replaced by measured image layouts.
for(const [capacity,columns] of [[16,4],[30,6],[50,10]]) {
 const rows=capacity/columns;
 COUNTER_BOX_LAYOUTS[capacity]={temporary:true,columns,rows,topScale:76/columns,fallbackScale:98/columns,
 slots:Array.from({length:capacity},(_,i)=>({x:(i%columns+.5)*100/columns,y:(Math.floor(i/columns)+.5)*100/rows}))};
}
function mountCounterBox(scene, products, onRemove, onMove) {
  const byId=new Map(products.map(p=>[p.id,p]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let editing=false, gesture=null, keyboardColumns=3;
  function cancelGesture(){
    const previous=gesture;
    gesture=null;
    previous?.ghost?.remove();
    if(previous?.button.hasPointerCapture(previous.id))previous.button.releasePointerCapture(previous.id);
    scene.querySelectorAll('.dragging,.drop-target').forEach(e=>e.classList.remove('dragging','drop-target'));
  }
  function render(state, edit, added=[]) {
    cancelGesture();editing=edit;
    const layout=COUNTER_BOX_LAYOUTS[state.capacity];
    keyboardColumns=layout.columns;
    scene.classList.toggle('editing',edit);
    const buttons=state.slots.map((id,i)=>{
      const p=byId.get(id), pos=layout.slots[i];
      // Prefer the product's true top-down photo; falls back to its catalog
      // (angled) photo for any product with no topViewImage supplied yet. Each
      // source gets its own on-screen scale AND aspect-ratio so the piece's own
      // box exactly matches the image being shown -- otherwise object-fit:contain
      // would letterbox it inside a mismatched box and it would render smaller
      // (and only nominally centered) than the calibrated scale intends.
      const hasTopView=!!(p&&p.topViewImage);
      const boxImage=p&&(p.topViewImage||p.image);
      const scale=hasTopView?layout.topScale:layout.fallbackScale;
      const aspect=hasTopView?'1/1':'600/540';
      const style='left:'+pos.x+'%;top:'+pos.y+'%;--piece-scale:'+scale+'%;--piece-aspect:'+aspect+';z-index:'+(i+1);
      return `<button type="button" class="box-piece ${id?'occupied':''} ${added.includes(i)?'arriving':''}" data-slot="${i}" data-piece-id="${esc(id||'')}" style="${style}" ${id||edit?'':'disabled'} aria-label="Slot ${i+1}${p?`: ${esc(p.name)}${edit?', tap to remove or drag to move':', tap to remove'}`:': empty'}">${p?`<img src="${esc(boxImage)}" alt="" draggable="false">`:`<span class="slot-number">${i+1}</span>`}</button>`;
    }).join('');
    if(layout.temporary){
      scene.innerHTML=`<div class="temporary-tray" style="--tray-columns:${layout.columns};--tray-rows:${layout.rows}"><div class="tray-cavities" aria-hidden="true">${state.slots.map(()=>'<span></span>').join('')}</div><div class="box-overlay">${buttons}</div></div>`;
      return;
    }
    scene.innerHTML=`<div class="box-frame"><img class="box-render" src="${layout.image}" alt="${state.capacity}-piece Cocoa Dolce box, top-down view" width="1536" height="1024"><div class="box-overlay">${buttons}</div></div>`;
  }
  // Nearest valid slot within a generous radius, but never a drop outside the scene.
  function destination(x,y,occupiedOnly=false) {
    const r=scene.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return null;
    let nearest=null,distance=Infinity;
    scene.querySelectorAll(occupiedOnly?'.box-piece.occupied':'[data-slot]').forEach(b=>{const r=b.getBoundingClientRect(),d=Math.hypot(x-r.x-r.width/2,y-r.y-r.height/2);if(d<distance && d<Math.max(occupiedOnly?24:36,r.width*(occupiedOnly?.5:.8))){nearest=b;distance=d;}});
    return nearest;
  }
  scene.addEventListener('pointerdown',e=>{
    const button=destination(e.clientX,e.clientY,true);
    if(!button||gesture||!e.isPrimary||e.button!==0)return;
    gesture={id:e.pointerId,button,from:Number(button.dataset.slot),x:e.clientX,y:e.clientY,drag:false};
    button.setPointerCapture(e.pointerId);
  });
  scene.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8)gesture.drag=true;
    if(!gesture.drag||!editing)return;
    if(!gesture.ghost){
      const image=gesture.button.querySelector('img'),r=image.getBoundingClientRect();
      gesture.ghost=image.cloneNode();
      gesture.ghost.className='piece-drag-preview';
      gesture.ghost.style.width=`${r.width}px`;
      gesture.ghost.setAttribute('aria-hidden','true');
      document.body.append(gesture.ghost);
    }
    gesture.ghost.style.left=`${e.clientX}px`;
    gesture.ghost.style.top=`${e.clientY}px`;
    gesture.button.classList.add('dragging');
    scene.querySelectorAll('.drop-target').forEach(b=>b.classList.remove('drop-target'));
    destination(e.clientX,e.clientY)?.classList.add('drop-target');
  });
  scene.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const {from,drag}=gesture, target=destination(e.clientX,e.clientY);
    cancelGesture();
    if(drag){if(editing&&target)onMove(from,Number(target.dataset.slot));}
    else onRemove(from);
  });
  scene.addEventListener('pointercancel',cancelGesture);
  scene.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});
  // Pointer removal occurs on pointerup only; generated clicks must never remove twice.
  scene.addEventListener('click',e=>{if(e.detail===0 && e.target.closest('.occupied'))onRemove(Number(e.target.closest('[data-slot]').dataset.slot));});
  scene.addEventListener('keydown',e=>{
    const b=e.target.closest('.occupied');if(!editing||!b||!e.altKey)return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-keyboardColumns,ArrowDown:keyboardColumns}[e.key];
    if(delta){e.preventDefault();onMove(Number(b.dataset.slot),Number(b.dataset.slot)+delta);}
  });
  return {render};
}
