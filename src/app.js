/* ===== Pullmann parcel planner: application ===== */
const $ = s => document.querySelector(s);
const fmt = n => n.toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
const num = n => n.toLocaleString('sk-SK',{maximumFractionDigits:2});
const m2 = n => (Math.round(n*10)/10).toLocaleString('sk-SK') + ' m²';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const r2 = n => Math.round(n*100)/100, r3 = n => Math.round(n*1000)/1000;
/* live regions: write only what really changed, so a screen reader is not told the same thing twice */
const setText = (el,t) => { t=String(t); if(el.textContent!==t) el.textContent=t; };
const setHtml = (el,h) => { if(el._h!==h){ el._h=h; el.innerHTML=h; } };
const nightsWord = n => n===1?'noc':n<5?'noci':'nocí';
let toastT;
let undoFn=null;
function toast(msg, act){
  const t=$('#toast'); t.hidden=false; t.textContent=msg; undoFn=act ? act.fn : null;
  if(act){ const b=document.createElement('button'); b.type='button'; b.textContent=act.label; b.addEventListener('click', ()=>{ const kb=document.activeElement===b; t.hidden=true; undoFn=null; act.fn(); if(kb && plannerOpen){ const n=$('#placedWrap .pr')||$('#plClose'); if(n) n.focus({preventScroll:true}); } }); t.appendChild(b); }
  clearTimeout(toastT); toastT=setTimeout(()=>{ t.hidden=true; undoFn=null; }, act ? 7000 : 4200);
}

/* ---------- Parcel types (real data from campingpiestany.sk; M is "cca 75–80 m²" on the camp site, planned here as 7 × 11 m) ---------- */
const TYPES = {
  M:  {name:'Parcela M',  w:7,   h:11, area:77, price:13.5, elec:true,  water:false, grey:false, desc:'Web kempu uvádza približne 75 až 80 m², plán počíta so 7 × 11 m.'},
  L:  {name:'Parcela L',  w:7.5, h:12, area:90, price:18.5, elec:true,  water:true,  grey:true,  desc:''},
  XL: {name:'Parcela XL', w:10,  h:12, area:120,price:23.5, elec:true,  water:true,  grey:true,  desc:''},
  V:  {name:'Voľné státie', w:10, h:5, area:50, price:12.0, elec:true,  water:false, grey:false, zone:true, desc:'Konkrétne miesto pridelí recepcia.'},
  S:  {name:'Voľné státie pre stany', w:10, h:5, area:50, price:12.0, elec:'ask', water:false, grey:false, zone:true, desc:'Stanová plocha. Konkrétne miesto pridelí recepcia.'}
};
const VSHAPE = {a:{w:10,h:5}, b:{w:8,h:6.25}, c:{w:7.07,h:7.07}};
const PARK = {car:4, van:6, motorhome:6, moto:3};   // parking of a further vehicle per night (price list 2026)
const SEASON = ['2026-04-02','2026-11-15'];

/* ---------- Map geometry (image coordinates of the official 2023 map) ---------- */
const PARCELS = [];
function PP(id,type,cx,cy,w,h,rot){ PARCELS.push({id,type,cx,cy,w,h,rot:rot||0}); }
[[615,740],[683,715],[748,698],[815,680],[882,662]].forEach((c,i)=>PP('M'+(i+1),'M',c[0],c[1],58,96,-10));
[[1105,515],[1135,590],[1163,665],[1190,740],[1218,815]].forEach((c,i)=>PP('M'+(i+6),'M',c[0],c[1],62,64,-25));
[[1214,545],[1238,600],[1262,652],[1290,706],[1306,758]].forEach((c,i)=>PP('M'+(i+11),'M',c[0],c[1],48,56,-25));
[[1322,640],[1300,585],[1278,530]].forEach((c,i)=>PP('M'+(i+16),'M',c[0],c[1],48,56,-25));
PP('M19','M',1297,346,53,58); PP('M20','M',1355,346,53,58);
PP('XL1','XL',1428,412,80,66,4); PP('XL2','XL',1428,484,80,66,4);
for(let i=0;i<8;i++) PP('L'+(i+1),'L',1447,558+i*58,104,52,4);
const ZONES = [
  {id:'VS1',type:'V',name:'Voľné státie 1',pts:'700,928 1045,920 1052,985 705,992', lx:870, ly:958, cap:6},
  {id:'VS2',type:'V',name:'Voľné státie 2',pts:'705,1000 1055,995 1062,1058 712,1062', lx:880, ly:1030, cap:6},
  {id:'VS3',type:'V',name:'Voľné státie 3',pts:'718,1070 1070,1066 1080,1128 740,1138', lx:900, ly:1100, cap:5},
  {id:'ST1',type:'S',name:'Stanová lúka',pts:'640,760 1000,735 1000,915 690,920', lx:820, ly:838, cap:14},
  {id:'ST2',type:'S',name:'Stany',pts:'1318,890 1405,885 1410,1000 1325,1005', lx:1357, ly:945, cap:4, short:true}
];
const FACIL = [ // [name, x, y, side L/R, leader length]
  ['Bazén 11 m',760,352],['Reštaurácia Na Panvici',560,470],['Kuchynka',958,425],['Ubytovňa',1005,528,'L'],
  ['Bar pia–ned',1062,665,'L'],['Sprchy · WC',1112,702,'L'],['WC',1115,830],['Detské ihrisko',1030,882,'R'],
  ['Chem. WC · pitná voda',1126,1000,'R',10],['Odpad',1225,962,'R',40],['Recepcia · info',1238,1105],['Chatka pod lipami',1176,1082,'R'],
  ['Ohnisko',1050,300,'L',14],['Petang',1105,300,'R',34],['Ping-pong',1160,300,'L',14],['Workout',1232,300,'R',34],['Zvieratá',1400,1050]
];
const CATBY = {}; CATALOG.forEach(c=>{ CATBY[c.id]=c; });
const GROUPS = [['Osobné autá',['small','hatch','sedan','kombi','suv','mpv','pickup']],['Dodávky a autobusy',['van','minibus']],['Obytné',['campervan','motorhome','caravan']],['Ostatné',['trailer','moto']],
  ['Stany',['tent23','tentfam','rooftent']],['Prístrešky',['awning','awningtent','gazebo']],['Výbava',['tableset','grill','bike','pool','relax']]];
const TABIDS = {veh:CATALOG.filter(c=>c.tab==='veh').map(c=>c.id), gear:CATALOG.filter(c=>c.tab==='gear').map(c=>c.id)};
const QUICKIDS = TABIDS.veh.concat(['tent23','tentfam']);

/* ---------- State ---------- */
const KEY = 'pullmann-plan-v3';
const S = { dIn:'', dOut:'', adults:2, kids:0, babies:0, dogs:0, parcel:null, items:[], sel:null, seq:1, sent:null };
try{ const d = JSON.parse(localStorage.getItem(KEY)||'null'); if(d && Array.isArray(d.items)) Object.assign(S,d,{sel:null,sent:null}); }catch(e){}
const hot = window.claude && window.claude.hot;
if(hot && hot.data && Array.isArray(hot.data.items)) Object.assign(S, hot.data, {sel:null});
if(hot && hot.snapshot) hot.snapshot(()=>S);
const SET_DEF = {snap:0.25, clear:0, road:'bottom', labels:'auto', hook:true, block:false, shape:'a'};
/* the stored state may be stale or damaged: keep only what the page can work with, so that a bad value never stops the page */
(function sanitize(){
  const own=(o,k)=>typeof k==='string' && Object.prototype.hasOwnProperty.call(o,k), pick=(v,list,d)=>list.indexOf(v)>=0 ? v : d;
  const int=(v,lo,hi,d)=>{ v=Math.round(Number(v)); return isFinite(v) ? Math.max(lo,Math.min(hi,v)) : d; }, pos=(v,d)=>(typeof v==='number' && isFinite(v)) ? r2(Math.max(-20,Math.min(40,v))) : d;
  const st=(S.set && typeof S.set==='object') ? S.set : {}, ff=(S.f && typeof S.f==='object') ? S.f : {};
  S.set={snap:pick(st.snap,[0,0.25,0.5,1],SET_DEF.snap), clear:pick(st.clear,[0,0.5,1],SET_DEF.clear), road:pick(st.road,['bottom','top','left','right'],SET_DEF.road), labels:pick(st.labels,['auto','names','numbers','none'],SET_DEF.labels),
    hook:st.hook!==false, block:st.block===true && st.hook!==false, shape:own(VSHAPE,st.shape) ? st.shape : SET_DEF.shape};
  S.f={type:pick(ff.type,['all'].concat(Object.keys(TYPES)),'all')};
  S.view={z:1, cx:null, cy:null};
  S.adults=int(S.adults,1,8,2); S.kids=int(S.kids,0,6,0); S.babies=int(S.babies,0,6,0); S.dogs=int(S.dogs,0,6,0);
  let first=true;
  S.items=(Array.isArray(S.items) ? S.items : []).filter(o=>o && typeof o==='object' && own(MODEL,o.mid) && o.L>=0.2 && o.L<=20 && o.W>=0.2 && o.W<=10).map(o=>{
    const n={}; Object.keys(o).forEach(k=>{ if(k!=='__proto__') n[k]=o[k]; });   // fields this check does not know stay as they are
    Object.assign(n, {uid:int(o.uid,1,1e9,0), name:(typeof o.name==='string' && o.name.trim()) ? o.name.trim().slice(0,80) : MODEL[o.mid].name, L:r2(Number(o.L)), W:r2(Number(o.W)), rot:pick(o.rot,[0,90,180,270],0), x:pos(o.x,0.5), y:pos(o.y,0.5)});
    if(o.primary===true && first) first=false; else delete n.primary;
    if(n.host==null) delete n.host;
    return n; });
  const seen={}; let max=S.items.reduce((m,o)=>Math.max(m,o.uid),0);
  S.items.forEach(o=>{ if(!o.uid || seen[o.uid]) o.uid=++max; seen[o.uid]=true; });   // every object needs a number of its own
  S.items.forEach(o=>{ if(o.host==null) return; const h=S.items.find(i=>i.uid===o.host); if(!h || h===o || !CATBY[MODEL[o.mid].cat].attach || CATBY[MODEL[h.mid].cat].tab!=='veh') delete o.host; });
  S.seq=Math.max(int(S.seq,1,1e9,1), max+1);
  if(typeof S.parcel!=='string' || (!PARCELS.some(p=>p.id===S.parcel) && !ZONES.some(z=>z.id===S.parcel))) S.parcel=null;
  S.sel=null;
})();
function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function applyShape(){ const v=VSHAPE[S.set.shape]||VSHAPE.a; TYPES.V.w=TYPES.S.w=v.w; TYPES.V.h=TYPES.S.h=v.h; }
applyShape();

/* ---------- Dates (ISO strings, compared as text) ---------- */
const todayIso = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const addDays = (s,n) => { const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const skDate = s => s ? s.split('-').reverse().map(Number).join('. ') : '';
function rangeText(){ const a=S.dIn.split('-').map(Number), b=S.dOut.split('-').map(Number); return a[0]===b[0] ? a[2]+'. '+a[1]+'. – '+b[2]+'. '+b[1]+'. '+b[0] : skDate(S.dIn)+' – '+skDate(S.dOut); }
function defaultDates(){ let a=addDays(todayIso(),7); if(a<SEASON[0]) a=SEASON[0]; if(a>=SEASON[1]) a=addDays(SEASON[1],-1); let b=addDays(a,3); if(b>SEASON[1]) b=SEASON[1]; return [a,b]; }
const seasonOver = () => todayIso()>=SEASON[1];
if(!/^\d{4}-\d\d-\d\d$/.test(S.dIn) || !/^\d{4}-\d\d-\d\d$/.test(S.dOut) || isNaN(new Date(S.dIn+'T00:00:00Z')) || isNaN(new Date(S.dOut+'T00:00:00Z')) || S.dIn<todayIso()){ const d=defaultDates(); S.dIn=d[0]; S.dOut=d[1]; }
function nights(){ const n=Math.round((new Date(S.dOut+'T00:00:00Z')-new Date(S.dIn+'T00:00:00Z'))/86400000); return isNaN(n)?0:Math.min(n,366); }
function eachNight(fn){ const n=nights(); for(let i=0;i<n;i++) fn(addDays(S.dIn,i)); }
function highNights(){ let k=0; eachNight(d=>{ const md=d.slice(5); if(md>='06-19' && md<='09-01') k++; }); return k; }
function inSeason(){ return S.dIn>=SEASON[0] && S.dOut<=SEASON[1]; }
function oneNightWeekend(){ if(nights()!==1 || !highNights()) return false; const wd=new Date(S.dIn+'T00:00:00Z').getUTCDay(); return wd===5 || wd===6; }

/* ---------- Example availability (deterministic per place and night) ---------- */
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/4294967295; }
function isFree(id){ let ok=true; eachNight(d=>{ if(hash(id+'|'+d)<=0.28) ok=false; }); return ok; }
function zoneFree(z){ let busy=0; for(let k=0;k<z.cap;k++){ if(!isFree(z.id+'#'+k)) busy++; } return z.cap-busy; }
const zoneOf = id => ZONES.find(z=>z.id===id);
const placeFree = id => { const z=zoneOf(id); return z ? zoneFree(z) : (isFree(id)?1:0); };

