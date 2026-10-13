// planner flows: gear tab, attach, rotate, dup, delete, search, custom size, auto layout, zones
module.exports = async ({ev,shot,nav,viewport,sleep,click,base}) => {
  await viewport(1400,900,false,1,false); await nav(null,true);
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  const state=()=>ev(`JSON.stringify({obs:[...document.querySelectorAll('#plan .ob')].map(g=>g.dataset.uid+(g.classList.contains('bad')?'!':'')+(g.classList.contains('sel')?'*':'')), rows:[...document.querySelectorAll('.placed .pr')].map(r=>r.querySelector('b').textContent+' '+r.querySelector('.dm').textContent), meter:document.querySelector('#meter .lbl').textContent, verdict:document.querySelector('#meter .verdict').textContent})`);
  // motorhome as primary, then parcel XL
  await setv('#qCat','motorhome'); await click('#qCards .card[data-mid="caradoa464"]');
  console.log('open', await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="XL"]')].find(g=>!g.classList.contains('busy')); if(!g) return 'no free XL'; g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return g.dataset.id;})()`));
  console.log('s0', await state());
  // gear tab → awning → add (should attach to the right-hand side of the motorhome)
  await click('.tab[data-tab="gear"]'); await setv('#vCat','awning'); await click('#vCards .card[data-mid="f45s350"]'); await click('#vAdd');
  console.log('awning', await ev(`JSON.stringify((()=>{const S=JSON.parse(localStorage.getItem('pullmann-plan-v3')); return S.items.map(o=>({n:o.name,x:o.x,y:o.y,rot:o.rot,L:o.L,W:o.W,host:o.host}));})())`));
  // car + roof tent
  await click('.tab[data-tab="veh"]'); await setv('#vSearch','kodiaq'); console.log('search→', await ev(`JSON.stringify({cat:${q('#vCat')}.value, on:${q('#vCards .card.on .nm')}.textContent, L:${q('#vL')}.value})`));
  await click('#vAdd'); await setv('#vSearch','');
  await click('.tab[data-tab="gear"]'); await setv('#vCat','rooftent'); await click('#vCards .card[data-mid="kukenam3"]'); await click('#vAdd');
  await setv('#vCat','tableset'); await click('#vCards .card[data-mid="set4"]'); await click('#vAdd');
  await setv('#vCat','grill'); await click('#vCards .card[data-mid="mastertouch"]'); await click('#vAdd');
  console.log('s1', await state());
  await sleep(200); await shot('b-planner-full.png');
  // rotate selected (grill) and duplicate, delete
  await click('#obtools [data-act="rot"]'); await click('#obtools [data-act="dup"]'); console.log('after rot+dup', await state());
  await click('#obtools [data-act="del"]'); console.log('after del', await state());
  // custom name + size
  await click('.tab[data-tab="veh"]'); await setv('#vCat','caravan'); await click('#vCards .card[data-mid="hobby495"]'); await setv('#vSearch','Adria Altea 552'); await setv('#vL','7.3'); await click('#vAdd');
  console.log('custom', await state());
  await click('#autoBtn'); console.log('auto', await state()); await sleep(200); await shot('b-planner-auto.png');
  // settings: labels numbers, clear 0.5, road left
  await ev(`${q('#settings')}.open=true`); await setv('#sLabels','numbers'); await setv('#sClear','0.5'); await setv('#sRoad','left');
  console.log('settings', await ev(`JSON.stringify({badges:document.querySelectorAll('#plan .lb').length, clear:!!document.querySelector('#plan .clear')})`), await state());
  await shot('b-planner-set.png');
  await click('#plDone'); await sleep(700);
  console.log('after done', await ev(`JSON.stringify({open:!${q('#planner')}.hidden, price:${q('#price')}.innerText, bsum:${q('#bsum')}.innerText, summ:${q('#summ')}.innerText})`));
  await shot('b-after.png', true);
};
