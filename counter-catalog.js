/* Display order only: product objects and box history belong to their existing models. */
function mountCatalogOrder(grid, toggle, products, onModeChange) {
  const storageKey='cd-catalog-order-v1';
  const nodes=new Map([...grid.children].map(node=>[node.querySelector('[data-product-id]').dataset.productId,node]));
  const defaults=products.map(p=>p.id);
  let order=[...defaults], active=false, gesture=null;
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(Array.isArray(saved))order=[...new Set([...saved.filter(id=>nodes.has(id)),...defaults])];
  } catch { /* Unavailable or malformed storage must never hide the catalog. */ }
  const arrange=()=>order.forEach(id=>grid.append(nodes.get(id)));
  arrange();
  function cancel(){
    const previous=gesture;gesture=null;
    if(previous){cancelAnimationFrame(previous.frame);previous.ghost?.remove();if(previous.node.hasPointerCapture(previous.pointer))previous.node.releasePointerCapture(previous.pointer);}
    grid.querySelectorAll('.catalog-dragging,.catalog-drop-target').forEach(n=>n.classList.remove('catalog-dragging','catalog-drop-target'));
  }
  function swap(a,b){
    const from=order.indexOf(a),to=order.indexOf(b);
    if(from<0||to<0||from===to)return;
    [order[from],order[to]]=[order[to],order[from]];arrange();
  }
  toggle.onclick=()=>{
    if(toggle.disabled)return;
    cancel();active=!active;
    toggle.textContent=active?'Done':'Edit';toggle.setAttribute('aria-pressed',active);
    grid.classList.toggle('catalog-reordering',active);
    if(!active){try{localStorage.setItem(storageKey,JSON.stringify(order));toggle.title='Edit catalog order';}catch{toggle.title='Order changed for this session; browser storage is unavailable.';}}
    onModeChange();
  };
  const idOf=node=>node.querySelector('[data-product-id]').dataset.productId;
  function targetAt(x,y){return document.elementFromPoint(x,y)?.closest('.catalog-item');}
  function track(){
    if(!gesture?.drag)return;
    const pane=grid.closest('.catalog'),r=pane.getBoundingClientRect();
    if(gesture.y<r.top+60)pane.scrollTop-=9;
    else if(gesture.y>r.bottom-60)pane.scrollTop+=9;
    grid.querySelectorAll('.catalog-drop-target').forEach(n=>n.classList.remove('catalog-drop-target'));
    const target=targetAt(gesture.x,gesture.y);
    if(target&&grid.contains(target)&&target!==gesture.node)target.classList.add('catalog-drop-target');
    gesture.frame=requestAnimationFrame(track);
  }
  grid.addEventListener('pointerdown',e=>{
    const node=e.target.closest('.catalog-item');
    if(!active||!node||e.target.closest('.quantity-open')||!e.isPrimary||e.button!==0)return;
    gesture={node,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,drag:false};
    node.setPointerCapture(e.pointerId);
  });
  grid.addEventListener('pointermove',e=>{
    if(!gesture||gesture.pointer!==e.pointerId)return;
    gesture.x=e.clientX;gesture.y=e.clientY;
    if(!gesture.drag&&Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8){
      gesture.drag=true;
      const r=gesture.node.getBoundingClientRect(),ghost=gesture.node.cloneNode(true);
      ghost.className='catalog-drag-preview';ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.style.width=r.width+'px';
      document.body.append(ghost);gesture.ghost=ghost;gesture.node.classList.add('catalog-dragging');track();
    }
    if(gesture.ghost){gesture.ghost.style.left=e.clientX+'px';gesture.ghost.style.top=e.clientY+'px';}
  });
  grid.addEventListener('pointerup',e=>{
    if(!gesture||gesture.pointer!==e.pointerId)return;
    const {node,drag}=gesture,target=targetAt(e.clientX,e.clientY);cancel();
    if(drag&&target&&grid.contains(target))swap(idOf(node),idOf(target));
  });
  grid.addEventListener('pointercancel',cancel);
  grid.addEventListener('lostpointercapture',()=>{if(gesture)cancel();});
  grid.addEventListener('keydown',e=>{
    if(!active)return;
    if(e.key==='Escape'){cancel();return;}
    const node=e.target.closest('.catalog-item');
    if(!node||!e.altKey)return;
    const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key];
    if(delta){e.preventDefault();swap(idOf(node),order[order.indexOf(idOf(node))+delta]);node.querySelector('.chocolate-card').focus({preventScroll:true});}
  });
  return {isActive:()=>active};
}
