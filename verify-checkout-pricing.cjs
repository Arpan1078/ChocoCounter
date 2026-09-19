const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({evaluate,send,delay,profile})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  for(const [sizes,total] of [[[6],'$25'],[[10],'$40'],[[6,6],'$50'],[[6,10],'$65'],[[6,6,10],'$90'],[[6,16],'Total unavailable'],[[30,50],'Total unavailable']]){
    await evaluate(`(()=>{localStorage.removeItem('cd-boxes-v1');localStorage.removeItem('cd-current-order-v1');for(const size of ${JSON.stringify(sizes)}){const state=createCounterSelection(CounterCatalogState.products());state.setCapacity(size);state.add('amaretto',size);const saved=saveCounterTransaction(state.snapshot());addCounterOrderBox(saved.record.id);}})()`);
    await send('Page.reload');await delay(2200);await click('[data-view="checkout"]');
    assert.equal(await evaluate(`document.querySelector('#checkout-total').textContent`),total);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.checkout-box-price')].map(e=>e.textContent)`),sizes.map(n=>n===6?'$25':n===10?'$40':'Price unavailable'));
    assert.equal(await evaluate(`document.querySelectorAll('#checkout-prices li').length`),sizes.length);
    const before=await evaluate(`JSON.stringify({storage:{...localStorage},url:location.href,html:document.querySelector('#v-checkout').innerHTML})`);
    await click('#checkout-pay');assert.equal(await evaluate(`JSON.stringify({storage:{...localStorage},url:location.href,html:document.querySelector('#v-checkout').innerHTML})`),before);
    if(sizes.join(',')==='6,6,10'){
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(profile,'checkout-prices.png'),Buffer.from(shot.data,'base64'));
    }
    if(sizes.join(',')==='6,10'){
      await click('[data-remove-box]');await click('[data-remove-confirm]');
      assert.equal(await evaluate(`document.querySelector('#checkout-total').textContent`),'$40');
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('cd-boxes-v1')).length`),2);
      await send('Page.reload');await delay(2200);await click('[data-view="checkout"]');
      assert.equal(await evaluate(`document.querySelector('#checkout-total').textContent`),'$40');
    }
  }
  console.log('PASS Checkout pricing: 25/40/50/65/90 totals, per-box prices, unsupported 16/30/50 safety, remove recalculates without history deletion, refresh, Pay no-op.');
};
