/* Stable catalog targets; all quantities and visuals derive from the slot state. */
function mountCounterFoundation({ products, escapeHTML: esc, transactionLocation='', onSaved=()=>{} }) {
  const root=document.querySelector('#v-counter'), selection=createCounterSelection(products);
  let currentProducts=products, available=products.filter(p=>p.active), byId=new Map(products.map(p=>[p.id,p]));
  const grid=root.querySelector('.chocolate-grid');
  let quantityProduct=null, quantityText='', saving=false, savedNoticeTimer=null, catalogFilter='all';
  let cards=new Map(), catalogItems=new Map();
  function buildCatalog(){
    grid.innerHTML=available.map(p=>`<div class="catalog-item"><button type="button" class="chocolate-card" data-product-id="${esc(p.id)}" aria-label="Add ${esc(p.name)}"><span class="chocolate-visual${p.image?'':' image-missing'}" style="--product-background:${esc(p.backgroundColor||'#817151')}">${p.image?`<img src="${esc(p.image)}" alt="" draggable="false" width="600" height="540">`:''}</span><span class="chocolate-name"><span>${esc(p.name)}</span><span class="quantity-badge" aria-hidden="true" hidden></span></span></button><button type="button" class="quantity-open" data-quantity-id="${esc(p.id)}" aria-label="Choose quantity for ${esc(p.name)}">Qty</button></div>`).join('');
    cards=new Map([...grid.querySelectorAll('.chocolate-card')].map(c=>[c.dataset.productId,c]));
    catalogItems=new Map([...cards].map(([id,c])=>[id,c.closest('.catalog-item')]));
    grid.querySelectorAll('.chocolate-card img').forEach(img=>img.addEventListener('error',()=>{img.closest('.chocolate-visual').classList.add('image-missing');img.remove();},{once:true}));
  }
  buildCatalog();
  const catalogEmpty=root.querySelector('#catalog-empty');
  const filterToggle=root.querySelector('#catalog-filter-toggle'), filterMenu=root.querySelector('#catalog-filter-menu');
  const filterLabels={all:'Filter',basic:'Filter: Basic',seasonal:'Filter: Seasonal',cocoshots:'Filter: CocoShots'};
  function applyFilter(){
    let visible=0;
    for(const p of available){
      const show=catalogFilter==='all'||p.category===catalogFilter||(catalogFilter==='cocoshots'&&p.category==='cocoshot');
      catalogItems.get(p.id).hidden=!show;
      if(show)visible++;
    }
    root.querySelector('#catalog-result').textContent=`${visible} chocolate${visible===1?'':'s'}`;
    filterToggle.textContent=filterLabels[catalogFilter];
    filterToggle.classList.toggle('is-active',catalogFilter!=='all');
    // The grid and its empty state are independent of the header/count/Filter/Edit
    // controls (siblings, not ancestors), so zero matches never takes them with it.
    catalogEmpty.hidden=visible!==0;
  }
  function closeFilterMenu(){filterMenu.hidden=true;filterToggle.setAttribute('aria-expanded','false');}
  function openFilterMenu(){filterMenu.hidden=false;filterToggle.setAttribute('aria-expanded','true');}
  filterToggle.onclick=()=>{filterMenu.hidden?openFilterMenu():closeFilterMenu();};
  filterMenu.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
    catalogFilter=b.dataset.filter;
    filterMenu.querySelectorAll('[data-filter]').forEach(o=>o.setAttribute('aria-checked',String(o===b)));
    closeFilterMenu();
    applyFilter();
  });
  document.addEventListener('click',e=>{if(!filterMenu.hidden&&!e.target.closest('.catalog-filter'))closeFilterMenu();});
  filterMenu.addEventListener('keydown',e=>{if(e.key==='Escape'){closeFilterMenu();filterToggle.focus();}});
  applyFilter();
  const summary=root.querySelector('.box-summary');summary.setAttribute('aria-label','Selected chocolates');summary.tabIndex=0;
  root.querySelector('.builder-heading').insertAdjacentHTML('beforeend','<div class="transaction-notice" role="status" aria-live="polite" hidden></div>');
  const notice=root.querySelector('.transaction-notice');
  const complete=root.querySelector('#box-complete');
  const status=root.querySelector('.builder-footnote');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const undo=root.querySelector('.box-undo'), reset=root.querySelector('.box-reset'), save=root.querySelector('.save-box');
  undo.dataset.action='undo';reset.dataset.action='reset';save.dataset.action='save';
  root.insertAdjacentHTML('beforeend',`<dialog class="counter-dialog" id="quantity-dialog" aria-labelledby="quantity-title"><h2 id="quantity-title"></h2><label for="quantity-value">Quantity</label><input id="quantity-value" type="text" inputmode="none" pattern="[0-9]*" autocomplete="off" aria-describedby="quantity-remaining"><p id="quantity-remaining" role="status"></p><div class="quantity-keys">${['1','2','3','4','5','6','7','8','9','Backspace','0'].map(k=>`<button type="button" data-key="${k}" ${k==='Backspace'?'aria-label="Backspace"':''}>${k==='Backspace'?'←':k}</button>`).join('')}</div><div class="dialog-actions"><button data-cancel>Cancel</button><button id="quantity-confirm">Add</button></div></dialog><dialog class="counter-dialog" id="clear-dialog" aria-labelledby="clear-title" aria-describedby="clear-detail"><h2 id="clear-title">Reset this box?</h2><p id="clear-detail"></p><div class="dialog-actions"><button data-cancel autofocus>Cancel</button><button id="clear-confirm">Reset Box</button></div></dialog>`);
  const quantityDialog=root.querySelector('#quantity-dialog'), clearDialog=root.querySelector('#clear-dialog');
  const input=root.querySelector('#quantity-value'), confirm=root.querySelector('#quantity-confirm');
  const boxView=mountCounterBox(root.querySelector('.box-scene'),products,i=>{apply(selection.remove(i),[],i);},(a,b)=>{apply(selection.move(a,b),[],b);});
  function render(added=[]) {
    const state=selection.snapshot(), quantities=new Map(state.items.map(i=>[i.id,i.quantity]));
    for(const p of available){const c=cards.get(p.id),q=quantities.get(p.id)||0,b=c.querySelector('.quantity-badge');b.hidden=!q;b.textContent=q||'';c.setAttribute('aria-label',`Add ${p.name}${q?`, ${q} in box`:''}`);}
    root.querySelectorAll('[data-capacity-option]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.capacityOption)===state.capacity));
    root.querySelector('#foundation-count').textContent=`${state.count} / ${state.capacity}`;
    complete.hidden=state.count!==state.capacity;
    summary.innerHTML=state.count?`<ul>${state.items.map(i=>`<li><img class="summary-thumb" src="${esc(byId.get(i.id).image)}" alt=""><span class="summary-name">${esc(i.name)}</span><span>×${i.quantity}</span></li>`).join('')}</ul>`:'<p>No chocolates selected.</p>';
    undo.disabled=!state.canUndo;reset.disabled=!state.count;
    save.disabled=saving||state.count!==state.capacity;
    status.textContent=state.count===state.capacity?'Box full.':'Select chocolates to fill your box.';
    boxView.render(state,added);
  }
  function apply(result,added=[],focusSlot=null){if(result.ok){render(result.added||added);if(focusSlot!==null)root.querySelector(`[data-slot="${focusSlot}"]`)?.focus({preventScroll:true});}else if(result.message)status.textContent=result.message;}
  grid.addEventListener('click',e=>{
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
  reset.onclick=()=>{const n=selection.snapshot().count;if(!n)return;root.querySelector('#clear-detail').textContent=`This will remove all ${n} chocolate${n===1?'':'s'}.`;clearDialog.showModal();};
  root.querySelector('#clear-confirm').onclick=()=>{clearDialog.close();apply(selection.clear());};
  save.onclick=()=>{
    const state=selection.snapshot();if(saving||state.count!==state.capacity)return;
    saving=true;save.disabled=true;
    let saved;
    try {saved=saveCounterTransaction(state,{location:transactionLocation});}
    catch(error){saving=false;save.disabled=false;status.textContent="Couldn't save box. Try again.";status.title=error.message;return;}
    selection.resetTransaction();saving=false;status.removeAttribute('title');render();
    onSaved(saved.records);
    notice.innerHTML='<strong>&#10003; Box Saved</strong><span>'+esc(saved.record.id)+'</span><span>'+saved.record.totalPieces+' pieces &middot; '+(saved.record.captureDurationMs/1000).toFixed(1)+' sec</span>';
    notice.hidden=false;clearTimeout(savedNoticeTimer);savedNoticeTimer=setTimeout(()=>notice.hidden=true,2600);
  };
  root.querySelectorAll('[data-capacity-option]').forEach(b=>b.onclick=()=>apply(selection.setCapacity(Number(b.dataset.capacityOption))));
  render();
  return {getSelection:selection.snapshot,refreshProducts(nextProducts){
    currentProducts=nextProducts;available=currentProducts.filter(p=>p.active);byId=new Map(currentProducts.map(p=>[p.id,p]));selection.setProducts(currentProducts);boxView.setProducts(currentProducts);buildCatalog();applyFilter();render();
  }};
}
