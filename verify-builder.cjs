const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  const state=()=>evaluate(`({count:document.querySelector('#foundation-count').textContent,slots:[...document.querySelectorAll('.box-piece')].map(b=>b.dataset.pieceId),summary:document.querySelector('.box-summary').textContent})`);
  const reload=async()=>{await send('Page.reload');await delay(500);};
  const point=selector=>evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const gesture=async(from,to,touch=false)=>{
    const a=await point(`[data-slot="${from}"]`),b=await point(`[data-slot="${to}"]`);
    if(touch){
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
      if(from!==to)for(let n=1;n<=5;n++)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*n/5,y:a.y+(b.y-a.y)*n/5,id:1}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',clickCount:1});
      if(from!==to)for(let n=1;n<=5;n++)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x+(b.x-a.x)*n/5,y:a.y+(b.y-a.y)*n/5,button:'left',buttons:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',clickCount:1});
    }
    await delay(80);
  };
  const add=id=>click(`[data-product-id="${id}"]`);
  for(const [width,height] of [[1376,1032],[1180,820],[1024,768],[1920,1080]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await reload();
    await click('[data-quantity-id="amaretto"]');assert.equal((await state()).count,'0 / 6','Qty must not add one');
    await click('[data-key="3"]');await click('#quantity-confirm');
    assert.equal((await state()).slots.filter(Boolean).length,3);await click('[data-action="undo"]');
    assert.equal((await state()).count,'0 / 6');
    await add('amaretto');await add('raspberry');
    await click('[data-action="edit"]');await add('champagne');assert.equal((await state()).count,'2 / 6');
    assert.equal(await evaluate(`document.querySelector('#box-complete').hidden`),true,'Box Complete badge stays hidden while the box is not full');
    await gesture(0,3,true);let s=await state();assert.equal(s.slots[3],'amaretto');assert.equal(s.slots[0],'');assert.equal(s.count,'2 / 6');
    await click('[data-action="undo"]');assert.equal((await state()).slots[0],'amaretto');
    await gesture(0,1);s=await state();assert.equal(s.slots[0],'raspberry');assert.equal(s.slots[1],'amaretto');assert.equal(s.count,'2 / 6','Drag must not remove');
    await click('[data-action="undo"]');
    // A canceled/outside drag must not become a removal or create an Undo action.
    const beforeOutside=await state(), outsideStart=await point('[data-slot="0"]');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...outsideStart,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:5,button:'left',clickCount:1});
    assert.deepEqual(await state(),beforeOutside);
    await gesture(0,0,true);assert.equal((await state()).count,'1 / 6');await click('[data-action="undo"]');assert.equal((await state()).slots[0],'amaretto');
    await click('[data-action="edit"]');await click('[data-slot="0"]');assert.equal((await state()).count,'1 / 6','Normal mode tap removes');await click('[data-action="undo"]');await gesture(0,1);assert.equal((await state()).slots[0],'amaretto','Normal drag does not move or remove');
    await add('champagne');await add('lemon');
    await click('[data-quantity-id="amaretto"]');await click('[data-key="4"]');
    assert(await evaluate(`document.querySelector('#quantity-confirm').disabled && document.querySelector('#quantity-remaining').textContent.includes('2 spaces remaining')`));
    await click('#quantity-dialog [data-cancel]');
    await click('[data-action="empty"]');await click('#clear-dialog [data-cancel]');assert.equal((await state()).count,'4 / 6');
    await click('[data-action="empty"]');await click('#clear-confirm');assert.equal((await state()).count,'0 / 6');
    await click('[data-action="undo"]');assert.equal((await state()).count,'4 / 6');
    await add('pistachio');await add('cheesecake');await delay(300);
    assert(await evaluate(`!document.querySelector('.save-box').disabled`));
    const consistent=await evaluate(`(() => {const counts={};document.querySelectorAll('.box-piece').forEach(b=>{if(b.dataset.pieceId)counts[b.dataset.pieceId]=(counts[b.dataset.pieceId]||0)+1;});return Object.entries(counts).every(([id,q])=>document.querySelector('[data-product-id="'+id+'"] .quantity-badge').textContent===String(q));})()`);assert(consistent);
    const image=await evaluate(`(() => {const r=document.querySelector('.box-frame').getBoundingClientRect(),i=document.querySelector('.box-render').getBoundingClientRect();return {ratio:r.width/r.height,same:Math.abs(r.width-i.width)<1&&Math.abs(r.height-i.height)<1,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    assert(Math.abs(image.ratio-1536/1024)<.001&&image.same&&!image.overflow);
    await evaluate(`Promise.all([...document.querySelectorAll('.box-piece img')].map(i=>i.decode()))`);
    assert(await evaluate(`document.querySelectorAll('.box-piece').length===6 && [...document.querySelectorAll('.box-piece.occupied')].every(c=>{const i=c.querySelector('img'),r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.001;})`),'All six top-down slots are present and each occupied chocolate keeps its natural aspect ratio');
    assert.equal(await evaluate(`document.querySelector('#box-complete').hidden`),false,'Box Complete badge shows once the box is full');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,`builder-${width}.png`),Buffer.from(shot.data,'base64'));
    if(width===1376){const clip=await evaluate(`(() => {const r=document.querySelector('.box-frame').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:3};})()`);const detail=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(path.join(profile,'slots-detail.png'),Buffer.from(detail.data,'base64'));}
  }
  await reload();await click('[data-capacity-option="10"]');await click('[data-quantity-id="amaretto"]');await click('[data-key="1"]');await click('[data-key="0"]');await click('#quantity-confirm');
  assert.equal((await state()).count,'10 / 10');assert.equal((await state()).slots.length,10);
  assert(await evaluate(`document.querySelector('.box-render').getAttribute('src').includes('top-down-10') && document.querySelectorAll('.box-piece').length===10`),'10-piece box uses the real top-down asset with ten slots');
  assert.equal(await evaluate(`document.querySelector('#box-complete').hidden`),false,'Box Complete badge shows for a full 10-piece box too');
  await click('[data-action="undo"]');assert.equal((await state()).count,'0 / 10');
  await add('amaretto');await add('raspberry');await click('[data-action="edit"]');
  await gesture(0,9,true);assert.equal((await state()).slots[9],'amaretto');
  await gesture(9,1);assert.equal((await state()).slots[1],'amaretto');assert.equal((await state()).slots[9],'raspberry');
  await click('[data-action="undo"]');await click('[data-action="edit"]');
  for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const capacity of [6,10,16,30,50]){
      await reload();await click('[data-capacity-option="'+capacity+'"]');
      const beforeCapture=await evaluate('JSON.stringify({html:document.querySelector("#v-counter").innerHTML,storage:{...localStorage},url:location.href})');
      await click('[data-action="capture"]');
      assert.equal(await evaluate('JSON.stringify({html:document.querySelector("#v-counter").innerHTML,storage:{...localStorage},url:location.href})'),beforeCapture,'Capture performs no action');
      await click('[data-quantity-id="amaretto"]');
      for(const digit of String(capacity+1))await click('[data-key="'+digit+'"]');
      assert(await evaluate('document.querySelector("#quantity-confirm").disabled'));
      await click('#quantity-dialog [data-cancel]');await click('[data-quantity-id="amaretto"]');
      for(const digit of String(capacity))await click('[data-key="'+digit+'"]');
      await click('#quantity-confirm');await delay(300);
      assert.equal((await state()).count,capacity+' / '+capacity);assert.equal((await state()).slots.length,capacity);
      assert(await evaluate('!document.querySelector(".save-box").disabled'));
      await add('raspberry');assert.equal((await state()).count,capacity+' / '+capacity);
      await gesture(0,0,true);assert.equal((await state()).count,(capacity-1)+' / '+capacity);
      assert(await evaluate('document.querySelector(".save-box").disabled'));
      assert.equal(await evaluate('document.querySelector("[data-product-id=amaretto] .quantity-badge").textContent'),String(capacity-1));
      await click('[data-action="undo"]');assert.equal((await state()).slots[0],'amaretto');
      assert(await evaluate('!document.querySelector(".save-box").disabled'));
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      if(capacity>=16){
        assert.equal(await evaluate('document.querySelectorAll(".tray-cavities span").length'),capacity);
        assert(await evaluate('Array.from(document.querySelectorAll(".temporary-tray .box-piece.occupied")).every(b=>{const r=b.getBoundingClientRect(),i=b.querySelector("img").getBoundingClientRect();return Math.abs(r.x+r.width/2-i.x-i.width/2)<1&&Math.abs(r.y+r.height/2-i.y-i.height/2)<1})'),'Temporary tray images stay centered');
      }
      await evaluate('document.querySelector(".capture-box").scrollIntoView({block:"nearest"})');
      assert(await evaluate('(()=>{const r=document.querySelector(".capture-box").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()'));
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,'capacity-'+capacity+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
      await click('[data-action="undo"]');assert.equal((await state()).count,'0 / '+capacity,'Undo entire grouped fill');
    }
  }
  await reload();await click('[data-capacity-option="10"]');
  // Preview and keypad at narrow widths must also remain usable.
  for(const width of [390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
    await click('[data-quantity-id="amaretto"]');
    assert(await evaluate(`(() => {const d=document.querySelector('#quantity-dialog').getBoundingClientRect();return d.left>=0&&d.right<=innerWidth&&d.top>=0&&d.bottom<=innerHeight;})()`));
    if(width===390){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,'quantity-keypad.png'),Buffer.from(shot.data,'base64'));}
    await click('[data-key="0"]');assert(await evaluate(`document.querySelector('#quantity-confirm').disabled`));
    await click('[data-key="Backspace"]');await click('[data-key="2"]');await click('#quantity-confirm');
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
  }
  await evaluate(`document.querySelector('.builder').scrollIntoView({block:'start'})`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(profile,'ten-piece-box.png'),Buffer.from(shot.data,'base64'));
  await reload();
  console.log('PASS Phase 3: grouped keypad, capacity rejection, undo add/remove/move/swap/clear, confirmation cancel, touch vs drag, edit lock/Done, six/ten visualization, and aligned landscape layouts.');
};
