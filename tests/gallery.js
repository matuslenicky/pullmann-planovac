// Renders every catalogue model in blueprint style and as picker cards, for visual review.
// node tests/gallery.js [catIds,comma|all] [pxPerMetre]   → tests/out/gallery.html (open it in a browser)
const fs=require('fs'), path=require('path');
const src=p=>fs.readFileSync(path.join(__dirname,'..','src',p),'utf8');
const {CATALOG,Draw}=new Function(src('dims.js')+src('draw.js')+src('outline.js')+src('catalog.js')+';return {CATALOG,Draw};')();
const only=process.argv[2]&&process.argv[2]!=='all'?process.argv[2].split(','):null, S=+(process.argv[3]||62);
let html='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1d4fa6;font:13px sans-serif;color:#fff}'
+'.row{display:flex;gap:26px;align-items:flex-end;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.25)}'
+'.it{display:grid;gap:4px}.nm{font-size:12px;opacity:.9}h2{margin:0;font-size:14px;width:120px;align-self:center}'
+'svg{overflow:visible;display:block}svg *{vector-effect:non-scaling-stroke}'
+'.b{fill:#3d68b2;stroke:#fff;stroke-width:1.6px;stroke-linejoin:round}.d{fill:none;stroke:#fff;stroke-width:1px;stroke-linejoin:round;stroke-linecap:round}'
+'.g{fill:rgba(255,255,255,.3);stroke:#fff;stroke-width:.8px;stroke-linejoin:round}.k{fill:#fff;stroke:none}.p{fill:#3d68b2;stroke:#fff;stroke-width:.8px;stroke-linejoin:round}.paper .p{fill:#fff;stroke:#344946}'
+'.h{fill:none;stroke:#fff;stroke-width:.9px;stroke-dasharray:3 2.2;opacity:.85}.t{fill:none;stroke:#fff;stroke-width:.6px;opacity:.75}'
+'.s{fill:rgba(246,198,81,.16);stroke:#f6c651;stroke-width:1px;stroke-dasharray:5 3}'
+'.paper{background:#fff;color:#2b3a38}.paper .b{fill:#e3ebe8;stroke:#344946}.paper .d,.paper .h,.paper .t{stroke:#344946}.paper .g{fill:rgba(73,102,98,.28);stroke:#344946}.paper .k{fill:#344946}.paper .s{fill:rgba(201,162,74,.18);stroke:#8a6a1e}'
+'</style>';
CATALOG.forEach(cat=>{ if(only&&!only.includes(cat.id)) return;
  html+='<div class="row"><h2>'+cat.name+'</h2>';
  cat.models.forEach(m=>{ const pad=.3;
    html+='<div class="it"><svg width="'+(m.L+2*pad)*S+'" height="'+(m.W+2*pad)*S+'" viewBox="'+(-pad)+' '+(-pad)+' '+(m.L+2*pad)+' '+(m.W+2*pad)+'">'+Draw.svg(m,m.L,m.W)+'</svg><div class="nm">'+m.name+' · '+m.L+' × '+m.W+'</div></div>'; });
  html+='</div>'; });
// picker-card preview: three nose-up drawings at a common scale on paper
html+='<div class="paper">';
CATALOG.forEach(cat=>{ if(only&&!only.includes(cat.id)) return;
  const maxL=Math.max(...cat.models.map(m=>m.L)), maxW=Math.max(...cat.models.map(m=>m.W)), pad=cat.pad||.25;
  html+='<div class="row" style="border-color:#ddd"><h2>'+cat.name+'</h2>';
  cat.models.forEach(m=>{ const vw=maxW+2*pad, vh=maxL+2*pad;
    html+='<div class="it" style="width:112px"><svg width="112" height="150" viewBox="'+(-vw/2)+' '+(-vh+pad)+' '+vw+' '+vh+'"><g transform="translate('+(m.W/2)+' '+(-m.L)+') rotate(90)">'+Draw.svg(m,m.L,m.W)+'</g></svg><div class="nm">'+m.name+'</div></div>'; });
  html+='</div>'; });
html+='</div>';
fs.mkdirSync(path.join(__dirname,'out'),{recursive:true}); fs.writeFileSync(path.join(__dirname,'out','gallery.html'),html);
const bad=html.match(/NaN|undefined|Infinity/g); console.log('gallery written', html.length, 'bytes', bad?('BAD TOKENS: '+bad.length):'clean');
