// deep link, zone shapes, over-limit, deselect when the chosen parcel becomes busy
module.exports = async ({ev,shot,nav,viewport,sleep,click,send,base}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  const HASH=`const hash=s=>{let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0)/4294967295;};`;
  await viewport(1400,900,false,1,false); await nav(null,true);
  // deselect: choose a parcel that is free now and find a later single night when it is busy
  console.log('deselect', await ev(`(()=>{${HASH} const S0=JSON.parse(localStorage.getItem('pullmann-plan-v3')||'{}'); const dIn=document.querySelector('#dIn'), dOut=document.querySelector('#dOut');
    const free=[...document.querySelectorAll('.plot:not(.zone):not(.busy)')].map(g=>g.dataset.id); let pick=null;
    for(const id of free){ for(let i=5;i<25&&!pick;i++){ const d=new Date(dIn.value+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+i); const v=d.toISOString().slice(0,10); if(v<'2026-11-14' && hash(id+'|'+v)<=0.28) pick={id,v}; } if(pick) break; }
    if(!pick) return 'no candidate';
    document.querySelector('.plot[data-id="'+pick.id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true})); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const before=document.querySelector('#pTitle').textContent, h0=location.hash;
    dIn.value=pick.v; dIn.dispatchEvent(new Event('change',{bubbles:true}));
    const S=JSON.parse(localStorage.getItem('pullmann-plan-v3'));
    return JSON.stringify({pick, before, h0, parcelAfter:S.parcel, title:document.querySelector('#pTitle').textContent, toast:document.querySelector('#toast').textContent, hash:location.hash, send:document.querySelector('#sendBtn').disabled, selCls:document.querySelectorAll('.plot.sel').length, openBtnHidden:document.querySelector('#openPlanner').hidden});})()`));
  // deep link (needs a real reload)
  await nav('about:blank', false); await nav(base+'#VS2', false);
  console.log('deep link', await ev(`JSON.stringify({title:${q('#pTitle')}.textContent, planner:!${q('#planner')}.hidden, sel:(document.querySelector('.plot.sel')||{dataset:{}}).dataset.id, free:${q('.plot[data-id="VS2"] .zcount')}.textContent})`));
  await nav('about:blank', false); await nav(base+'#NOPE', false);
  console.log('bad link', await ev(`${q('#pTitle')}.textContent`));
  // zone planner
  await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="V"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
  await setv('#vCat','motorhome'); await click('#vCards .card[data-mid="sunlightt58"]'); await click('#vAdd');
  await click('.tab[data-tab="gear"]'); await setv('#vCat','awning'); await click('#vCards .card[data-mid="f45s260"]'); await click('#vAdd');
  await ev(`${q('#settings')}.open=true`);
  console.log('zone a', await ev(`JSON.stringify({shapeHidden:${q('#sShapeWrap')}.hidden, meta:${q('#plMeta')}.textContent, verdict:${q('#meter .verdict')}.textContent, note:${q('#meter .note')}.textContent, meter:${q('#meter .lbl')}.textContent})`));
  await shot('f-zone-a.png');
  await setv('#sShape','c'); await click('#autoBtn');
  console.log('zone c', await ev(`JSON.stringify({dims:[...document.querySelectorAll('#plan .dim')].map(t=>t.textContent), verdict:${q('#meter .verdict')}.textContent})`));
  await sleep(100); await shot('f-zone-c.png');
  // exceed 50 m²: add a big tent and gazebo
  await setv('#vCat','tentfam'); await click('#vCards .card[data-mid="tent6"]'); await click('#vAdd');
  await setv('#vCat','gazebo'); await click('#vCards .card[data-mid="eventxl"]'); await click('#vAdd');
  console.log('over', await ev(`JSON.stringify({verdict:${q('#meter .verdict')}.textContent, meter:${q('#meter .lbl')}.textContent, tags:[...document.querySelectorAll('#vCards .tg')].map(x=>x.textContent)})`));
  await shot('f-zone-over.png');
  await click('#plDone'); await sleep(600);
  console.log('summary', await ev(`${q('#summ')}.innerText`));
};
