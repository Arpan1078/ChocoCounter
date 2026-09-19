/* Stable catalog targets; all quantities and visuals derive from the slot state. */
function mountCounterFoundation({ products, escapeHTML: esc }) {
  const root=document.querySelector('#v-counter'), selection=createCounterSelection(products);
  const available=products.filter(p=>p.active), byId=new Map(products.map(p=>[p.id,p]));
  const grid=root.querySelector('.chocolate-grid');
  let editing=false, quantityProduct=null, quantityText='';
  grid.innerHTML=available.map(p=>`<div class="catalog-item"><button type="button" class="chocolate-card" data-product-id="${esc(p.id)}" aria-label="Add ${esc(p.name)}"><span class="chocolate-visual" style="--product-background:${esc(p.backgroundColor)}"><img src="${esc(p.image)}" alt="" draggable="false" width="600" height="540"></span><span class="chocolate-name"><span>${esc(p.name)}</span><span class="quantity-badge" aria-hidden="true" hidden></span></span></button><button type="button" class="quantity-open" data-quantity-id="${esc(p.id)}" aria-label="Choose quantity for ${esc(p.name)}">Qty</button></div>`).join('');
  root.querySelector('#catalog-result').textContent=`${available.length} chocolates`;
  const cards=new Map([...grid.querySelectorAll('.chocolate-card')].map(c=>[c.dataset.productId,c]));
  const summary=root.querySelector('.box-summary');summary.setAttribute('aria-label','Selected chocolates');summary.tabIndex=0;
  const complete=root.querySelector('#box-complete');
  const status=root.querySelector('.builder-footnote');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const [undo,edit,empty,save]=root.querySelectorAll('.builder-controls button');
  undo.dataset.action='undo';edit.dataset.action='edit';empty.dataset.action='empty';save.dataset.action='save';
  root.insertAdjacentHTML('beforeend',`<dialog class="counter-dialog" id="quantity-dialog" aria-labelledby="quantity-title"><h2 id="quantity-title"></h2><label for="quantity-value">Quantity</label><input id="quantity-value" type="text" inputmode="none" pattern="[0-9]*" autocomplete="off" aria-describedby="quantity-remaining"><p id="quantity-remaining" role="status"></p><div class="quantity-keys">${['1','2','3','4','5','6','7','8','9','Backspace','0'].map(k=>`<button type="button" data-key="${k}" ${k==='Backspace'?'aria-label="Backspace"':''}>${k==='Backspace'?'←':k}</button>`).join('')}</div><div class="dialog-actions"><button data-cancel>Cancel</button><button id="quantity-confirm">Add</button></div></dialog><dialog class="counter-dialog" id="clear-dialog" aria-labelledby="clear-title"><h2 id="clear-title"></h2><div class="dialog-actions"><button data-cancel autofocus>Cancel</button><button id="clear-confirm">Clear Box</button></div></dialog>`);
  const quantityDialog=root.querySelector('#quantity-dialog'), clearDialog=root.querySelector('#clear-dialog');
  const input=root.querySelector('#quantity-value'), confirm=root.querySelector('#quantity-confirm');
  const boxView=mountCounterBox(root.querySelector('.box-scene'),products,i=>{if(editing)apply(selection.remove(i),[],i);},(a,b)=>{if(editing)apply(selection.move(a,b),[],b);});
  function render(added=[]) {
    const state=selection.snapshot(), quantities=new Map(state.items.map(i=>[i.id,i.quantity]));
    for(const p of available){const c=cards.get(p.id),q=quantities.get(p.id)||0,b=c.querySelector('.quantity-badge');b.hidden=!q;b.textContent=q||'';c.disabled=editing;c.setAttribute('aria-label',`Add ${p.name}${q?`, ${q} in box`:''}`);}
    grid.querySelectorAll('.quantity-open').forEach(b=>b.disabled=editing);
    grid.classList.toggle('catalog-editing',editing);
    root.querySelectorAll('[data-capacity-option]').forEach(b=>{b.setAttribute('aria-pressed',Number(b.dataset.capacityOption)===state.capacity);b.disabled=editing;});
    root.querySelector('#foundation-count').textContent=`${state.count} / ${state.capacity}`;
    complete.hidden=state.count!==state.capacity;
    summary.innerHTML=state.count?`<ul>${state.items.map(i=>`<li><img class="summary-thumb" src="${esc(byId.get(i.id).image)}" alt=""><span class="summary-name">${esc(i.name)}</span><span>×${i.quantity}</span></li>`).join('')}</ul>`:'<p>No chocolates selected.</p>';
    undo.disabled=!state.canUndo;empty.disabled=!state.count;edit.disabled=!state.count&&!editing;edit.textContent=editing?'Done':'Edit';edit.setAttribute('aria-pressed',editing);
    save.disabled=state.count!==state.capacity||editing;
    status.textContent=editing?'Editing: tap to remove; drag to move or swap.':state.count===state.capacity?'Box full.':'Select chocolates to fill your box.';
    boxView.render(state,editing,added);
  }
  function apply(result,added=[],focusSlot=null){if(result.ok){render(result.added||added);if(focusSlot!==null)root.querySelector(`[data-slot="${focusSlot}"]`)?.focus({preventScroll:true});}else if(result.message)status.textContent=result.message;}
  grid.addEventListener('click',e=>{
    if(editing)return;
    const qty=e.target.closest('[data-quantity-id]');
    if(qty){quantityProduct=qty.dataset.quantityId;quantityText='';root.querySelector('#quantity-title').textContent=byId.get(quantityProduct).name;updateQuantity();quantityDialog.showModal();input.focus();return;}
    const card=e.target.closest('.chocolate-card');if(!card)return;
    const result=selection.add(card.dataset.productId);apply(result);
    if(result.ok&&!matchMedia('(prefers-reduced-motion: reduce)').matches){card.getAnimations().forEach(a=>a.cancel());card.animate([{transform:'scale(1)'},{transform:'scale(.975)'},{transform:'scale(1)'}],{duration:240});}
  });
  function updateQuantity(){
    input.value=quantityText;const s=selection.snapshot(),remaining=s.capacity-s.count,q=Number(quantityText);
    root.querySelector('#quantity-remaining').textContent=`${remaining} spaces remaining${q>remaining?' — quantity exceeds capacity.':''}`;
    confirm.disabled=!/^\d+$/.test(quantityText)||!Number.isSafeInteger(q)||q<1||q>remaining;
    input.setAttribute('aria-invalid',quantityText!==''&&confirm.disabled);
  }
  input.addEventListener('input',()=>{quantityText=input.value;updateQuantity();});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!confirm.disabled)confirm.click();}});
  quantityDialog.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{quantityText=b.dataset.key==='Backspace'?quantityText.slice(0,-1):quantityText+b.dataset.key;updateQuantity();});
  confirm.onclick=()=>{if(confirm.disabled)return;const result=selection.add(quantityProduct,Number(quantityText));if(result.ok)quantityDialog.close();apply(result);};
  root.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  undo.onclick=()=>apply(selection.undo());
  edit.onclick=()=>{editing=!editing;render();};
  empty.onclick=()=>{root.querySelector('#clear-title').textContent=`Clear all ${selection.snapshot().count} chocolates?`;clearDialog.showModal();};
  root.querySelector('#clear-confirm').onclick=()=>{clearDialog.close();apply(selection.clear());};
  save.onclick=()=>{status.textContent='Saving will be available in the next phase.';};
  root.querySelectorAll('[data-capacity-option]').forEach(b=>b.onclick=()=>{if(!editing)apply(selection.setCapacity(Number(b.dataset.capacityOption)));});
  render();
  return {getSelection:selection.snapshot};
}