/* ---------- Geometry of placed objects ---------- */
const mdl = o => MODEL[o.mid];
/* what kind of thing it is (car, van, caravan, trailer, …): the category decides, a single model may be drawn in another way */
const kind = o => CATBY[mdl(o).cat].draw;
/* solid and canopy objects need ground of their own; small gear and roof tents may share it */
const lay = o => mdl(o).layer;
const needsSpace = o => { const l=lay(o); return l==='solid' || l==='canopy'; };
const byId = uid => S.items.find(i=>i.uid===uid);
const box = o => (o.rot%180) ? {x:o.x,y:o.y,w:o.W,h:o.L} : {x:o.x,y:o.y,w:o.L,h:o.W};
const tf = o => { const B=box(o); return 'translate('+r3(B.x+B.w/2)+' '+r3(B.y+B.h/2)+') rotate('+o.rot+') translate('+r3(-o.L/2)+' '+r3(-o.W/2)+')'; };
function hit(a,b){ const A=box(a),B=box(b); return A.x<B.x+B.w-0.01 && B.x<A.x+A.w-0.01 && A.y<B.y+B.h-0.01 && B.y<A.y+A.h-0.01; }
function overlap(a,b){ return a!==b && needsSpace(a) && needsSpace(b) && hit(a,b); }
function inside(o,t){ const B=box(o), c=S.set.clear||0; return B.x>=c-0.001 && B.y>=c-0.001 && B.x+B.w<=t.w-c+0.001 && B.y+B.h<=t.h-c+0.001; }
function hookups(t){ const W=t.w,H=t.h, out=[]; if(!S.set.hook) return out;
  if(t.elec===true) out.push({k:'elec', x:W-0.5, y:0.25, w:0.5, h:0.5, lx:W-0.1, ly:1.2, anchor:'end', txt:'⚡ 230 V'});
  if(t.water) out.push({k:'water', x:W-0.47, y:H-0.77, w:0.44, h:0.44, lx:W-0.25, ly:H-0.95, anchor:'middle', txt:'voda'});
  if(t.grey) out.push({k:'grey', x:0.2, y:H-0.75, w:0.5, h:0.4, lx:0.45, ly:H-0.95, anchor:'middle', txt:'výpust'});
  return out; }
function hitsHookup(o,t){ if(!S.set.block || lay(o)!=='solid') return false; const B=box(o); return hookups(t).some(p=>B.x<p.x+p.w && p.x<B.x+B.w && B.y<p.y+p.h && p.y<B.y+B.h); }
function badMap(t){ const bad={}; S.items.forEach(o=>{ bad[o.uid] = !inside(o,t) || hitsHookup(o,t) || S.items.some(p=>overlap(o,p)); }); return bad; }
function snapV(v){ const s=S.set.snap; return s ? Math.round(v/s)*s : Math.round(v*100)/100; }
/* occupied ground = exact union of all footprints, so an awning over a car is not counted twice */
function usedArea(items){
  if(!items.length) return 0; const bs=items.map(box), uniq=a=>a.sort((p,q)=>p-q).filter((v,i,l)=>!i || v-l[i-1]>1e-6);
  const xs=uniq(bs.reduce((l,b)=>l.concat(b.x,b.x+b.w),[])), ys=uniq(bs.reduce((l,b)=>l.concat(b.y,b.y+b.h),[])); let A=0;
  for(let i=0;i<xs.length-1;i++){ const cx=(xs[i]+xs[i+1])/2; for(let j=0;j<ys.length-1;j++){ const cy=(ys[j]+ys[j+1])/2;
    if(bs.some(b=>cx>b.x && cx<b.x+b.w && cy>b.y && cy<b.y+b.h)) A+=(xs[i+1]-xs[i])*(ys[j+1]-ys[j]); } }
  return A;
}

/* ---------- Does the equipment fit? Greedy packing, biggest first, 25 cm raster ---------- */
function packInto(w,h,items,gap){
  const c=S.set.clear||0, W=w-2*c, H=h-2*c, g=gap||0, placed=[], rots=h>w?[90,0]:[0,90];
  for(const o of [...items].sort((a,b)=>b.L*b.W-a.L*a.W)){ let ok=false;
    for(const rot of rots){ const bw=rot?o.W:o.L, bh=rot?o.L:o.W; if(bw>W+0.001 || bh>H+0.001) continue;
      for(let y=0; y<=H-bh+0.001 && !ok; y+=0.25){ for(let x=0; x<=W-bw+0.001; x+=0.25){
        if(!placed.some(p=>x<p.x+p.w+g-0.01 && p.x<x+bw+g-0.01 && y<p.y+p.h+g-0.01 && p.y<y+bh+g-0.01)){ placed.push({x,y,w:bw,h:bh,rot,o}); ok=true; break; } } }
      if(ok) break; }
    if(!ok) return null; }
  return placed;
}
const fitCache = {};
function fitsType(k, list){
  const hard=(list||S.items).filter(needsSpace); if(!hard.length) return true;
  const key=k+'|'+(S.set.clear||0)+'|'+hard.map(o=>o.L+'x'+o.W).sort().join(',');
  if(key in fitCache) return fitCache[key];
  const t=TYPES[k]; let ok;
  if(t.zone) ok = hard.reduce((s,o)=>s+o.L*o.W,0)<=t.area+0.001 && Object.keys(VSHAPE).some(v=>packInto(VSHAPE[v].w,VSHAPE[v].h,hard));
  else ok = !!packInto(t.w,t.h,hard);
  return (fitCache[key]=ok);
}
function fitsAll(){ const r={}; Object.keys(TYPES).forEach(k=>{ r[k]=fitsType(k); }); return r; }
const hasHard = () => S.items.some(needsSpace);
function passFilter(k){ const f=S.f, t=TYPES[k]; if(f.type!=='all' && f.type!==k) return false; if(f.water && !t.water) return false; return true; }

