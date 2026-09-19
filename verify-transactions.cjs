const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
 const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
 const records=()=>evaluate(`JSON.parse(localStorage.getItem('cd-boxes-v1')||'[]')`);
 const state=()=>evaluate(`({count:document.querySelector('#foundation-count').textContent,slots:[...document.querySelectorAll('.box-piece')].map(b=>b.dataset.pieceId),save:document.querySelector('.save-box').disabled})`);
 const qty=async(id,n)=>{await click('[data-quantity-id="'+id+'"]');for(const d of String(n))await click('[data-key="'+d+'"]');await click('#quantity-confirm');};
 await send('Emulation.setDeviceMetricsOverride',{width:1376,height:1032,deviceScaleFactor:1,mobile:false});await send('Page.reload');await delay(800);
 await click('#catalog-edit');await evaluate(`(()=>{const b=document.querySelector('.chocolate-card');b.focus();b.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true}));})()`);await click('#catalog-edit');
 const catalogOrder=await evaluate(`localStorage.getItem('cd-catalog-order-v1')`);
 const initial=(await records()).length;
 for(const size of [6,10,16,30,50]){
  await click('[data-capacity-option="'+size+'"]');const firstAt=Date.now();await qty('amaretto',size-1);await qty('raspberry',1);
  if(size===6){await click('[data-slot="0"]');assert((await state()).save);await click('[data-action=undo]');await click('[data-action=edit]');await evaluate(`(()=>{const b=document.querySelector('[data-slot="4"]');b.focus();b.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true}));})()`);await click('[data-action=edit]');}
  const before=await state(),n=(await records()).length;if(size===6)assert.equal(before.slots[4],'raspberry','Rearrangement before saving must move the distinct piece');
  await evaluate(`document.querySelector('.save-box').click();document.querySelector('.save-box').click()`);
  assert.equal(await evaluate(`localStorage.getItem('cd-catalog-order-v1')`),catalogOrder);
  const all=await records(),r=all.at(-1);assert.equal(all.length,n+1);assert.equal(r.totalPieces,size);assert.deepEqual(r.slotOrder,before.slots);assert.equal(r.contents.reduce((sum,i)=>sum+i.quantity,0),size);assert(Date.parse(r.startedAt)>=firstAt-100);assert(r.captureDurationMs>=0);assert.equal((await state()).count,'0 / '+size);assert((await state()).save);
  assert(await evaluate(`document.querySelector('[data-action=undo]').disabled&&[...document.querySelectorAll('.quantity-badge')].every(b=>b.hidden)&&!document.querySelector('.transaction-notice').hidden`));
 }
 assert.equal((await records()).length,initial+5);assert.equal(new Set((await records()).map(r=>r.id)).size,(await records()).length);
 await click('[data-capacity-option="6"]');await qty('amaretto',6);const full=await state();
 await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cd-boxes-v1')throw new Error('Quota exceeded');return window.originalSetItem.call(this,k,v);}`);
 await click('.save-box');assert.deepEqual(await state(),full);assert(await evaluate(`document.querySelector('.builder-footnote').textContent.includes("Couldn't save")`));
 await evaluate('Storage.prototype.setItem=window.originalSetItem;delete window.originalSetItem');
 const previous=await evaluate(`localStorage.getItem('cd-boxes-v1')`);await evaluate(`localStorage.setItem('cd-boxes-v1','malformed')`);await click('.save-box');assert.deepEqual(await state(),full);assert.equal(await evaluate(`localStorage.getItem('cd-boxes-v1')`),'malformed');await evaluate(`localStorage.setItem('cd-boxes-v1',${JSON.stringify(previous)})`);await click('.save-box');
 for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await qty('amaretto',6);await click('.save-box');
  assert(await evaluate(`(()=>{const n=document.querySelector('.transaction-notice').getBoundingClientRect(),b=document.querySelector('.box-size-options').getBoundingClientRect();return n.left>=0&&n.right<=innerWidth&&n.bottom<=b.top&&document.documentElement.scrollWidth<=innerWidth})()`));
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,'saved-'+width+'.png'),Buffer.from(shot.data,'base64'));
 }
 await delay(2700);assert(await evaluate(`document.querySelector('.transaction-notice').hidden`));
 const beforeCapture=await evaluate(`JSON.stringify({url:location.href,storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML})`);await click('.capture-box');assert.equal(await evaluate(`JSON.stringify({url:location.href,storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML})`),beforeCapture);
 const savedCount=(await records()).length;await send('Page.reload');await delay(800);assert.equal((await records()).length,savedCount);
 await click('[data-view=boxes]');assert(await evaluate(`document.querySelector('#boxTable').textContent.includes('Amaretto')`));await click('[data-view=insights]');await click('[data-view=counter]');
 await send('Page.navigate',{url:'http://127.0.0.1:8080/cocoa-dolce-box-log.html'});await delay(800);await qty('amaretto',6);await click('.save-box');assert.equal((await records()).length,savedCount+1);
 console.log('PASS transactions UI: all five sizes, duplicate-save protection, final slots, remove/Undo, quantities, reset, append/refresh, failed saves preserve box, four confirmation layouts, Capture no-op.');
};
