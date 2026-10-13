// rules and edge cases
module.exports = async ({ev,shot,nav,viewport,sleep,click,send,base}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  const st=()=>ev(`JSON.stringify((()=>{const S=JSON.parse(localStorage.getItem('pullmann-plan-v3')); return {parcel:S.parcel, dIn:S.dIn, dOut:S.dOut, items:S.items.map(o=>o.name+' '+o.L+'x'+o.W+(o.primary?' P':''))};})())`);
  await viewport(1400,900,false,1,false); await nav(null,true);
  // busy parcel click
  console.log('busy click', await ev(`(()=>{const g=document.querySelector('.plot.busy'); if(!g) return 'no busy'; g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return JSON.stringify({id:g.dataset.id, toast:${q('#toast')}.textContent, tip:!${q('#tip')}.hidden, tipText:${q('#tip')}.innerText, planner:!${q('#planner')}.hidden});})()`));
  // quick search + Enter
  await setv('#qSearch','golf'); console.log('search golf', await ev(`JSON.stringify({cat:${q('#qCat')}.value, hit:(${q('#qCards .card.hit .nm')}||{}).textContent, on:(${q('#qCards .card.on .nm')}||{}).textContent})`));
  await ev(`${q('#qSearch')}.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`); console.log('enter', await st());
  await setv('#qSearch','karavan'); console.log('search karavan', await ev(`${q('#qCat')}.value`));
  await setv('#qSearch','xyzabc'); await ev(`${q('#qSearch')}.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`); console.log('unknown', await ev(`${q('#toast')}.textContent`));
  await setv('#qSearch','');
  // primary dims edit
  await setv('#qCat','hatch'); console.log('golf still primary, dims visible', await ev(`JSON.stringify({dimsHidden:${q('#qDims')}.hidden, L:${q('#qL')}.value})`));
  await setv('#qL','4.5'); console.log('edited', await st(), await ev(`${q('#qInfo')}.textContent`));
  // switch primary to a long motorhome with custom length 12 m → M should not fit
  await setv('#qCat','motorhome'); await click('#qCards .card[data-mid="hymerbml890"]'); await setv('#qL','11.5');
  console.log('long', await st(), await ev(`JSON.stringify({tag:${q('#mapTag')}.textContent, dimM:document.querySelectorAll('.plot[data-type="M"].dim').length, dimL:document.querySelectorAll('.plot[data-type="L"].dim').length, dimV:document.querySelectorAll('.plot[data-type="V"].dim').length})`));
  await click('#recBtn'); await sleep(200); console.log('rec long', await ev(`JSON.stringify({toast:${q('#toast')}.textContent, planner:!${q('#planner')}.hidden, title:${q('#plTitle')}.textContent, verdict:${q('#meter .verdict')}.textContent})`));
  await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await click('#qClear'); console.log('cleared', await st(), await ev(`JSON.stringify({cat:${q('#qCat')}.value, cardsHidden:${q('#qCards')}.hidden})`));
  // filters
  await click('#fType [data-f="L"]'); console.log('filter L', await ev(`JSON.stringify({dim:document.querySelectorAll('.plot.dim').length, total:document.querySelectorAll('.plot').length, tag:${q('#mapTag')}.textContent})`));
  await click('#fType [data-f="all"]'); console.log('filter all', await ev(`JSON.stringify({dim:document.querySelectorAll('.plot.dim').length, gone:['#fFit','#fWater','#fFree'].filter(s=>document.querySelector(s)).length, tag:${q('#mapTag')}.textContent})`));
  // select a free M parcel, then find a date where it becomes busy
  console.log('date→busy', await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="M"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true})); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const id=g.dataset.id, dIn=document.querySelector('#dIn'); const S0=JSON.parse(localStorage.getItem('pullmann-plan-v3'));
    for(let i=1;i<25;i++){ const d=new Date(S0.dIn+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+i); dIn.value=d.toISOString().slice(0,10); dIn.dispatchEvent(new Event('change',{bubbles:true})); const S=JSON.parse(localStorage.getItem('pullmann-plan-v3')); if(!S.parcel) return id+' deselected on '+S.dIn+' | toast: '+document.querySelector('#toast').textContent+' | title: '+document.querySelector('#pTitle').textContent+' | send disabled: '+document.querySelector('#sendBtn').disabled+' | hash: '+location.hash; }
    return id+' never busy';})()`));
  // high season + one-night weekend (Friday 10. 7. 2026)
  await setv('#dIn','2026-07-10'); await setv('#dOut','2026-07-11'); console.log('1 night weekend', await ev(`${q('#dateInfo')}.textContent`));
  await setv('#dOut','2026-07-19'); console.log('9 nights', await ev(`${q('#dateInfo')}.textContent`));
  await setv('#qCat','kombi'); await click('#qCards .card[data-mid="passat"]');
  console.log('pick L', await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="L"]')].find(g=>!g.classList.contains('busy')); if(!g) return 'no L'; g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return g.dataset.id;})()`));
  await click('#vCards .card[data-mid="octaviacombi"]'); await setv('#vCat','trailer'); await click('#vAdd'); await setv('#vCat','moto'); await click('#vAdd');
  await click('#plDone'); await sleep(600);
  await ev(`(()=>{['adults','kids','dogs'].forEach(k=>document.querySelector('[data-inc="'+k+'"]').click()); const e=${q('#fEarly')}; e.checked=true; e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  console.log('price', await ev(`${q('#price')}.innerText`));
  // deep link to a zone, shape setting
  await nav('about:blank', false); await nav(base+'#VS2', false);   // a hash change alone does not reload the page
  console.log('deep link', await ev(`JSON.stringify({title:${q('#pTitle')}.textContent, planner:!${q('#planner')}.hidden})`));
  await click('#openPlanner'); await ev(`${q('#settings')}.open=true`);
  console.log('zone', await ev(`JSON.stringify({shapeHidden:${q('#sShapeWrap')}.hidden, vb:${q('#plan svg')}.getAttribute('viewBox'), meta:${q('#plMeta')}.textContent, verdict:${q('#meter .verdict')}.textContent, note:${q('#meter .note')}.textContent})`));
  await setv('#sShape','c'); console.log('shape c', await ev(`JSON.stringify({vb:${q('#plan svg')}.getAttribute('viewBox'), dims:[...document.querySelectorAll('#plan .dim')].map(t=>t.textContent)})`));
  await ev(`${q('#sources')}.open=true`); await sleep(100); console.log('sources', await ev(`JSON.stringify({groups:document.querySelectorAll('#srcList p').length, first:${q('#srcList p')}.innerText.slice(0,120)})`));
  await sleep(100); await shot('e-zone.png');
  // focus trap: Tab from last focusable goes to first
  console.log('trap', await ev(`(()=>{const f=[...document.querySelector('#planner').querySelectorAll('button,select,input,summary,a[href],[tabindex="0"]')].filter(el=>!el.disabled && el.offsetParent!==null); f[f.length-1].focus(); const e=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}); document.activeElement.dispatchEvent(e); return JSON.stringify({n:f.length, prevented:e.defaultPrevented, active:document.activeElement.id||document.activeElement.className});})()`));
};
