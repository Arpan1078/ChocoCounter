const assert=require('node:assert/strict');
module.exports=async({evaluate,send,delay})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  const visibleIds=()=>evaluate(`[...document.querySelectorAll('.catalog-item')].filter(e=>!e.hidden).map(e=>e.querySelector('.chocolate-card').dataset.productId)`);
  const expectedFor=cat=>evaluate(`COUNTER_PRODUCTS.filter(p=>p.active${cat==='all'?'':`&&p.category===${JSON.stringify(cat)}`}).map(p=>p.id)`);
  await click('[data-view="counter"]');
  await delay(150);

  // Default = All: every ACTIVE product, none hard-coded, count derived live.
  const allExpected=await expectedFor('all');
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),`${allExpected.length} chocolates`,'Default filter is All, count reflects every active product');
  assert.deepEqual((await visibleIds()).sort(),[...allExpected].sort(),'All shows exactly the active products, nothing hard-coded to 25');
  assert.equal(await evaluate(`[...document.querySelectorAll('.catalog-item')].filter(e=>e.hidden).length`),0,'Nothing hidden by default');
  assert.equal(await evaluate(`document.getElementById('catalog-empty').hidden`),true,'Empty-state message stays hidden when results exist');
  const initialOrder=await evaluate(`[...document.querySelectorAll('.catalog-item .chocolate-card')].map(e=>e.dataset.productId)`);

  // Put a Basic chocolate in the box before touching the filter, to prove independence.
  await click('[data-product-id="raspberry"]');
  await click('[data-product-id="raspberry"]');
  assert.equal(await evaluate(`document.querySelector('[data-product-id="raspberry"] .quantity-badge').textContent`),'2','Quantity badge shows 2 before any filtering');
  const boxCountBefore=await evaluate(`document.querySelector('#foundation-count').textContent`);

  // Menu structure and mouse-click open/select.
  await click('#catalog-filter-toggle');
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-menu').hidden`),false,'Filter menu opens on click');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#catalog-filter-menu [data-filter]')].map(b=>b.dataset.filter)`),['all','basic','seasonal','cocoshots'],'Exactly the four required categories, in order');
  assert.equal(await evaluate(`document.querySelector('[data-filter="all"]').getAttribute('aria-checked')`),'true','All is marked selected by default');

  // Basic: real classification data, raspberry (Basic) included, count matches exactly.
  await click('[data-filter="basic"]');
  const basicExpected=await expectedFor('basic');
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-menu').hidden`),true,'Menu closes immediately after a selection');
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),`${basicExpected.length} chocolates`,'Basic count matches the active Basic products');
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-toggle').textContent`),'Filter: Basic','Active category shown on the control');
  assert.deepEqual((await visibleIds()).sort(),[...basicExpected].sort(),'Basic shows exactly the active Basic products');
  assert(basicExpected.includes('raspberry'),'Sanity: raspberry is classified Basic in the product data');
  // Filter control must remain visible and clickable even with real (non-empty) results.
  assert(await evaluate(`document.querySelector('#catalog-filter-toggle').getBoundingClientRect().width>0`),'Filter control still visible after selecting Basic');

  await click('#catalog-filter-toggle');
  await click('[data-filter="seasonal"]');
  const seasonalExpected=await expectedFor('seasonal');
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),`${seasonalExpected.length} chocolates`,'Seasonal count matches the active Seasonal products from the supplied data');
  assert.deepEqual((await visibleIds()).sort(),[...seasonalExpected].sort(),'Seasonal shows exactly the active Seasonal products, not defaulted to Basic');
  assert(seasonalExpected.length>0,'Seasonal has real active products from the supplied classification');
  assert.equal(await evaluate(`document.querySelectorAll('#catalog-filter-menu [aria-checked="true"]').length`),1,'Exactly one category is ever checked (single-select, not multi-select)');
  assert.equal(await evaluate(`document.querySelector('[data-filter="basic"]').getAttribute('aria-checked')`),'false','Selecting Seasonal replaced Basic rather than adding to it');
  // Box contents are completely independent of the catalog filter, even hidden.
  assert.equal(await evaluate(`document.querySelector('#foundation-count').textContent`),boxCountBefore,'Box piece count unaffected by switching filters, even while raspberry is hidden from the catalog');
  assert(await evaluate(`document.querySelector('#catalog-filter-toggle').getBoundingClientRect().width>0`),'Filter control still visible after selecting Seasonal');
  assert.equal(await evaluate(`document.getElementById('catalog-empty').hidden`),true,'Empty-state message stays hidden -- Seasonal has real results now');

  await click('#catalog-filter-toggle');
  await click('[data-filter="cocoshots"]');
  const cocoshotsExpected=await expectedFor('cocoshots');
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),`${cocoshotsExpected.length} chocolates`,'CocoShots count matches the active CocoShot products (CSV type cocoashot)');
  assert.deepEqual((await visibleIds()).sort(),[...cocoshotsExpected].sort(),'CocoShots shows exactly the active CocoShot products');
  assert(cocoshotsExpected.length>0,'CocoShots has real active products from the supplied classification');
  // Missing images (if any) must not break layout, remove the product, or throw.
  await evaluate(`Promise.all([...document.querySelectorAll('.catalog-item:not([hidden]) .chocolate-card img')].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});})))`);
  assert.equal(await evaluate(`document.querySelectorAll('.catalog-item:not([hidden])').length`),cocoshotsExpected.length,'Every active CocoShot still renders a card even if its photo asset 404s');
  assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'No layout collapse/overflow while CocoShots is active');
  assert(await evaluate(`document.querySelector('#catalog-filter-toggle').getBoundingClientRect().width>0`),'Filter control still visible after selecting CocoShots');

  // Synthetic zero-result check: the empty-state mechanism itself, independent of
  // whether today's real data happens to be non-empty for every category.
  const originalCategories=await evaluate(`COUNTER_PRODUCTS.map(p=>({id:p.id,category:p.category}))`);
  await evaluate(`COUNTER_PRODUCTS.forEach(p=>{if(p.category==='cocoshots')p.category='basic';})`);
  await click('#catalog-filter-toggle');
  await click('[data-filter="all"]');
  await click('#catalog-filter-toggle');
  await click('[data-filter="cocoshots"]');
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),'0 chocolates','Synthetic zero-result case reports 0');
  assert.equal(await evaluate(`document.getElementById('catalog-empty').hidden`),false,'Empty-state message shows when a filter genuinely has zero matches');
  assert.equal(await evaluate(`document.getElementById('catalog-empty').textContent`),'No chocolates available in this category.');
  assert(await evaluate(`(()=>{const h=document.querySelector('#catalog-title'),c=document.querySelector('#catalog-result'),f=document.querySelector('#catalog-filter-toggle'),e=document.querySelector('#catalog-edit');return [h,c,f,e].every(el=>el.getBoundingClientRect().width>0||el.getBoundingClientRect().height>0)})()`),'Heading, count, Filter, and Edit all remain visible with zero results');
  assert(await evaluate(`document.querySelector('#catalog-filter-toggle').getBoundingClientRect().width>0`),'Filter control is still clickable with zero results, not destroyed');
  await click('#catalog-filter-toggle');
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-menu').hidden`),false,'Filter can still be reopened after a zero-result selection');
  await click('[data-filter="all"]');
  await evaluate(`(()=>{const saved=${JSON.stringify(originalCategories)};COUNTER_PRODUCTS.forEach(p=>{const s=saved.find(x=>x.id===p.id);if(s)p.category=s.category;});})()`);

  // Return to All: everything comes back, quantity badge survives the round-trip.
  assert.equal(await evaluate(`document.querySelector('#catalog-result').textContent`),`${allExpected.length} chocolates`);
  assert.deepEqual((await visibleIds()).sort(),[...allExpected].sort(),'All active products return after the round-trip');
  assert.equal(await evaluate(`document.querySelector('[data-product-id="raspberry"] .quantity-badge').textContent`),'2','Quantity badge survives a full filter round-trip unchanged');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.catalog-item .chocolate-card')].map(e=>e.dataset.productId)`),initialOrder,'Catalog DOM order is untouched by filtering (view-only)');
  await click('[data-action="undo"]');await click('[data-action="undo"]');

  // Catalog interactions keep working while a filter is active.
  await click('#catalog-filter-toggle');
  await click('[data-filter="basic"]');
  const countBeforeTap=await evaluate(`document.querySelector('#foundation-count').textContent`);
  const [beforeN,capacity]=countBeforeTap.split(' / ');
  await click('[data-product-id="champagne"]');
  assert.equal(await evaluate(`document.querySelector('#foundation-count').textContent`),`${Number(beforeN)+1} / ${capacity}`,'Tap-to-add still works while filtered');
  await click('[data-quantity-id="champagne"]');
  assert.equal(await evaluate(`document.querySelector('#quantity-dialog').open`),true,'Qty dialog still opens while filtered');
  await click('#quantity-dialog [data-cancel]');
  await click('[data-action="undo"]');
  await click('#catalog-filter-toggle');
  await click('[data-filter="all"]');

  // Escape closes the menu; outside click closes the menu (mouse); a plain button
  // click handler works identically for touch, since no custom pointer gesture is used.
  await click('#catalog-filter-toggle');
  await evaluate(`document.querySelector('#catalog-filter-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-menu').hidden`),true,'Escape closes the filter menu');
  await click('#catalog-filter-toggle');
  await evaluate(`document.querySelector('.catalog h2').click()`);
  assert.equal(await evaluate(`document.querySelector('#catalog-filter-menu').hidden`),true,'Clicking outside the filter closes the menu');

  // Full round-trip through every category, confirming Filter is never lost.
  for(const cat of ['all','seasonal','cocoshots','basic','all']){
    await click('#catalog-filter-toggle');
    await click(`[data-filter="${cat}"]`);
    assert(await evaluate(`document.querySelector('#catalog-filter-toggle').getBoundingClientRect().width>0`),`Filter control survives switching to ${cat}`);
  }
  console.log('PASS Counter filter: real CSV-sourced categories (Basic/Seasonal/CocoShots), active-only, count reflects visible products, empty-state message with header/Filter/Edit always intact, box contents and quantity badges independent of filter, catalog order preserved, catalog interactions unaffected.');
};
