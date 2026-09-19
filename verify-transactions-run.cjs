// Run with the preview server running: node verify-transactions-run.cjs
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
  await require('./verify-transactions.cjs')({evaluate,send,delay,profile});
  assert.equal(errors.length,0,JSON.stringify(errors));console.log('Screenshots: '+profile);await send('Browser.close');ws.close();
})().catch(e=>{console.error(e);browser.kill();process.exitCode=1;});
