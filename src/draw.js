/* ===== Top-view drawing engine. Pure functions, no DOM. Units: metres.
   Local frame: x = 0 is the front of a vehicle, y = 0 is its right-hand side; the drawing fills 0..L × 0..W.
   Mirrors, guy lines and ladders may poke out of that box a little.
   Classes: b body (opaque), d detail line, g glass or fabric fill, k solid, h hidden line (dashed), t thin line, s canopy (see-through). ===== */
const Draw = (function(){
const f = n => Math.round(n*1000)/1000;
const P = (d,c) => '<path class="'+c+'" d="'+d+'"/>';
const R = (x,y,w,h,c,r) => '<rect class="'+c+'" x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'"'+(r?' rx="'+f(Math.min(r,w/2,h/2))+'"':'')+'/>';
const C = (x,y,r,c) => '<circle class="'+c+'" cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r)+'"/>';
const Ln = (x1,y1,x2,y2,c) => P('M'+f(x1)+','+f(y1)+'L'+f(x2)+','+f(y2), c);
/* polygon with rounded corners: points are [x, y, cut]; cut = how far from the corner the rounding starts */
function rp(pts, open){
  const n=pts.length; let d='';
  for(let i=0;i<n;i++){
    const p=pts[i], cut=(open&&(i===0||i===n-1))?0:(p[2]||0);
    if(!cut){ d+=(i?'L':'M')+f(p[0])+','+f(p[1]); continue; }
    const a=pts[(i-1+n)%n], b=pts[(i+1)%n];
    const la=Math.hypot(a[0]-p[0],a[1]-p[1])||1, lb=Math.hypot(b[0]-p[0],b[1]-p[1])||1;
    const ca=Math.min(cut,la/2), cb=Math.min(cut,lb/2);
    d+=(i?'L':'M')+f(p[0]+(a[0]-p[0])*ca/la)+','+f(p[1]+(a[1]-p[1])*ca/la)+'Q'+f(p[0])+','+f(p[1])+' '+f(p[0]+(b[0]-p[0])*cb/lb)+','+f(p[1]+(b[1]-p[1])*cb/lb);
  }
  return d+(open?'':'Z');
}
const mirY = (pts,W) => pts.map(p=>[p[0],W-p[1],p[2]]).reverse();
const both = (W,s) => s+'<g transform="translate(0 '+f(W)+') scale(1 -1)">'+s+'</g>';
const left = (W,s) => '<g transform="translate(0 '+f(W)+') scale(1 -1)">'+s+'</g>';
const at = (x,y,rot,s) => '<g transform="translate('+f(x)+' '+f(y)+')'+(rot?' rotate('+rot+')':'')+'">'+s+'</g>';
const skylight = (x,y,w,h) => R(x-w/2,y-h/2,w,h,'d',.06)+R(x-w/2+.06,y-h/2+.06,w-.12,h-.12,'g',.04);
const peg = (x,y,dx,dy) => Ln(x,y,x+dx,y+dy,'h')+C(x+dx,y+dy,.03,'k');
const mats = (x,y,len,wid,n) => { let o=''; for(let i=0;i<n;i++) o+=R(x,y+i*wid+.03,len,wid-.06,'t',.07); return o; };

/* ---------- Roof and wall fittings shared by vans, motorhomes and caravans ---------- */
function extras(list,W,c,hr){
  let o=''; (list||[]).forEach(e=>{ const k=e[0];
    if(k==='sky') o+=skylight(e[1],c+(e[2]||0),e[3]||.5,e[4]||e[3]||.5);
    else if(k==='ac'){ const w=e[2]||1.1,h=e[3]||.9; o+=R(e[1],c-h/2,w,h,'d',.12); for(let i=1;i<5;i++) o+=Ln(e[1]+.12,c-h/2+h*i/5,e[1]+w-.12,c-h/2+h*i/5,'t'); }
    else if(k==='awn') o+=R(e[1],-.02,e[2],.11,'g',.03)+Ln(e[1]+.05,.035,e[1]+e[2]-.05,.035,'t');
    else if(k==='pop') o+=P(rp([[e[1],c-hr+.07,.16],[e[2],c-hr+.07,.12],[e[2],c+hr-.07,.12],[e[1],c+hr-.07,.16]]),'d')+Ln(e[2]-.13,c-hr+.13,e[2]-.13,c+hr-.13,'t');
    else if(k==='solar'){ const w=e[3]||1.5,h=e[4]||.68,y=c+(e[2]||0)-h/2; o+=R(e[1],y,w,h,'d',.02); for(let i=1;i<4;i++) o+=Ln(e[1]+w*i/4,y,e[1]+w*i/4,y+h,'t'); o+=Ln(e[1],y+h/2,e[1]+w,y+h/2,'t'); }
    else if(k==='door'){ const w=e[2]||.6; o+=Ln(e[1],0,e[1],.11,'d')+Ln(e[1]+w,0,e[1]+w,.11,'d')+R(e[1]+.04,-.012,w-.08,.05,'k',.02); }
    else if(k==='dish') o+=C(e[1],c+(e[2]||0),.3,'d')+C(e[1],c+(e[2]||0),.05,'k')+Ln(e[1],c+(e[2]||0),e[1]+.25,c+(e[2]||0)+.13,'t');
    else if(k==='line') o+=Ln(e[1],.09,e[1],W-.09,'t');
    else if(k==='win') o+=R(e[1],0,e[2],.065,'g',.02);
    else if(k==='winL') o+=R(e[1],W-.065,e[2],.065,'g',.02);
    else if(k==='vent') o+=C(e[1],c+(e[2]||0),.09,'d')+C(e[1],c+(e[2]||0),.035,'k');
  }); return o;
}

/* ---------- Passenger cars and pick-ups ---------- */
const CAR = {
  small: {nb:0.22,tf:0.15,tr:0.11,rb:.10,rcF:0.46,rcR:0.36,cowl:.24,ws:.70,rw:.34,deck:.13,belt:.88,roof:.66,bow:.16,sg:.30,pil:[.55],mir:.11,td:.60,tw:.19,hg:.20},
  hatch: {nb:0.2,tf:0.14,tr:0.1,rb:.10,rcF:0.46,rcR:0.34,cowl:.36,ws:.78,rw:.40,deck:.14,belt:.88,roof:.65,bow:.16,sg:.35,pil:[.42,.86],mir:.11,td:.64,tw:.21,hg:.22},
  sedan: {nb:0.2,tf:0.14,tr:0.11,rb:.11,rcF:0.46,rcR:0.34,cowl:.38,ws:.82,rw:.70,deck:.50,belt:.88,roof:.64,bow:.16,sg:.30,pil:[.45,.90],mir:.11,td:.66,tw:.22,hg:.22,trunk:1},
  lift:  {nb:0.2,tf:0.14,tr:0.11,rb:.11,rcF:0.46,rcR:0.34,cowl:.38,ws:.82,rw:.84,deck:.30,belt:.88,roof:.64,bow:.16,sg:.50,pil:[.42,.80],mir:.11,td:.66,tw:.22,hg:.22,trunk:1},
  kombi: {nb:0.2,tf:0.14,tr:0.09,rb:.09,rcF:0.46,rcR:0.3,cowl:.38,ws:.82,rw:.36,deck:.12,belt:.88,roof:.65,bow:.16,sg:.70,pil:[.34,.66,.88],mir:.11,td:.66,tw:.22,hg:.22,rails:1},
  suv:   {nb:0.17,tf:0.11,tr:0.07,rb:.08,rcF:0.4,rcR:0.28,cowl:.40,ws:.74,rw:.38,deck:.16,belt:.90,roof:.69,bow:.14,sg:.60,pil:[.36,.70,.90],mir:.13,td:.72,tw:.24,hg:.24,rails:1},
  mpv:   {nb:0.2,tf:0.14,tr:0.08,rb:.08,rcF:0.46,rcR:0.28,cowl:.16,ws:.92,rw:.30,deck:.10,belt:.91,roof:.72,bow:.16,sg:.70,pil:[.30,.60,.85],mir:.12,td:.66,tw:.22,hg:.20},
  pickup:{nb:0.12,tf:0.08,tr:.02,rb:.02,rcF:0.32,rcR:.10,cowl:.46,ws:.62,rw:.07,deck:0,belt:.91,roof:.72,bow:.12,sg:.2,pil:[.48],mir:.15,td:.78,tw:.27,hg:.24}
};
function car(L,W,m){
  const s=Object.assign({},CAR[m.body]||CAR.hatch,m.p||{}), c=W/2, fo=m.fo, ra=fo+m.wb;
  let x3=L-s.deck, x2=x3-s.rw, b0=0, b1=0;
  if(m.body==='pickup'){ b1=L-.09; b0=b1-(m.bed||1.5); x3=b0-.11; x2=x3-s.rw; }
  const side=[[s.nb,s.tf,s.rcF],[fo+.15,0,.7],[ra+.10,0,.7],[L-s.rb,s.tr,s.rcR]];
  let o=P(rp([[0,c,c]].concat(side,[[L,c,c]],mirY(side,W))),'b');
  const xc=fo+s.cowl, x1=xc+s.ws, hb=c*s.belt, hrf=c*s.roof, hrr=hrf*(s.rt||.96), bw=s.bow, bt=bw*.4;
  const wsB=hb-.03, bwR=s.bowR==null?.10:s.bowR, btR=bwR*.5, rgB=s.rgb?c*s.rgb:hrr+.03;
  const arc=(x0,mx,y1)=>'Q'+f(2*mx-x0)+','+f(c)+' '+f(x0)+','+f(y1);
  const hx=s.nb+s.hg, hh=c-s.tf-.10;
  o+=P(rp([[xc+bw,c-wsB],[hx+.08,c-hh,.22],[hx,c,hh*.6],[hx+.08,c+hh,.22],[xc+bw,c+wsB]],true),'d');
  o+=P('M'+f(xc+bw)+','+f(c-wsB)+arc(xc+bw,xc,c+wsB)+'L'+f(x1+bt)+','+f(c+hrf)+arc(x1+bt,x1,c-hrf)+'Z','g');
  o+=P('M'+f(x2-btR)+','+f(c-hrr)+arc(x2-btR,x2,c+hrr)+'L'+f(x3-bwR)+','+f(c+rgB)+arc(x3-bwR,x3,c-rgB)+'Z','g');
  const A=[xc+bw+.07,c-wsB], B=[x1+bt+.05,c-hrf], Cp=[x2-btR-.05,c-hrr], D=[x2+(x3-x2)*s.sg,c-hb,.05];
  let sd=P(rp([A,B,Cp,D]),'g');
  (s.pil||[]).forEach(t=>{ const x=B[0]+(D[0]-B[0])*t;
    const yr=x<Cp[0]?B[1]+(Cp[1]-B[1])*(x-B[0])/(Cp[0]-B[0]):Cp[1]+(D[1]-Cp[1])*(x-Cp[0])/(D[0]-Cp[0]);
    sd+=Ln(x,yr,x,.012,'d'); });
  sd+=Ln(A[0]-.03,A[1]+.01,A[0]-.1,.03,'d');
  const xm=A[0]-.14;
  sd+=P(rp([[xm+.02,.05],[xm-.03,-s.mir,.05],[xm+.18,-s.mir+.02,.05],[xm+.16,.05]]),'b');
  sd+=R(fo-s.td/2,.035,s.td,s.tw,'h',.04)+R(ra-s.td/2,.035,s.td,s.tw,'h',.04);
  sd+=P(rp([[s.nb*.45+.03,s.tf+.40,.06],[s.nb+.03,s.tf+.07,.09],[s.nb+.30,s.tf+.045,.04],[s.nb+.22,s.tf+.20,.07]]),'g');
  sd+=m.body==='pickup'?R(L-.06,.025,.06,.2,'g',.02):P(rp([[L-s.rb*.5-.03,s.tr+.36,.05],[L-s.rb-.02,s.tr+.06,.08],[L-s.rb-.25,s.tr+.04,.03],[L-s.rb-.16,s.tr+.17,.06]]),'g');
  if(s.trunk) sd+=Ln(x3-bwR,c-rgB,L-s.rb-.07,s.tr+.17,'d');
  if(s.rails) sd+=Ln(x1+.32,c-hrf+.07,x2-.10,c-hrr+.06,'d');
  if(s.slide) sd+=Ln(x2-1.0,.04,x2-.1,.04,'d');
  o+=both(W,sd);
  o+=P('M'+f(s.nb+.07)+','+f(c-hh+.1)+'Q'+f(s.nb*.2+.07)+','+f(c)+' '+f(s.nb+.07)+','+f(c+hh-.1),'t');
  if(m.body!=='pickup') o+=P('M'+f(L-s.rb-.06)+','+f(s.tr+.3)+'Q'+f(L+.02-.06)+','+f(c)+' '+f(L-s.rb-.06)+','+f(W-s.tr-.3),'t');
  o+=both(W,Ln(hx+.14,c-hh*.5,xc+bw*.35,c-wsB*.55,'t'));
  o+=Ln(xc+bw*.62,c-wsB*.7,xc+.05,c-.06,'t')+Ln(xc+.04,c+.03,xc+bw*.5,c+wsB*.62,'t');
  if(s.glassroof){ o+=P(rp([[x1+.16,c-hrf+.08,.1],[x2-.14,c-hrr+.08,.1],[x2-.14,c+hrr-.08,.1],[x1+.16,c+hrf-.08,.1]]),'g'); o+=Ln((x1+x2)/2+.05,c-hrf+.08,(x1+x2)/2+.05,c+hrf-.08,'d'); }
  else { if(s.pano) o+=R(x1+.18,c-hrf+.15,s.pano,2*hrf-.30,'g',.07); o+=C(x2-.17,c,.028,'k'); }
  if(m.body==='pickup'){ const bi=.11;
    o+=R(b0,bi,b1-b0,W-2*bi,'d',.04);
    for(let i=1;i<7;i++) o+=Ln(b0+.06,bi+(W-2*bi)*i/7,b1-.06,bi+(W-2*bi)*i/7,'t');
    o+=both(W,R(ra-.40,bi,.80,.16,'d',.05));
    o+=Ln(b1+.04,.10,b1+.04,W-.10,'d');
  }
  return o;
}

/* ---------- Panel vans, minibuses and camper vans ---------- */
const VAN = {nb:.10,tf:.08,rcF:.34,rcR:.10,cab:1.0,cowl:0,ws:.72,belt:.955,roof:.885,bow:.16,mir:.17,td:.68,tw:.22,hg:.20,door:.95};
function van(L,W,m){
  const s=Object.assign({},VAN,m.p||{}), c=W/2, fo=m.fo, ra=fo+m.wb, xw=fo+s.cab, xe=L-.07;
  const side=[[s.nb,s.tf,s.rcF],[xw,0,.6],[L,0,s.rcR]];
  let o=P(rp([[0,c,c]].concat(side,mirY(side,W))),'b');
  const hw=x=>c-s.tf*Math.max(0,Math.min(1,(xw-x)/(xw-s.nb)));
  const xc=fo+s.cowl, x1=xc+s.ws, bw=s.bow, bt=bw*.4, hr=c*s.roof, hrf=hw(x1)*s.roof, wsB=hw(xc+bw)*s.belt-.02, xB=xc+bw+s.door;
  const arc=(x0,mx,y1)=>'Q'+f(2*mx-x0)+','+f(c)+' '+f(x0)+','+f(y1);
  const hx=s.nb+s.hg, hh=c-s.tf-.10;
  o+=P(rp([[xc+bw,c-wsB],[hx+.07,c-hh,.2],[hx,c,hh*.6],[hx+.07,c+hh,.2],[xc+bw,c+wsB]],true),'d');
  o+=P('M'+f(xc+bw)+','+f(c-wsB)+arc(xc+bw,xc,c+wsB)+'L'+f(x1+bt)+','+f(c+hrf)+arc(x1+bt,x1,c-hrf)+'Z','g');
  const rs=[[x1+bt,c-hrf],[xw+.25,c-hr,.5],[xe,c-hr,.09]];
  o+=P(rp(rs.concat(mirY(rs,W)),true),'d');
  let sd=P(rp([[xc+bw+.06,c-wsB],[x1+bt+.05,c-hrf],[xB,c-hw(xB)*s.roof],[xB,c-hw(xB)*s.belt]]),'g');
  const xm=xc+bw-.10;
  sd+=P(rp([[xm+.02,.07],[xm-.04,-s.mir,.06],[xm+.22,-s.mir+.02,.06],[xm+.2,.07]]),'b');
  sd+=R(fo-s.td/2,.045,s.td,s.tw,'h',.04)+R(ra-s.td/2,.04,s.td,s.tw*(s.twin?2.05:1),'h',.04);
  if(s.tandem) sd+=R(ra+s.tandem-s.td/2,.04,s.td,s.tw,'h',.04);
  sd+=P(rp([[s.nb*.45+.03,s.tf+.40,.06],[s.nb+.03,s.tf+.07,.09],[s.nb+.28,s.tf+.045,.04],[s.nb+.20,s.tf+.20,.07]]),'g');
  sd+=R(L-.06,.03,.06,.17,'g',.02);
  (s.win||[]).forEach(w=>{ sd+=R(w[0],c-c*s.belt,w[1]-w[0],c*(s.belt-s.roof),'g',.02); });
  o+=both(W,sd);
  (s.winR||[]).forEach(w=>{ o+=R(w[0],c-c*s.belt,w[1]-w[0],c*(s.belt-s.roof),'g',.02); });
  (s.winL||[]).forEach(w=>{ o+=left(W,R(w[0],c-c*s.belt,w[1]-w[0],c*(s.belt-s.roof),'g',.02)); });
  if(s.ribs) for(let x=x1+.55;x<xe-.25;x+=s.ribs) o+=Ln(x,c-hr+.07,x,c+hr-.07,'t');
  const slide=x=>Ln(x,0,x,c-hr,'d')+Ln(x+s.slide,0,x+s.slide,c-hr,'d')+Ln(x+s.slide,.03,Math.min(x+s.slide*1.95,L-.35),.03,'d');
  if(s.slide){ o+=slide(xB+.06); if(s.slide2) o+=left(W,slide(xB+.06)); }
  o+=Ln(L-.05,.12,L-.05,W-.12,'t'); if(s.barn) o+=Ln(L-.05,c,L,c,'d');
  o+=extras(s.x,W,c,hr);
  return o;
}

/* ---------- Motorhomes: semi-integrated, alcove, integrated ---------- */
function motorhome(L,W,m){
  const s=Object.assign({cabW:2.05,nb:.11,tf:.09,rcF:.34,cowl:-.12,ws:.74,bow:.15,td:.70,tw:.23,mir:.19},m.p||{}), c=W/2, fo=m.fo, ra=fo+m.wb, lay=m.layout;
  let o='';
  const rear=both(W,R(ra-s.td/2,.05,s.td,s.tw*(s.twin?2:1),'h',.04)+(s.tandem?R(ra+s.tandem-s.td/2,.05,s.td,s.tw,'h',.04):'')+R(L-.05,.06,.05,.22,'g',.02));
  if(lay==='int'){
    const side=[[.26,.05,.5],[1.7,0,.6],[L,0,.14]];
    o+=P(rp([[0,c,c]].concat(side,mirY(side,W))),'b');
    const xa=.3, xb=1.18, ha=c-.2, hb=c-.24;
    o+=P('M'+f(xa+.3)+','+f(c-ha)+'Q'+f(xa-.3)+','+f(c)+' '+f(xa+.3)+','+f(c+ha)+'L'+f(xb+.1)+','+f(c+hb)+'Q'+f(xb-.1)+','+f(c)+' '+f(xb+.1)+','+f(c-hb)+'Z','g');
    o+=both(W,R(.85,.035,.85,.075,'g',.02)+R(.24,-.2,.15,.2,'b',.05)+Ln(.33,-.01,.36,.07,'d')
      +P(rp([[.1,c-.52,.06],[.2,.2,.08],[.42,.12,.04],[.3,.34,.06]]),'g')+R(fo-s.td/2,.06,s.td,s.tw,'h',.04));
    o+=rear+extras(s.x,W,c,c*.9);
    return o;
  }
  const cy0=c-s.cabW/2, xc=fo+s.cowl, x1=xc+s.ws, bw=s.bow, hbC=s.cabW/2*.93, hrC=s.cabW/2*.86;
  const cs=[[s.nb,cy0+s.tf,s.rcF],[fo+.6,cy0,.5],[x1+1.3,cy0,0]];
  o+=P(rp([[0,c,s.cabW/2]].concat(cs,mirY(cs,W))),'b');
  const hh=s.cabW/2-s.tf-.1;
  o+=P(rp([[xc+bw,c-hbC+.03],[s.nb+.27,c-hh,.2],[s.nb+.2,c,hh*.6],[s.nb+.27,c+hh,.2],[xc+bw,c+hbC-.03]],true),'d');
  const xm=xc+bw-.08;
  let sd=P(rp([[xm+.02,cy0+.07],[xm-.04,cy0-s.mir,.06],[xm+.22,cy0-s.mir+.02,.06],[xm+.2,cy0+.07]]),'b');
  sd+=R(fo-s.td/2,cy0+.045,s.td,s.tw,'h',.04);
  sd+=P(rp([[s.nb*.45+.03,cy0+s.tf+.40,.06],[s.nb+.03,cy0+s.tf+.07,.09],[s.nb+.28,cy0+s.tf+.045,.04],[s.nb+.20,cy0+s.tf+.20,.07]]),'g');
  let body;
  if(lay==='alcove'){
    const xa=xc-.22, bs=[[xa+.12,.03,.4],[L,0,.14]];
    body=P(rp([[xa,c,c*.9]].concat(bs,mirY(bs,W))),'b')+P('M'+f(xa+1.55)+',.1Q'+f(xa+1.4)+','+f(c)+' '+f(xa+1.55)+','+f(W-.1),'t');
  } else {
    o+=P('M'+f(xc+bw)+','+f(c-hbC+.03)+'Q'+f(xc-bw)+','+f(c)+' '+f(xc+bw)+','+f(c+hbC-.03)+'L'+f(x1+.06)+','+f(c+hrC)+'Q'+f(x1-.06)+','+f(c)+' '+f(x1+.06)+','+f(c-hrC)+'Z','g');
    sd+=P(rp([[xc+bw+.06,c-hbC+.03],[x1+.1,c-hrC],[x1+.75,c-hrC],[x1+.75,c-hbC]]),'g');
    const xj=x1+.8, bs=[[x1+.04,c-hrC,.2],[xj-.06,c-hrC-.03,.08],[xj,.02,.14],[L,0,.14]];
    body=P(rp([[x1-.08,c,hrC*.7]].concat(bs,mirY(bs,W))),'b');
  }
  o+=both(W,sd)+body+rear+extras(s.x,W,c,c*.9);
  return o;
}

/* ---------- Caravans ---------- */
function caravan(L,W,m){
  const s=Object.assign({bow:.14,rcF:.38,rcR:.2,axle:.55,td:.66,tw:.2},m.p||{}), c=W/2, lb=m.Lbody, x0=L-lb;
  let o=P('M'+f(x0+.3)+','+f(c-.62)+'L.3,'+f(c-.05)+'L.3,'+f(c+.05)+'L'+f(x0+.3)+','+f(c+.62),'d');
  o+=P('M'+f(x0+.3)+','+f(c-.5)+'L.44,'+f(c)+'L'+f(x0+.3)+','+f(c+.5),'t');
  o+=R(0,c-.06,.36,.12,'b',.05)+C(.09,c,.035,'d');
  o+=R(.56,c+.15,.13,.07,'k',.03)+C(.625,c+.185,.1,'d');
  if(s.gasbox) o+=R(x0-.4,c-.42,.5,.84,'b',.1)+Ln(x0-.34,c,x0+.02,c,'t');
  const side=[[x0+s.bow,.02,s.rcF],[L-.03,0,s.rcR]];
  o+=P(rp([[x0,c,c]].concat(side,[[L,c,c]],mirY(side,W))),'b');
  if(s.locker) o+=P('M'+f(x0+.5)+',.14Q'+f(x0+.36)+','+f(c)+' '+f(x0+.5)+','+f(W-.14),'t');
  o+=R(x0+.035,c-(s.fw||.6),.065,2*(s.fw||.6),'g',.03);
  if(s.rwin) o+=R(L-.075,c-s.rwin,.065,2*s.rwin,'g',.03);
  if(s.pop) o+=P(rp([[x0+.7,.26,.3],[L-.55,.26,.3],[L-.55,W-.26,.3],[x0+.7,W-.26,.3]]),'d')+P(rp([[x0+.82,.38,.22],[L-.67,.38,.22],[L-.67,W-.38,.22],[x0+.82,W-.38,.22]]),'t');
  const xa=x0+lb*s.axle, ax=m.axles>1?[-.4,.4]:[0]; let w='';
  ax.forEach(d=>{ w+=R(xa+d-s.td/2,.04,s.td,s.tw,'h',.04); });
  o+=both(W,w+R(L-.05,.1,.05,.26,'g',.02));
  o+=extras((s.x||[]).map(e=>[e[0],e[1]+x0].concat(e.slice(2))),W,c,c*.9);
  return o;
}

/* ---------- Cargo trailers ---------- */
function trailer(L,W,m){
  const s=Object.assign({td:.58},m.p||{}), c=W/2, bl=m.boxL+.07, bwid=m.boxW+.07, x0=L-bl-.03, y0=(W-bwid)/2;
  let o=P('M'+f(x0+.1)+','+f(c-bwid*.36)+'L.28,'+f(c-.04)+'L.28,'+f(c+.04)+'L'+f(x0+.1)+','+f(c+bwid*.36),'d');
  o+=R(0,c-.055,.32,.11,'b',.05)+C(.085,c,.03,'d');
  if(s.jockey) o+=R(x0-.46,c+.13,.13,.06,'k',.02)+C(x0-.395,c+.16,.09,'d');
  const ax=m.axles>1?[-.36,.36]:[0], xa=x0+bl*(s.axle||.54), tw=Math.max(.14,(W-bwid)/2-.05);
  if(m.out){ let w=''; ax.forEach(d=>{ w+=R(xa+d-s.td/2-.06,y0-tw-.05,s.td+.12,tw+.08,'b',.08)+R(xa+d-s.td/2,y0-tw-.02,s.td,tw,'h',.03); }); o+=both(W,w); }
  o+=R(x0,y0,bl,bwid,'b',.03)+R(x0+.035,y0+.035,m.boxL,m.boxW,'d',.01);
  if(!m.out){ let w=''; ax.forEach(d=>{ w+=R(xa+d-s.td/2,y0+.07,s.td,.2,'h',.03); }); o+=both(W,w); }
  let r=''; for(let i=1;i<=3;i++) r+=C(x0+bl*i/4,y0+.1,.022,'d');
  o+=both(W,r+R(L-.03,y0+.02,.03,.22,'g'));
  o+=Ln(x0+bl-.06,y0+.06,x0+bl-.06,y0+bwid-.06,'t');
  return o;
}

/* ---------- Motorcycles ---------- */
function moto(L,W,m){
  const c=W/2, ty=m.type, fa=m.fa||.33, ra=fa+m.wb, hw=W/2, td=m.td||.62;
  let o=R(fa-td/2,c-.055,td,.11,'b',.05)+R(ra-td/2,c-.085,td,.17,'b',.07);
  const seat=d=>P(d,'b')+P(d,'g');
  const bar=(x,sweep)=>P('M'+f(x+sweep)+','+f(c-hw+.03)+'Q'+f(x-sweep)+','+f(c)+' '+f(x+sweep)+','+f(c+hw-.03),'d')
    +both(W,R(x+sweep-.03,.0,.06,.13,'k',.03));
  if(ty==='scooter'){
    o+=R(fa-.24,c-.085,.5,.17,'b',.085);
    o+=P(rp([[fa+.2,c-.3,.1],[fa+.42,c-.36,.08],[fa+.62,c-.26,.1],[fa+.62,c+.26,.1],[fa+.42,c+.36,.08],[fa+.2,c+.3,.1]]),'b');
    o+=R(fa+.62,c-.2,.38,.4,'d',.05)+Ln(fa+.68,c-.07,fa+.95,c-.07,'t')+Ln(fa+.68,c+.07,fa+.95,c+.07,'t');
    const bs=[[fa+.98,c-.17,.08],[ra-.12,c-.29,.22],[L-.14,c-.22,.16]];
    o+=P(rp(bs.concat([[L-.03,c,.2]],mirY(bs,W))),'b');
    o+=P(rp([[fa+.98,c-.13,.07],[ra-.2,c-.17,.12],[ra+.12,c-.12,.08],[ra+.12,c+.12,.08],[ra-.2,c+.17,.12],[fa+.98,c+.13,.07]]),'g');
    o+=R(fa+.24,c-.25,.15,.5,'b',.07)+C(fa+.2,c,.07,'g')+bar(fa+.31,.02);
    o+=both(W,C(fa+.22,.07,.06,'g')+Ln(fa+.26,.12,fa+.3,.22,'d'));
    o+=R(L-.2,c-.11,.17,.22,'d',.04);
  } else if(ty==='tourer'){
    o+=R(fa-.26,c-.09,.52,.18,'b',.09);
    const fs=[[fa+.12,c-.2,.12],[fa+.42,c-hw+.04,.1],[fa+.72,c-hw+.1,.1],[fa+.95,c-.3,.12]];
    o+=P(rp([[fa+.02,c,.2]].concat(fs,mirY(fs,W))),'b');
    o+=P('M'+f(fa+.4)+','+f(c-.3)+'Q'+f(fa+.16)+','+f(c)+' '+f(fa+.4)+','+f(c+.3),'d');
    o+=both(W,R(fa+.4,.0,.2,.12,'g',.05));
    o+=bar(fa+.62,.03);
    o+=P(rp([[fa+.78,c-.2,.1],[fa+1.15,c-.24,.1],[fa+1.15,c+.24,.1],[fa+.78,c+.2,.1]]),'b');
    o+=seat(rp([[fa+1.12,c-.25,.1],[fa+1.6,c-.27,.12],[fa+1.6,c+.27,.12],[fa+1.12,c+.25,.1]]))+Ln(fa+1.36,c-.25,fa+1.36,c+.25,'d');
    o+=both(W,R(ra-.36,c-hw+.01,.78,.2,'b',.08));
    o+=R(ra-.02,c-.3,.56,.6,'b',.14)+R(ra+.05,c-.22,.42,.44,'d',.1)+R(ra-.06,c-.2,.07,.4,'k',.03);
  } else {
    o+=P(rp([[fa-.28,c,.06],[fa+.12,c-.09,.08],[fa+.5,c-.15,.06],[fa+.5,c+.15,.06],[fa+.12,c+.09,.08]]),'b');
    o+=P('M'+f(fa+.3)+','+f(c-.17)+'Q'+f(fa+.16)+','+f(c)+' '+f(fa+.3)+','+f(c+.17),'d')+C(fa+.36,c,.06,'g');
    o+=both(W,R(fa+.72,c-.44,.24,.24,'b',.06)+Ln(fa+.78,c-.44,fa+.78,c-.2,'t')+Ln(fa+.9,c-.44,fa+.9,c-.2,'t'));
    o+=P(rp([[fa+.5,c-.12,.08],[fa+.72,c-.27,.14],[fa+1.08,c-.19,.1],[fa+1.08,c+.19,.1],[fa+.72,c+.27,.14],[fa+.5,c+.12,.08]]),'b');
    o+=bar(fa+.5,.05)+both(W,C(fa+.46,.07,.06,'g')+Ln(fa+.5,.12,fa+.54,.2,'d'));
    /* seat and luggage rack are fitted between the tank and the overall length, so the rack never sticks out behind the bike */
    const xr=Math.min(fa+1.74,L-.31), sx=t=>fa+1.05+(xr+.01-fa-1.05)*t;
    o+=seat(rp([[sx(0),c-.16,.07],[sx(.53),c-.2,.1],[sx(1),c-.14,.08],[sx(1),c+.14,.08],[sx(.53),c+.2,.1],[sx(0),c+.16,.07]]))+Ln(sx(.57),c-.19,sx(.57),c+.19,'d');
    o+=R(xr,c-.13,.3,.26,'b',.04)+Ln(xr+.1,c-.13,xr+.1,c+.13,'t')+Ln(xr+.2,c-.13,xr+.2,c+.13,'t');
  }
  return o;
}

/* ---------- Bicycles ---------- */
function bike(L,W,m){
  const c=W/2, d=m.wd||.7, xs=L-d*.5-.2, xb=L-d*.5-.43; let o='', xh;
  o+=R(L-d,c-.025,d,.05,'k',.025);
  if(m.type==='cargo'){
    const d1=m.wd1||.5, x0=d1+.06, x1=x0+(m.box||.9); xh=x1+.18;
    o+=R(0,c-.03,d1,.06,'k',.03);
    o+=R(d1*.5,c-.02,L-d*.5-d1*.5,.04,'b',.02);
    o+=P(rp([[x0,c-.27,.1],[x1,c-.32,.08],[x1,c+.32,.08],[x0,c+.27,.1]]),'b');
    o+=P(rp([[x0+.07,c-.21,.06],[x1-.07,c-.25,.05],[x1-.07,c+.25,.05],[x0+.07,c+.21,.06]]),'d')+R(x1-.34,c-.23,.24,.46,'g',.05);
  } else {
    xh=d*.5+.1;
    o+=R(0,c-.025,d,.05,'k',.025);
    o+=R(d*.5,c-.02,L-d,.04,'b',.02);
  }
  o+=R(xh-.018,.0,.036,W,'b',.018)+both(W,R(xh-.025,0,.05,.12,'k',.025))+Ln(xh,c,xh+.11,c,'d');
  o+=P(rp([[xs-.15,c,.03],[xs+.05,c-.075,.07],[xs+.12,c,.07],[xs+.05,c+.075,.07]]),'b');
  o+=Ln(xb,c-.16,xb,c+.16,'d')+R(xb-.05,c-.22,.1,.07,'d',.01)+R(xb-.05,c+.15,.1,.07,'d',.01);
  if(m.rack) o+=R(L-d*.5-.12,c-.08,.4,.16,'d',.03);
  return o;
}

/* ---------- Tents ---------- */
function tentPop(L,W,m){
  const s=m.p||{}; let o=P(rp([[0,.3,.4],[.4,0,.4],[L-.4,0,.4],[L,.3,.4],[L,W-.3,.4],[L-.4,W,.4],[.4,W,.4],[0,W-.3,.4]]),'b');
  const il=s.il||L-.3, iw=s.iw||W-.3, ix=(L-il)/2, iy=W-iw-.1;
  o+=R(ix,iy,il,iw,'d',.2)+mats(ix+.1,iy+.04,il-.2,(iw-.08)/(s.n||2),s.n||2);
  o+=P('M.12,.12Q'+f(L/2)+','+f(W*.75)+' '+f(L-.12)+',.12','d')+P('M.12,'+f(W-.12)+'Q'+f(L/2)+','+f(W*.25)+' '+f(L-.12)+','+f(W-.12),'d');
  o+=P('M'+f(L/2-.45)+',.03Q'+f(L/2)+',.5 '+f(L/2+.45)+',.03','t');
  o+=peg(.1,.1,-.2,-.2)+peg(L-.1,.1,.2,-.2)+peg(.1,W-.1,-.2,.2)+peg(L-.1,W-.1,.2,.2);
  return o;
}
function tentDome(L,W,m){
  const s=m.p||{}, c=W/2, v=s.v==null?.8:s.v, n=s.n||3;
  let o=P(rp([[0,c-W*.2,.12],[v,0,.2],[L,0,.3],[L,W,.3],[v,W,.2],[0,c+W*.2,.12]]),'b');
  const ix=v+.06, il=L-v-.16, iy=.1, iw=W-.2;
  o+=R(ix,iy,il,iw,'d',.12)+mats(ix+.08,iy+.05,il-.16,(iw-.1)/n,n);
  o+=Ln(ix,iy,ix+il,iy+iw,'d')+Ln(ix,iy+iw,ix+il,iy,'d');
  if(v>.3) o+=P('M'+f(v*.5)+','+f(c-W*.36)+'Q'+f(v*.2)+','+f(c)+' '+f(v*.5)+','+f(c+W*.36),'d');
  o+=P('M'+f(ix)+','+f(c-.38)+'Q'+f(ix+.42)+','+f(c)+' '+f(ix)+','+f(c+.38),'t');
  o+=peg(v,.02,-.12,-.22)+peg(L-.06,.06,.2,-.2)+peg(v,W-.02,-.12,.22)+peg(L-.06,W-.06,.2,.2)+peg(.02,c,-.24,0);
  return o;
}
function tentTunnel(L,W,m){
  const s=m.p||{}, c=W/2, bd=s.bd||2.2, rooms=s.rooms||1, n=s.n||4, ar=s.arches||3;
  let o=P(rp([[0,.4,.3],[.5,0,.35],[L-.45,0,.35],[L,.35,.3],[L,W-.35,.3],[L-.45,W,.35],[.5,W,.35],[0,W-.4,.3]]),'b');
  for(let i=0;i<ar;i++){ const x=.5+(L-1)*i/(ar-1); o+=Ln(x,.02,x,W-.02,'d')+peg(x,.02,0,-.22)+peg(x,W-.02,0,.22); }
  const bx=L-bd-.2, by=.16, bw=W-.32;
  o+=R(bx,by,bd,bw,'d',.1);
  for(let i=1;i<rooms;i++) o+=Ln(bx,by+bw*i/rooms,bx+bd,by+bw*i/rooms,'d');
  o+=mats(bx+.12,by+.05,bd-.24,(bw-.1)/n,n);
  const gx=Math.max(.3,(s.can||0)+.08); if(s.can) o+=Ln(s.can,.07,s.can,W-.07,'t');
  o+=R(gx,.14,bx-.12-gx,W-.28,'t',.08);
  o+=P('M.04,'+f(c-.5)+'Q.6,'+f(c)+' .04,'+f(c+.5),'t');
  const xd=.5+(bx-.5)*.5;
  o+=P('M'+f(xd-.45)+',.03Q'+f(xd)+',.55 '+f(xd+.45)+',.03','t');
  o+=R(xd-.5,W-.06,1,.06,'g',.02)+R(.7,0,.5,.06,'g',.02);
  o+=peg(.08,.3,-.22,-.16)+peg(.08,W-.3,-.22,.16)+peg(L-.08,.3,.22,-.16)+peg(L-.08,W-.3,.22,.16);
  return o;
}
function rooftent(L,W,m){
  const s=m.p||{}, c=W/2; let o='';
  if((s.fold||'x')==='x'){ const h=L/2;
    o+=R(0,0,L,W,'b',.07)+Ln(h,0,h,W,'d')+R(.07,.07,L-.14,W-.14,'t',.05);
    o+=Ln(L*.25,.03,L*.25,W-.03,'t')+Ln(L*.75,.03,L*.75,W-.03,'t');
    o+=P('M'+f(L-.05)+','+f(c-.36)+'Q'+f(L-.5)+','+f(c)+' '+f(L-.05)+','+f(c+.36),'t');
    o+=Ln(L,c-.2,L+.75,c-.2,'h')+Ln(L,c+.2,L+.75,c+.2,'h'); for(let i=1;i<=4;i++) o+=Ln(L+i*.17,c-.2,L+i*.17,c+.2,'h');
    o+=R(.3,0,h-.6,.05,'g',.02)+R(.3,W-.05,h-.6,.05,'g',.02);
  } else { const h=s.cw||W/2;
    o+=R(0,0,L,W,'b',.07)+Ln(0,h,L,h,'d')+R(.07,.07,L-.14,W-.14,'t',.05);
    if(s.hard) o+=R(.05,.04,L-.1,h-.08,'d',.12)+Ln(.3,.11,L-.3,.11,'t');
    else o+=Ln(.03,h*.5,L-.03,h*.5,'t')+Ln(.03,h+(W-h)*.5,L-.03,h+(W-h)*.5,'t');
    o+=P('M'+f(L/2-.36)+','+f(W-.05)+'Q'+f(L/2)+','+f(W-.5)+' '+f(L/2+.36)+','+f(W-.05),'t');
    o+=Ln(L/2-.2,W,L/2-.2,W+.75,'h')+Ln(L/2+.2,W,L/2+.2,W+.75,'h'); for(let i=1;i<=4;i++) o+=Ln(L/2-.2,W+i*.17,L/2+.2,W+i*.17,'h');
  }
  return o;
}

/* ---------- Awnings and shelters ---------- */
function awning(L,W,m){
  const ins=m.p&&m.p.can ? Math.max(.03,(L-m.p.can)/2) : .05;
  let o=R(ins,.08,L-2*ins,W-.12,'s')+R(0,0,L,.1,'b',.03)+R(0,W-.07,L,.07,'b',.02);
  for(let x=.5;x<L-.3;x+=.5) o+=Ln(x,.12,x,W-.09,'t');
  const arm=(x,dir)=>P('M'+f(x)+',.1L'+f(x+dir*Math.min(1.05,L*.3))+','+f(W*.5)+'L'+f(x+dir*.06)+','+f(W-.07),'d')+C(x+dir*Math.min(1.05,L*.3),W*.5,.035,'k');
  o+=arm(L*.07,1)+arm(L*.93,-1);
  if(L>4.2) o+=Ln(L/2,.1,L/2,W-.07,'d');
  o+=C(.1,W-.035,.045,'k')+C(L-.1,W-.035,.045,'k');
  return o;
}
function airawning(L,W,m){
  const s=m.p||{}, n=s.beams||3, c=L/2;
  let o=P(rp([[0,0],[L,0],[L,W-.2,.35],[c,W,L*.45],[0,W-.2,.35]]),'b')+R(0,0,L,.05,'g');
  for(let i=0;i<n;i++){ const x=.09+(L-.18)*i/(n-1); o+=R(x-.065,0,.13,W-.13-(i>0&&i<n-1?0:.06),'d',.065); }
  o+=R(.2,.2,L-.4,W-.5,'t',.06);
  const seg=(L-.4)/Math.max(1,n-1);
  for(let i=0;i<n-1;i++){ const x=.2+seg*i+seg/2; o+=R(x-seg*.3,W-.11,seg*.6,.06,'g',.02); }
  o+=P('M.03,'+f(W*.3)+'Q.5,'+f(W*.52)+' .03,'+f(W*.74),'t')+P('M'+f(L-.03)+','+f(W*.3)+'Q'+f(L-.5)+','+f(W*.52)+' '+f(L-.03)+','+f(W*.74),'t');
  o+=peg(.06,W-.25,-.22,.2)+peg(L-.06,W-.25,.22,.2)+peg(c,W-.02,0,.25);
  return o;
}
function gazebo(L,W,m){
  const cx=L/2, cy=W/2; let o=R(0,0,L,W,'s',.08)+R(0,0,L,W,'d',.08)+R(.12,.12,L-.24,W-.24,'t',.05);
  o+=Ln(.04,.04,cx-.18,cy-.18,'d')+Ln(L-.04,.04,cx+.18,cy-.18,'d')+Ln(.04,W-.04,cx-.18,cy+.18,'d')+Ln(L-.04,W-.04,cx+.18,cy+.18,'d');
  o+=R(cx-.2,cy-.2,.4,.4,'b',.06)+R(cx-.1,cy-.1,.2,.2,'t',.03);
  [[.04,.04,-1,-1],[L-.04,.04,1,-1],[.04,W-.04,-1,1],[L-.04,W-.04,1,1]].forEach(q=>{ o+=R(q[0]-.05,q[1]-.05,.1,.1,'k',.02)+peg(q[0],q[1],q[2]*.26,q[3]*.26); });
  return o;
}

/* ---------- Furniture, grills, pools ---------- */
function chair(cw,cd){ return R(-cw/2,0,cw,cd,'b',.09)+R(-cw/2+.04,cd-.08,cw-.08,.07,'k',.035)+R(-cw/2,.08,.05,cd-.2,'d',.02)+R(cw/2-.05,.08,.05,cd-.2,'d',.02); }
function tableset(L,W,m){
  const s=m.p||{}, tl=s.tl, tw=s.tw, cw=s.cw||.55, cd=s.cd||.55, n=s.n||4, x0=(L-tl)/2, y0=(W-tw)/2;
  let o=R(x0,y0,tl,tw,'b',.05)+Ln(x0+tl/2,y0+.03,x0+tl/2,y0+tw-.03,'t');
  [[.08,.08],[tl-.08,.08],[.08,tw-.08],[tl-.08,tw-.08]].forEach(q=>{ o+=C(x0+q[0],y0+q[1],.025,'d'); });
  const per=s.ends?(n-2)/2:n/2, gap=Math.max(tl/per,cw);
  for(let i=0;i<per;i++){ const x=L/2+(i-(per-1)/2)*gap; o+=at(x,y0,180,chair(cw,cd))+at(x,y0+tw,0,chair(cw,cd)); }
  if(s.ends) o+=at(x0,W/2,90,chair(cw,cd))+at(x0+tl,W/2,-90,chair(cw,cd));
  return o;
}
function grill(L,W,m){
  const s=m.p||{}, c=W/2, ty=m.type; let o='';
  if(ty==='box'){
    o+=R(0,.02,L,W-.04,'b',.06)+R(.03,.05,L-.06,W-.1,'d',.04)+R(L/2-.1,c-.016,.2,.032,'k',.016);
    o+=C(L*.2,c,.035,'d')+C(L*.8,c,.035,'d')+Ln(.05,0,.05,W,'t')+Ln(L-.05,0,L-.05,W,'t');
  } else if(ty==='kettle'){
    const r=(s.dia||.57)/2, cx=L/2, cy=c;
    [90,210,330].forEach(a=>{ const q=a*Math.PI/180; o+=Ln(cx,cy,cx+Math.cos(q)*(r+.07),cy+Math.sin(q)*(r+.07),'d'); if(a!==90) o+=at(cx+Math.cos(q)*(r+.07),cy+Math.sin(q)*(r+.07),a+90,R(-.09,-.025,.18,.05,'k',.02)); });
    o+=C(cx,cy,r,'b')+C(cx,cy,r-.035,'d')+R(cx-.08,cy-.017,.16,.034,'k',.017)+C(cx+.13,cy-.12,.04,'d')+C(cx+.13,cy-.12,.012,'k');
    o+=R(cx-r-.07,cy-.08,.06,.16,'d',.03)+R(cx+r+.01,cy-.08,.06,.16,'d',.03);
  } else {
    const bw=s.box||.66, bx=(L-bw)/2;
    o+=R(0,.1,bx-.01,W-.26,'b',.03)+R(bx+bw+.01,.1,bx-.01,W-.26,'b',.03)+C(L-bx/2,c-.02,.15,'h');
    for(let i=1;i<=3;i++) o+=Ln(.06*i,W-.16,.06*i,W-.1,'d');
    o+=R(bx,.04,bw,W-.16,'b',.07)+R(bx+.04,.08,bw-.08,W-.3,'d',.05)+R(bx+.1,W-.2,bw-.2,.03,'k',.015)+C(bx+bw/2,.2,.035,'d');
    o+=R(bx,W-.11,bw,.11,'b',.02); for(let i=0;i<(s.knobs||3);i++) o+=C(bx+bw*(i+1)/((s.knobs||3)+1),W-.055,.03,'k');
  }
  return o;
}
function pool(L,W,m){
  const r=L/2; let o=C(r,r,r,'b')+C(r,r,r-.13,'d')+C(r,r,r-.17,'g');
  o+=P('M'+f(r*.55)+','+f(r*.8)+'q'+f(r*.18)+','+f(-r*.1)+' '+f(r*.36)+',0','t')+P('M'+f(r)+','+f(r*1.2)+'q'+f(r*.18)+','+f(-r*.1)+' '+f(r*.36)+',0','t')+P('M'+f(r*.6)+','+f(r*1.35)+'q'+f(r*.14)+','+f(-r*.08)+' '+f(r*.28)+',0','t');
  o+=C(r*1.72,r*1.45,.04,'k');
  return o;
}
function lounger(L,W){
  let o=R(0,0,L,W,'b',.07)+Ln(L*.36,0,L*.36,W,'d')+Ln(L*.72,0,L*.72,W,'d')+R(.06,.09,.24,W-.18,'d',.06);
  for(let x=.42;x<L-.1;x+=.14) if(Math.abs(x-L*.36)>.06&&Math.abs(x-L*.72)>.06) o+=Ln(x,.05,x,W-.05,'t');
  return o;
}
function relax(L,W,m){
  const s=m.p||{}, ty=m.type, c=W/2;
  if(ty==='lounger') return lounger(L,W);
  if(ty==='pair'){ const lw=s.lw||.6; return lounger(L,lw)+at(0,W-lw,0,lounger(L,lw))+(s.ts ? R(.25,c-s.ts/2,s.ts,s.ts,'b',.05)+R(.31,c-s.ts/2+.06,s.ts-.12,s.ts-.12,'t',.03) : C(.3,c,(s.tr||.2),'b')+C(.3,c,(s.tr||.2)-.05,'t')); }
  let o=R(.12,c-.03,L-.24,.06,'d',.03)+R(.42,.04,.07,W-.08,'b',.035)+R(L-.49,.04,.07,W-.08,'b',.035);
  const a=.2, b=L-.2, bu=W-.16;
  o+=P('M'+f(a)+','+f(c)+'Q'+f(L/2)+','+f(c-bu)+' '+f(b)+','+f(c)+'Q'+f(L/2)+','+f(c+bu)+' '+f(a)+','+f(c)+'Z','g');
  [-.5,0,.5].forEach(k=>{ o+=P('M'+f(a+.1)+','+f(c)+'Q'+f(L/2)+','+f(c+bu*k)+' '+f(b-.1)+','+f(c),'t'); });
  o+=C(a,c,.04,'k')+C(b,c,.04,'k');
  return o;
}

const FN = {car, van, motorhome, caravan, trailer, moto, bike, tentPop, tentDome, tentTunnel, rooftent, awning, airawning, gazebo, tableset, grill, pool, relax};
const cache = {};
/* model = catalogue entry with its real dimensions; L and W = the size to draw (the outline is stretched when the guest edits the size) */
function svg(model, L, W){
  const key=model.id+'|'+L+'|'+W; if(cache[key]) return cache[key];
  const fn=FN[model.draw]; let s = fn ? fn(model.L, model.W, model) : R(0,0,model.L,model.W,'b',.1);
  if(Math.abs(L-model.L)>.0051 || Math.abs(W-model.W)>.0051) s='<g transform="scale('+f(L/model.L)+' '+f(W/model.W)+')">'+s+'</g>';
  return cache[key]=s;
}
return {svg, rp, FN};
})();
