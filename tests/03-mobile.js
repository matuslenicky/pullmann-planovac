// mobile 390: page, step 1, map, planner, drag by touch, booking; plus zones, list view, recommend, date change
module.exports = async ({ev,shot,nav,viewport,sleep,click,send,base}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  const over=()=>ev(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:innerWidth, wide:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(); return r.width>0 && r.right>innerWidth+1 && !el.closest('.mapbox') && !el.closest('.top nav') && !el.closest('.listview') && getComputedStyle(el).position!=='fixed';}).slice(0,6).map(el=>el.tagName+'.'+(el.className.baseVal!==undefined?el.className.baseVal:el.className)+'#'+el.id)})`);
  await viewport(390,844,true,2,false); await nav(null,true);
  console.log('mob overflow', await over());
  await shot('c-mob-top.png');
  // recommend without anything chosen
  await click('#recBtn'); console.log('rec empty →', await ev(`${q('#toast')}.hidden ? 'no toast' : ${q('#toast')}.textContent`));
  // step 1: caravan
  await setv('#qCat','caravan'); await click('#qCards .card[data-mid="hobby495"]');
  await ev(`${q('#sec-date')}.scrollIntoView()`); await sleep(200); await shot('c-mob-step1.png');
  console.log('mob overflow step1', await over());
  // recommend
  await click('#recBtn'); await sleep(300);
  console.log('rec →', await ev(`JSON.stringify({toast:${q('#toast')}.textContent, parcel:${q('#plTitle')}.textContent, open:!${q('#planner')}.hidden, labels:[...document.querySelectorAll('#plan .lab')].map(g=>g.textContent)})`));
  await shot('c-mob-planner.png');
  // add a car + awning tent via planner
  await setv('#vCat','kombi'); await click('#vCards .card[data-mid="octaviacombi"]'); await click('#vAdd');
  await click('.tab[data-tab="gear"]'); await setv('#vCat','awningtent'); await click('#vCards .card[data-mid="rally330"]'); await click('#vAdd');
  console.log('items', await ev(`JSON.stringify(JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>[o.name,o.x,o.y,o.rot,o.host||null]))`), await ev(`${q('#meter .verdict')}.textContent`));
  await sleep(200); await shot('c-mob-planner2.png');
  // touch drag of the first object by 1 m to the right
  console.log('drag', await ev(`(()=>{const g=document.querySelector('#plan .ob'); const r=g.getBoundingClientRect(); const svg=document.querySelector('#plan svg'); const k=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width; const x=r.x+r.width/2, y=r.y+r.height/2;
    const before=JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>[o.x,o.y]);
    const f=(t,X,Y)=>g.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:X,clientY:Y,pointerId:7,isPrimary:true,pointerType:'touch'}));
    f('pointerdown',x,y); f('pointermove',x+k*0.5,y); f('pointermove',x+k*1,y); f('pointerup',x+k*1,y);
    const after=JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>[o.x,o.y]); return JSON.stringify({k:Math.round(k*10)/10,before,after,tools:!document.querySelector('#obtools').hidden});})()`));
  await ev(`${q('.pl-side')}.scrollTop=0`); await shot('c-mob-planner3.png');
  await ev(`${q('.pl-side')}.scrollTop=420`); await sleep(150); await shot('c-mob-planner4.png');
  console.log('planner overflow', await ev(`JSON.stringify([...document.querySelectorAll('.planner *')].filter(el=>{const r=el.getBoundingClientRect(); return r.width>0&&r.right>innerWidth+1;}).slice(0,6).map(el=>el.tagName+'.'+(el.className.baseVal!==undefined?el.className.baseVal:el.className)))`));
  await click('#plDone'); await sleep(800);
  // booking: errors then success
  await click('#sendBtn'); console.log('err1', await ev(`${q('#fErr')}.textContent`));
  await setv('#fName','Ján Tester'); await setv('#fPhone','+421 900 123 456'); await setv('#fMail','jan@example.com'); await ev(`${q('#fRules')}.checked=true`);
  await ev(`${q('#bookForm')}.requestSubmit()`); await sleep(200);
  console.log('confirm', await ev(`${q('#confirm')}.hidden ? 'hidden' : ${q('#confirm pre')}.textContent`));
  await ev(`${q('#sec-book')}.scrollIntoView()`); await sleep(200); await shot('c-mob-book.png');
  // date change that makes the parcel busy: search a date range
  console.log('date change', await ev(`(()=>{const S=JSON.parse(localStorage.getItem('pullmann-plan-v3')); const id=S.parcel; const dIn=document.querySelector('#dIn'); let res='none';
    for(let i=1;i<40;i++){ const d=new Date(S.dIn+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+i); const v=d.toISOString().slice(0,10); if(v>'2026-11-10') break; dIn.value=v; dIn.dispatchEvent(new Event('change',{bubbles:true}));
      const now=JSON.parse(localStorage.getItem('pullmann-plan-v3')); if(!now.parcel){ res='deselected at '+v+' · '+document.querySelector('#toast').textContent+' · title='+document.querySelector('#pTitle').textContent; break; } }
    return id+' → '+res;})()`));
  // list view
  await click('#viewToggle'); console.log('list', await ev(`${q('#listview')}.innerText.slice(0,400)`));
  await ev(`${q('#sec-map')}.scrollIntoView()`); await sleep(200); await shot('c-mob-list.png');
  console.log('final overflow', await over());
};
