const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  await click('[data-view="counter"]');
  for(const [width,height] of [[1920,1080],[1376,1032],[1180,820],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const size of [6,10]){
      await click(`[data-capacity-option="${size}"]`);
      for(const state of ['empty','partial','full']){
        if(state!=='empty'){
          await click('[data-quantity-id="amaretto"]');
          for(const digit of String(state==='partial'?2:size-2))await click(`[data-key="${digit}"]`);
          await click('#quantity-confirm');
          await delay(260); // Let the existing arrival animation settle before measuring centers.
        }
        assert(await evaluate(`(()=>{const frame=document.querySelector('.box-frame').getBoundingClientRect(),scene=document.querySelector('.box-scene').getBoundingClientRect();return frame.width/scene.width>=.99&&Math.abs(frame.width/frame.height-1.5)<.01&&[...document.querySelectorAll('.box-piece')].every((e,i)=>{const r=e.getBoundingClientRect(),p=COUNTER_BOX_LAYOUTS[${size}].slots[i];return Math.abs(r.x+r.width/2-frame.x-frame.width*p.x/100)<1&&Math.abs(r.y+r.height/2-frame.y-frame.height*p.y/100)<1})})()`),'Full panel width, aspect ratio, and slot coordinates');
        assert(await evaluate(`(()=>{const r=document.querySelector('.box-frame').getBoundingClientRect(),u=document.querySelector('.box-undo').getBoundingClientRect(),x=document.querySelector('.box-reset').getBoundingClientRect();return u.left>=r.left&&u.left-r.left<20&&x.right<=r.right&&r.right-x.right<20&&u.bottom<=r.bottom&&r.bottom-u.bottom<20&&x.bottom<=r.bottom})()`),'Controls remain attached to frame bottom corners');
        assert(await evaluate(`[...document.querySelectorAll('.box-frame .box-piece.occupied')].every(e=>{const b=e.getBoundingClientRect(),i=e.querySelector('img').getBoundingClientRect();return Math.abs(b.x+b.width/2-i.x-i.width/2)<1&&Math.abs(b.y+b.height/2-i.y-i.height/2)<1})`),'Chocolate image centers match slot hit areas');
        if(state==='full'){
          await evaluate(`Promise.all([...document.querySelectorAll('.box-scene img')].map(i=>i.decode()))`);
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(profile,`counter-restored-${size}-${width}.png`),Buffer.from(shot.data,'base64'));
          await click('.save-box');await click('#saved-another');
        }
      }
      const initial=await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width`);
      // Exercise the same split CSS properties updated by the existing divider.
      await evaluate(`document.querySelector('.foundation').style.setProperty('--counter-catalog-split','45fr');document.querySelector('.foundation').style.setProperty('--counter-builder-split','55fr')`);
      assert(await evaluate(`document.querySelector('.box-frame').getBoundingClientRect().width>${initial}`),'Wider panel grows frame');
      assert(await evaluate(`Math.abs(document.querySelector('.box-frame').getBoundingClientRect().width-document.querySelector('.box-scene').getBoundingClientRect().width)<1`),'No remaining height-based width cap');
      await evaluate(`document.querySelector('.foundation').style.setProperty('--counter-catalog-split','65fr');document.querySelector('.foundation').style.setProperty('--counter-builder-split','35fr')`);
    }
  }
  const before=await evaluate(`JSON.stringify({storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML})`);await click('.capture-box');assert.equal(await evaluate(`JSON.stringify({storage:{...localStorage},html:document.querySelector('#v-counter').innerHTML})`),before);
  console.log('PASS Counter sizing: empty/partial/full 6 and 10 at all four viewports, full panel width, proportional slots, attached Undo/Reset, wider panel grows box, Save and Capture.');
};
