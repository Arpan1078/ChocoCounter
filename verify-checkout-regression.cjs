const assert=require('node:assert/strict');
module.exports=async({evaluate,send,delay})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  await send('Emulation.setDeviceMetricsOverride',{width:1376,height:1032,deviceScaleFactor:1,mobile:false});
  for(const category of ['basic','seasonal','cocoshots','all']){
    await click('#catalog-filter-toggle');await click(`[data-filter="${category}"]`);
    assert(await evaluate(`(()=>{const expected=CounterCatalogState.products().filter(p=>p.active&&('${category}'==='all'||p.category==='${category}'||('${category}'==='cocoshots'&&p.category==='cocoshot')));return document.querySelectorAll('#v-counter .catalog-item:not([hidden])').length===expected.length&&document.querySelector('#catalog-result').textContent===expected.length+' chocolates'})()`));
  }
  const p=await evaluate(`(()=>{const r=document.querySelector('.counter-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x-80,y:p.y,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x-80,y:p.y,button:'left',clickCount:1});
  const split=await evaluate(`localStorage.getItem('cd-counter-split-v1')`);assert(split);
  await click('[data-quantity-id="amaretto"]');await click('[data-key="6"]');await click('#quantity-confirm');
  await click('#catalog-filter-toggle');await click('[data-filter="seasonal"]');await click('.save-box');await click('#saved-another');
  assert.equal(await evaluate(`localStorage.getItem('cd-counter-split-v1')`),split);
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-toggle').textContent`),'Filter: Seasonal');
  const before=await evaluate(`JSON.stringify({storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML,url:location.href})`);
  await click('.capture-box');assert.equal(await evaluate(`JSON.stringify({storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML,url:location.href})`),before);
  await send('Page.reload');await delay(2200);
  assert.equal(await evaluate(`localStorage.getItem('cd-counter-split-v1')`),split);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length`),1);
  console.log('PASS current Counter regressions: all four filters/counts, real pointer divider resize/persistence, filter and split retained after save, Capture no-op, order persists while building another box.');
};