/* ---------- Map (static SVG built once; availability, filters and selection only toggle classes) ---------- */
let mapBuilt = false;
/* line icons for the tool buttons: drawn, so they look the same on every phone */
const UI = d => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const IC = {
  rot:UI('<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'),
  dup:UI('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  x:UI('<path d="M6 6l12 12M18 6 6 18"/>'),
  fit:UI('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  plus:UI('<path d="M12 5v14M5 12h14"/>'),
  minus:UI('<path d="M5 12h14"/>')
};
document.querySelectorAll('[data-ico]').forEach(b=>{ b.innerHTML=IC[b.dataset.ico]||''; });
const ICO = {
  elec:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 1 3 9h4l-1 6 7-9H9z" fill="currentColor"/></svg>',
  water:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z" fill="currentColor"/></svg>',
  grey:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v3H2zM4 7h8l-1 7H5z" fill="currentColor"/></svg>',
  ok:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4L16 6"/></svg>',
  bad:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  warn:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3 2 17h16z"/><path d="M10 8v4M10 14.5v.5"/></svg>'
};
const sizeText = t => t.zone ? 'max. '+m2(t.area) : num(t.w)+' × '+num(t.h)+' m';
const hookText = t => [t.elec===true?'elektrina':t.elec?'elektrina po dohode':null, t.water?'voda':null, t.grey?'výpust':null].filter(Boolean).join(', ') || 'bez prípojok';
function placeLabel(id){ const z=zoneOf(id); if(z) return z.name; const p=PARCELS.find(p=>p.id===id); return p ? TYPES[p.type].name+' '+id.replace(/\D/g,'') : id; }
function buildMap(){
  const facs = FACIL.map(f=>{ const s=f[3]==='L'?-1:1, l=f[4]||14; return '<g class="fac"><circle cx="'+f[1]+'" cy="'+f[2]+'" r="5"/><line x1="'+f[1]+'" y1="'+f[2]+'" x2="'+(f[1]+s*l)+'" y2="'+(f[2]-l)+'"/><text x="'+(f[1]+s*(l+3))+'" y="'+(f[2]-l-3)+'" text-anchor="'+(s<0?'end':'start')+'">'+esc(f[0])+'</text></g>'; }).join('');
  const plots = PARCELS.map(p=>'<g class="plot" data-id="'+p.id+'" data-type="'+p.type+'" tabindex="0" role="button" transform="rotate('+p.rot+' '+p.cx+' '+p.cy+')"><rect x="'+(p.cx-p.w/2)+'" y="'+(p.cy-p.h/2)+'" width="'+p.w+'" height="'+p.h+'"/><line class="bx" x1="'+(p.cx-p.w/2)+'" y1="'+(p.cy+p.h/2)+'" x2="'+(p.cx+p.w/2)+'" y2="'+(p.cy-p.h/2)+'"/><text x="'+p.cx+'" y="'+p.cy+'" style="font-size:'+Math.min(22,Math.round(p.w*0.42))+'px" transform="rotate('+(-p.rot)+' '+p.cx+' '+p.cy+')">'+p.id+'</text></g>').join('');
  const zones = ZONES.map(z=>'<g class="plot zone" data-id="'+z.id+'" data-type="'+z.type+'" tabindex="0" role="button"><path d="M'+z.pts.split(' ').join('L')+'Z"/><text x="'+z.lx+'" y="'+(z.ly-10)+'">'+esc(z.name)+'</text><text x="'+z.lx+'" y="'+(z.ly+14)+'" class="mapsub zcount"></text></g>').join('');
  $('#mapbox').innerHTML = '<svg viewBox="380 236 1200 1030" role="group" aria-label="Mapa kempu Pullmann s parcelami">'
    +'<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="hz" width="10" height="10"/><line class="hl" x1="0" y1="0" x2="0" y2="10"/></pattern></defs>'
    +'<path class="water" d="M380,236 L520,236 L395,660 L380,700Z"/><text class="maplabel" x="400" y="520" font-size="30" transform="rotate(-72 400 520)">Váh</text>'
    +'<polygon class="outline" points="640,255 1470,290 1548,1150 1180,1232 1050,1190 900,1150 710,1140 640,1000 400,715"/>'
    +'<path class="road" d="M1160,1060 C1050,1030 760,1040 650,1000"/><path class="road" d="M1130,560 C1000,620 870,640 600,760"/><path class="road" d="M940,350 L560,470"/>'
    +'<path class="road" d="M1200,1225 L1160,1060 L1130,560 C1120,460 1040,360 940,350 C1050,330 1200,340 1290,400 C1380,470 1392,620 1376,800 C1366,890 1290,960 1230,990 C1200,1010 1175,1030 1160,1060"/>'
    +'<text class="maplabel mapgold" x="1235" y="1258" font-size="22">▲ Vstup</text>'
    +'<text class="maplabel" x="1535" y="300" font-size="19" transform="rotate(90 1535 300)">Piešťany 1 km ◄ · ► Hlohovec</text>'
    +zones+plots+facs+'</svg>';
  const tip=$('#tip'), panel=$('#sec-map'); let tipT;
  const placeTip = (x,y) => { const r=panel.getBoundingClientRect(); if(x+250>r.width) x-=264; if(y+130>r.height) y-=124; tip.style.left=Math.max(4,x)+'px'; tip.style.top=Math.max(4,y)+'px'; };
  const tipAt = g => { const r=panel.getBoundingClientRect(), b=g.getBoundingClientRect(); tip.innerHTML=tipHtml(g.dataset.id); tip.hidden=false; placeTip(b.left-r.left, b.bottom-r.top+6); };
  $('#mapbox').querySelectorAll('.plot').forEach(g=>{
    const act = () => {
      if(g.classList.contains('busy')){ tipAt(g); clearTimeout(tipT); tipT=setTimeout(()=>{ tip.hidden=true; }, 2600); toast(zoneOf(g.dataset.id) ? placeLabel(g.dataset.id)+': v tomto termíne tu nie je voľné miesto. Vyberte inú plochu alebo zmeňte termín.' : placeLabel(g.dataset.id)+' je v tomto termíne obsadená. Vyberte zelenú parcelu alebo zmeňte termín.'); return; }
      tip.hidden=true; selectParcel(g.dataset.id);
    };
    g.addEventListener('click', act);
    g.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } });
    g.addEventListener('pointerenter', e=>{ if(e.pointerType==='touch') return; const r=panel.getBoundingClientRect(); tip.innerHTML=tipHtml(g.dataset.id); tip.hidden=false; placeTip(e.clientX-r.left+14, e.clientY-r.top+14); });
    g.addEventListener('pointermove', e=>{ if(e.pointerType==='touch' || tip.hidden) return; const r=panel.getBoundingClientRect(); placeTip(e.clientX-r.left+14, e.clientY-r.top+14); });
    g.addEventListener('pointerleave', ()=>{ tip.hidden=true; });
    g.addEventListener('focus', ()=>{ let kb=true; try{ kb=g.matches(':focus-visible'); }catch(err){} if(kb) tipAt(g); });
    g.addEventListener('blur', ()=>{ tip.hidden=true; });
  });
  mapBuilt = true;
}
function tipHtml(id){
  const z=zoneOf(id), p=PARCELS.find(p=>p.id===id), k=(z||p).type, t=TYPES[k], free=placeFree(id), n=nights();
  return '<b>'+esc(placeLabel(id))+'</b>'+(t.zone?sizeText(t):sizeText(t)+' · '+m2(t.area))+'<br>'+hookText(t)+'<br>'+fmt(t.price)+' / noc'+(n>0?' · '+fmt(t.price*n)+' / pobyt':'')+'<br>'
    +(z ? (free>0?'<span class="ok">voľných miest: '+free+' z '+z.cap+'</span>':'<span class="no">obsadené</span>') : (free?'<span class="ok">voľná v termíne</span>':'<span class="no">obsadená v termíne</span>'))
    +(hasHard() ? (fitsType(k)?' · <span class="ok">zmestíte sa</span>':' · <span class="no">nezmestíte sa</span>') : '');
}
function updateMapState(){
  if(!mapBuilt) return;
  const fits=fitsAll(), hard=hasHard(); let freeCount=0, okCount=0;
  $('#mapbox').querySelectorAll('.plot').forEach(g=>{
    const id=g.dataset.id, k=g.dataset.type, z=zoneOf(id), free=placeFree(id);
    const pass = passFilter(k) && (!hard || fits[k]);
    g.classList.toggle('busy', free<=0); g.classList.toggle('sel', S.parcel===id); g.classList.toggle('dim', !pass);
    g.setAttribute('aria-label', placeLabel(id)+', '+(z ? (free>0 ? 'voľných miest: '+free+' z '+z.cap : 'bez voľného miesta') : (free>0?'voľná':'obsadená'))+(pass?'':', nevyhovuje filtru')+(S.parcel===id?', vybrané miesto':''));
    if(z) g.querySelector('.zcount').textContent = free+' / '+z.cap+(z.short?'':' voľných');
    if(free>0){ freeCount++; if(pass) okCount++; }
  });
  $('#mapTag').textContent = 'voľných '+freeCount+', vyhovuje '+okCount;
  if(!$('#listview').hidden) renderList(fits);
}
function firstFree(k){ return TYPES[k].zone ? (ZONES.find(z=>z.type===k && zoneFree(z)>0)||{}).id : (PARCELS.find(p=>p.type===k && isFree(p.id))||{}).id; }
function renderList(fits){
  fits = fits || fitsAll(); const n=nights(), hard=hasHard();
  const rows = ['M','L','XL','V','S'].map(k=>{ const t=TYPES[k], zs=ZONES.filter(z=>z.type===k), ps=PARCELS.filter(p=>p.type===k);
    const free = t.zone ? zs.reduce((s,z)=>s+zoneFree(z),0) : ps.filter(p=>isFree(p.id)).length;
    const total = t.zone ? zs.reduce((s,z)=>s+z.cap,0) : ps.length;
    const first = firstFree(k), fit = !hard || fits[k];
    return '<tr class="'+(fit?'':'nofit')+'"'+(passFilter(k)?'':' hidden')+'><td><b>'+esc(t.name)+'</b><br><span class="small muted">'+sizeText(t)+' · '+esc(hookText(t))+'</span></td><td class="n">'+fmt(t.price)+'</td><td class="n stay">'+(n>0?fmt(t.price*n):'–')+'</td><td class="n">'+free+' / '+total+'</td><td>'
      +(hard?(fit?'<span class="fitok">zmestíte sa</span> ':'<span class="fitno">nezmestíte sa</span> '):'')+'<button class="btn sm" type="button" data-pick="'+(first||'')+'"'+(first&&fit?'':' disabled')+'>Vybrať</button></td></tr>'; }).join('');
  $('#listview').innerHTML = '<table><thead><tr><th>Typ miesta</th><th class="n">Za noc</th><th class="n stay">Za pobyt</th><th class="n">Voľných</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><p class="note" style="margin-top:8px">Cena za miesto bez osôb a elektriny. Tlačidlo Vybrať zvolí prvé voľné miesto daného typu, konkrétnu parcelu si vyberiete v mape.</p>';
  $('#listview').querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.pick) selectParcel(b.dataset.pick); }));
}
function recommend(){
  if(!S.items.length){ toast('Najprv vyberte v kroku 1, s čím prídete. Potom vám odporučíme najlacnejšie voľné miesto.'); $('#qCat').focus(); return; }
  if(nights()<=0 || !inSeason()){ toast('Najprv zvoľte termín v sezóne 2026.'); $('#dIn').focus(); return; }
  const fits=fitsAll(), hard=S.items.filter(o=>lay(o)==='solid'), tents=hard.length>0 && hard.every(o=>kind(o).indexOf('tent')===0);
  const order=(tents?['S','V','M','L','XL']:['V','M','L','XL']).filter(k=>fits[k]);
  for(const k of order){ const id=firstFree(k); if(id){ selectParcel(id); toast('Odporúčame: '+placeLabel(id)+'. Je to najlacnejšie voľné miesto, kam sa zmestíte.'); return; } }
  toast('V tomto termíne nie je voľné miesto, kam sa zmestíte. Skúste iný termín alebo menej výbavy.');
}
function initMapControls(){
  $('#fType').querySelectorAll('button').forEach(b=>{ b.classList.toggle('on', b.dataset.f===S.f.type); b.setAttribute('aria-pressed', String(b.dataset.f===S.f.type));
    b.addEventListener('click',()=>{ S.f.type=b.dataset.f; $('#fType').querySelectorAll('button').forEach(x=>{ x.classList.toggle('on', x===b); x.setAttribute('aria-pressed', String(x===b)); }); updateMapState(); persist(); }); });
  $('#viewToggle').addEventListener('click',()=>{ const lv=$('#listview'); lv.hidden=!lv.hidden; $('#mapbox').hidden=!lv.hidden; $('#viewToggle').textContent = lv.hidden?'Zoznam':'Mapa'; $('#viewToggle').setAttribute('aria-pressed', String(!lv.hidden)); $('#tip').hidden=true; $('#mapHint').hidden=!lv.hidden; if(!lv.hidden) renderList(); else centerMap(); });
  $('#recBtn').addEventListener('click', recommend);
}

/* on a phone the map is wider than the screen: bring the chosen pitch, or all of them, to the middle */
function centerMap(){
  const box=$('#mapbox'); if(box.hidden || box.scrollWidth<=box.clientWidth+1) return;
  const one=S.parcel && box.querySelector('.plot.sel'); let l=Infinity, r=-Infinity;
  (one?[one]:[...box.querySelectorAll('.plot')]).forEach(g=>{ const b=g.getBoundingClientRect(); if(!b.width) return; l=Math.min(l,b.left); r=Math.max(r,b.right); });
  if(l>r) return;
  const bb=box.getBoundingClientRect(); box.scrollLeft += (l+r)/2 - (bb.left+bb.width/2);
}

/* ---------- Parcel selection ---------- */
function parcelInfo(){
  if(!S.parcel) return null;
  const z=zoneOf(S.parcel); if(z) return {id:z.id, label:z.name, type:TYPES[z.type], key:z.type, zone:z};
  const p=PARCELS.find(p=>p.id===S.parcel); if(!p) return null;
  return {id:p.id, label:placeLabel(p.id), type:TYPES[p.type], key:p.type};
}
const curType = () => { const i=parcelInfo(); return i ? i.type : TYPES.M; };
function selectParcel(id){
  S.parcel=id; S.sel=null; S.sent=null; $('#confirm').hidden=true; $('#bookForm').hidden=false;
  const t=curType(), bad=badMap(t); if(S.items.some(o=>bad[o.uid])) autoLayout();
  updateMapState(); renderParcel(); renderPlan(); renderPrice(); persist(); centerMap();
  try{ history.replaceState(null,'','#'+id); }catch(e){}
  $('#tip').hidden=true;
  openPlanner();
}
function deselectParcel(){ if(plannerOpen) closePlanner(false); S.parcel=null; S.sel=null; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} renderParcel(); renderPlan(); renderPrice(); persist(); }
function renderParcel(){
  const i=parcelInfo();
  if(!i){ $('#pTitle').textContent='Vyberte parcelu'; $('#pDims').hidden=true; $('#pDesc').hidden=false; $('#pDesc').textContent='Kliknite na parcelu alebo zónu v mape.'; $('#pChips').innerHTML=''; $('#pTag').textContent=''; $('#fElec').disabled=false; return; }
  const t=i.type;
  $('#pTitle').textContent=i.label; $('#pTag').textContent=fmt(t.price)+' / noc';
  $('#pDims').innerHTML = t.zone ? 'max. '+m2(t.area)+' <span class="muted" style="font-size:18px;font-weight:500">na posádku</span>' : sizeText(t)+' <span class="muted" style="font-size:18px;font-weight:500">· '+m2(t.area)+'</span>';
  $('#pDims').hidden=false; $('#pDesc').textContent=t.desc; $('#pDesc').hidden=!t.desc;
  $('#pChips').innerHTML = '<span class="chip '+(t.elec===true?'on':t.elec?'':'off')+'">'+ICO.elec+(t.elec===true?' elektrina 230 V':t.elec?' elektrina po dohode s recepciou':' elektrina')+'</span>'
    +(t.water?'<span class="chip on">'+ICO.water+' pitná voda</span>':'<span class="chip off">bez pitnej vody</span>')+(t.grey?'<span class="chip on">'+ICO.grey+' výpust šedej vody</span>':'<span class="chip off">bez výpustu</span>');
  $('#fElec').disabled=!t.elec; if(!t.elec) $('#fElec').checked=false;
}

