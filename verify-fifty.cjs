const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  const slots=()=>evaluate(`[...document.querySelectorAll('.box-piece')].map(e=>e.dataset.pieceId)`);
  const qty=async n=>{await click('[data-quantity-id="amaretto"]');for(const digit of String(n))await click(`[data-key="${digit}"]`);await click('#quantity-confirm');await delay(260);};
  const reset=async()=>{await click('.box-reset');await click('#clear-confirm');};
  const point=i=>evaluate(`(()=>{const r=document.querySelector('[data-slot="${i}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const drag=async(from,to)=>{
    const a=await point(from),b=await point(to);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',clickCount:1});
    if(from!==to)for(let n=1;n<=5;n++)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x+(b.x-a.x)*n/5,y:a.y+(b.y-a.y)*n/5,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',clickCount:1});
    await delay(100);
  };
  const geometry=async(size=50)=>assert(await evaluate(`(()=>{
    const scene=document.querySelector('.box-scene'),frame=document.querySelector('.box-frame'),image=document.querySelector('.box-render');
    const r=frame.getBoundingClientRect(),s=scene.getBoundingClientRect(),im=image.getBoundingClientRect();
    const aligned=[...frame.querySelectorAll('.box-piece')].every((e,i)=>{const b=e.getBoundingClientRect(),p=COUNTER_BOX_LAYOUTS[${size}].slots[i],img=e.querySelector('img')?.getBoundingClientRect();return Math.abs(b.x+b.width/2-r.x-r.width*p.x/100)<1&&Math.abs(b.y+b.height/2-r.y-r.height*p.y/100)<1&&(!img||(Math.abs(img.x+img.width/2-b.x-b.width/2)<1&&Math.abs(img.y+img.height/2-b.y-b.height/2)<1))});
    const undo=document.querySelector('.box-undo').getBoundingClientRect(),reset=document.querySelector('.box-reset').getBoundingClientRect();
    const controlsClear=[undo,reset].every(c=>[...frame.querySelectorAll('.box-piece.occupied')].every(e=>{const b=e.getBoundingClientRect();return c.right<=b.left||c.left>=b.right||c.bottom<=b.top||c.top>=b.bottom}));
    return controlsClear&&aligned&&r.width/s.width>.99&&Math.abs(r.width/r.height-image.naturalWidth/image.naturalHeight)<.001&&Math.abs(im.height-r.height)<1&&scene.scrollWidth<=scene.clientWidth+1&&scene.scrollHeight<=scene.clientHeight+1&&undo.left>=r.left&&reset.right<=r.right&&undo.bottom<=r.bottom&&reset.bottom<=r.bottom&&!document.querySelector('.temporary-tray');
  })()`),'Natural photo ratio, width, slot/image alignment, no scene scrolling, attached controls');
  for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate(`localStorage.setItem('cd-counter-split-v1','65')`);await send('Page.reload');await delay(2200);
    await click('[data-capacity-option="50"]');
    await evaluate(`document.querySelector('.box-render').decode()`);
    let previousCount=0;
    for(const count of [0,1,10,20,25,30,40,48,49,50]){
      if(count)await qty(count-previousCount);
      previousCount=count;
      assert.equal(await evaluate(`document.querySelector('#foundation-count').textContent`),`${count} / 50`);
      assert.equal(await evaluate(`document.querySelector('.save-box').disabled`),count!==50);
      assert.equal(await evaluate(`document.querySelector('#box-complete').hidden`),count!==50);
      assert.equal((await slots()).length,50);await geometry();
      if(count===48){await click('[data-quantity-id="amaretto"]');await click('[data-key="5"]');assert(await evaluate(`document.querySelector('#quantity-confirm').disabled`));await click('#quantity-dialog [data-cancel]');assert.equal((await slots()).filter(Boolean).length,48);}
      if(count===50&&width===1024){for(let slot=0;slot<50;slot++){await drag(slot,slot);assert.equal((await slots())[slot],'');await click('.box-undo');assert.equal((await slots()).filter(Boolean).length,50);}}
      if([0,25,50].includes(count)){
        const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,`fifty-${width}-${count}.png`),Buffer.from(shot.data,'base64'));
      }
    }
    await click('[data-quantity-id="amaretto"]');await click('[data-key="1"]');assert(await evaluate(`document.querySelector('#quantity-confirm').disabled`));await click('#quantity-dialog [data-cancel]');
    await reset();
    // Resize with the real divider, retaining the existing limits and persistence.
    const initial=await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width`);
    const divider=await evaluate(`(()=>{const r=document.querySelector('.counter-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for(const [type,x] of [['mousePressed',divider.x],['mouseMoved',divider.x-80],['mouseReleased',divider.x-80]])await send('Input.dispatchMouseEvent',{type,x,y:divider.y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
    assert(await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width>${initial}`));await qty(50);await geometry();
    const resized=await evaluate(`(()=>{const r=document.querySelector('.counter-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for(const [type,x] of [['mousePressed',resized.x],['mouseMoved',resized.x+160],['mouseReleased',resized.x+160]])await send('Input.dispatchMouseEvent',{type,x,y:resized.y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
    assert(await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width<${initial}`));await geometry();await reset();
    await evaluate(`document.querySelector('.foundation').style.setProperty('--counter-catalog-split','65fr');document.querySelector('.foundation').style.setProperty('--counter-builder-split','35fr')`);
  }
  // Real pointer move/swap/remove plus Undo/Reset for the upgraded and existing photos.
  await send('Emulation.setDeviceMetricsOverride',{width:1376,height:1032,deviceScaleFactor:1,mobile:false});
  for(const size of [50,6,10,16,30]){
    await click(`[data-capacity-option="${size}"]`);
    await click('.chocolate-card[data-product-id="amaretto"]');await click('.chocolate-card[data-product-id="raspberry"]');await delay(260);await evaluate(`document.querySelector('.box-render').decode()`);await geometry(size);
    await drag(0,size-1);assert.equal((await slots())[size-1],'amaretto');assert.equal((await slots())[0],'');
    await drag(size-1,1);assert.equal((await slots())[1],'amaretto');assert.equal((await slots())[size-1],'raspberry');
    await click('.box-undo');assert.equal((await slots())[1],'raspberry');
    await drag(size-1,size-1);assert.equal((await slots())[size-1],'');
    await click('.box-undo');assert.equal((await slots())[size-1],'amaretto');
    const before=await slots();await click('.box-reset');await click('#clear-dialog [data-cancel]');assert.deepEqual(await slots(),before);
    await reset();assert((await slots()).every(id=>!id));await click('.box-undo');assert.deepEqual(await slots(),before);await reset();
  }
  await click('[data-capacity-option="50"]');await qty(50);
  const beforeSave=await slots();await click('.save-box');await click('#saved-checkout');
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cd-boxes-v1')).at(-1).slotOrder`),beforeSave);
  assert.equal(await evaluate(`document.querySelector('#checkout-total').textContent`),'Total unavailable');
  await click('[data-view="counter"]');
  // Rapid switches retain only the current image, capacity, and slots.
  await evaluate(`(()=>{for(const size of [6,10,16,30,50,30,16,10,6,50]){document.querySelector('[data-capacity-option="'+size+'"]').click();const img=document.querySelector('.box-render');if(img.getAttribute('src')!==COUNTER_BOX_LAYOUTS[size].image||document.querySelectorAll('.box-piece').length!==size||document.querySelector('#foundation-count').textContent!=='0 / '+size)throw Error('Stale size state');}})()`);
  // Exercise the first/last columns at both top and bottom edges.
  await click('.chocolate-card[data-product-id="amaretto"]');await click('.chocolate-card[data-product-id="raspberry"]');await delay(260);
  for(const target of [9,40,49]){await drag(0,target);assert.equal((await slots())[target],'amaretto');await drag(target,1);assert.equal((await slots())[1],'amaretto');await click('.box-undo');await drag(target,target);assert.equal((await slots())[target],'');await click('.box-undo');await drag(target,0);}
  await geometry();
  console.log('PASS 50 real asset: 0/1/10/20/25/30/40/48/49/50 at four viewports, row-major slots, natural aspect, no scene scroll, resize divider, capacity/duplicates, pointer move/swap/remove, Undo/Reset, Save slot order and unsupported Checkout price; all 50 hit targets, edge interactions, rapid size switches, and 6/10/16/30 regressions.');
};
