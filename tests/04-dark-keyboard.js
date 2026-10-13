// dark theme (desktop + mobile), list view, keyboard, deep link, persisted state reload
module.exports = async ({ev,shot,nav,viewport,sleep,click,send,base}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  await viewport(1400,900,false,1,true); await nav(null,true);
  await setv('#qCat','campervan'); await click('#qCards .card[data-mid="california"]');
  await click('#viewToggle'); await sleep(100);
  await shot('d-dark-top.png', true);
  await click('#viewToggle');
  console.log('open', await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="M"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return g.dataset.id;})()`));
  await click('.tab[data-tab="gear"]'); await setv('#vCat','awning'); await click('#vAdd');
  await setv('#vCat','tentfam'); await click('#vCards .card[data-mid="vail4"]'); await click('#vAdd');
  await setv('#vCat','gazebo'); await click('#vCards .card[data-mid="eventm"]'); await click('#vAdd');
  await setv('#vCat','tableset'); await click('#vAdd');
  await setv('#vCat','bike'); await click('#vAdd'); await click('#vAdd');
  await setv('#vCat','relax'); await click('#vCards .card[data-mid="hammock"]'); await click('#vAdd');
  await sleep(200); await shot('d-dark-planner.png');
  // keyboard: select first row, arrows, R, Delete
  console.log('kbd', await ev(`(()=>{const key=(k,o)=>document.body.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{}))); const get=()=>JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>[o.uid,o.x,o.y,o.rot]);
    document.querySelector('.placed .pr').click(); const a=get(); key('ArrowRight'); key('ArrowDown',{shiftKey:true}); const b=get(); key('r'); const c=get(); const n0=get().length; document.querySelectorAll('.placed .pr')[5].click(); key('Delete'); const n1=get().length;
    return JSON.stringify({a:a.slice(0,2),b:b.slice(0,2),c:c.slice(0,2),n0,n1});})()`));
  await sleep(150); await shot('d-dark-planner2.png');
  // zoom + pan
  console.log('zoom', await ev(`(()=>{const vb=()=>document.querySelector('#plan svg').getAttribute('viewBox'); const a=vb(); document.querySelector('#zIn').click(); document.querySelector('#zIn').click(); const b=vb(); document.querySelector('#zReset').click(); return JSON.stringify({a,b,c:vb()});})()`));
  // Escape closes; focus returns
  console.log('esc', await ev(`(()=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return JSON.stringify({open:!document.querySelector('#planner').hidden, tip:!document.querySelector('#tip').hidden, hash:location.hash});})()`));
  // reload: state persists
  await nav(null,false);
  console.log('reload', await ev(`JSON.stringify({title:${q('#pTitle')}.textContent, items:JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.length, qcat:${q('#qCat')}.value, on:(${q('#qCards .card.on .nm')}||{}).textContent, total:${q('#price .total')}.innerText})`));
  // mobile dark
  await viewport(390,844,true,2,true); await nav(null,false);
  await click('#openPlanner'); await sleep(300); await shot('d-dark-mob-planner.png');
  await ev(`${q('.pl-side')}.scrollTop=10`);
  await click('#plClose'); await sleep(300); await ev(`${q('#sec-parcel')}.scrollIntoView()`); await sleep(200); await shot('d-dark-mob-parcel.png');
};
