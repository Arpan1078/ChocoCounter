const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
 const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
 const order=()=>evaluate(`[...document.querySelectorAll('.chocolate-card')].map(c=>c.dataset.productId)`);
 const box=()=>evaluate(`({slots:[...document.querySelectorAll('.box-piece')].map(c=>c.dataset.pieceId),count:document.querySelector('#foundation-count').textContent,summary:document.querySelector('.box-summary').textContent,undo:document.querySelector('[data-action=undo]').disabled,save:document.querySelector('.save-box').disabled})`);
 const reload=async()=>{await send('Page.reload');await delay(650);};
 const point=async i=>evaluate(`(()=>{const e=document.querySelectorAll('.catalog-item')[${i}],r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+35}})()`);
 async function drag(touch){const a=await point(0),b=await point(1);if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',...b,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',clickCount:1});}}
 for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
  await evaluate(`localStorage.removeItem('cd-catalog-order-v1')`);await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await reload();
  await click('[data-product-id=amaretto]');const initialBox=await box(),initial=await order();
  const productData=await evaluate('JSON.stringify(COUNTER_PRODUCTS)');
  await click('#catalog-edit');assert.equal(await evaluate('document.querySelector("#catalog-edit").textContent'),'Done');
  await click('[data-product-id=raspberry]');await click('[data-quantity-id=raspberry]');assert.deepEqual(await box(),initialBox);assert(await evaluate('!document.querySelector("#quantity-dialog").open'));
  await drag(false);let expected=[...initial];[expected[0],expected[1]]=[expected[1],expected[0]];assert.deepEqual(await order(),expected);assert.deepEqual(await box(),initialBox);
  assert.equal(await evaluate('JSON.stringify(COUNTER_PRODUCTS)'),productData);
  assert(await evaluate(`[...document.querySelectorAll('.chocolate-card')].every(c=>{const p=COUNTER_PRODUCTS.find(p=>p.id===c.dataset.productId);return c.querySelector('img').getAttribute('src')===p.image&&c.querySelector('.chocolate-name > span').textContent===p.name})`));
  await drag(true);assert.deepEqual(await order(),initial);await drag(true);assert.deepEqual(await order(),expected);
  assert.equal(await evaluate(`localStorage.getItem('cd-catalog-order-v1')`),null,'Persist only on Done');
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,'catalog-edit-'+width+'.png'),Buffer.from(shot.data,'base64'));
  await click('#catalog-edit');assert.deepEqual(await box(),initialBox);assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cd-catalog-order-v1'))`),expected);
  await click('[data-action=undo]');assert.equal((await box()).count,'0 / 6','Catalog editing must not add Undo history');
  await click('[data-product-id="'+expected[0]+'"]');assert.equal((await box()).slots[0],expected[0]);
  assert(await evaluate(`document.querySelector('.box-piece img').getAttribute('src')===COUNTER_PRODUCTS.find(p=>p.id==='${expected[0]}').topViewImage`));
  await click('[data-quantity-id="'+expected[0]+'"]');assert(await evaluate('document.querySelector("#quantity-dialog").open'));await click('#quantity-dialog [data-cancel]');
  await reload();assert.deepEqual(await order(),expected);
  assert(await evaluate(`(()=>{const a=document.querySelector('#catalog-title').getBoundingClientRect(),b=document.querySelector('.catalog-tools').getBoundingClientRect();return a.right<b.left&&b.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`));
 }
 for(const saved of ['bad json','{}',JSON.stringify(['raspberry','raspberry','removed-id'])]){
  await evaluate(`localStorage.setItem('cd-catalog-order-v1',${JSON.stringify(saved)})`);await reload();const ids=await order();assert.equal(ids.length,31);assert.equal(new Set(ids).size,31);if(saved.startsWith('['))assert.equal(ids[0],'raspberry');
 }
 await evaluate(`localStorage.removeItem('cd-catalog-order-v1')`);await reload();
 console.log('PASS catalog editing: mouse/touch swaps, selection/Qty lock, independent modes, unchanged box/history/data, restored ID order, stale storage repair, and four responsive headers.');
};
