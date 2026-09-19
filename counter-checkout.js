/* Current customer grouping only. The box ledger remains authoritative. */
const COUNTER_ORDER_STORAGE_KEY='cd-current-order-v1';
// Display-only fixed box prices. Never written to the transaction ledger.
const counterCheckoutPrice=box=>({6:25,10:40})[box.boxSize]??null;
function readCounterOrder(storage=localStorage){
  const raw=storage.getItem(COUNTER_ORDER_STORAGE_KEY);
  if(raw===null)return {boxIds:[]};
  let order;
  try{order=JSON.parse(raw);}catch{throw new Error('Current order data is unreadable.');}
  if(!order||!Array.isArray(order.boxIds)||order.boxIds.some(id=>typeof id!=='string'))throw new Error('Current order data is unreadable.');
  return {boxIds:[...new Set(order.boxIds)]};
}
function addCounterOrderBox(id,storage=localStorage){
  const order=readCounterOrder(storage);
  if(!order.boxIds.includes(id))order.boxIds.push(id);
  storage.setItem(COUNTER_ORDER_STORAGE_KEY,JSON.stringify(order));
}
function mountCounterCheckout({escapeHTML:esc,getRecords}){
  const root=document.querySelector('#v-checkout'),list=root.querySelector('#checkout-boxes');
  const empty=root.querySelector('#checkout-empty'),pay=root.querySelector('#checkout-pay');
  const error=root.querySelector('#checkout-error'),dialog=root.querySelector('#checkout-remove-dialog');
  let removing=null,trigger=null;
  function render(){
    let order;
    try{order=readCounterOrder();error.hidden=true;}
    catch{error.textContent="Couldn't load the current order. Stored data has been preserved; refresh to try again.";error.hidden=false;list.innerHTML='';empty.hidden=true;pay.hidden=true;return;}
    const records=new Map(getRecords().map(record=>[record.id,record]));
    const boxes=order.boxIds.map(id=>records.get(id)).filter(Boolean);
    const products=CounterCatalogState.products();
    empty.hidden=boxes.length!==0;pay.hidden=boxes.length===0;
    root.querySelector('#checkout-count').textContent=boxes.length?`${boxes.length} box${boxes.length===1?'':'es'} in this order`:'';
    const prices=boxes.map(counterCheckoutPrice);
    root.querySelector('#checkout-prices').innerHTML=prices.map((price,index)=>`<li><span>Box ${index+1}</span><span>${price===null?'Price unavailable':'$'+price}</span></li>`).join('');
    root.querySelector('#checkout-total').textContent=prices.some(price=>price===null)?'Total unavailable':'$'+prices.reduce((sum,price)=>sum+price,0);
    list.innerHTML=boxes.map((box,index)=>{
      const items=box.contents||box.items||[],quantities=new Map();
      items.forEach(item=>{const id=item.chocolateId||item.id,previous=quantities.get(id);quantities.set(id,{id,name:item.name,quantity:(previous?.quantity||0)+(item.quantity??item.qty??0)});});
      const duration=box.captureDurationMs!=null?box.captureDurationMs/1000:box.captureSeconds;
      const price=counterCheckoutPrice(box);
      return `<article class="checkout-card" aria-labelledby="checkout-box-${index}"><div class="checkout-card-heading"><div><h3 id="checkout-box-${index}">Box ${index+1}</h3><p>${esc(box.boxSize)}-piece box</p><p class="checkout-box-price">${price===null?'Price unavailable':'$'+price}</p></div><button type="button" class="checkout-remove" data-remove-box="${esc(box.id)}" aria-label="Remove Box ${index+1}">Remove Box</button></div><ul class="checkout-contents">${[...quantities.values()].map(item=>{
        const product=products.find(p=>p.id===item.id)||products.find(p=>p.name===item.name);
        const image=product?.image,name=item.name||product?.name||'Chocolate';
        return `<li><span class="chocolate-visual${image?'':' image-missing'}">${image?`<img src="${esc(image)}" alt="" width="80" height="72">`:''}</span><span class="checkout-name">${esc(name)}</span><span class="checkout-quantity" aria-label="Quantity ${item.quantity}">×${item.quantity}</span></li>`;
      }).join('')}</ul><p class="checkout-time">Capture time: ${Number.isFinite(duration)?duration.toFixed(1)+'s':'Unavailable'}</p></article>`;
    }).join('');
    list.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{image.parentElement.classList.add('image-missing');image.remove();},{once:true}));
  }
  root.querySelector('#checkout-build').onclick=()=>document.querySelector('[data-view="counter"]').click();
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-box]');if(!button)return;
    removing=button.dataset.removeBox;trigger=button;
    dialog.querySelector('[role="alert"]').hidden=true;dialog.showModal();
  });
  dialog.querySelector('[data-remove-cancel]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus();else root.querySelector('h2').focus();removing=null;});
  dialog.querySelector('[data-remove-confirm]').onclick=()=>{
    try{
      const order=readCounterOrder();
      localStorage.setItem(COUNTER_ORDER_STORAGE_KEY,JSON.stringify({boxIds:order.boxIds.filter(id=>id!==removing)}));
    }catch{const message=dialog.querySelector('[role="alert"]');message.textContent="Couldn't remove this box. Try again.";message.hidden=false;return;}
    render();dialog.close();
  };
  CounterCatalogState.subscribe(()=>{if(!root.hidden)render();});
  return {render};
}