/* ---------- Adding and arranging objects ---------- */
function place(it){
  const t=curType(), c=Math.max(0.25,S.set.clear||0);
  const near = (a,b) => { const A=box(a), B=box(b), g=0.25; return A.x<B.x+B.w+g && B.x<A.x+A.w+g && A.y<B.y+B.h+g && B.y<A.y+A.h+g; };
  const scan = test => { const B=box(it); for(let y=c; y<=t.h-B.h-c+0.001; y+=0.25){ for(let x=c; x<=t.w-B.w-c+0.001; x+=0.25){ it.x=x; it.y=y; if(!S.items.some(o=>o!==it && test(o,it))) return true; } } return false; };
  if(scan(near) || scan(hit) || scan(overlap)) return true;
  const B=box(it); let best=null;
  for(let y=c; y<=t.h-B.h-c+0.001; y+=0.5){ for(let x=c; x<=t.w-B.w-c+0.001; x+=0.5){ let a=0;
    S.items.forEach(o=>{ if(o===it) return; const O=box(o), w=Math.min(x+B.w,O.x+O.w)-Math.max(x,O.x), h=Math.min(y+B.h,O.y+O.h)-Math.max(y,O.y); if(w>0 && h>0) a+=w*h; });
    if(!best || a<best.a-0.001) best={a:a,x:x,y:y}; } }
  if(best){ it.x=best.x; it.y=best.y; }
  return !!best;
}
/* which vehicle a piece of gear belongs to: the catalogue lists suitable kinds in order of preference; among equals the selected one wins, then the newest */
function findHost(cat, self){
  const sel=byId(S.sel);
  const taken=h=>S.items.some(k=>k!==self && k.host===h.uid && CATBY[mdl(k).cat].attach===cat.attach);   // one awning per side, one tent per roof
  for(const d of cat.hosts||[]){ const c=S.items.filter(i=>i!==self && kind(i)===d && CATBY[mdl(i).cat].tab==='veh' && !taken(i)); if(c.length) return c.indexOf(sel)>=0 ? sel : c[c.length-1]; }
  return null;
}
function toWorld(h,lx,ly){ const B=box(h), dx=lx-h.L/2, dy=ly-h.W/2, r=h.rot; const v = r===0?[dx,dy] : r===90?[-dy,dx] : r===180?[-dx,-dy] : [dy,-dx]; return [B.x+B.w/2+v[0], B.y+B.h/2+v[1]]; }
/* an awning goes to the right-hand side of its vehicle, a roof tent on top of the roof */
function attach(o,h){
  const m=mdl(o), kind=CATBY[m.cat].attach, xr=h.L*0.55; let p;
  if(kind==='roof'){ o.rot=h.rot; const fold=(m.p&&m.p.fold)||'x';
    p = fold==='x' ? toWorld(h, xr+o.L/4, h.W/2) : toWorld(h, xr, h.W/2-((m.p&&m.p.cw)||o.W/2)/2+o.W/2); }
  else { o.rot=(h.rot+180)%360; p=toWorld(h, xr, -o.W/2); }
  const b=box(o); o.x=r2(p[0]-b.w/2); o.y=r2(p[1]-b.h/2); o.host=h.uid;
}
function addItem(m,L,W,name,primary){
  const t=curType(), it={uid:S.seq++, mid:m.id, name:name||m.name, L:L, W:W, rot:(L>W && t.h>t.w)?90:0, x:0.5, y:0.5};
  if(primary) it.primary=true;
  const cat=CATBY[m.cat], host=cat.attach?findHost(cat,it):null;
  S.items.push(it);
  if(host) attach(it,host);
  else if(!place(it)){ it.rot=it.rot?0:90; if(!place(it)){ it.rot=it.rot?0:90; it.x=0.5; it.y=0.5; } }
  if(badMap(t)[it.uid] && (hosted(it) || needsSpace(it))) autoLayout();
  S.sel=it.uid; S.sent=null;
  return it;
}
const hosted = o => o.host!=null && !!byId(o.host);
function autoLayout(){
  const t=curType(), c=S.set.clear||0, hard=S.items.filter(o=>needsSpace(o) && !hosted(o));
  const wide = hard.map(o=>({L:o.L, W:o.W+S.items.filter(k=>k.host===o.uid && CATBY[mdl(k).cat].attach==='side').reduce((m,k)=>Math.max(m,k.W),0), ref:o}));
  const slim = hard.map(o=>({L:o.L, W:o.W, ref:o}));
  const res = packInto(t.w,t.h,wide,0.5) || packInto(t.w,t.h,wide,0.25) || packInto(t.w,t.h,wide,0) || packInto(t.w,t.h,slim,0.25) || packInto(t.w,t.h,slim,0);
  if(res){ const ex=Math.min.apply(null,res.map(q=>t.w-2*c-q.x-q.w)), ey=Math.min.apply(null,res.map(q=>t.h-2*c-q.y-q.h)), ox=Math.min(0.5,Math.max(0,Math.floor(ex*2)/4)), oy=Math.min(0.5,Math.max(0,Math.floor(ey*2)/4));
    res.forEach(q=>{ const o=q.o.ref; o.rot=q.rot; o.x=r2(q.x+c+ox); o.y=r2(q.y+c+oy+(q.rot===0 ? q.o.W-o.W : 0)); }); }
  S.items.filter(hosted).forEach(o=>attach(o, byId(o.host)));
  S.items.filter(o=>!needsSpace(o) && !hosted(o)).forEach(o=>{ const B=box(o); o.x=r2(Math.max(c, Math.min(t.w-c-B.w, o.x))); o.y=r2(Math.max(c, Math.min(t.h-c-B.h, o.y))); });
  return !!res;
}
function clampIn(o){ const t=curType(), B=box(o); o.x=Math.max(-B.w*0.5, Math.min(t.w-B.w*0.5, o.x)); o.y=Math.max(-B.h*0.5, Math.min(t.h-B.h*0.5, o.y)); }
function changed(){ renderPlan(); renderPrice(); persist(); }
function rotate(uid){ const o=byId(uid); if(!o) return; const B=box(o), cx=B.x+B.w/2, cy=B.y+B.h/2; o.rot=(o.rot+90)%360; const b=box(o); o.x=snapV(cx-b.w/2); o.y=snapV(cy-b.h/2); const t=curType(), c=S.set.clear||0; if(b.w<=t.w-2*c+0.001) o.x=Math.max(c, Math.min(t.w-c-b.w, o.x)); if(b.h<=t.h-2*c+0.001) o.y=Math.max(c, Math.min(t.h-c-b.h, o.y)); clampIn(o); S.items.filter(k=>k.host===uid).forEach(k=>attach(k,o)); S.sel=uid; changed(); }
/* move an object together with the gear attached to it */
function moveBy(o,dx,dy){ const x0=o.x, y0=o.y; o.x=snapV(o.x+dx); o.y=snapV(o.y+dy); clampIn(o); S.items.filter(k=>k.host===o.uid).forEach(k=>{ k.x=r2(k.x+o.x-x0); k.y=r2(k.y+o.y-y0); }); }
/* deleting and emptying can be taken back. If something else was edited in the meantime, only what was removed returns and the newer edits stay. */
function undoable(msg, fn){
  const before=JSON.stringify(S.items); fn();
  const after=JSON.stringify(S.items), left={}; S.items.forEach(o=>{ left[o.uid]=1; });
  toast(msg, {label:'Vrátiť späť', fn:()=>{
    const old=JSON.parse(before);
    if(JSON.stringify(S.items)===after) S.items=old;
    else {
      const was={}; old.forEach(o=>{ was[o.uid]=o; });
      const gone=old.filter(o=>!left[o.uid] && !byId(o.uid)), back=uid=>gone.some(g=>g.uid===uid);
      S.items.forEach(k=>{ const w=was[k.uid]; if(w && w.host!=null && k.host==null && back(w.host) && k.x===w.x && k.y===w.y && k.rot===w.rot) k.host=w.host; });   // gear that has not moved hangs on its vehicle again
      S.items=S.items.concat(gone);
      gone.forEach(o=>{ if(o.host==null) return; const h=byId(o.host), kind=CATBY[mdl(o).cat].attach; if(h && !S.items.some(k=>k!==o && k.host===h.uid && CATBY[mdl(k).cat].attach===kind)) attach(o,h); else delete o.host; });
      if(S.items.filter(o=>o.primary).length>1) gone.forEach(o=>{ delete o.primary; });
    }
    S.sel=null; changed();
  }});
}
function delAsk(uid){ const o=byId(uid); if(!o) return; undoable('Odstránené: '+o.name+'.', ()=>del(uid)); }
function del(uid){ S.items=S.items.filter(i=>i.uid!==uid); S.items.forEach(k=>{ if(k.host===uid) delete k.host; }); if(S.sel===uid) S.sel=null; changed(); }
function dup(uid){ const o=byId(uid); if(!o) return; const n=addItem(mdl(o),o.L,o.W,o.name); if(n.host==null){ n.rot=o.rot; if(!place(n)){ n.x=snapV(o.x+0.5); n.y=snapV(o.y+0.5); clampIn(n); } } changed(); }

