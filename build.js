// Builds the page from src/ in two forms:
//   planovac.html            the published Claude artifact (no doctype, the host adds the document skeleton)
//   index.html               a complete, self-contained document for opening locally or hosting anywhere
//   Pullmann-planovac.html   the same document under a name that is fit to send to other people
// Run: node build.js
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const css = src('style.css').trim();
const body = src('body.html').replace('{{LOGO}}', src('logo.b64.txt').trim()).replace('{{HERO}}', src('hero.b64.txt').trim()).trim();
const js = ['dims.js', 'draw.js', 'outline.js', 'catalog.js', 'app.js'].map(src).join('\n');
if (/\{\{[A-Z]+\}\}/.test(body)) throw new Error('unreplaced placeholder in body.html');
if (js.includes('</script')) throw new Error('script source contains a closing script tag');
try { new Function(js); } catch (e) { console.error('SYNTAX ERROR in script:', e.message); process.exit(1); }
const head = [
  '<title>Pullmann Plánovač parcely</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">',
  '<style>', css, '</style>'
].join('\n');
const main = [body, '', '<script>', '(function(){', "'use strict';", js, '})();', '</script>'].join('\n');
fs.writeFileSync(path.join(__dirname, 'planovac.html'), head + '\n\n' + main + '\n');
/* standalone: everything but the web fonts is inside the file, and those fall back to system fonts when offline */
const doc = '<!doctype html>\n<html lang="sk">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + '<meta name="robots" content="noindex">\n<meta name="description" content="Ukážka návrhu: plánovač parcely pre kemp, nie oficiálna stránka.">\n'
  + head + '\n</head>\n<body>\n' + main + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), doc);
fs.writeFileSync(path.join(__dirname, 'Pullmann-planovac.html'), doc);
console.log('built planovac.html', Math.round((head.length + main.length) / 1024) + ' KB', '(css ' + Math.round(css.length / 1024) + ', js ' + Math.round(js.length / 1024) + ' KB) + index.html + Pullmann-planovac.html');
