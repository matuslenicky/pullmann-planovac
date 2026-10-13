// exhaustive: every category and every model in the planner (cards render, add works, no NaN), plus step-1 categories
module.exports = async ({ev,shot,nav,viewport,sleep,click,base}) => {
  await viewport(1400,900,false,1,false); await nav(null,true);
  console.log('step1 cats', await ev(`(()=>{const sel=document.querySelector('#qCat'); const out=[]; [...sel.options].forEach(o=>{ if(!o.value) return; sel.value=o.value; sel.dispatchEvent(new Event('change',{bubbles:true})); const cards=[...document.querySelectorAll('#qCards .card')]; const bad=document.querySelector('#qCards').innerHTML.match(/NaN|undefined|Infinity/g); out.push(o.value+':'+cards.length+(bad?'!BAD':'')); cards[cards.length-1].click(); }); return out.join(' ');})()`));
  console.log('primary now', await ev(`JSON.parse(localStorage.getItem('pullmann-plan-v3')).items.map(o=>o.name).join(', ')`));
  await ev(`(()=>{const g=[...document.querySelectorAll('.plot[data-type="XL"]')].find(g=>!g.classList.contains('busy'))||[...document.querySelectorAll('.plot[data-type="L"]')].find(g=>!g.classList.contains('busy')); g.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
  console.log('planner all', await ev(`(()=>{const out=[]; let total=0; ['veh','gear'].forEach(tab=>{ document.querySelector('.tab[data-tab="'+tab+'"]').click(); const sel=document.querySelector('#vCat'); [...sel.options].map(o=>o.value).forEach(v=>{ sel.value=v; sel.dispatchEvent(new Event('change',{bubbles:true}));
      const mids=[...document.querySelectorAll('#vCards .card')].map(c=>c.dataset.mid); let bad=(document.querySelector('#vCards').innerHTML.match(/NaN|undefined|Infinity/g)||[]).length;
      mids.forEach(mid=>{ document.querySelector('#vCards .card[data-mid="'+mid+'"]').click(); const L=document.querySelector('#vL').value, W=document.querySelector('#vW').value; if(!(parseFloat(L)>0&&parseFloat(W)>0)) bad++; document.querySelector('#vAdd').click(); total++; });
      bad+=(document.querySelector('#plan').innerHTML.match(/NaN|undefined|Infinity/g)||[]).length; out.push(v+':'+mids.length+(bad?'!BAD'+bad:''));
      document.querySelector('#clearBtn').click(); }); });
    return out.join(' ')+' | added '+total;})()`));
  // everything at once for a stress screenshot
  await ev(`(()=>{ document.querySelector('.tab[data-tab="veh"]').click(); const sel=document.querySelector('#vCat'); ['motorhome','suv','trailer','moto'].forEach(v=>{ sel.value=v; sel.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#vAdd').click(); });
    document.querySelector('.tab[data-tab="gear"]').click(); const s2=document.querySelector('#vCat'); ['awning','tent23','gazebo','tableset','grill','bike','pool','relax','rooftent'].forEach(v=>{ s2.value=v; s2.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#vAdd').click(); }); document.querySelector('#autoBtn').click(); })()`);
  await sleep(250); await shot('i-stress.png');
  console.log('stress', await ev(`JSON.stringify({n:document.querySelectorAll('#plan .ob').length, bad:document.querySelectorAll('#plan .ob.bad').length, verdict:document.querySelector('#meter .verdict').textContent, meter:document.querySelector('#meter .lbl').textContent})`));
};
