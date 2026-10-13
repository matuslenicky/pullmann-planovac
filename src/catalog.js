/* ===== Catalogue: every category offers three models to compare. Real dimensions are merged in from DIMS (dims.js). =====
   p = drawing parameters of the model (see draw.js); x = roof and wall fittings, positions in metres from the front. */
const CATALOG = [
  /* ---------------- vehicles ---------------- */
  {id:'small', tab:'veh', name:'Malé auto', kw:'mestske city mini male', draw:'car', models:[
    {id:'fiat500', name:'Fiat 500', body:'small', p:{nb:.2,rcF:.48,rcR:.38,tf:.1,tr:.09,cowl:.2,ws:.72,rw:.34,pil:[.6],roof:.76}},
    {id:'yaris', name:'Toyota Yaris', body:'small', p:{cowl:.3,ws:.82,pil:[.42,.86],sg:.35}},
    {id:'fabia', name:'Škoda Fabia', body:'hatch', p:{td:.62}}]},
  {id:'hatch', tab:'veh', name:'Hatchback', kw:'kompakt', draw:'car', models:[
    {id:'golf', name:'VW Golf', body:'hatch'},
    {id:'ceed', name:'Kia Ceed', body:'hatch', p:{cowl:.38}},
    {id:'scala', name:'Škoda Scala', body:'hatch', p:{rw:.48,sg:.5}}]},
  {id:'sedan', tab:'veh', name:'Sedan a liftback', kw:'limuzina', draw:'car', models:[
    {id:'octavia', name:'Škoda Octavia', body:'lift'},
    {id:'model3', name:'Tesla Model 3', body:'sedan', p:{glassroof:1,cowl:.3,ws:1.06,rw:.82,deck:.36,nb:.14,rcF:.4,hg:.18,sg:.4,pil:[.46]}},
    {id:'superb', name:'Škoda Superb', body:'lift', p:{rw:.9,deck:.32}}]},
  {id:'kombi', tab:'veh', name:'Kombi', kw:'combi variant sportswagon touring', draw:'car', models:[
    {id:'ceedsw', name:'Kia Ceed SW', body:'kombi'},
    {id:'octaviacombi', name:'Škoda Octavia Combi', body:'kombi'},
    {id:'passat', name:'VW Passat Variant', body:'kombi'}]},
  {id:'suv', tab:'veh', name:'SUV', kw:'crossover terenne offroad 4x4', draw:'car', models:[
    {id:'duster', name:'Dacia Duster', body:'suv', p:{rcF:.3,rcR:.22,cowl:.36,tf:.045}},
    {id:'kodiaq', name:'Škoda Kodiaq', body:'suv'},
    {id:'x5', name:'BMW X5', body:'suv', p:{cowl:.58,ws:.8,td:.78,tw:.28,nb:.12}}]},
  {id:'mpv', tab:'veh', name:'MPV', kw:'rodinne van sedemmiestne', draw:'car', models:[
    {id:'touran', name:'VW Touran', draw:'raw', raw:'touran', osrc:'https://openclipart.org/detail/338016/volkswagen-touran-2018'},
    {id:'jogger', name:'Dacia Jogger', body:'mpv', p:{cowl:.3,ws:.9,rails:1,rw:.34,deck:.12,roof:.76,belt:.9}},
    {id:'sharan', name:'VW Sharan', body:'mpv', p:{slide:1,rails:1}}]},
  {id:'pickup', tab:'veh', name:'Pick-up', kw:'pickup', draw:'car', models:[
    {id:'hilux', name:'Toyota Hilux', body:'pickup'},
    {id:'ranger', name:'Ford Ranger', body:'pickup'},
    {id:'ram1500', name:'RAM 1500', body:'pickup', p:{td:.84,tw:.3,cowl:.55,ws:.7,mir:.18}}]},
  {id:'van', tab:'veh', name:'Dodávka', kw:'uzitkove kastlik transit ducato', draw:'van', models:[
    {id:'caddy', name:'VW Caddy Cargo', p:{cab:.95,cowl:.22,ws:.9,belt:.93,roof:.84,mir:.14,td:.64,slide:.8,ribs:.4,barn:1}},
    {id:'transporter', name:'VW Transporter', p:{cab:.95,cowl:-.02,ws:.74,slide:1.0,ribs:.45}},
    {id:'sprinter', name:'Mercedes Sprinter', p:{cab:1.05,ws:.72,tf:.1,slide:1.3,ribs:.5,barn:1}}]},
  {id:'minibus', tab:'veh', name:'Minibus', kw:'autobus mikrobus bus', draw:'van', models:[
    {id:'transitbus', name:'Ford Transit Minibus', p:{cab:1.05,cowl:-.05,belt:.965,roof:.86,twin:1,win:[[2.25,3.3],[3.4,4.45],[4.55,5.6],[5.7,6.45]],x:[['sky',3.5,0,.6],['ac',4.5,1.0,.9],['door',2.3,.95]]}},
    {id:'sprintertransfer', name:'Mercedes Sprinter Transfer 45', p:{cab:1.05,tf:.1,belt:.965,roof:.86,twin:1,win:[[2.2,3.2],[3.3,4.3],[4.4,5.4],[5.5,6.5],[6.6,7.1]],x:[['sky',3.2,0,.6],['ac',5.0,1.2,1.0],['door',2.25,.95]]}},
    {id:'sprintercity', name:'Mercedes Sprinter City 75', p:{cab:1.05,tf:.1,belt:.965,roof:.86,twin:1,win:[[2.2,3.3],[3.4,4.5],[4.6,5.7],[5.8,6.9],[7.0,8.1]],x:[['sky',3.0,0,.6],['sky',6.6,0,.6],['ac',4.4,1.3,1.0],['door',3.55,1.25],['door',6.95,.8]]}}]},
  {id:'campervan', tab:'veh', name:'Kempingový van', kw:'obytna dodavka kastlik california vanlife', draw:'van', models:[
    {id:'california', name:'VW California', p:{cab:.95,cowl:-.02,ws:.74,slide:1.0,win:[[2.3,3.25],[3.35,4.6]],x:[['pop',1.8,4.6],['awn',1.95,2.6]]}},
    {id:'summit600', name:'Pössl Summit 600', p:{cab:1.0,cowl:-.1,ws:.76,slide:1.25,barn:1,winL:[[2.9,3.8],[4.9,5.7]],winR:[[4.9,5.7]],x:[['sky',2.45,0,.7,.5],['sky',3.9,0,.4],['sky',5.25,0,.4],['awn',2.2,3.5]]}},
    {id:'boxstar630', name:'Knaus BoxStar 630', p:{cab:1.0,cowl:-.1,ws:.76,slide:1.25,barn:1,winL:[[2.9,3.8],[5.0,6.0]],winR:[[5.0,6.0]],x:[['sky',2.45,0,.7,.5],['sky',4.0,0,.4],['sky',5.5,0,.7,.5],['awn',2.2,4.0]]}}]},
  {id:'motorhome', tab:'veh', name:'Obytné auto', kw:'obytnak karavan integral polointegral alkovna camper', draw:'motorhome', models:[
    {id:'sunlightt58', name:'Sunlight T 58', layout:'semi', p:{x:[['sky',2.35,0,.9,.6],['sky',3.75,0,.7,.5],['sky',5.2,.35,.4],['vent',5.2,-.55],['awn',2.5,3.0],['door',3.95,.6],['win',2.75,.9],['winL',2.7,1.0],['winL',4.6,.9]]}},
    {id:'caradoa464', name:'Carado A 464', layout:'alcove', p:{x:[['sky',3.5,0,.7,.5],['sky',5.0,0,.4],['sky',6.4,0,.4],['vent',4.3,.6],['awn',2.7,4.0],['door',3.35,.6],['win',4.3,.9],['winL',2.6,1.0],['winL',5.3,.9],['win',1.2,.8],['winL',1.2,.8],['line',6.05]]}},
    {id:'hymerbml890', name:'Hymer B-ML I 890', layout:'int', p:{tandem:.82,x:[['sky',2.0,0,.9,.6],['sky',4.2,0,.7,.5],['sky',6.1,.4,.4],['sky',8.0,0,.7,.5],['dish',5.3,-.2],['solar',6.05,-.6,1.4,.6],['awn',2.2,5.0],['door',3.0,.65],['win',4.2,1.1],['winL',2.4,1.2],['winL',4.6,1.0],['winL',7.4,.9],['win',7.4,.9]]}}]},
  {id:'caravan', tab:'veh', name:'Karavan', kw:'obytny prives hobby adria', draw:'caravan', models:[
    {id:'troll530', name:'Eriba Touring 530', p:{pop:1,rcF:.5,rcR:.45,bow:.2,fw:.55,rwin:.5,x:[['door',2.6,.55],['win',.9,.8],['winL',.9,.8],['winL',2.8,.9]]}},
    {id:'hobby495', name:'Hobby De Luxe 495 UL', p:{locker:1,rwin:.6,x:[['sky',1.7,0,.7,.5],['sky',4.4,0,.5],['vent',3.2,.6],['door',3.4,.6],['win',1.0,1.0],['winL',1.0,1.0],['winL',3.9,1.2],['win',4.5,.9]]}},
    {id:'hobby720', name:'Hobby Prestige 720 KWFU', p:{locker:1,rwin:.6,x:[['sky',1.7,0,.7,.5],['sky',3.9,0,.9,.6],['sky',6.2,0,.5],['vent',5.2,.7],['door',4.3,.6],['win',1.0,1.0],['winL',1.0,1.0],['win',2.9,1.0],['winL',3.2,1.3],['winL',5.9,1.0],['win',6.0,.9]]}}]},
  {id:'trailer', tab:'veh', name:'Prívesný vozík', kw:'privesny vozik privesok', draw:'trailer', models:[
    {id:'handy7', name:'Agados Handy 7'},
    {id:'trailermid', name:'Humbaur HA 132513', p:{jockey:1}},
    {id:'trailertandem', name:'Humbaur HA 203015', p:{jockey:1}}]},
  {id:'moto', tab:'veh', name:'Motorka', kw:'motocykel skuter', draw:'moto', models:[
    {id:'vespa', name:'Vespa GTS 300', type:'scooter', fa:.27, td:.48},
    {id:'r1250gs', name:'BMW R 1250 GS', type:'adv', fa:.36, td:.65},
    {id:'goldwing', name:'Honda Gold Wing Tour', type:'tourer', fa:.34, td:.63}]},

  /* ---------------- tents and gear ---------------- */
  {id:'tent23', tab:'gear', name:'Stan pre 2–3 osoby', kw:'stan maly turisticky', draw:'tentDome', models:[
    {id:'q2seconds', name:'Quechua 2 Seconds', draw:'tentPop', p:{il:2.1,iw:1.2,n:2}},
    {id:'darwin3', name:'Coleman Darwin 3', p:{v:.6,n:3}},
    {id:'bizon3', name:'Husky Bizon 3 Classic', p:{v:1.1,n:3,iw:2.15}}]},
  {id:'tentfam', tab:'gear', name:'Rodinný stan', kw:'stan velky tunelovy', draw:'tentTunnel', models:[
    {id:'arpenaz41', name:'Quechua Arpenaz 4.1', p:{bd:2.1,bw:2.4,rooms:1,n:4,arches:3}},
    {id:'vail4', name:'Coleman Vail 4', p:{bd:2.1,bw:2.8,rooms:2,n:4,arches:4,can:.95}},
    {id:'tent6', name:'Coleman Vail 6', p:{bd:2.1,bw:3.6,rooms:3,n:6,arches:4,can:.7}}]},
  {id:'rooftent', tab:'gear', name:'Strešný stan', kw:'stan na aute autostan', draw:'rooftent', layer:'roof', attach:'roof', hosts:['car','van'], pad:.9, models:[
    {id:'foothill', name:'Thule Tepui Foothill', p:{fold:'y',cw:.61}},
    {id:'kukenam3', name:'Thule Tepui Kukenam 3', p:{fold:'x'}},
    {id:'skycamp', name:'iKamper Skycamp 3.0', p:{fold:'y',hard:1,cw:1.391}}]},
  {id:'awning', tab:'gear', name:'Markíza', kw:'markiza pristresok tien', draw:'awning', layer:'canopy', attach:'side', hosts:['motorhome','van','caravan','car'], models:[
    {id:'f45s260', name:'Fiamma F45s 260', p:{can:2.47}},
    {id:'f45s350', name:'Fiamma F45s 350', p:{can:3.31}},
    {id:'f45s450', name:'Fiamma F45s 450', p:{can:4.31}}]},
  {id:'awningtent', tab:'gear', name:'Predstan', kw:'predstan ku karavanu nafukovaci', draw:'airawning', attach:'side', hosts:['caravan','motorhome','van'], models:[
    {id:'rally260', name:'Dometic Rally Air Pro 260', p:{beams:3}},
    {id:'rally330', name:'Dometic Rally Air Pro 330', p:{beams:3}},
    {id:'rally390', name:'Dometic Rally Air Pro 390', p:{beams:3}}]},
  {id:'gazebo', tab:'gear', name:'Pavilón', kw:'pavilon altanok pristresok party stan', draw:'gazebo', layer:'canopy', models:[
    {id:'eventm', name:'Coleman Event Shelter M'},
    {id:'eventl', name:'Coleman Event Shelter L'},
    {id:'eventxl', name:'Coleman Event Shelter XL'}]},
  {id:'tableset', tab:'gear', name:'Stôl a stoličky', kw:'stol stolicky sedenie', draw:'tableset', layer:'small', models:[
    {id:'set2', name:'Stôl 80 × 60 a 2 stoličky', p:{tl:.8,tw:.6,cw:.55,cd:.55,n:2}},
    {id:'set4', name:'Stôl 120 × 60 a 4 stoličky', p:{tl:1.2,tw:.6,cw:.55,cd:.55,n:4}},
    {id:'set6', name:'Stôl 160 × 80 a 6 stoličiek', p:{tl:1.6,tw:.8,cw:.55,cd:.55,n:6}}]},
  {id:'grill', tab:'gear', name:'Gril', kw:'gril grilovanie weber', draw:'grill', layer:'small', models:[
    {id:'goanywhere', name:'Weber Go-Anywhere', type:'box'},
    {id:'mastertouch', name:'Weber Master-Touch 57', type:'kettle', p:{dia:.57}},
    {id:'spirit310', name:'Weber Spirit II E-310', type:'gas', p:{box:.66,knobs:3}}]},
  {id:'bike', tab:'gear', name:'Bicykel', kw:'bicykel kolo ebike', draw:'bike', layer:'small', models:[
    {id:'bike20', name:'Detský 20" (woom 4)', wd:.48},
    {id:'bike29', name:'Horský 29" (Cube Aim)', wd:.736},
    {id:'cargobike', name:'Nákladný (Urban Arrow)', type:'cargo', wd:.66, wd1:.5, box:.95}]},
  {id:'pool', tab:'gear', name:'Bazén', kw:'bazen bazenik', draw:'pool', models:[
    {id:'intex183', name:'Intex Easy Set 183'},
    {id:'intex244', name:'Intex Easy Set 244'},
    {id:'intex305', name:'Intex Easy Set 305'}]},
  {id:'relax', tab:'gear', name:'Oddych', kw:'lehatko hojdacia siet', draw:'relax', layer:'small', models:[
    {id:'lounger', name:'Lehátko Lafuma Siesta', type:'lounger'},
    {id:'loungers2', name:'2 lehátka a stolík', type:'pair', p:{lw:.71,ts:.57}},
    {id:'hammock', name:'Sieť so stojanom Amazonas', type:'hammock'}]}
];
/* merge real dimensions into the models and index them */
const MODEL = {};
CATALOG.forEach(cat=>cat.models.forEach(m=>{ Object.assign(m, DIMS[m.id]||{}); if(!m.draw) m.draw=cat.draw; m.cat=cat.id; m.layer=cat.layer||'solid'; MODEL[m.id]=m; }));