/* ---------- Plan editor ---------- */
function labelMode(){ const l=S.set.labels; return l==='auto' ? (window.innerWidth<=900?'numbers':'names') : l; }
/* where the label sits: in the middle, or at the fold-out end for a roof tent that lies on a car */
function labelAt(o){
  const B=box(o), m=mdl(o);
  if(CATBY[m.cat].attach==='roof' && hosted(o)) return ((m.p&&m.p.fold)||'x')==='x' ? toWorld(o,o.L*0.8,o.W/2) : toWorld(o,o.L/2,o.W*0.8);
  return [B.x+B.w/2, B.y+B.h/2];
}
/* label of an object: its number in a badge, or its name fitted to the box (long names break into two lines) */
function label(o){
  const B=box(o), mode=labelMode(), a=labelAt(o), x=a[0], y=a[1];
  if(mode==='none') return null;
  /* the number sits in the middle; on small gear it moves to a corner so that the drawing stays visible */
  const badge=()=>{ const small=Math.min(B.w,B.h)<1.1 && !hosted(o); return {x:small?B.x+B.w:x, y:small?B.y:y, fs:0.36, lines:[String(S.items.indexOf(o)+1)], badge:true}; };
  if(mode==='numbers') return badge();
  if(CATBY[mdl(o).cat].attach==='roof' && hosted(o)) return null;   // a roof tent on a car: the car carries the name
  const n=o.name, fit=len=>(B.w-0.2)/(len*0.5); let lines=[n], fs=fit(n.length);
  if(fs<0.3 && n.length>8 && n.indexOf(' ')>0){
    const sp=[]; for(let i=1;i<n.length;i++) if(n[i]===' ') sp.push(i);
    const mid=n.length/2, cut=sp.reduce((a,i)=>Math.abs(i-mid)<Math.abs(a-mid)?i:a, sp[0]);
    const l2=[n.slice(0,cut), n.slice(cut+1)], f2=Math.min(fit(Math.max(l2[0].length,l2[1].length)), (B.h-0.2)/2.4);
    if(f2>fs){ lines=l2; fs=f2; }
  }
  if(fs<0.2) return badge();   // the name would be unreadable or spill over its neighbours: show the number from the list instead
  return {x:x, y:y, fs:Math.min(0.4,fs), lines:lines};
}
function labelSvg(o){
  const l=label(o); if(!l) return '';
  if(l.badge) return '<circle class="lb" cx="'+r3(l.x)+'" cy="'+r3(l.y)+'" r="0.34"/><text x="'+r3(l.x)+'" y="'+r3(l.y)+'" style="font-size:'+l.fs+'px">'+l.lines[0]+'</text>';
  const inner = l.lines.length===1 ? esc(l.lines[0]) : l.lines.map((t,i)=>'<tspan x="'+r3(l.x)+'" dy="'+(i?'1.15em':'-0.55em')+'">'+esc(t)+'</tspan>').join('');
  return '<text class="nm" x="'+r3(l.x)+'" y="'+r3(l.y)+'" style="font-size:'+l.fs.toFixed(2)+'px">'+inner+'</text>';
}
let drag=null, plannerOpen=false, lastFocus=null;
function renderPlan(){
  const info=parcelInfo(), t=curType(), W=t.w, H=t.h, pad=1.6;
  const grid=[]; for(let x=0;x<=W+0.001;x+=0.5) grid.push('<line class="gridline'+(x%1?' minor':'')+'" x1="'+x+'" y1="0" x2="'+x+'" y2="'+H+'"/>');
  for(let y=0;y<=H+0.001;y+=0.5) grid.push('<line class="gridline'+(y%1?' minor':'')+'" x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'"/>');
  const hook = hookups(t).map(p=>'<g class="hookup">'+(p.k==='water'?'<circle class="pad" cx="'+(p.x+p.w/2)+'" cy="'+(p.y+p.h/2)+'" r="'+(p.w/2)+'"/>':'<rect class="pad" x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'"/>')+'<text x="'+p.lx+'" y="'+p.ly+'" style="text-anchor:'+p.anchor+'">'+p.txt+'</text></g>').join('');
  const c=S.set.clear||0, clearRect = c ? '<rect class="clear" x="'+c+'" y="'+c+'" width="'+(W-2*c)+'" height="'+(H-2*c)+'"/>' : '';
  const rs=S.set.road;
  /* margins of the view: room for the dimension lines on top and left, and a 0.9 m road band beyond them on the entry side */
  const mT=rs==='top'?2.8:1.6, mL=rs==='left'?2.55:1.4, mR=rs==='right'?1.7:0.9, mB=rs==='bottom'?1.7:0.9;
  const bx=-mL, by=-mT, bw=W+mL+mR, bh=H+mT+mB, z=S.view.z||1, vw=bw/z, vh=bh/z;
  const roadRect = rs==='top' ? 'x="'+bx+'" y="-2.6" width="'+bw+'" height="0.9"' : rs==='left' ? 'x="-2.35" y="'+by+'" width="0.9" height="'+bh+'"' : rs==='right' ? 'x="'+(W+0.5)+'" y="'+by+'" width="0.9" height="'+bh+'"' : 'x="'+bx+'" y="'+(H+0.5)+'" width="'+bw+'" height="0.9"';
  const roadLbl = rs==='top' ? 'x="'+(W/2)+'" y="-2.15"' : rs==='left' ? 'x="-1.9" y="'+(H/2)+'" transform="rotate(-90 -1.9 '+(H/2)+')"' : rs==='right' ? 'x="'+(W+0.95)+'" y="'+(H/2)+'" transform="rotate(90 '+(W+0.95)+' '+(H/2)+')"' : 'x="'+(W/2)+'" y="'+(H+0.95)+'"';
  if(S.view.cx==null){ S.view.cx=bx+bw/2; S.view.cy=by+bh/2; }
  S.view.cx=Math.max(bx+vw/2, Math.min(bx+bw-vw/2, S.view.cx)); S.view.cy=Math.max(by+vh/2, Math.min(by+bh-vh/2, S.view.cy));
  const bad=badMap(t);
  const objs = S.items.map(o=>{ const px=Math.max(0.05,(0.9-o.L)/2), py=Math.max(0.05,(0.9-o.W)/2);
    return '<g class="ob'+(bad[o.uid]?' bad':'')+(S.sel===o.uid?' sel':'')+'" data-uid="'+o.uid+'"><g class="obt" transform="'+tf(o)+'"><rect class="hit" x="'+r3(-px)+'" y="'+r3(-py)+'" width="'+r3(o.L+2*px)+'" height="'+r3(o.W+2*py)+'"/>'
      +Draw.svg(mdl(o),o.L,o.W)+'<rect class="selbox" x="-0.1" y="-0.1" width="'+r3(o.L+0.2)+'" height="'+r3(o.W+0.2)+'" rx="0.12"/></g></g>'; }).join('');
  const labs = S.items.map(o=>'<g class="lab" data-l="'+o.uid+'">'+labelSvg(o)+'</g>').join('');
  $('#plan').innerHTML = '<svg viewBox="'+r3(S.view.cx-vw/2)+' '+r3(S.view.cy-vh/2)+' '+r3(vw)+' '+r3(vh)+'" role="group" aria-label="Pôdorys: '+esc(info?info.label:'parcela M')+', mriežka 1 meter">'
    +'<rect '+roadRect+' class="road"/><text class="roadlbl" '+roadLbl+'>PRÍJAZDOVÁ CESTA · VJAZD</text>'+grid.join('')
    +'<rect class="bound'+(Object.keys(bad).some(k=>bad[k])?' over':'')+'" x="0" y="0" width="'+W+'" height="'+H+'"/>'+clearRect
    +'<line class="dimline" x1="0" y1="-0.6" x2="'+W+'" y2="-0.6"/><line class="dimline" x1="0" y1="-0.8" x2="0" y2="-0.4"/><line class="dimline" x1="'+W+'" y1="-0.8" x2="'+W+'" y2="-0.4"/><text class="dim" x="'+(W/2)+'" y="-0.75">'+num(W)+' m</text>'
    +'<line class="dimline" x1="-0.6" y1="0" x2="-0.6" y2="'+H+'"/><line class="dimline" x1="-0.8" y1="0" x2="-0.4" y2="0"/><line class="dimline" x1="-0.8" y1="'+H+'" x2="-0.4" y2="'+H+'"/><text class="dim" x="-0.75" y="'+(H/2)+'" transform="rotate(-90 -0.75 '+(H/2)+')">'+num(H)+' m</text>'
    +'<line class="dimline" x1="'+(W-1)+'" y1="-1.2" x2="'+W+'" y2="-1.2"/><line class="dimline" x1="'+(W-1)+'" y1="-1.3" x2="'+(W-1)+'" y2="-1.1"/><line class="dimline" x1="'+W+'" y1="-1.3" x2="'+W+'" y2="-1.1"/><text class="dim" x="'+(W-1.15)+'" y="-1.09" style="text-anchor:end;font-size:.32px;opacity:.85">1 m</text>'
    +objs+hook+labs+'</svg>';
  const svg=$('#plan svg');
  const toM = e => { const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const moveDom = o => { const g=svg.querySelector('.ob[data-uid="'+o.uid+'"]'); if(g) g.firstElementChild.setAttribute('transform', tf(o)); const lb=svg.querySelector('.lab[data-l="'+o.uid+'"]'); if(lb) lb.innerHTML=labelSvg(o); };
  svg.querySelectorAll('.ob').forEach(g=>{
    g.addEventListener('pointerdown', e=>{
      const uid=+g.dataset.uid, o=byId(uid), m=toM(e);
      drag={o:o, dx:m.x-o.x, dy:m.y-o.y, kids:S.items.filter(k=>k.host===uid).map(k=>({k:k, dx:k.x-o.x, dy:k.y-o.y}))};
      S.sel=uid; try{ g.setPointerCapture(e.pointerId); }catch(err){} e.preventDefault(); e.stopPropagation();
      svg.querySelectorAll('.ob').forEach(x=>x.classList.toggle('sel', +x.dataset.uid===uid)); $('#obtools').hidden=true;
    });
    g.addEventListener('pointermove', e=>{
      if(!drag || drag.o.uid!==+g.dataset.uid) return; const m=toM(e), o=drag.o, B=box(o);
      let nx=snapV(m.x-drag.dx), ny=snapV(m.y-drag.dy);
      nx=Math.max(-B.w*0.5, Math.min(W-B.w*0.5, nx)); ny=Math.max(-B.h*0.5, Math.min(H-B.h*0.5, ny));
      if(nx!==o.x || ny!==o.y){ o.x=nx; o.y=ny; moveDom(o); drag.kids.forEach(c=>{ c.k.x=r2(o.x+c.dx); c.k.y=r2(o.y+c.dy); moveDom(c.k); }); }
    });
    const end = () => { if(drag){ drag=null; changed(); } };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  });
  /* background: drag pans the view when zoomed in, a plain click clears the selection */
  let pan=null;
  svg.addEventListener('pointerdown', e=>{ if(e.target.closest('.ob')) return;
    if((S.view.z||1)<=1){ if(S.sel!=null){ S.sel=null; renderPlan(); } return; }
    const r=svg.getBoundingClientRect(); pan={x:e.clientX,y:e.clientY,cx:S.view.cx,cy:S.view.cy,k:vw/r.width}; try{ svg.setPointerCapture(e.pointerId); }catch(err){} });
  svg.addEventListener('pointermove', e=>{ if(!pan) return; S.view.cx=Math.max(bx+vw/2, Math.min(bx+bw-vw/2, pan.cx-(e.clientX-pan.x)*pan.k)); S.view.cy=Math.max(by+vh/2, Math.min(by+bh-vh/2, pan.cy-(e.clientY-pan.y)*pan.k)); svg.setAttribute('viewBox', r3(S.view.cx-vw/2)+' '+r3(S.view.cy-vh/2)+' '+r3(vw)+' '+r3(vh)); placeTools(); });
  const endPan = () => { pan=null; };
  svg.addEventListener('pointerup', endPan); svg.addEventListener('pointercancel', endPan);
  renderMeter(t, bad); renderPlaced(bad); placeTools(); renderSummary(bad); refreshTags();
}
function placeTools(){
  const tools=$('#obtools'), g=document.querySelector('#plan .ob.sel .obt');
  if(!g || !plannerOpen){ tools.hidden=true; return; }
  const r=g.getBoundingClientRect(), st=$('#plan').getBoundingClientRect();
  let x=r.x+r.width/2-st.x, y=r.y-st.y-8;
  x=Math.max(70, Math.min(st.width-70, x)); if(y<52) y=Math.min(st.height-6, r.y+r.height-st.y+54);
  tools.style.left=x+'px'; tools.style.top=y+'px'; tools.hidden=false;
}
function verdict(t, bad){
  /* occupied ground: the union of all footprints; while objects still overlap, at least the sum of those that need ground of their own */
  const used=Math.max(usedArea(S.items), S.items.filter(needsSpace).reduce((a,o)=>a+o.L*o.W,0)), pct=used/t.area*100, anyBad=Object.keys(bad).some(k=>bad[k]), over=t.zone && used>t.area+0.05;
  let v;
  if(!S.items.length) v={c:'warn', i:ICO.warn, t:'Zatiaľ tu nič nie je. Pridajte vozidlo, stan alebo výbavu.'};
  else if(over) v={c:'bad', i:ICO.bad, t:'Potrebujete '+m2(used)+', limit voľného státia je '+m2(t.area)+'. Uberte výbavu alebo zvoľte parcelu M, L či XL.'};
  else if(anyBad) v={c:'bad', i:ICO.bad, t: t.zone ? 'Niečo presahuje vyznačenú plochu alebo sa prekrýva. Presuňte to, otočte, alebo zmeňte tvar plochy v nastaveniach.' : 'Niečo sa nezmestí alebo sa prekrýva. Presuňte to, otočte, alebo zvoľte väčšiu parcelu.'};
  else if(pct>85) v={c:'warn', i:ICO.warn, t:'Zmestíte sa, ale veľmi natesno. Zvážte väčšie miesto, aby zostal priestor na pohyb.'};
  else v={c:'', i:ICO.ok, t:'Všetko sa zmestí.'};
  return {v:v, used:used, pct:pct};
}
function renderMeter(t, bad){
  const r=verdict(t,bad), pct=Math.min(100,r.pct), cls=r.pct>100||r.v.c==='bad'?'bad':r.pct>85?'warn':'';
  const hard=S.items.filter(o=>lay(o)==='solid').reduce((s,o)=>s+o.L*o.W,0);
  setHtml($('#meter'), '<div class="lbl"><span>Zastavaná plocha <b class="mono">'+m2(r.used)+'</b> z '+m2(t.area)+(t.zone?' (limit voľného státia)':'')+'</span><span class="mono">'+Math.round(r.pct)+' %</span></div>'
    +'<div class="bar" role="progressbar" aria-label="Zastavaná plocha" aria-valuenow="'+Math.round(pct)+'" aria-valuemin="0" aria-valuemax="100"><div class="fill '+cls+'" style="width:'+pct+'%"></div></div>'
    +'<div class="lbl small muted"><span>Vozidlá a stany: <span class="mono">'+m2(hard)+'</span></span><span>Voľná plocha: <span class="mono">'+m2(Math.max(0,t.area-r.used))+'</span></span></div>'
    +'<div class="verdict '+r.v.c+'">'+r.v.i+'<span>'+r.v.t+'</span></div>'
    +'<p class="note">Poloha prípojok a strana vjazdu sú v pláne ilustračné.'+(t.zone?' Tvar plochy voľného státia zmeníte v nastaveniach.':'')+'</p>');
}
function renderPlaced(bad){
  /* the list is rebuilt on every change: remember which control had the focus and give it back afterwards */
  const wrap=$('#placedWrap'), act=document.activeElement, row=wrap.contains(act) ? act.closest('.pr') : null;
  const keep=row ? {i:[...wrap.querySelectorAll('.pr')].indexOf(row), k:act===row ? 'sel' : act.dataset.rot!==undefined ? 'rot' : 'del'} : null;
  const back=()=>{ if(!keep) return; const rows=wrap.querySelectorAll('.pr'), r=rows[Math.min(keep.i,rows.length-1)], n=r ? (keep.k==='sel' ? r : r.querySelector('[data-'+keep.k+']')) : $('#vAdd'); if(n) n.focus({preventScroll:true}); };
  if(!S.items.length){ $('#placedWrap').innerHTML='<p class="empty">Vyberte kategóriu, kliknite na jeden z troch modelov a stlačte Pridať.</p>'; back(); return; }
  $('#placedWrap').innerHTML = '<div class="placed">'+S.items.map((o,i)=>'<div class="pr'+(bad[o.uid]?' bad':'')+(S.sel===o.uid?' sel':'')+'" data-sel="'+o.uid+'" role="button" tabindex="0" aria-label="Označiť '+esc(o.name)+'"><span class="no">'+(i+1)+'.</span><b>'+esc(o.name)+'</b><span class="dm">'+num(o.L)+' × '+num(o.W)+' m</span><button type="button" data-rot="'+o.uid+'" aria-label="Otočiť '+esc(o.name)+'">'+IC.rot+'</button><button type="button" data-del="'+o.uid+'" aria-label="Zmazať '+esc(o.name)+'">'+IC.x+'</button></div>').join('')+'</div>';
  $('#placedWrap').querySelectorAll('[data-rot]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); rotate(+b.dataset.rot); }));
  $('#placedWrap').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); delAsk(+b.dataset.del); }));
  $('#placedWrap').querySelectorAll('[data-sel]').forEach(r=>{ const sel=()=>{ S.sel=+r.dataset.sel; renderPlan(); }; r.addEventListener('click',sel); r.addEventListener('keydown',e=>{ if(e.target===r && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); sel(); } }); });
  back();
}
$('#obtools').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b || S.sel==null) return; const a=b.dataset.act; if(a==='rot') rotate(S.sel); else if(a==='del'){ delAsk(S.sel); const n=$('#placedWrap .pr')||$('#vAdd'); if(n) n.focus({preventScroll:true}); } else if(a==='dup') dup(S.sel); });
$('#zIn').addEventListener('click', ()=>{ S.view.z=Math.min(4,(S.view.z||1)*1.4); renderPlan(); });
$('#zOut').addEventListener('click', ()=>{ S.view.z=Math.max(1,(S.view.z||1)/1.4); if(S.view.z<1.01){ S.view.z=1; S.view.cx=null; } renderPlan(); });
$('#zReset').addEventListener('click', ()=>{ S.view={z:1,cx:null,cy:null}; renderPlan(); });
let rsT; window.addEventListener('resize', ()=>{ clearTimeout(rsT); rsT=setTimeout(()=>{ if(plannerOpen) renderPlan(); },150); });
$('#clearBtn').addEventListener('click',()=>{ if(!S.items.length) return; undoable(curType().zone ? 'Plocha je prázdna.' : 'Parcela je prázdna.', ()=>{ S.items=[]; S.sel=null; changed(); }); });
$('#autoBtn').addEventListener('click',()=>{ if(!S.items.length) return; const ok=autoLayout(); changed(); if(!ok) toast('Všetko sa naraz nezmestí. Uberte výbavu alebo zvoľte väčšie miesto.'); });

