// first look: page loads, step 1 picker, map, planner
module.exports = async ({ev,shot,nav,viewport,sleep,click,base}) => {
  await viewport(1400,900,false,1,false); await nav(null,true);
  console.log('boot', await ev(`JSON.stringify({opts:document.querySelectorAll('#qCat option').length, plots:document.querySelectorAll('.plot').length, tag:document.querySelector('#mapTag').textContent, dates:[document.querySelector('#dIn').value,document.querySelector('#dOut').value], info:document.querySelector('#dateInfo').textContent})`));
  console.log('pick suv', await ev(`(()=>{const s=document.querySelector('#qCat'); s.value='suv'; s.dispatchEvent(new Event('change',{bubbles:true})); return document.querySelectorAll('#qCards .card').length;})()`));
  await click('#qCards .card[data-mid="kodiaq"]');
  console.log('primary', await ev(`JSON.stringify({on:document.querySelector('#qCards .card.on .nm').textContent, info:document.querySelector('#qInfo').textContent, dims:[document.querySelector('#qL').value,document.querySelector('#qW').value], tag:document.querySelector('#mapTag').textContent})`));
  await shot('a-desk-top.png', true);
  // click a free parcel
  console.log('parcel', await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="L"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true})); return JSON.stringify({id:g.dataset.id, open:!document.querySelector('#planner').hidden, title:document.querySelector('#plTitle').textContent, meta:document.querySelector('#plMeta').textContent, obs:document.querySelectorAll('#plan .ob').length, cards:document.querySelectorAll('#vCards .card').length, tags:[...document.querySelectorAll('#vCards .tg')].map(x=>x.textContent)});})()`));
  await sleep(300); await shot('a-desk-planner.png');
};
