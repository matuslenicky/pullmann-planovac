// Runs the browser scenarios against the built index.html.
//   node tests/run.js              all scenarios (tests/NN-*.js)
//   node tests/run.js 03 05        only those whose file name starts with 03 or 05
//   node tests/run.js --verbose    also print what the scenarios report
// It starts its own headless Chrome with a throw-away profile and stops exactly that process afterwards.
// Never stop Chrome by image name (taskkill /IM chrome.exe): that would close the browser of whoever sits at the machine.
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const { run } = require('./drive.js');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!CHROME) { console.error('Chrome not found. Set CHROME=<path to chrome>.'); process.exit(2); }
const args = process.argv.slice(2), verbose = args.includes('--verbose'), only = args.filter(a => !a.startsWith('--'));
const files = fs.readdirSync(__dirname).filter(f => /^\d\d-.*\.js$/.test(f)).filter(f => !only.length || only.some(o => f.startsWith(o))).sort();
const port = +process.env.PORT || 9333, profile = fs.mkdtempSync(path.join(os.tmpdir(), 'planovac-test-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
(async () => {
  let failed = 0; const log = console.log;
  for (const f of files) {
    const lines = []; console.log = (...a) => lines.push(a.join(' '));
    let problems;
    try { problems = await run(path.join(__dirname, f), port); } catch (e) { problems = ['RUNNER ' + e.message]; }
    console.log = log;
    problems = problems.concat(lines.filter(l => /EVAL-EXC|SCENARIO ERROR|(^|[\s"])NO [#.\[]|!BAD/.test(l)));
    log((problems.length ? 'FAIL ' : 'ok   ') + f + (problems.length ? '\n     ' + problems.join('\n     ') : ''));
    if (verbose) lines.forEach(l => log('     ' + l.slice(0, 400)));
    if (problems.length) failed++;
  }
  chrome.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} log(failed ? failed + ' scenario(s) failed' : 'all ' + files.length + ' scenarios passed'); process.exit(failed ? 1 : 0); }, 800);
})();