/* ---------- Pickers: a category and its three models drawn at one common scale ---------- */
function catOptions(ids, first){ return (first||'')+GROUPS.map(g=>{ const l=g[1].filter(id=>ids.indexOf(id)>=0); return l.length ? '<optgroup label="'+g[0]+'">'+l.map(id=>'<option value="'+id+'">'+esc(CATBY[id].name)+'</option>').join('')+'</optgroup>' : ''; }).join(''); }
function findCat(q, ids){
  const qq=norm(q.trim()); if(qq.length<2) return null;
  for(const id of ids){ const m=CATBY[id].models.find(m=>norm(m.name).indexOf(qq)>=0); if(m) return {cat:id, mid:m.id}; }
  for(const id of ids){ if(norm(CATBY[id].name).indexOf(qq)>=0) return {cat:id}; }
  for(const id of ids){ if(norm(CATBY[id].kw||'').indexOf(qq)>=0) return {cat:id}; }
  return null;
}
function cardsHtml(cat, selId, hitId){
  const maxL=Math.max.apply(null,cat.models.map(m=>m.L)), maxW=Math.max.apply(null,cat.models.map(m=>m.W)), pad=cat.pad||0.25, vw=maxW+2*pad, vh=maxL+2*pad;
  let grid=''; for(let y=0; y<=maxL+0.001; y++) grid+='M'+r3(-vw/2)+','+(-y)+'H'+r3(vw/2);   // one line per metre, shared by the three cards
  return cat.models.map(m=>'<button type="button" class="card'+(m.id===selId?' on':'')+(m.id===hitId&&m.id!==selId?' hit':'')+'" data-mid="'+m.id+'" aria-pressed="'+(m.id===selId)+'">'
    +'<svg viewBox="'+r3(-vw/2)+' '+r3(-vh+pad)+' '+r3(vw)+' '+r3(vh)+'" aria-hidden="true"><path class="cg" d="'+grid+'"/><g class="ob" transform="translate('+r3(m.W/2)+' '+r3(-m.L)+') rotate(90)">'+Draw.svg(m,m.L,m.W)+'</g></svg>'
    +'<span class="nm">'+esc(m.name)+'</span><span class="dm">'+num(m.L)+' × '+num(m.W)+'\u00a0m</span><span class="tg" data-tag="'+m.id+'">'+m2(m.L*m.W)+'</span></button>').join('');
}
const readDim = el => parseFloat(String(el.value).replace(',','.'));
const dimsOk = (L,W) => L>=0.2 && L<=20 && W>=0.2 && W<=10;

/* step 1: what you arrive with (drives the map filter) */
const Q = {cat:'', hit:null, touched:false};
const primary = () => S.items.find(o=>o.primary);
function renderQuick(){
  const p=primary(); if(p && !Q.touched) Q.cat=mdl(p).cat;
  const sel=$('#qCat'); if(sel.value!==Q.cat) sel.value=Q.cat;
  const cat=CATBY[Q.cat], mine=!!(p && cat && mdl(p).cat===cat.id);
  $('#qCards').hidden=!cat; $('#qCards').innerHTML = cat ? cardsHtml(cat, mine?p.mid:null, Q.hit) : '';
  $('#qDims').hidden=!mine;
  if(mine && document.activeElement!==$('#qL') && document.activeElement!==$('#qW')){ $('#qL').value=p.L; $('#qW').value=p.W; }
  setText($('#qInfo'), p ? p.name+', '+num(p.L)+' × '+num(p.W)+' m, zaberie '+m2(p.L*p.W)+'. Mapa stmaví miesta, kam sa nezmestíte. Stan, markízu a ďalšiu výbavu pridáte v plánovači po výbere parcely.'
    : cat ? 'Kliknite na jeden z troch modelov. Ak máte iný, vyberte najbližší a upravte dĺžku a šírku.' : 'Vyberte kategóriu a mapa ukáže, kam sa zmestíte. Tento krok môžete preskočiť a všetko doplniť v plánovači.');
}
function setPrimary(m){
  S.items=S.items.filter(o=>!o.primary); S.sel=null;
  if(m){ addItem(m, r2(m.L), r2(m.W), m.name, true); S.sel=null; Q.cat=m.cat; }
  Q.hit=null; changed();
}
function initQuick(){
  $('#qCat').innerHTML = catOptions(QUICKIDS, '<option value="">Zatiaľ bez vozidla</option>');
  $('#qCat').addEventListener('change', e=>{ Q.cat=e.target.value; Q.touched=true; Q.hit=null; if(!Q.cat && primary()) setPrimary(null); else renderQuick(); });
  $('#qCards').addEventListener('click', e=>{ const b=e.target.closest('.card'); if(!b) return; Q.touched=true; setPrimary(MODEL[b.dataset.mid]); const n=$('#qCards .card.on'); if(n) n.focus(); });
  $('#qSearch').addEventListener('input', e=>{ const f=findCat(e.target.value, QUICKIDS); if(f){ Q.cat=f.cat; Q.hit=f.mid||null; Q.touched=true; renderQuick(); } else if(Q.hit){ Q.hit=null; renderQuick(); } });
  $('#qSearch').addEventListener('keydown', e=>{ if(e.key!=='Enter') return; e.preventDefault(); const f=findCat(e.target.value, QUICKIDS);
    if(f && f.mid){ Q.touched=true; setPrimary(MODEL[f.mid]); e.target.value=''; } else if(f){ toast('Kategória '+CATBY[f.cat].name+': kliknite na jeden z troch modelov.'); } else if(e.target.value.trim()){ toast('„'+e.target.value.trim()+'“ v zozname nie je. Vyberte najbližšiu kategóriu a upravte rozmery.'); } });
  const upd = () => { const p=primary(); if(!p) return; const L=readDim($('#qL')), W=readDim($('#qW')); if(!dimsOk(L,W)){ $('#qL').value=p.L; $('#qW').value=p.W; toast('Zadajte dĺžku 0,2 až 20 m a šírku 0,2 až 10 m.'); return; } const m=mdl(p);
    p.L=r2(L); p.W=r2(W); p.name = (Math.abs(p.L-m.L)>0.0051 || Math.abs(p.W-m.W)>0.0051) ? m.name+' (upravené)' : m.name; clampIn(p); changed(); };
  $('#qL').addEventListener('change', upd); $('#qW').addEventListener('change', upd);
  $('#qClear').addEventListener('click', ()=>{ Q.cat=''; Q.touched=true; setPrimary(null); $('#qCat').focus(); });
}

/* step 3: add vehicles and gear in the planner */
const PK = {tab:'veh', cat:{veh:'suv', gear:'tent23'}, mid:null, hit:false};
const NOTE = {veh:'Tri modely sú v rovnakej mierke, čiary sú po 1 m. Máte iný model? Vyberte najbližší a upravte dĺžku a šírku.',
  gear:'Markíza a predstan sa samy priložia k pravej strane vozidla, strešný stan na strechu auta.'};
