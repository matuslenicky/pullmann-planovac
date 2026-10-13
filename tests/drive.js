// Drives the built page in a headless Chrome over the DevTools protocol (no dependencies, Node 22+).
//   node tests/run.js                 starts its own Chrome, runs every scenario, stops that Chrome again
//   PORT=9223 node tests/drive.js tests/01-load.js    one scenario against a Chrome you started yourself
// A scenario exports async ({ev, shot, nav, viewport, sleep, click, send, logs, base}) => {...}; screenshots land in tests/out/.
const fs = require('fs'), http = require('http'), path = require('path');
const OUT = path.join(__dirname, 'out');
const BASE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const get = (port, p) => new Promise((r, j) => http.get('http://127.0.0.1:' + port + p, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d))); }).on('error', j));

async function run(scenarioFile, port) {
  let tabs; for (let i = 0; i < 60; i++) { try { tabs = await get(port, '/json'); break; } catch (e) { await new Promise(r => setTimeout(r, 250)); } }
  if (!tabs) throw new Error('no Chrome with remote debugging on port ' + port);
  const t = tabs.find(t => t.type === 'page'), ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {}, logs = [];
  const send = (m, p = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.type.toUpperCase() + ' ' + m.params.args.map(a => a.value || a.description).join(' ')); };
  await send('Runtime.enable'); await send('Page.enable');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return 'EVAL-EXC ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text);
    return r.result ? (r.result.value !== undefined ? r.result.value : r.result.description) : r; };
  /* a real phone is emulated (width, touch, device pixel ratio): a narrow desktop window is not a phone */
  const viewport = async (w, h, mobile, scale, dark) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale || 1, mobile: !!mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] }); };
  const nav = async (url, clear) => { const wait = /^https?:/.test(url || '') ? 3500 : 1000;   // a deployed site needs time to arrive
    await send('Page.navigate', { url: url || BASE }); await sleep(wait);
    if (clear) { await ev('try{localStorage.clear()}catch(e){}'); await send('Page.navigate', { url: url || BASE }); await sleep(wait); } };
  const shot = async (name, full) => { fs.mkdirSync(OUT, { recursive: true }); const opt = { format: 'png' };
    if (full) { const m = JSON.parse(await ev('JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})')); opt.clip = { x: 0, y: 0, width: m.w, height: Math.min(m.h, 9000), scale: 1 }; opt.captureBeyondViewport = true; }
    const s = await send('Page.captureScreenshot', opt); fs.writeFileSync(path.join(OUT, name), Buffer.from(s.data, 'base64')); };
  const click = sel => ev('(()=>{const el=document.querySelector(' + JSON.stringify(sel) + '); if(!el) return "NO "+' + JSON.stringify(sel) + '; el.scrollIntoView({block:"center"}); el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true})); return "ok";})()');
  try { await require(path.resolve(scenarioFile))({ ev, shot, nav, viewport, sleep, click, logs, send, base: BASE }); }
  catch (e) { logs.push('SCENARIO ERROR ' + (e.stack || e)); }
  await send('Emulation.clearDeviceMetricsOverride'); ws.close();
  return logs;
}
module.exports = { run, BASE, OUT };
if (require.main === module) run(process.argv[2], +process.env.PORT || 9223).then(l => { console.log('console:', l.length ? l : 'clean'); process.exit(l.length ? 1 : 0); });
