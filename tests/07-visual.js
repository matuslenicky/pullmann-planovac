// visual pass: traced Touran in cards and plan, gear cards, sources list, mobile step 1 with cards
module.exports = async ({ev,shot,nav,viewport,sleep,click,base}) => {
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  await viewport(1400,900,false,1,false); await nav(null,true);
  await setv('#qCat','mpv'); await click('#qCards .card[data-mid="touran"]');
  await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="L"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
  await setv('#vCat','mpv');
  await click('.tab[data-tab="gear"]'); await setv('#vCat','tableset'); await click('#vCards .card[data-mid="set6"]'); await click('#vAdd');
  await setv('#vCat','tentfam'); await click('#vCards .card[data-mid="vail4"]'); await click('#vAdd');
  await setv('#vCat','relax'); await click('#vCards .card[data-mid="loungers2"]'); await click('#vAdd');
  await setv('#vCat','bike'); await click('#vCards .card[data-mid="cargobike"]'); await click('#vAdd');
  await sleep(200); await shot('h-planner-gear.png');
  await click('.tab[data-tab="veh"]'); await setv('#vCat','mpv'); await sleep(100); await shot('h-planner-mpv.png');
  await ev(`${q('#sources')}.open=true`); await ev(`${q('.pl-side')}.scrollTop=99999`); await sleep(150); await shot('h-sources.png');
  console.log('sources sample', await ev(`[...document.querySelectorAll('#srcList p')].slice(5,7).map(p=>p.innerText).join(' || ')`));
  console.log('links', await ev(`document.querySelectorAll('#srcList a').length`));
  await click('#plClose');
  await viewport(390,844,true,2,false); await nav(null,false);
  await ev(`${q('#sec-date')}.scrollIntoView()`); await sleep(200); await shot('h-mob-step1.png');
  await click('#openPlanner'); await sleep(300); await ev(`${q('.pl-side')}.scrollTop=0`); await shot('h-mob-planner.png');
  console.log('over', await ev(`JSON.stringify({sw:document.documentElement.scrollWidth, bad:[...document.querySelectorAll('.planner *')].filter(el=>{const r=el.getBoundingClientRect(); return r.width>0&&r.right>innerWidth+1;}).length})`));
};
