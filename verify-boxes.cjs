const assert=require('node:assert/strict');
module.exports=async({evaluate,send,delay})=>{
  const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
  // navigator.clipboard.writeText requires a trusted user gesture; a synthetic
  // element.click() from Runtime.evaluate doesn't count, so Copy needs a real
  // dispatched mouse click (as verify-builder.cjs/verify-selection.cjs already do).
  const realClick=async s=>{
    const p=await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(s)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  };
  try { await send('Browser.grantPermissions',{permissions:['clipboardReadWrite','clipboardSanitizedWrite'],origin:'http://127.0.0.1:8080'}); } catch {}
  await click('[data-view="boxes"]');
  await delay(150);
  // The stopwatch/baseline-comparison "Measure the time it adds" section is fully removed.
  assert(await evaluate(`!document.getElementById('bStart') && !document.getElementById('bStop') && !document.getElementById('bSize') && !document.getElementById('watch') && !document.getElementById('compare')`),'Stopwatch/measurement controls no longer exist');
  assert(await evaluate(`![...document.querySelectorAll('#v-boxes h2')].some(h=>h.textContent.includes('Measure the time it adds'))`),'Measurement section heading is gone');
  // Saved records and their real capture-time stats remain, untouched by the cleanup.
  assert(await evaluate(`document.querySelector('#boxTable').textContent.includes('Salted Caramel')`),'Saved box record row is still listed');
  assert(await evaluate(`document.querySelector('#timeStats').textContent.includes('Pieces recorded')`),'Saved-box summary stats remain (median time, per piece, corrections, pieces)');
  const before=await evaluate(`localStorage.getItem('cd-boxes-v1')`);
  // Spy on the real download mechanism: intercept the anchor's native click so no
  // actual OS file-save dialog fires, but fetch its blob: URL to read the exact
  // bytes the browser would have written -- the same Blob+object-URL code path.
  await evaluate(`(() => {
    window.__downloads=[];
    if(!window.__origAnchorClick) window.__origAnchorClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){
      if(this.download) window.__downloads.push({filename:this.download,href:this.href});
      return window.__origAnchorClick.call(this);
    };
  })()`);
  for(const kind of ['csv','json']){
    await click(kind==='csv'?'#expCsv':'#expJson');
    assert(await evaluate(`document.querySelector('#fallback').open`),`${kind} popup opens`);
    const filename=await evaluate(`document.querySelector('#fbTitle').textContent`);
    assert(new RegExp(`^cocoa-dolce-boxes-\\d{4}-\\d{2}-\\d{2}\\.${kind}$`).test(filename),`${kind} popup title is a sensible filename: ${filename}`);
    const preview=await evaluate(`document.querySelector('#fbText').value`);
    if(kind==='csv'){
      assert(preview.startsWith('box_id,'),'CSV preview starts with the expected header row');
      assert(preview.includes('Salted Caramel'),'CSV preview includes the saved item');
    } else {
      const parsed=JSON.parse(preview);
      assert(Array.isArray(parsed.boxes)&&parsed.boxes.length>=1,'JSON preview parses and has a boxes array');
      assert(parsed.boxes.some(b=>b.items.some(i=>i.name==='Salted Caramel')),'JSON preview includes the saved item');
    }
    await realClick('#fbCopy');
    await delay(100);
    assert.equal(await evaluate(`document.querySelector('#fbCopy').textContent`),'Copied',`${kind} Copy still works`);
    // Click and fetch the resulting blob: URL within the same evaluate call --
    // downloadTextFile() revokes the object URL right after the click (a
    // setTimeout(...,0) macrotask), so a separate round-trip to fetch it
    // afterward can lose the race and find it already revoked.
    const dl=await evaluate(`(async () => {
      document.querySelector('#fbDownload').click();
      const d=window.__downloads[window.__downloads.length-1];
      const text=await (await fetch(d.href)).text();
      return {filename:d.filename,text};
    })()`);
    assert(new RegExp(`^cocoa-dolce-boxes-\\d{4}-\\d{2}-\\d{2}\\.${kind}$`).test(dl.filename),`${kind} download filename matches: ${dl.filename}`);
    assert.equal(dl.text,preview,`${kind} downloaded content matches the popup preview exactly (same source)`);
    await click('#fbClose');
    assert(await evaluate(`!document.querySelector('#fallback').open`),`${kind} Cancel closes the popup`);
  }
  const after=await evaluate(`localStorage.getItem('cd-boxes-v1')`);
  assert.equal(after,before,'Exporting (preview, Copy, or Download) never modifies saved box records');
  console.log('PASS Boxes page: timer/measurement UI removed, saved records + stats intact, CSV/JSON popup with Copy/Download/Cancel verified against the same export source, records unmodified by export.');
};
