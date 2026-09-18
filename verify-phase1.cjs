// Run with the preview server running: node verify-phase1.cjs
// Uses installed Chrome, an isolated temporary profile, and Node 22+ WebSocket.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chococounter-qa-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=9224', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let n=0;n<40;n++) { try { tabs=await (await fetch('http://127.0.0.1:9224/json')).json(); break; } catch { await delay(250); } }
  assert(tabs, 'Chrome debugging endpoint available');
  const ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let sequence=0; const pending=new Map(); const errors=[];
  ws.addEventListener('message',({data})=>{
    const m=JSON.parse(data);
    if(m.id) { const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result); }
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push(m.params);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate',{url:'http://127.0.0.1:8080'}); await delay(1200);
  // Seed existing records to test retained views without modifying real user data.
  await evaluate(`localStorage.setItem('cd-boxes-v1',JSON.stringify([{id:'qa',savedAt:new Date().toISOString(),location:'Bradley Fair',boxSize:6,pieceCount:6,captureSeconds:12,undos:0,removals:0,items:[{id:'salted-caramel',name:'Salted Caramel',qty:6}],sequence:[]}]))`);
  await send('Page.reload'); await delay(1000);
  for(const [width,height] of [[1920,1080],[1366,900],[1024,768],[768,1024],[390,844],[320,740]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await delay(150);
    const state=await evaluate(`(() => {
      const root=document.querySelector('#v-counter');
      const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
        sizes:[...root.querySelectorAll('[data-capacity-option]')].map(e=>e.textContent),
        nav:[...document.querySelectorAll('nav button')].map(e=>e.textContent),
        selectors:[...document.querySelectorAll('select')].filter(visible).length,
        cards:root.querySelectorAll('.chocolate-card').length,
        columns:getComputedStyle(root.querySelector('.chocolate-grid')).gridTemplateColumns.split(' ').length,
        saveDisabled:root.querySelector('.save-box').disabled,
        clipped:[...root.querySelectorAll('button,input')].filter(visible).some(e=>e.getBoundingClientRect().right>innerWidth+1)};
    })()`);
    assert(!state.overflow && !state.clipped,JSON.stringify(state));
    assert.deepEqual(state.sizes,['6 Piece','10 Piece']); assert.deepEqual(state.nav,['Counter','Boxes','Insights']);
    assert.equal(state.selectors,0); assert.equal(state.cards,25); assert(state.saveDisabled);
    if(width===1920) assert.equal(state.columns,7,'Large desktop uses seven readable cards per row');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(profile,`counter-${width}.png`),Buffer.from(shot.data,'base64'));
    console.log(`PASS ${width} × ${height}: no overflow; 25 cards; only 6/10; no store selector`);
  }
  assert.equal(await evaluate(`document.querySelector('[data-capacity-option="10"]').click();document.querySelector('#foundation-count').textContent`),'0 / 10');
  assert.equal(await evaluate(`document.querySelector('[data-capacity-option="6"]').click();document.querySelector('#foundation-count').textContent`),'0 / 6');
  assert.equal(await evaluate(`document.querySelector('.chocolate-card').click();document.querySelector('#foundation-count').textContent`),'0 / 6');
  assert.equal(await evaluate(`document.querySelectorAll('#v-counter input, #v-counter .recent, #v-counter .chocolate-type, #v-counter .bb').length`),0);
  const assetFiles=fs.readdirSync(path.join(__dirname,'assets/chocolates')).sort();
  const usedFiles=await evaluate(`[...document.querySelectorAll('.chocolate-card img')].map(i=>i.getAttribute('src').split('/').pop()).sort()`);
  assert.deepEqual(usedFiles,assetFiles,'Every supplied chocolate photo is used exactly once');
  assert(await evaluate(`[...document.querySelectorAll('.chocolate-card')].every(c=>c.children.length===2 && c.querySelectorAll('img').length===1 && c.textContent.trim()===c.querySelector('.chocolate-name').textContent)`));
  assert(await evaluate(`[...document.querySelectorAll('#v-counter img, .brand-logo')].every(i=>i.complete && i.naturalWidth>0)`),'All 27 supplied images load');
  // Full catalog contact sheet and mobile builder for visual review.
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1400,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('.catalog').style.maxHeight='none'`);
  await delay(100);
  let shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(profile,'all-products.png'),Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('.catalog').style.maxHeight=''`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('.builder').scrollIntoView()`);
  await delay(100);
  shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(profile,'mobile-box.png'),Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('[data-view="boxes"]').click()`);
  assert(await evaluate(`!document.querySelector('#v-boxes').hidden && document.querySelector('#boxTable').textContent.includes('Salted Caramel')`));
  assert(await evaluate(`['expCsv','expJson','bStart','bStop'].every(id=>document.getElementById(id))`));
  await evaluate(`document.querySelector('#bStart').click()`); await delay(250);
  await evaluate(`document.querySelector('#bStop').click()`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('cd-baseline-v1')).length`),1);
  await evaluate(`document.querySelector('[data-view="insights"]').click()`);
  assert(await evaluate(`!document.querySelector('#v-insights').hidden && document.querySelector('#topBars').textContent.includes('Salted Caramel')`));
  await evaluate(`document.querySelector('#fDemo').click()`);
  assert(await evaluate(`document.querySelector('#insLbl').textContent.includes('240')`));
  await send('Page.navigate',{url:'http://127.0.0.1:8080/cocoa-dolce-box-log.html'}); await delay(600);
  assert.equal(await evaluate(`document.querySelectorAll('.chocolate-card').length`),25);
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: all 25 photos, official logo, supplied box render, no search/recent/type labels, size preview, inactive capture, saved records, timing, Insights, alternate entry point; no runtime/console errors.');
  console.log(`Screenshots: ${profile}`);
  await send('Browser.close'); ws.close();
})().catch(e=>{console.error(e);browser.kill();process.exitCode=1;});
