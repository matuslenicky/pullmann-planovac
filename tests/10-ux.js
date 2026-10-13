// UX rules that are easy to break without noticing: 16 px fields and 44 px touch targets on a phone, the Back button closing
// the planner, undo after deleting, and form errors that sit under their field. A line with !BAD fails the scenario.
module.exports = async ({ev,nav,viewport,sleep,click,send}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  const check=(name,ok,detail)=>console.log((ok?'ok  ':'!BAD ')+name+(detail!==undefined?' '+(typeof detail==='string'?detail:JSON.stringify(detail)):''));
  const items=()=>ev(`JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>o.name).join(' | ')`);
  const st=async()=>JSON.parse(await ev(`JSON.stringify({open:!${q('#planner')}.hidden, len:history.length, bookTop:Math.round(${q('#sec-book')}.getBoundingClientRect().top)})`));
  const SIZES=`(()=>{ const vis=el=>{ const r=el.getBoundingClientRect(); return r.width>0 && r.height>0; };
    const scope=document.querySelector('#planner:not([hidden])')||document.body;
    const small=[...scope.querySelectorAll('button,a[href],input:not([type=checkbox]),select,summary,[role=button],label.toggle')].filter(vis).filter(el=>{ const r=el.getBoundingClientRect(); return (r.width<43.5||r.height<43.5) && getComputedStyle(el).display!=='inline' && !el.classList.contains('skip'); }).map(el=>el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+' '+Math.round(el.getBoundingClientRect().width)+'x'+Math.round(el.getBoundingClientRect().height));
    const fields=[...new Set([...scope.querySelectorAll('input:not([type=checkbox]),select')].filter(vis).map(el=>getComputedStyle(el).fontSize))];
    const tiny=[...scope.querySelectorAll('*')].filter(el=>vis(el) && [...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())).filter(el=>{ let f=parseFloat(getComputedStyle(el).fontSize); const svg=el.closest('svg'); if(svg && svg.viewBox && svg.viewBox.baseVal.width) f=f*svg.getBoundingClientRect().width/svg.viewBox.baseVal.width; return f<11.9; }).length;
    return JSON.stringify({small, fields, tiny}); })()`;

  await viewport(390,844,true,2,false); await nav(null,true); await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await setv('#qCat','suv'); await sleep(150);
  let m=JSON.parse(await ev(SIZES)); check('page: touch targets 44 px', !m.small.length, m.small); check('page: fields 16 px', m.fields.join()==='16px', m.fields); check('page: no text under 12 px', m.tiny===0, m.tiny);
  for (const w of [320,360,390]) { await viewport(w,800,true,2,false); await sleep(120); const o=JSON.parse(await ev(`JSON.stringify({over:document.documentElement.scrollWidth-innerWidth, clip:[...document.querySelectorAll('#dIn,#dOut')].map(el=>el.scrollWidth-el.clientWidth)})`)); check('dates fit at '+w+' px', o.over<=1 && o.clip.every(c=>c<=1), o); }
  await viewport(390,844,true,2,false); await sleep(150);

  // planner: opens on a click, the Back button closes it, the page stays where it was
  const len0=(await st()).len;
  await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="L"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`); await sleep(350);
  await click('#vAdd'); await sleep(100); await click('.tab[data-tab="gear"]'); await setv('#vCat','tableset'); await click('#vAdd'); await sleep(150);
  m=JSON.parse(await ev(SIZES)); check('planner: touch targets 44 px', !m.small.length, m.small); check('planner: fields 16 px', m.fields.join()==='16px', m.fields);
  check('planner: icons are drawn', await ev(`[...document.querySelectorAll('#obtools button,.zoom button,#plClose,#placedWrap .pr button')].every(b=>b.querySelector('svg.ico'))`));
  const two=await items();
  await ev(`document.querySelector('#placedWrap [data-del]').click()`); await sleep(120);
  check('delete offers undo', await ev(`!${q('#toast')}.hidden && !!${q('#toast button')}`), await items());
  await ev(`${q('#toast button')}.click()`); await sleep(120); check('undo brings the item back', (await items())===two, await items());
  await click('#clearBtn'); await sleep(100); await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))`); await sleep(120);
  check('Ctrl+Z after emptying', (await items())===two, await items());
  await ev(`document.querySelector('#placedWrap [data-del]').click()`); await sleep(100); await click('#vAdd'); await sleep(120); await ev(`${q('#toast button')}.click()`); await sleep(120);
  const kept=(await items()).split(' | '); check('undo keeps what was added meanwhile', kept.length===3 && two.split(' | ').every(n=>kept.includes(n)), kept.join(' | '));
  await ev(`document.querySelector('#placedWrap [data-del]').click()`); await sleep(100); await ev(`${q('#plDone')}.focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8}); await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8}); await sleep(80);
  check('the keyboard reaches the undo button', await ev(`!!document.activeElement.closest('#toast')`), await ev(`document.activeElement.tagName+'#'+document.activeElement.id`));
  await ev(`${q('#toast button')}.click()`); await sleep(120); check('focus stays in the planner after undo', await ev(`!!document.activeElement.closest('#planner')`));
  await ev('history.back()'); await sleep(400); let s=await st(); check('Back closes the planner', !s.open, s);
  for (let i=0;i<3;i++){ await click('#openPlanner'); await sleep(250); await click('#plClose'); await sleep(350); }
  s=await st(); check('history does not grow', !s.open && s.len<=len0+1, {len0, now:s.len});
  await click('#openPlanner'); await sleep(250); await ev(`${q('#plClose')}.click(); ${q('#openPlanner')}.click();`); await sleep(500); s=await st(); check('quick close and reopen keeps it open', s.open, s);
  await ev('history.back()'); await sleep(400); s=await st(); check('Back still closes it', !s.open, s);
  await ev('history.forward()'); await sleep(400); s=await st(); check('Forward opens the planner again', s.open, s);
  await click('#clearBtn'); await sleep(120); const tb=JSON.parse(await ev(`JSON.stringify({gap:Math.round(innerHeight-${q('#toast')}.getBoundingClientRect().bottom), hidden:${q('#toast')}.hidden})`)); check('toast sits low in the planner', !tb.hidden && tb.gap<40, tb);
  await ev(`${q('#toast button')}.click()`); await sleep(120);
  await ev('location.reload()'); await sleep(1200); s=await st(); check('a reload keeps the planner open', s.open, s);
  await ev('history.back()'); await sleep(400); s=await st(); check('Back closes it after the reload', !s.open, s);
  await click('#openPlanner'); await sleep(250); await click('#plDone'); await sleep(1300); s=await st(); check('Done lands on the booking', !s.open && Math.abs(s.bookTop)<40, s);

  // form: the error is under the field it is about and goes away on typing
  await click('#sendBtn'); await sleep(150);
  let e=JSON.parse(await ev(`JSON.stringify({txt:${q('#fErr')}.textContent, under:${q('#fErr')}.previousElementSibling.contains(${q('#fName')}), inv:${q('#fName')}.getAttribute('aria-invalid'), focus:document.activeElement.id})`));
  check('error under the name', e.under && e.inv==='true' && e.focus==='fName', e);
  await ev(`${q('#fElec')}.click()`); await sleep(80); check('a field error survives a price change', await ev(`!${q('#fErr')}.hidden`)); await ev(`${q('#fElec')}.click()`);
  await setv('#fName','Ján Testovací'); check('typing clears it', await ev(`${q('#fErr')}.hidden && !${q('#fName')}.hasAttribute('aria-invalid')`));
  await setv('#fMail','zle@'); await ev(`${q('#fMail')}.dispatchEvent(new FocusEvent('blur'))`); await sleep(80);
  check('bad e-mail is caught on leaving the field', await ev(`!${q('#fErr')}.hidden && ${q('#fErr')}.previousElementSibling.contains(${q('#fMail')}) && ${q('#fMail')}.getAttribute('aria-invalid')==='true'`));
  await setv('#fPhone','0911 201 089'); await setv('#fMail','jan@example.sk'); await ev(`${q('#fRules')}.checked=true`); await click('#sendBtn'); await sleep(200);
  check('booking goes through', await ev(`!${q('#confirm')}.hidden`), await ev(`${q('#fErr')}.textContent`));

  // keyboard: the skip link shows up on focus and lands on the content without changing the address
  await viewport(1400,900,false,1,false); await nav(null,false);
  await ev(`${q('.skip')}.focus()`); await sleep(80); const r=JSON.parse(await ev(`JSON.stringify(${q('.skip')}.getBoundingClientRect())`)); check('skip link visible on focus', r.left>=0 && r.height>=43.5, {left:Math.round(r.left), h:Math.round(r.height)});
  await ev(`${q('.skip')}.click()`); check('skip link lands on the content', await ev(`document.activeElement.id==='planovac' && !location.hash.includes('planovac')`));
  check('taken pitches are crossed out', await ev(`[...document.querySelectorAll('.plot.busy:not(.zone)')].every(g=>getComputedStyle(g.querySelector('.bx')).display!=='none') && [...document.querySelectorAll('.plot:not(.busy):not(.zone)')].every(g=>getComputedStyle(g.querySelector('.bx')).display==='none')`));
  await send('Emulation.setFocusEmulationEnabled',{enabled:false});
};
