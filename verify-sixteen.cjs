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
  const geometry=async()=>assert(await evaluate(`(()=>{
    const scene=document.querySelector('.box-scene'),frame=document.querySelector('.box-frame'),image=document.querySelector('.box-render');
    const r=frame.getBoundingClientRect(),s=scene.getBoundingClientRect(),im=image.getBoundingClientRect();
    const aligned=[...frame.querySelectorAll('.box-piece')].every((e,i)=>{const b=e.getBoundingClientRect(),p=COUNTER_BOX_LAYOUTS[16].slots[i],img=e.querySelector('img')?.getBoundingClientRect();return Math.abs(b.x+b.width/2-r.x-r.width*p.x/100)<1&&Math.abs(b.y+b.height/2-r.y-r.height*p.y/100)<1&&(!img||(Math.abs(img.x+img.width/2-b.x-b.width/2)<1&&Math.abs(img.y+img.height/2-b.y-b.height/2)<1))});
    const undo=document.querySelector('.box-undo').getBoundingClientRect(),reset=document.querySelector('.box-reset').getBoundingClientRect();
    return aligned&&r.width/s.width>.99&&Math.abs(r.width/r.height-image.naturalWidth/image.naturalHeight)<.001&&Math.abs(im.height-r.height)<1&&scene.scrollWidth<=scene.clientWidth+1&&scene.scrollHeight<=scene.clientHeight+1&&undo.left>=r.left&&reset.right<=r.right&&undo.bottom<=r.bottom&&reset.bottom<=r.bottom&&!document.querySelector('.temporary-tray');
  })()`),'Natural photo ratio, width, slot/image alignment, no scene scrolling, attached controls');
  for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await click('[data-capacity-option="16"]');
    await evaluate(`document.querySelector('.box-render').decode()`);
    for(const count of [0,1,4,8,12,16]){
      if(count)await qty(count===1?1:count===4?3:4);
      assert.equal(await evaluate(`document.querySelector('#foundation-count').textContent`),`${count} / 16`);
      assert.equal(await evaluate(`document.querySelector('.save-box').disabled`),count!==16);
      assert.equal(await evaluate(`document.querySelector('#box-complete').hidden`),count!==16);
      assert.equal((await slots()).length,16);await geometry();
      if([0,8,16].includes(count)){
        const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,`sixteen-${width}-${count}.png`),Buffer.from(shot.data,'base64'));
      }
    }
    await click('[data-quantity-id="amaretto"]');await click('[data-key="1"]');assert(await evaluate(`document.querySelector('#quantity-confirm').disabled`));await click('#quantity-dialog [data-cancel]');
    await reset();
    // Resize with the real divider, retaining the existing limits and persistence.
    const initial=await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width`);
    const divider=await evaluate(`(()=>{const r=document.querySelector('.counter-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for(const [type,x] of [['mousePressed',divider.x],['mouseMoved',divider.x-80],['mouseReleased',divider.x-80]])await send('Input.dispatchMouseEvent',{type,x,y:divider.y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
    assert(await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width>${initial}`));await geometry();
    await evaluate(`document.querySelector('.foundation').style.setProperty('--counter-catalog-split','65fr');document.querySelector('.foundation').style.setProperty('--counter-builder-split','35fr')`);
  }
  // Real pointer move/swap/remove plus Undo/Reset for the upgraded and existing photos.
  await send('Emulation.setDeviceMetricsOverride',{width:1376,height:1032,deviceScaleFactor:1,mobile:false});
  for(const size of [16,6,10]){
    await click(`[data-capacity-option="${size}"]`);
    await click('.chocolate-card[data-product-id="amaretto"]');await click('.chocolate-card[data-product-id="raspberry"]');await delay(260);
    await drag(0,size-1);assert.equal((await slots())[size-1],'amaretto');assert.equal((await slots())[0],'');
    await drag(size-1,1);assert.equal((await slots())[1],'amaretto');assert.equal((await slots())[size-1],'raspberry');
    await click('.box-undo');assert.equal((await slots())[1],'raspberry');
    await drag(size-1,size-1);assert.equal((await slots())[size-1],'');
    await click('.box-undo');assert.equal((await slots())[size-1],'amaretto');
    const before=await slots();await click('.box-reset');await click('#clear-dialog [data-cancel]');assert.deepEqual(await slots(),before);
    await reset();assert((await slots()).every(id=>!id));await click('.box-undo');assert.deepEqual(await slots(),before);await reset();
  }
  await click('[data-capacity-option="16"]');await qty(16);
  const beforeSave=await slots();await click('.save-box');await click('#saved-checkout');
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cd-boxes-v1')).at(-1).slotOrder`),beforeSave);
  assert.equal(await evaluate(`document.querySelector('#checkout-total').textContent`),'Total unavailable');
  await click('[data-view="counter"]');
  for(const size of [50]){await click(`[data-capacity-option="${size}"]`);assert(await evaluate(`!document.querySelector('.temporary-tray')&&document.querySelector('.box-render').getAttribute('src')==='assets/box/50-piece-box.png'&&document.querySelectorAll('.box-piece').length===50`));}
  console.log('PASS 16 real asset: 0/1/4/8/12/16 at four viewports, row-major slots, natural aspect, no scene scroll, resize divider, capacity/duplicates, pointer move/swap/remove, Undo/Reset, Save slot order and unsupported Checkout price; 6/10 interactions and 50 real photo verified.');
};
