const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  const check=async(expression,message)=>assert(await evaluate(expression),message);
  const waitFor=async expression=>{for(let n=0;n<100;n++){if(await evaluate(expression))return;await delay(100);}throw Error('Timed out: '+expression);};
  const reload=async()=>{await send('Page.reload');await delay(2200);};
  const qty=async(id,n)=>{await click(`[data-quantity-id="${id}"]`);for(const d of String(n))await click(`[data-key="${d}"]`);await click('#quantity-confirm');};
  await evaluate('localStorage.clear()');await reload();
  await send('Emulation.setDeviceMetricsOverride',{width:1376,height:1032,deviceScaleFactor:1,mobile:false});
  await click('[data-view="checkout"]');
  await check(`!document.querySelector('#checkout-empty').hidden&&document.querySelector('#checkout-pay').hidden`,'Empty state');
  await click('#checkout-build');
  // Three real saves: repeated quantities, final slot order, and double-save guard.
  for(const [index,size] of [6,6,10].entries()){
    await click(`[data-capacity-option="${size}"]`);await qty('salted-caramel',size-1);await qty('amaretto',1);
    await evaluate(`document.querySelector('.save-box').click();document.querySelector('.save-box').click()`);
    await check(`document.querySelector('#box-saved-dialog').open&&document.activeElement.id==='saved-another'`,'Save confirmation and initial focus');
    await check(`JSON.parse(localStorage.getItem('cd-boxes-v1')).length===${index+1}&&JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length===${index+1}`,'Exactly one ledger record and association');
    await check(`document.querySelector('#foundation-count').textContent==='${size} / ${size}'`,'Saved box remains behind modal');
    if(index===0){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(profile,'checkout-save-dialog.png'),Buffer.from(shot.data,'base64'));}
    await click(index===2?'#saved-checkout':'#saved-another');
    await check(`document.querySelector('#foundation-count').textContent==='0 / ${size}'&&document.querySelector('[data-capacity-option="${size}"]').getAttribute('aria-pressed')==='true'`,'Reset preserves capacity');
  }
  await check(`document.querySelector('[data-view="checkout"]').getAttribute('aria-current')==='page'&&document.querySelectorAll('.checkout-card').length===3`,'Three-box checkout');
  await check(`JSON.stringify([...document.querySelectorAll('.checkout-card h3')].map(e=>e.textContent))==='["Box 1","Box 2","Box 3"]'`,'Added order numbering');
  await check(`document.querySelectorAll('.checkout-quantity')[0].textContent==='×5'&&document.querySelector('.checkout-time').textContent.endsWith('s')`,'Quantities and saved duration');
  await evaluate(`Promise.all([...document.querySelectorAll('#checkout-boxes img')].map(i=>i.decode()))`);
  await check(`[...document.querySelectorAll('#checkout-boxes img')].every(i=>i.naturalWidth&&i.getAttribute('src')===COUNTER_PRODUCTS.find(p=>p.name===i.closest('li').querySelector('.checkout-name').textContent).image)`,'Actual front-view images');
  for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await check(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#checkout-pay').getBoundingClientRect().bottom<innerHeight`,'Responsive page and Pay');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,`checkout-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  const before=await evaluate(`JSON.stringify({url:location.href,storage:{...localStorage},html:document.querySelector('#v-checkout').innerHTML})`);
  await click('#checkout-pay');assert.equal(await evaluate(`JSON.stringify({url:location.href,storage:{...localStorage},html:document.querySelector('#v-checkout').innerHTML})`),before,'Pay has no effect');
  for(const view of ['boxes','insights','manage','counter','checkout'])await click(`[data-view="${view}"]`);
  await reload();await click('[data-view="checkout"]');await check(`document.querySelectorAll('.checkout-card').length===3`,'Refresh preserves order');
  await click('[data-remove-box]');await check(`document.querySelector('#checkout-remove-dialog').open&&document.activeElement.hasAttribute('data-remove-cancel')`,'Remove confirmation focus');
  await click('[data-remove-cancel]');await check(`document.querySelectorAll('.checkout-card').length===3`,'Cancel preserves order');
  await click('[data-remove-box]');await click('[data-remove-confirm]');
  await check(`document.querySelectorAll('.checkout-card').length===2&&JSON.parse(localStorage.getItem('cd-boxes-v1')).length===3`,'Remove changes association only');
  await reload();await click('[data-view="checkout"]');await check(`document.querySelectorAll('.checkout-card').length===2`,'Removal persists');
  await require('./verify-boxes.cjs')({evaluate,send,delay,profile});
  await click('[data-view="insights"]');await check(`document.querySelector('#insLbl').textContent.includes('3 boxes')&&document.querySelector('#topBars img')`,'Insights retains all three records and images');
  // Manage still resolves inactive products; reorder, add, uploaded image, Done.
  await click('[data-view="manage"]');await click('[data-product-id="salted-caramel"] [data-manage-toggle]');
  await click('[data-view="checkout"]');await check(`document.querySelector('#checkout-boxes').textContent.includes('Salted Caramel')&&document.querySelector('#checkout-boxes img')`,'Inactive product resolves');
  await click('[data-view="manage"]');await click('[data-product-id="salted-caramel"] [data-manage-toggle]');
  await evaluate(`(()=>{const e=document.querySelector('.manage-card');e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true}));})()`);
  await check(`!!localStorage.getItem('cd-catalog-order-v1')`,'Manage reorder persisted');
  await click('[data-manage-add]');
  await evaluate(`document.querySelector('#manage-name').value='Local Truffle';const dt=new DataTransfer();dt.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="30" fill="brown"/></svg>'],'truffle.svg',{type:'image/svg+xml'}));document.querySelector('#manage-image').files=dt.files;document.querySelector('#manage-add-form').requestSubmit()`);await waitFor(`!!document.querySelector('[data-quantity-id="local-truffle"]')&&!document.querySelector('#manage-add-dialog').open`);
  await click('[data-manage-done]');await check(`document.querySelector('#manage-done-dialog').open`,'Done confirmation');await click('[data-manage-done-confirm]');
  await qty('local-truffle',6);await click('.save-box');await click('#saved-checkout');await reload();await click('[data-view="checkout"]');
  await waitFor(`[...document.querySelectorAll('#checkout-boxes img')].some(i=>i.src.startsWith('blob:'))`);
  await check(`document.querySelector('#checkout-boxes').textContent.includes('Local Truffle')&&[...document.querySelectorAll('#checkout-boxes img')].some(i=>i.src.startsWith('blob:'))`,'Local uploaded image survives refresh');
  await evaluate(`document.querySelector('#checkout-boxes img').dispatchEvent(new Event('error'))`);
  await check(`!!document.querySelector('#checkout-boxes .image-missing')`,'Missing photo neutral fallback');
  // Fail transaction write: no grouping, no popup, unchanged active box.
  await click('[data-view="counter"]');await qty('amaretto',6);
  await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cd-boxes-v1')throw Error('quota');return originalSetItem.call(this,k,v)}`);
  await click('.save-box');await check(`!document.querySelector('#box-saved-dialog').open&&document.querySelector('#foundation-count').textContent==='6 / 6'&&JSON.parse(localStorage.getItem('cd-boxes-v1')).length===4&&JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length===3`,'Transaction failure safety');
  // Fail only grouping; retry reuses the successful ledger record.
  await evaluate(`Storage.prototype.setItem=function(k,v){if(k==='cd-current-order-v1')throw Error('quota');return originalSetItem.call(this,k,v)}`);
  await click('.save-box');await check(`!document.querySelector('#box-saved-dialog').open&&JSON.parse(localStorage.getItem('cd-boxes-v1')).length===5&&document.querySelector('.catalog').inert`,'Grouping failure preserves and locks saved box');
  await evaluate('Storage.prototype.setItem=originalSetItem');await click('.save-box');await check(`document.querySelector('#box-saved-dialog').open&&JSON.parse(localStorage.getItem('cd-boxes-v1')).length===5&&JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length===4`,'Retry never duplicates history');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await check(`!document.querySelector('#box-saved-dialog').open&&document.querySelector('#foundation-count').textContent==='0 / 6'`,'Escape safely prepares next box');
  await send('Page.navigate',{url:'http://127.0.0.1:8080/cocoa-dolce-box-log.html'});await delay(2200);await click('[data-view="checkout"]');await check(`document.querySelectorAll('.checkout-card').length===4`,'Alternate entry point');
  await click('[data-remove-box]');
  await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')}`);
  await click('[data-remove-confirm]');await check(`document.querySelector('#checkout-remove-dialog').open&&document.querySelectorAll('.checkout-card').length===4&&!document.querySelector('#checkout-remove-dialog [role="alert"]').hidden`,'Failed removal preserves order');
  await evaluate('Storage.prototype.setItem=originalSetItem');await click('[data-remove-cancel]');
  for(let n=0;n<4;n++){await click('[data-remove-box]');await click('[data-remove-confirm]');}
  await check(`!document.querySelector('#checkout-empty').hidden&&document.querySelector('#checkout-pay').hidden&&JSON.parse(localStorage.getItem('cd-boxes-v1')).length===5`,'Last removal returns to empty without deleting history');
  await evaluate(`localStorage.setItem('cd-current-order-v1','malformed')`);await click('[data-view="checkout"]');
  await check(`!document.querySelector('#checkout-error').hidden&&localStorage.getItem('cd-current-order-v1')==='malformed'`,'Unreadable order is preserved and reported');
  console.log('PASS Checkout: three-box flow, size retention, modal focus/Escape, saved timing/quantities/front images, local/inactive/fallback products, four viewports, persistence, remove/cancel/history/exports/Insights, Manage, Pay no-op, transaction and grouping failures/retry, alternate entry point.');
};
