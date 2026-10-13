// the file as a friend would get it: other folder (spaces, diacritics), no internet, fresh browser state, desktop and phone
module.exports = async ({ev,shot,nav,viewport,sleep,click,send,logs,base}) => {
  const URL='file:///'+encodeURI((process.env.SHARED||require('path').resolve(__dirname,'..','Pullmann-planovac.html')).replace(/\\/g,'/'));   // SHARED=<path> tests a copy somewhere else
  const q=(sel)=>`document.querySelector(${JSON.stringify(sel)})`;
  const setv=(sel,v)=>ev(`(()=>{const el=${q(sel)}; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`);
  await send('Network.enable'); await send('Log.enable');
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  for(const [name,w,h,mob] of [['m-desk',1400,900,false],['m-mob',390,844,true]]){
    await viewport(w,h,mob,mob?2:1,false); await nav(URL,true);
    console.log(name,'boot', await ev(`JSON.stringify({url:location.href.slice(-40), doctype:document.doctype&&document.doctype.name, headKids:document.head.children.length, bodyFirst:document.body.firstElementChild.className, plots:document.querySelectorAll('.plot').length, demo:!!document.querySelector('.demo'), font:getComputedStyle(document.querySelector('h1')).fontFamily.slice(0,30), fontsLoaded:document.fonts.check('16px Jost'), sw:document.documentElement.scrollWidth, robots:(document.querySelector('meta[name=robots]')||{}).content})`));
    await setv('#qCat','caravan'); await click('#qCards .card[data-mid="hobby495"]');
    await click('#recBtn'); await sleep(250);
    await setv('#vCat','kombi'); await click('#vAdd');
    await click('.tab[data-tab="gear"]'); await setv('#vCat','awningtent'); await click('#vAdd'); await setv('#vCat','tableset'); await click('#vAdd');
    console.log(name,'planner', await ev(`JSON.stringify({title:${q('#plTitle')}.textContent, obs:document.querySelectorAll('#plan .ob').length, verdict:${q('#meter .verdict')}.textContent})`));
    await sleep(150); await shot(name+'-planner.png');
    await click('#plDone'); await sleep(700);
    await setv('#fName','Test Kamoš'); await setv('#fPhone','0900 123 456'); await setv('#fMail','kamos@example.com'); await ev(`${q('#fRules')}.checked=true`);
    await ev(`${q('#bookForm')}.requestSubmit()`); await sleep(200);
    console.log(name,'booking', await ev(`${q('#confirm')}.hidden ? 'HIDDEN: '+${q('#fErr')}.textContent : ${q('#confirm pre')}.textContent.split('\\n').slice(0,5).join(' | ')`));
    await nav(URL,false);
    console.log(name,'after reload', await ev(`JSON.stringify({title:${q('#pTitle')}.textContent, total:(${q('#price .total')}||{innerText:'-'}).innerText, sw:document.documentElement.scrollWidth, iw:innerWidth})`));
    await shot(name+'-top.png');
  }
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
};