function renderPicker(keepDims){
  const ids=TABIDS[PK.tab], cat=CATBY[PK.cat[PK.tab]];
  $('#vCat').innerHTML=catOptions(ids); $('#vCat').value=cat.id;
  if(!cat.models.some(m=>m.id===PK.mid)) PK.mid=(cat.models[1]||cat.models[0]).id;
  $('#vCards').innerHTML=cardsHtml(cat, PK.mid);
  const m=MODEL[PK.mid]; if(!keepDims){ $('#vL').value=r2(m.L); $('#vW').value=r2(m.W); }
  $('#vAdd').textContent='+ Pridať'; $('#vAdd').setAttribute('aria-label','Pridať '+m.name+' na parcelu');
  $('#pickNote').textContent=NOTE[PK.tab];
  document.querySelectorAll('.tab').forEach(x=>{ const on=x.dataset.tab===PK.tab; x.classList.toggle('on',on); x.setAttribute('aria-pressed', String(on)); });
  refreshTags();
}
/* under every card: its area and whether it still fits next to what is already placed */
function refreshTags(){
  if(!plannerOpen) return; const info=parcelInfo(), key=info?info.key:'M';
  document.querySelectorAll('#vCards [data-tag]').forEach(el=>{ const m=MODEL[el.dataset.tag]; let txt=m2(m.L*m.W), cls='tg';
    if(m.layer==='solid' || m.layer==='canopy'){ const ok=fitsType(key, S.items.concat([{mid:m.id,L:m.L,W:m.W}])); txt+=ok?' · zmestí sa':' · nezmestí sa'; cls+=ok?' ok':' no'; }
    el.textContent=txt; el.className=cls; });
}
function addFromPicker(){
  const m=MODEL[PK.mid], L=readDim($('#vL')), W=readDim($('#vW'));
  if(!dimsOk(L,W)){ $('#vL').focus(); toast('Zadajte dĺžku 0,2 až 20 m a šírku 0,2 až 10 m.'); return; }
  const q=$('#vSearch').value.trim(), custom=q.length>1 && !findCat(q, TABIDS.veh.concat(TABIDS.gear));
  const edited=Math.abs(L-m.L)>0.0051 || Math.abs(W-m.W)>0.0051;
  const it=addItem(m, r2(L), r2(W), custom ? q : m.name+(edited?' (upravené)':''));
  if(custom) $('#vSearch').value='';
  changed(); renderPicker();
  const cat=CATBY[m.cat];
  if(badMap(curType())[it.uid]) toast(it.name+' sa na voľné miesto nezmestí. Presuňte objekty, uberte výbavu alebo zvoľte väčšiu parcelu.');
  else if(cat.attach && !hosted(it)) toast(cat.attach==='roof' ? 'Na parcele nie je auto s voľnou strechou, strešný stan preto leží samostatne. Pridajte auto a stan naň presuňte.' : 'Na parcele nie je vozidlo s voľnou pravou stranou, '+it.name+' preto stojí samostatne.');
}
function initPicker(){
  $('.tabs').addEventListener('click', e=>{ const b=e.target.closest('.tab'); if(!b) return; PK.tab=b.dataset.tab; PK.mid=null; $('#vSearch').value=''; $('#vSearch').placeholder = PK.tab==='veh' ? 'napr. Kodiaq' : 'napr. markíza'; renderPicker(); });
  $('#vCat').addEventListener('change', e=>{ PK.cat[PK.tab]=e.target.value; PK.mid=null; renderPicker(); });
  $('#vCards').addEventListener('click', e=>{ const b=e.target.closest('.card'); if(!b) return; PK.mid=b.dataset.mid; renderPicker(); const n=$('#vCards .card.on'); if(n) n.focus(); });
  $('#vCards').addEventListener('dblclick', e=>{ if(e.target.closest('.card')) addFromPicker(); });
  $('#vSearch').addEventListener('input', e=>{ const f=findCat(e.target.value, TABIDS.veh.concat(TABIDS.gear)); if(!f) return; const c=CATBY[f.cat]; PK.tab=c.tab; PK.cat[c.tab]=c.id; PK.mid=f.mid||null; renderPicker(); });
  $('#vSearch').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addFromPicker(); } });
  $('#vAdd').addEventListener('click', addFromPicker);
  [$('#vL'),$('#vW')].forEach(el=>el.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addFromPicker(); } }));
  /* settings */
  const syncSet = () => { $('#sSnap').value=String(S.set.snap); $('#sClear').value=String(S.set.clear); $('#sRoad').value=S.set.road; $('#sLabels').value=S.set.labels; $('#sShape').value=S.set.shape; $('#sHook').checked=!!S.set.hook; $('#sBlock').checked=!!S.set.block; $('#sBlock').disabled=!S.set.hook; };
  const upd = () => { S.set.snap=parseFloat($('#sSnap').value); S.set.clear=parseFloat($('#sClear').value); S.set.road=$('#sRoad').value; S.set.labels=$('#sLabels').value; S.set.shape=$('#sShape').value; S.set.hook=$('#sHook').checked; S.set.block=$('#sBlock').checked && S.set.hook; applyShape(); syncSet(); S.view={z:1,cx:null,cy:null}; renderPlan(); updateMapState(); persist(); };
  syncSet();
  ['sSnap','sClear','sRoad','sLabels','sShape','sHook','sBlock'].forEach(id=>$('#'+id).addEventListener('change', upd));
  $('#sReset').addEventListener('click', ()=>{ S.set=Object.assign({},SET_DEF); applyShape(); syncSet(); S.view={z:1,cx:null,cy:null}; renderPlan(); updateMapState(); persist(); toast('Nastavenia sú späť na predvolených hodnotách.'); });
  $('#sources').addEventListener('toggle', ()=>{ if($('#sources').open && !$('#srcList').firstChild) $('#srcList').innerHTML = CATALOG.map(c=>'<p><b>'+esc(c.name)+'</b><br>'+c.models.map(m=>esc(m.name)+' · '+num(m.L)+' × '+num(m.W)+' m'+(m.src?' · <a href="'+esc(m.src)+'" target="_blank" rel="noopener">zdroj rozmerov</a>':'')+(m.est?' · časť údajov je odhad':'')+(m.osrc?' · <a href="'+esc(m.osrc)+'" target="_blank" rel="noopener">skutočný obrys, voľné dielo CC0</a>':'')).join('<br>')+'</p>').join(''); });
}

/* ---------- Full-screen planner ---------- */
/* the Back button (and the back swipe on a phone) closes the planner instead of leaving the page */
let histOpen=false, histWait=false, histT;
function histPush(){
  if(histOpen || histWait) return;
  try{ history.scrollRestoration='manual'; history.pushState({planner:1},''); histOpen=true; }catch(e){}
}
function histPop(){
  if(!histOpen) return;
  histOpen=false; histWait=true; clearTimeout(histT); histT=setTimeout(()=>{ histWait=false; }, 700);
  try{ history.back(); }catch(e){ histWait=false; }
}
window.addEventListener('popstate', ev=>{
  if(histWait){   // our own step back after closing with a button
    histWait=false;
    try{ history.replaceState(null,'', S.parcel ? '#'+S.parcel : location.pathname+location.search); }catch(e){}
    if(plannerOpen) histPush(); else try{ history.scrollRestoration='auto'; }catch(e){}
    return;
  }
  if(plannerOpen){ histOpen=false; closePlanner(false, true); try{ history.scrollRestoration='auto'; }catch(e){} return; }
  if(ev.state && ev.state.planner && S.parcel){ histOpen=true; openPlanner(); }   // Forward: back into the planner
});
function openPlanner(){
  const i=parcelInfo(); if(!i) return;
  lastFocus=document.activeElement;
  const t=i.type; $('#plTitle').textContent=i.label;
  $('#plMeta').textContent = (t.zone ? sizeText(t) : sizeText(t)+' · '+m2(t.area))+' · '+hookText(t)+' · '+fmt(t.price)+' / noc';
  $('#sShapeWrap').hidden=!t.zone;
  $('#planner').hidden=false; plannerOpen=true; histPush(); document.body.style.overflow='hidden'; $('.wrap').inert=true; $('#sticky').inert=true; S.view={z:1,cx:null,cy:null};
  renderPicker(); renderPlan(); setTimeout(()=>{ $('#plClose').focus(); }, 50);
}
function closePlanner(goBook, fromBack){
  if(!fromBack) histPop();
  $('#planner').hidden=true; plannerOpen=false; document.body.style.overflow=''; $('.wrap').inert=false; $('#sticky').inert=false; $('#obtools').hidden=true;
  drag=null; S.sel=null; renderPlan(); renderPrice(); persist();
  if(goBook){ $('#sec-book').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); setTimeout(()=>{ $('#fName').focus({preventScroll:true}); }, 500); }
  else { const to=(lastFocus && lastFocus.isConnected && lastFocus!==document.body && lastFocus.focus) ? lastFocus : $('#openPlanner'); if(to) to.focus({preventScroll:true}); }
}
$('#plClose').addEventListener('click', ()=>closePlanner(false));
$('#plDone').addEventListener('click', ()=>closePlanner(true));
$('#openPlanner').addEventListener('click', openPlanner);
document.addEventListener('keydown', e=>{
  if(!plannerOpen) return;
  if(e.key==='Escape'){ closePlanner(false); return; }
  if(e.key==='Tab'){ /* keep focus inside the dialog */
    const f=[...$('#planner').querySelectorAll('button,select,input,summary,a[href],[tabindex="0"]'), ...$('#toast').querySelectorAll('button')].filter(el=>!el.disabled && el.offsetParent!==null); if(!f.length) return;   // the undo button in the toast counts too
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    return; }
  const tag=(e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='select'||tag==='textarea') return;
  if((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z') && undoFn){ e.preventDefault(); const f=undoFn; undoFn=null; $('#toast').hidden=true; f(); return; }
  const o=byId(S.sel); if(!o) return;
  const step=e.shiftKey ? 1 : (S.set.snap||0.25); let used=true;
  if(e.key==='ArrowLeft') moveBy(o,-step,0); else if(e.key==='ArrowRight') moveBy(o,step,0); else if(e.key==='ArrowUp') moveBy(o,0,-step); else if(e.key==='ArrowDown') moveBy(o,0,step);
  else if(e.key==='r'||e.key==='R'){ e.preventDefault(); rotate(o.uid); return; } else if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); delAsk(o.uid); return; } else used=false;
  if(used){ e.preventDefault(); changed(); }
});
function renderSummary(bad){
  renderQuick(); updateMapState();
  const el=$('#summ'), info=parcelInfo();
  $('#openPlanner').hidden=!info;
  if(!info){ setHtml(el,''); return; }
  const t=info.type; bad=bad||badMap(t); const r=verdict(t,bad);
  const v = !S.items.length ? {c:'warn', i:ICO.warn, t:'Zatiaľ bez vozidiel. Otvorte plánovač a pridajte, čo prinesiete.'}
    : r.v.c==='bad' ? {c:'bad', i:ICO.bad, t:'Niečo sa nezmestí alebo sa prekrýva. Upravte rozloženie v plánovači.'}
    : {c:r.v.c, i:r.v.i, t:(r.v.c==='warn'?'Zmestíte sa natesno. ':'Všetko sa zmestí. ')+'Zastavaná plocha '+m2(r.used)+' ('+Math.round(r.pct)+' %).'};
  setHtml(el, '<div class="verdict '+v.c+'">'+v.i+'<span>'+v.t+'</span></div>'+(S.items.length ? '<div class="list">'+S.items.map(o=>'<span class="'+(bad[o.uid]?'bad':'')+'">'+esc(o.name)+' · '+num(o.L)+' × '+num(o.W)+' m</span>').join('')+'</div>' : ''));
}

/* ---------- Price (price list valid from 1. 3. 2026) ---------- */
function calc(){
  const info=parcelInfo(), n=nights(); if(!info || n<=0) return null;
  const t=info.type, hn=highNights(), ln=n-hn, rows=[];
  rows.push([info.label+' · '+n+' '+nightsWord(n), t.price*n]);
  const per=(lo,hi)=> ln&&hn ? '('+ln+' × '+lo+' € + '+hn+' × '+hi+' €)' : n+' × '+(hn?hi:lo)+' €';   // a single rate when the stay does not cross the season line
  if(S.adults) rows.push(['Dospelí '+S.adults+' × '+per('7,00','9,50'), S.adults*(ln*7+hn*9.5)]);
  if(S.kids) rows.push(['Deti 3–12 r. '+S.kids+' × '+per('4,00','6,50'), S.kids*(ln*4+hn*6.5)]);
  if(S.babies) rows.push(['Deti do 3 r. '+S.babies+' × zdarma', 0]);
  if(t.elec && $('#fElec').checked) rows.push(['Elektrina do 6 kWh · '+n+' × 5,00 €', 5*n]);
  if(S.dogs) rows.push(['Pes '+S.dogs+' × '+n+' × 3,00 €', 3*n*S.dogs]);
  const tr=S.items.filter(o=>kind(o)==='trailer').length;
  if(tr) rows.push(['Prívesný vozík '+tr+' × '+n+' × 5,00 € (cenník 3–5 €, rátame hornú hranicu)', 5*n*tr]);
  S.items.filter(o=>PARK[kind(o)]).sort((a,b)=>b.L*b.W-a.L*a.W).slice(1).forEach(o=>{ const p=PARK[kind(o)]; rows.push(['Ďalšie vozidlo '+o.name+' · parkovanie '+n+' × '+fmt(p), p*n]); });
  if($('#fEarly').checked) rows.push(['Skorý príchod alebo neskorý odchod do 4 h', info.key==='XL' ? 15 : 10]);
  const sub=rows.reduce((s,r)=>s+r[1],0); let disc=0;
  if(n>7){ disc=-sub*0.10; rows.push(['Zľava za pobyt nad 7 nocí −10 %', disc]); }
  const tax=0.5*S.adults*n; rows.push(['Daň z ubytovania '+S.adults+' × '+n+' × 0,50 €', tax]);
  return {rows:rows, total:sub+disc+tax, n:n, info:info};
}
function crewText(){ return S.adults+' dosp.'+(S.kids?', '+S.kids+' deti 3–12 r.':'')+(S.babies?', '+S.babies+' do 3 r.':'')+(S.dogs?', psy: '+S.dogs:''); }
function renderPrice(){
  if(!$('#bookForm [aria-invalid]')) $('#fErr').hidden=true;   // a general error (date, place, nothing to park) goes away once the cause changes
  const c=calc(), st=$('#stPrice'), si=$('#stInfo');
  $('#st2').classList.toggle('done', !!S.parcel); $('#st3').classList.toggle('done', !!S.parcel && S.items.length>0);
  const off = c && (!inSeason() || S.dIn<todayIso());
  if(!c || off){ const why = off ? 'Termín je mimo sezóny 2026 (2. 4. – 15. 11.) alebo v minulosti. Zvoľte iný termín a cena sa vypočíta.' : 'Vyberte termín a parcelu v mape, cena sa vypočíta automaticky.';
    $('#bsum').innerHTML='<div><small>Zhrnutie</small><b>'+why+'</b></div>'; $('#price').innerHTML='<tr><td class="muted">Zatiaľ nie je čo počítať.</td><td>–</td></tr>'; st.textContent='–'; si.textContent='Vyberte termín a parcelu'; $('#sendBtn').disabled=true; return; }
  $('#price').innerHTML = c.rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+fmt(r[1])+'</td></tr>').join('')+'<tr class="total"><td>Spolu za pobyt</td><td>'+fmt(c.total)+'</td></tr>';
  $('#bsum').innerHTML = '<div><small>Termín</small><b class="mono">'+rangeText().replace(/\. (?=\d)/g,'.\u00a0')+'</b></div><div><small>Nocí</small><b>'+c.n+'</b></div><div><small>Miesto</small><b>'+esc(c.info.label)+'</b></div><div><small>Posádka</small><b>'+crewText()+'</b></div><div><small>Vozidlá a výbava</small><b>'+(S.items.length?esc(S.items.map(o=>o.name).join(', ')):'zatiaľ nič')+'</b></div>';
  st.textContent=fmt(c.total); si.textContent=c.info.label+' · '+c.n+' '+nightsWord(c.n)+' · '+(S.adults+S.kids+S.babies)+' os.';
  $('#sendBtn').disabled=false;
}

