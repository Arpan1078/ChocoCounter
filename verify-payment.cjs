const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  const check=async(e,m)=>assert(await evaluate(e),m);
  const reload=async()=>{await send('Page.reload');await delay(2200);};
  const qty=async(id,n)=>{await click(`[data-quantity-id="${id}"]`);for(const digit of String(n))await click(`[data-key="${digit}"]`);await click('#quantity-confirm');};
  const build=async(size)=>{
    await click(`[data-capacity-option="${size}"]`);
    await qty('salted-caramel',size-1);await qty('amaretto',1);
    await click('.save-box');
  };
  await build(6);await click('#saved-another');await build(10);await click('#saved-checkout');
  await check(`document.querySelectorAll('.checkout-card').length===2&&document.querySelector('#checkout-total').textContent==='$65'`,'Customer 1 boxes and total');
  await reload();await click('[data-view="checkout"]');
  await check(`document.querySelectorAll('.checkout-card').length===2`,'Pre-payment refresh preserves order');
  // Include an unsaved box and its active timer in the completion cleanup.
  await click('[data-view="counter"]');await click('[data-capacity-option="10"]');await click('.chocolate-card');
  await click('[data-view="checkout"]');
  const history=await evaluate(`localStorage.getItem('cd-boxes-v1')`);
  const preferences=await evaluate(`JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='cd-current-order-v1')))`);
  await evaluate(`document.querySelector('#checkout-pay').click();document.querySelector('#checkout-pay').click()`);
  await check(`document.querySelectorAll('#payment-success-dialog[open]').length===1&&JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length===2`,'One modal, no premature cleanup');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await delay(150);
  await check(`document.querySelector('#payment-success-dialog').open`,'Continue is the only dismissal');
  for(const [width,height] of [[1376,1032],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(profile,`payment-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cd-current-order-v1')throw Error('quota');return originalSetItem.call(this,k,v)}`);
  await click('#payment-continue');
  await check(`document.querySelector('#payment-success-dialog').open&&!document.querySelector('#payment-success-dialog [role="alert"]').hidden&&document.querySelector('#foundation-count').textContent==='1 / 10'`,'Failed persistence preserves active customer for retry');
  await evaluate('Storage.prototype.setItem=originalSetItem');
  await click('#payment-continue');
  await check(`!document.querySelector('#v-counter').hidden&&document.querySelector('#foundation-count').textContent==='0 / 10'&&document.querySelector('.save-box').disabled&&document.querySelector('.box-undo').disabled`,'Counter cleared, size retained, undo cannot restore previous customer');
  assert.equal(await evaluate(`JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='cd-current-order-v1')))`),preferences,'History and preferences unchanged');
  await click('[data-view="checkout"]');
  await check(`!document.querySelector('#checkout-empty').hidden&&document.querySelector('#checkout-pay').hidden`,'Empty Checkout');
  await reload();await click('[data-view="checkout"]');
  await check(`JSON.parse(localStorage.getItem('cd-current-order-v1')).boxIds.length===0&&!document.querySelector('#checkout-empty').hidden`,'Completed order stays empty after refresh');
  await click('[data-view="counter"]');await build(6);await click('#saved-checkout');
  await check(`document.querySelectorAll('.checkout-card').length===1&&document.querySelector('.checkout-card h3').textContent==='Box 1'&&document.querySelector('#checkout-total').textContent==='$25'`,'Customer 2 has only Box C');
  await check(`JSON.parse(localStorage.getItem('cd-boxes-v1')).length===3&&JSON.parse(localStorage.getItem('cd-boxes-v1')).slice(0,2).every((r,i)=>JSON.stringify(r)===JSON.stringify(JSON.parse(${JSON.stringify(history)})[i]))`,'All history retained');
  await click('[data-view="insights"]');await check(`document.querySelector('#insLbl').textContent.includes('3 boxes')`,'Insights retains all customers');
  await require('./verify-boxes.cjs')({evaluate,send,delay,profile});
  console.log('PASS payment: two customers, repeat Pay, single-action modal, failed write retry, active-box reset/size retention, history/preferences/Insights/exports retained, refresh before and after payment.');
};
