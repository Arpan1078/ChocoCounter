const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
module.exports = async ({ evaluate, send, delay, profile }) => {
  const reload = async () => { await send('Page.reload'); await delay(500); };
  const count = () => evaluate(`document.querySelector('#foundation-count').textContent`);
  const tap = async (id, touch=false) => {
    const p=await evaluate(`(() => {const e=document.querySelector('[data-product-id="${id}"]');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    if(touch) {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else {
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    }
  };
  for(const [width,height] of [[1376,1032],[1180,820],[1024,768],[1920,1080]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await reload();
    const ids=await evaluate(`[...document.querySelectorAll('.chocolate-card')].map(c=>c.dataset.productId)`);
    for(const id of ids.slice(0,6)) {await tap(id,true);await delay(260);}
    assert.equal(await count(),'6 / 6');
    await tap(ids[6]); assert.equal(await count(),'6 / 6');
    assert(await evaluate(`document.querySelector('.builder-footnote').textContent.includes('full')`));
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.chocolate-card')].map(c=>c.dataset.productId)`),ids);
    assert(await evaluate(`document.querySelector('.save-box').disabled`));
    assert(await evaluate(`(() => {const i=document.querySelector('.box-scene img'),r=i.getBoundingClientRect(),s=i.parentElement.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.001 && r.top>=s.top-1 && r.bottom<=s.bottom+1 && r.left>=s.left-1 && r.right<=s.right+1;})()`),'Full-box summary preserves image aspect ratio and containment');
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth && document.querySelector('.save-box').getBoundingClientRect().bottom<=innerHeight`));
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(profile,`selected-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await reload();
  // Fast consecutive native button activations cannot be dropped by animation timers.
  await evaluate(`for(let i=0;i<3;i++) document.querySelector('[data-product-id="salted-caramel"]').click()`);
  assert.equal(await count(),'3 / 6');
  assert.equal(await evaluate(`document.querySelector('[data-product-id="salted-caramel"] .quantity-badge').textContent`),'3');
  assert(await evaluate(`document.querySelector('.box-summary').textContent.includes('Salted Caramel×3')`));
  await evaluate(`document.querySelector('[data-capacity-option="10"]').click()`);
  assert.equal(await count(),'3 / 10');
  await evaluate(`document.querySelector('[data-capacity-option="6"]').click()`);
  assert.equal(await count(),'3 / 6');
  await reload();
  await evaluate(`document.querySelector('[data-capacity-option="10"]').click()`);
  assert.equal(await count(),'0 / 10');
  await evaluate(`document.querySelectorAll('.chocolate-card').forEach((c,i)=>{if(i<10)c.click()})`);
  assert.equal(await count(),'10 / 10');
  await evaluate(`document.querySelector('.chocolate-card').click();document.querySelector('[data-capacity-option="6"]').click()`);
  assert.equal(await count(),'10 / 10');
  assert(await evaluate(`document.querySelector('.builder-footnote').textContent.includes('10 pieces selected')`));
  assert(await evaluate(`[...document.querySelectorAll('.builder-controls button')].every(b=>b.disabled)`));
  // Exercise the state boundary with inactive entries and recency without reordering UI.
  const model=await evaluate(`(() => {const s=createCounterSelection([{id:'a',name:'A',active:true},{id:'b',name:'B',active:true},{id:'off',name:'Off',active:false}]);s.add('a');s.add('b');s.add('a');const x=s.snapshot();x.pieces.push('bad');return {recent:s.snapshot().recentIds,count:s.snapshot().count,inactive:s.add('off').ok};})()`);
  assert.deepEqual(model,{recent:['a','b'],count:3,inactive:false});
  await reload(); assert.equal(await count(),'0 / 6');
  // Keyboard retains native button activation semantics.
  await evaluate(`document.querySelector('.chocolate-card').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await count(),'1 / 6');
  assert(await evaluate(`[...document.querySelectorAll('#v-counter img')].every(i=>i.complete&&i.naturalWidth)`));
  console.log('PASS Phase 2: touch/mouse/keyboard, six and ten capacity limits, rapid duplicates, size preservation/rejection, stable order, recency, inactive products, refresh, and filled-box layouts.');
};