/* ---------- Dates and counters ---------- */
function renderDates(){
  $('#dIn').value=S.dIn; $('#dOut').value=S.dOut; $('#dIn').min=SEASON[0] > todayIso() ? SEASON[0] : todayIso(); $('#dIn').max=addDays(SEASON[1],-1); $('#dOut').min=addDays(S.dIn,1); $('#dOut').max=SEASON[1];
  ['adults','kids','babies','dogs'].forEach(k=>{ setText($('#'+k), S[k]); });
  const n=nights(); let msg;
  if(seasonOver()) msg='Sezóna 2026 sa skončila 15. 11. Termíny ďalšej sezóny zverejní kemp na svojom webe.';
  else if(n<=0) msg='Odchod musí byť po príchode.';
  else if(!inSeason()) msg='Kemp je otvorený od 2. 4. do 15. 11. 2026. Zvoľte termín v sezóne.';
  else { const hn=highNights(); msg=n+' '+nightsWord(n)+(hn?', z toho '+hn+' v hlavnej sezóne (19. 6. – 1. 9.)':'')+'.'+(oneNightWeekend()?' V hlavnej sezóne kemp neprijíma víkendové pobyty na 1 noc, pridajte ďalšiu noc.':''); }
  setText($('#dateInfo'), msg);
  $('#st1').classList.toggle('done', n>0 && inSeason());
}
function datesChanged(){
  S.sent=null; renderDates();
  if(S.parcel && placeFree(S.parcel)<=0){ const lbl=placeLabel(S.parcel), zn=!!zoneOf(S.parcel); deselectParcel(); toast(zn ? lbl+': v novom termíne tu nie je voľné miesto. Vyberte v mape iné.' : lbl+' je v novom termíne obsadená. Vyberte v mape inú.'); }
  updateMapState(); renderPrice(); persist();
}
$('#dIn').addEventListener('change', e=>{ if(!e.target.value) { renderDates(); return; } S.dIn=e.target.value; if(nights()<=0) S.dOut=addDays(S.dIn,1); datesChanged(); });
$('#dOut').addEventListener('change', e=>{ if(!e.target.value) { renderDates(); return; } S.dOut=e.target.value; datesChanged(); });
document.querySelectorAll('[data-inc],[data-dec]').forEach(b=>b.addEventListener('click',()=>{
  const k=b.dataset.inc||b.dataset.dec, d=b.dataset.inc?1:-1, max=k==='adults'?8:6, min=k==='adults'?1:0;
  S[k]=Math.max(min, Math.min(max, S[k]+d)); renderDates(); renderPrice(); persist();
}));
$('#fElec').addEventListener('change', renderPrice);
$('#fEarly').addEventListener('change', renderPrice);

/* ---------- Booking request (no backend yet: the summary goes out by e-mail) ---------- */
/* an error about one field sits right under that field; problems with the date or the place stay above the button */
function formError(msg, sel, quiet){
  const err=$('#fErr'); $('#bookForm').querySelectorAll('[aria-invalid]').forEach(el=>{ el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  if(!msg){ err.hidden=true; return; }
  const el=sel ? $(sel) : null, own=el && el.closest('#bookForm'), at=own ? (el.closest('.row') || el.closest('label')) : null;
  if(at) at.insertAdjacentElement('afterend', err); else $('#sendBtn').insertAdjacentElement('beforebegin', err);
  err.classList.toggle('end', !!(at && at.classList.contains('c2') && el.closest('label')!==at.firstElementChild));   // the field in the right column: the text sits under it
  err.textContent=msg; err.hidden=false;
  if(own){ el.setAttribute('aria-invalid','true'); el.setAttribute('aria-describedby','fErr'); }
  if(el && !quiet) el.focus();
}
$('#bookForm').addEventListener('input', e=>{ if(e.target.getAttribute('aria-invalid')) formError(''); });
const phoneOk = v => v.replace(/\D/g,'').length>=7, mailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
[['#fPhone', phoneOk, 'Telefónne číslo je príliš krátke.'], ['#fMail', mailOk, 'E-mail nemá správny tvar, napríklad meno@domena.sk.']].forEach(a=>{
  $(a[0]).addEventListener('blur', ()=>{ const v=$(a[0]).value.trim(); if(v && !a[1](v)) formError(a[2], a[0], true); });
});
$('#bookForm').addEventListener('submit', e=>{
  e.preventDefault();
  const c=calc(), err=$('#fErr'), name=$('#fName').value.trim(), phone=$('#fPhone').value.trim(), mail=$('#fMail').value.trim();
  let problem='', focus=null;
  if(!c) problem='Vyberte termín a parcelu.';
  else if(!inSeason()){ problem='Termín je mimo sezóny 2026 (2. 4. – 15. 11.).'; focus='#dIn'; }
  else if(S.dIn<todayIso()){ problem='Dátum príchodu je v minulosti.'; focus='#dIn'; }
  else if(oneNightWeekend()){ problem='V hlavnej sezóne kemp neprijíma víkendové pobyty na 1 noc. Pridajte ďalšiu noc.'; focus='#dOut'; }
  else if(placeFree(S.parcel)<=0) problem='Vybrané miesto je v tomto termíne obsadené. Vyberte v mape iné.';
  else if(!name){ problem='Vyplňte meno a priezvisko.'; focus='#fName'; }
  else if(!phoneOk(phone)){ problem='Vyplňte telefónne číslo.'; focus='#fPhone'; }
  else if(!mailOk(mail)){ problem='Vyplňte platný e-mail, napríklad meno@domena.sk.'; focus='#fMail'; }
  else if(!$('#fRules').checked){ problem='Potvrďte súhlas s ubytovacím poriadkom.'; focus='#fRules'; }
  else if(!S.items.length) problem='Pridajte aspoň jedno vozidlo alebo stan, aby recepcia vedela, čo pre vás pripraviť.';
  if(problem){ formError(problem, focus); if(focus && !$(focus).closest('#bookForm')) toast(problem); return; }
  formError('');
  const code='PL-'+S.dIn.replace(/-/g,'').slice(2)+'-'+String(Math.floor(hash(name+mail+S.dIn)*9000)+1000);
  const t=c.info.type, note=$('#fNote').value.trim(), r=verdict(t, badMap(t));
  const lines=[
    'Žiadosť o rezerváciu '+code, 'Camping Pullmann, Piešťany', '',
    'Termín: '+rangeText()+' ('+c.n+' '+nightsWord(c.n)+')',
    'Miesto: '+c.info.label+' ('+(t.zone?sizeText(t):sizeText(t)+', '+m2(t.area))+', '+hookText(t)+')',
    'Posádka: '+crewText(),
    'Elektrina: '+(t.elec && $('#fElec').checked?'áno':'nie')+($('#fEarly').checked?'\nSkorý príchod alebo neskorý odchod: áno':''),
    'Vozidlá a výbava: '+S.items.map(o=>o.name+' '+num(o.L)+' × '+num(o.W)+' m').join(', '),
    'Zastavaná plocha: '+m2(r.used)+' z '+m2(t.area)+(r.v.c==='bad'?' (rozloženie treba doladiť)':''),
    'Predbežná cena: '+fmt(c.total), '',
    'Kontakt: '+name+', '+phone+', '+mail
  ].concat(note?['Poznámka: '+note]:[]).join('\n');
  S.sent={code:code}; persist();
  $('#bookForm').hidden=true; $('#st4').classList.add('done');
  const mailto='mailto:info@campingpiestany.sk?subject='+encodeURIComponent('Rezervácia '+code)+'&body='+encodeURIComponent(lines);
  $('#confirm').hidden=false;
  $('#confirm').innerHTML='<div class="confirm" tabindex="-1"><h3>Žiadosť '+code+' je pripravená</h3>'
    +'<p>Táto ukážka ešte nie je napojená na rezervačný systém kempu, žiadosť sa preto neodoslala. Skopírujte zhrnutie a pošlite ho na <b class="mono">info@campingpiestany.sk</b>. Rezervácia platí až po potvrdení recepciou.</p>'
    +'<pre class="sum">'+esc(lines)+'</pre><div class="btnrow"><button class="btn primary" type="button" id="copyBtn">Kopírovať zhrnutie</button><a class="btn" href="'+mailto+'">Otvoriť v e-maile</a><button class="btn" type="button" id="editBtn">Upraviť</button></div><p class="note">Tlačidlo e-mailu funguje len tam, kde je nastavený poštový program. Ak sa nič neotvorí, použite kopírovanie.</p></div>';
  $('#confirm .confirm').focus();
  $('#copyBtn').addEventListener('click', ()=>{
    const done=()=>{ $('#copyBtn').textContent='Skopírované'; }, fallback=()=>{ const rg=document.createRange(); rg.selectNodeContents($('#confirm pre')); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); $('#copyBtn').textContent='Označené, stlačte Ctrl+C'; };
    try{ navigator.clipboard.writeText(lines).then(done, fallback); }catch(err){ fallback(); }
  });
  $('#editBtn').addEventListener('click', ()=>{ $('#confirm').hidden=true; $('#bookForm').hidden=false; $('#st4').classList.remove('done'); S.sent=null; persist(); $('#fName').focus(); });
});

$('.skip').addEventListener('click', e=>{ e.preventDefault(); const m=$('#planovac'); m.focus({preventScroll:true}); m.scrollIntoView(); });

/* ---------- Boot ---------- */
function boot(){
  let hid=''; try{ hid=decodeURIComponent((location.hash||'').slice(1)); }catch(e){}   // a malformed hash must not stop the page
  if(hid && (PARCELS.some(p=>p.id===hid) || ZONES.some(z=>z.id===hid)) && placeFree(hid)>0) S.parcel=hid;
  if(S.parcel && placeFree(S.parcel)<=0) S.parcel=null;
  /* ?embed=1: the page sits inside the camp's own site, which brings its own header and footer */
  if(/[?&]embed(=1)?(&|$)/.test(location.search)) document.documentElement.classList.add('embed');
  renderDates(); initMapControls(); buildMap(); initQuick(); initPicker(); renderParcel(); renderPlan(); renderPrice();
  centerMap(); requestAnimationFrame(centerMap);
  /* the page was reloaded with the planner open: its history entry is still there, so open it again */
  try{ if(history.state && history.state.planner && S.parcel){ histOpen=true; openPlanner(); } }catch(e){}
}
if(hot && hot.ready) hot.ready(boot); else boot();
