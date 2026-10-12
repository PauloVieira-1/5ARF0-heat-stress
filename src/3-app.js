
/* ---------- app ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COW=Object.fromEntries(COWS.map(c=>[c.id,c]));
const START_STEP=36, ESC_LIMIT=3, ESC_HOURS=2;
const I={
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
};
const LABEL={breathing:'Fast, irregular breathing',bodyTemp:'Raised body temperature',rumination:'Less rumination',standing:'Standing more, lying less',thi:'High THI',sun:'Long time in direct sun',milk:'Milk yield dropping'};
const ADVICE={
  breathing:['Count her breaths','60 or more per minute, drooling or open-mouth breathing are signs of heat stress.',['p3464']],
  bodyTemp:['Cool her','Sprinklers and fans lower body temperature.',['chen','west']],
  rumination:['Check water','Heat-stressed cows spend more time drinking.',['cook']],
  standing:['Give her shade to lie down in','Cows stand more as body temperature rises.',['allen','west']],
  thi:['Cool the whole group','Milk losses start at THI 68. Use shade, sprinklers and fans.',['zim','p3464']],
  sun:['Get her out of the sun','Shade lowers body temperature.',['west','schutz']],
  milk:['Compare at the next milking','Heat stress lowers feed intake and milk yield.',['west']],
};
const OBS={fast:'Breathing 60+/min',drool:'Drooling',open:'Open mouth, tongue out',stand:'Standing, restless',group:'Grouping together',dull:'Dull, head low',eat:'Eating less',sunobs:'Standing in full sun',normal:'Looks normal'};
const SCORE=['0 Normal','1 Mild','2 Moderate','3 Severe'];
const heatScore=o=>o.has('open')?3:o.has('dull')?2:['fast','drool','stand','group'].some(k=>o.has(k))?1:0;
const SCORE_ACT=['','Start cooling: shade, sprinklers, fans.','Start cooling: shade, sprinklers, fans.','Move her to cool shade with water and feed now. Get a vet exam.'];
const CALL={heat:'Heat stress',no:'Not heat stress',vet:'Not sure: ask the vet'};
const ACTS={yard:'Moved to shaded yard by the barn',barn:'Moved into the barn',fans:'Fans and sprinklers on',water:'Fresh water given',vet:'Called the vet'};
const BREED_EVAL=[
  {b:'Holstein-Friesian',n:1840,rec:92,fa:17,note:''},
  {b:'MRIJ',n:310,rec:88,fa:19,note:''},
  {b:'Jersey',n:160,rec:84,fa:22,note:'Small sample'},
  {b:'Blaarkop',n:95,rec:76,fa:26,note:'Below target'},
];

const newForm=()=>({obs:new Set(),call:null,acts:new Set(),note:'',nearby:true,err:''});
const S={sub:'why',step:START_STEP,thr:60,tab:'today',role:'farmer',sel:'001',filter:'all',independent:false,
  checks:{},ivs:{},missed:[],form:newForm(),missOpen:false,missForm:newForm(),
  share:{vet:false,dev:false,coop:false},timer:null,toastTimer:null};

const fmtDur=min=>{const h=Math.floor(min/60),m=min%60;return h?`${h} h${m?' '+m+' min':''}`:`${m} min`;};
const level=pct=>pct>=S.thr?'high':pct>=40?'mod':'ok';
const LV={high:'High',mod:'Moderate',ok:'Low'};
const thiBand=v=>v>=68?['Above limit 68','mod']:['Below limit 68','ok'];
function bearing(x,y){const dx=x-HOUSE.x,dy=y-HOUSE.y;const deg=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
  const names=['north','north-east','east','south-east','south','south-west','west','north-west'];
  return{deg,name:names[Math.round(deg/45)%8],dist:Math.round(Math.hypot(dx,dy)/10)*10};}
function status(a){const ck=S.checks[a.id];
  if(ck&&ck.step<=S.step){const moved=ck.acts.some(x=>x!=='vet');
    const k=ck.call==='no'?'false':ck.call==='vet'?'vet':moved?'resolved':'confirmed';
    return{k,ck,label:{false:'False alarm',vet:'Vet asked',resolved:'Confirmed · resolved',confirmed:'Confirmed'}[k],cls:{false:'plain',vet:'info',resolved:'ok',confirmed:'mod'}[k]};}
  return{k:'open',label:'Unchecked',cls:'high',age:(S.step-a.step)*STEP};}
function compute(){return simulate(S.step,S.ivs,S.checks,S.thr);}
function escalation(sim){const q=sim.alerts.filter(a=>a.peak>=80&&status(a).k==='open'&&(S.step-a.step)*STEP>=ESC_HOURS*60);return{q,shared:q.length>=ESC_LIMIT};}
function topReasons(rec,n=3){return Object.entries(rec.contrib).filter(([,v])=>v>0.15).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k);}
function cowAlerts(sim,id){return sim.alerts.filter(a=>a.cow===id);}
function openAlertFor(sim,id){return cowAlerts(sim,id).filter(a=>status(a).k==='open').pop()||null;}
function latestAlertFor(sim,id){const list=cowAlerts(sim,id);return list[list.length-1]||null;}

/* ---------- small pieces ---------- */
function riskBar(p,u,lv){const lo=Math.max(0,p-u),hi=Math.min(100,p+u);const col=`var(--${lv})`;
  return `<span class="bar"><span class="band" style="left:${lo}%;width:${hi-lo}%;background:${col}"></span><span class="fill" style="width:${p}%;background:${col}"></span><span class="th" style="left:${S.thr}%"></span></span>`;}
function spark(id,sim){const tl=sim.tl[id];const from=Math.max(0,S.step-18);const pts=tl.slice(from);const w=220,h=46;
  if(pts.length<2)return '';const x=i=>4+i*(w-8)/(pts.length-1),y=p=>4+(1-p)*(h-8);
  const d=pts.map((r,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(r.p).toFixed(1)}`).join('');
  const last=pts[pts.length-1];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-label="Likelihood over the last ${fmtDur((pts.length-1)*STEP)}" role="img" style="max-width:260px">
   <line x1="4" x2="${w-4}" y1="${y(S.thr/100)}" y2="${y(S.thr/100)}" stroke="var(--high)" stroke-dasharray="3 3" stroke-width="1" opacity=".7"/>
   <path d="${d} L${x(pts.length-1)},${h-4} L4,${h-4} Z" fill="var(--${level(last.p*100)})" opacity=".14"/>
   <path d="${d}" fill="none" stroke="var(--${level(last.p*100)})" stroke-width="2"/>
   <circle cx="${x(pts.length-1)}" cy="${y(last.p)}" r="3.5" fill="var(--${level(last.p*100)})"/></svg>`;}

/* ---------- THI chart ---------- */
function thiChart(sim){const w=760,h=190,l=40,r=16,t=16,b=30;
  const x=m=>l+(m-START)/(END-START)*(w-l-r),y=v=>t+(80-v)/(80-58)*(h-t-b);
  const pts=[];for(let s=0;s<=N;s++)pts.push([x(clk(s)),y(thiAt(clk(s)))]);
  const line=a=>a.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const past=pts.slice(0,S.step+1),fut=pts.slice(S.step);const y68=y(68);
  const area=a=>`${line(a)} L${a[a.length-1][0].toFixed(1)},${y68} L${a[0][0].toFixed(1)},${y68} Z`;
  const nowM=clk(S.step),nowT=thiAt(nowM);
  const grid=[60,64,68,72,76,80].map(v=>`<line x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${l-8}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
  const ticks=[360,540,720,900,1080,1260].map(m=>`<text x="${x(m)}" y="${h-10}" text-anchor="middle">${fmtClock(m)}</text>`).join('');
  const marks=sim.alerts.map(a=>{const st=status(a);return `<g><title>Cow ${a.cow} · ${fmtClock(clk(a.step))} · ${st.label}</title><path d="M${x(clk(a.step))-5},${h-b+1} l5,-8 l5,8z" fill="var(--${st.k==='open'?'high':'ok'})"/></g>`;}).join('');
  const nx=x(nowM),ny=y(nowT),lx=Math.min(Math.max(nx,l+60),w-r-60);
  return `<svg class="chart-svg" id="thiChart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Temperature-humidity index through the day. Now ${nowT.toFixed(1)} at ${fmtClock(nowM)}.">
    <defs><clipPath id="above"><rect x="0" y="0" width="${w}" height="${y68}"/></clipPath></defs>
    ${grid}
    <path d="${area(past)}" fill="var(--high)" opacity=".18" clip-path="url(#above)"/>
    <path d="${area(fut)}" fill="var(--high)" opacity=".06" clip-path="url(#above)"/>
    <line x1="${l}" x2="${w-r}" y1="${y68}" y2="${y68}" stroke="var(--high)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${l+6}" y="${y68-6}" style="fill:var(--high)">heat stress limit · THI 68</text>
    <path d="${line(fut)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
    <path d="${line(past)}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
    <text x="${x(1170)}" y="${y(thiAt(1170))-12}" text-anchor="middle">forecast</text>
    <line x1="${nx}" x2="${nx}" y1="${t}" y2="${h-b}" stroke="var(--accent)" stroke-width="1.5"/>
    <circle cx="${nx}" cy="${ny}" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${lx}" y="${t+2}" text-anchor="middle" style="fill:var(--ink);font-weight:500">${fmtClock(nowM)} · THI ${nowT.toFixed(1)}</text>
    ${marks}
    <line x1="${l}" x2="${w-r}" y1="${h-b}" y2="${h-b}" stroke="var(--muted)" stroke-width="1"/>
    ${ticks}
  </svg>`;}

/* ---------- map ---------- */
function mapSvg(sim){const Y=v=>H-v;const now=S.step;
  const trees=SHADE.slice(1).map(s=>{const blobs=[[0,0,1],[-.45,.3,.62],[.42,.35,.6],[.35,-.4,.55],[-.4,-.35,.55]];
    return `<ellipse cx="${s.x+8}" cy="${Y(s.y)+10}" rx="${s.r}" ry="${s.r*0.8}" fill="var(--shade)"/>`+
      blobs.map(([dx,dy,k])=>`<circle cx="${s.x+dx*s.r*.6}" cy="${Y(s.y)+dy*s.r*.6}" r="${s.r*.42*k}" fill="var(--tree)"/>`).join('')+
      `<circle cx="${s.x}" cy="${Y(s.y)}" r="${s.r*.3}" fill="var(--tree-dark)"/>`;}).join('');
  const yard=SHADE[0];
  let cows='';let sel=null;
  const order=[...COWS].sort((a,b)=>(a.id===S.sel)-(b.id===S.sel));
  for(const c of order){const r=sim.tl[c.id][now];const pct=r.p*100,lv=level(pct);const oa=openAlertFor(sim,c.id);
    const isSel=c.id===S.sel;if(isSel)sel=r;
    cows+=`<g class="cow" data-cow="${c.id}" tabindex="0" role="button" aria-label="Cow ${c.id}, ${Math.round(pct)}%, ${LV[lv]}">
      ${oa?`<circle cx="${r.x}" cy="${Y(r.y)}" r="13" fill="none" stroke="var(--high)" stroke-width="2" opacity=".55"/>`:''}
      ${isSel?`<circle cx="${r.x}" cy="${Y(r.y)}" r="12" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`:''}
      <circle cx="${r.x}" cy="${Y(r.y)}" r="7" fill="var(--${lv})" stroke="var(--surface)" stroke-width="1.8"/>
      ${(lv==='high'||isSel)?`<text class="lbl" x="${r.x+11}" y="${Y(r.y)-9}" style="fill:var(--ink);paint-order:stroke;stroke:var(--grass);stroke-width:3px">${c.id}</text>`:''}
    </g>`;}
  let route='';
  if(sel){const b=bearing(sel.x,sel.y);const mx=(HOUSE.x+sel.x)/2,my=Y((HOUSE.y+sel.y)/2);
    route=`<line x1="${HOUSE.x}" y1="${Y(HOUSE.y)}" x2="${sel.x}" y2="${Y(sel.y)}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 5" opacity=".8"/>
      <g transform="translate(${mx},${my})"><rect x="-44" y="-12" width="88" height="22" rx="11" fill="var(--ink)"/><text x="0" y="4" text-anchor="middle" style="fill:var(--surface);font-family:var(--mono);font-size:11.5px;font-weight:500">${b.dist} m ${b.name.split('-').map(w=>w[0].toUpperCase()).join('')}</text></g>`;}
  return `<svg class="map-svg" id="map" viewBox="0 0 ${W} ${H}" role="group" aria-label="Pasture map with cow positions">
    <defs><pattern id="mow" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><rect width="22" height="11" fill="var(--grass-line)"/></pattern></defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="var(--grass)"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#mow)" opacity=".55"/>
    <rect x="${W-10}" y="0" width="10" height="${H}" fill="var(--water)"/>
    <rect x="0" y="0" width="${W}" height="9" fill="var(--water)"/>
    <text x="${W-16}" y="${H/2}" text-anchor="middle" transform="rotate(-90 ${W-16} ${H/2})" style="fill:var(--info);font-size:11px;font-weight:600">sloot (ditch)</text>
    <rect x="0" y="${Y(128)}" width="226" height="128" fill="var(--yard)"/>
    <rect x="${yard.x-40}" y="${Y(yard.y)-30}" width="80" height="60" rx="6" fill="var(--shade)" stroke="var(--tree-dark)" stroke-dasharray="4 3"/>
    <text x="${yard.x}" y="${Y(yard.y)-36}" text-anchor="middle" style="font-size:11px">shaded yard</text>
    <rect x="${TROUGH.x-14}" y="${Y(TROUGH.y)-4}" width="28" height="8" rx="3" fill="var(--water)" stroke="var(--info)"/>
    <rect x="${BARN.x}" y="${Y(BARN.y+BARN.h)}" width="${BARN.w}" height="${BARN.h}" fill="var(--building)" stroke="var(--roof)" stroke-width="2"/>
    <line x1="${BARN.x}" y1="${Y(BARN.y+BARN.h/2)}" x2="${BARN.x+BARN.w}" y2="${Y(BARN.y+BARN.h/2)}" stroke="var(--roof)" stroke-width="1.5"/>
    <text x="${BARN.x+BARN.w/2}" y="${Y(BARN.y+BARN.h)-6}" text-anchor="middle">Barn</text>
    <rect x="${HOUSE.x-14}" y="${Y(HOUSE.y)-14}" width="28" height="22" fill="var(--building)" stroke="var(--roof)" stroke-width="2"/>
    <path d="M${HOUSE.x-17},${Y(HOUSE.y)-14} L${HOUSE.x},${Y(HOUSE.y)-26} L${HOUSE.x+17},${Y(HOUSE.y)-14}Z" fill="var(--roof)"/>
    ${trees}
    ${route}
    <g transform="translate(${HOUSE.x+22},${Y(HOUSE.y)-8})"><rect x="0" y="-10" width="36" height="20" rx="10" fill="var(--accent)"/><text x="18" y="4" text-anchor="middle" style="fill:var(--surface);font-size:11px">You</text></g>
    ${cows}
    <g transform="translate(26,30)"><circle r="14" fill="var(--surface)" opacity=".85"/><path d="M0,-10 L5,4 L0,1 L-5,4Z" fill="var(--ink)"/><text y="-17" text-anchor="middle" style="font-size:11px">N</text></g>
    <g transform="translate(${W-140},${H-18})"><line x1="0" x2="100" y1="0" y2="0" stroke="var(--ink)" stroke-width="2"/><line x1="0" x2="0" y1="-4" y2="4" stroke="var(--ink)" stroke-width="2"/><line x1="100" x2="100" y1="-4" y2="4" stroke="var(--ink)" stroke-width="2"/><text x="50" y="-6" text-anchor="middle" style="font-size:11px;font-family:var(--mono);font-weight:500">100 m</text></g>
  </svg>`;}

/* ---------- sources (demo only) ---------- */
const SRC=[
 {k:'nrc',ref:'National Research Council (1971). A guide to environmental research on animals.',url:'https://openlibrary.org/works/OL6986171W'},
 {k:'zim',ref:'Zimbelman, R.B., Rhoads, R.P., Rhoads, M.L., Duff, G.C., Baumgard, L.H. & Collier, R.J. (2009). A re-evaluation of the impact of temperature humidity index (THI) and black globe humidity index (BGHI) on milk production in high producing dairy cows. Proceedings of the Southwest Nutrition and Management Conference, 158–169. Not online; checked through papers that cite it.',url:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0206520'},
 {k:'p3464',ref:'Becker, C.A. & Stone, A.E. Recognizing heat stress in dairy cattle: a scoring system to help producers assess heat stress. Mississippi State University Extension, Publication P3464.',url:'https://extension.msstate.edu/publications/recognizing-heat-stress-dairy-cattle-scoring-system-help-producers-assess-heat-stress'},
 {k:'p3465',ref:'Becker, C.A., Woolums, A.R. & Stone, A.E. Recognizing heat stress in dairy cattle: how to visually record respiration rate. Mississippi State University Extension, Publication P3465.',url:'https://extension.msstate.edu/publications/recognizing-heat-stress-dairy-cattle-how-visually-record-respiration-rate'},
 {k:'polsky',ref:'Polsky, L. & von Keyserlingk, M.A.G. (2017). Invited review: Effects of heat stress on dairy cattle welfare. Journal of Dairy Science, 100(11), 8645–8657.',url:'https://doi.org/10.3168/jds.2017-12651'},
 {k:'becker',ref:'Becker, C.A., Collier, R.J. & Stone, A.E. (2020). Invited review: Physiological and behavioral effects of heat stress in dairy cows. Journal of Dairy Science, 103(8), 6751–6770.',url:'https://doi.org/10.3168/jds.2019-17929'},
 {k:'west',ref:'West, J.W. (2003). Effects of heat-stress on production in dairy cattle. Journal of Dairy Science, 86(6), 2131–2144.',url:'https://doi.org/10.3168/jds.S0022-0302(03)73803-X'},
 {k:'allen',ref:'Allen, J.D., Hall, L.W., Collier, R.J. & Smith, J.F. (2015). Effect of core body temperature, time of day, and climate conditions on behavioral patterns of lactating dairy cows experiencing mild to moderate heat stress. Journal of Dairy Science, 98(1), 118–127.',url:'https://doi.org/10.3168/jds.2013-7704'},
 {k:'cook',ref:'Cook, N.B., Mentink, R.L., Bennett, T.B. & Burgi, K. (2007). The effect of heat stress and lameness on time budgets of lactating dairy cows. Journal of Dairy Science, 90(4), 1674–1682.',url:'https://doi.org/10.3168/jds.2006-634'},
 {k:'soriani',ref:'Soriani, N., Panella, G. & Calamari, L. (2013). Rumination time during the summer season and its relationships with metabolic conditions and milk production. Journal of Dairy Science, 96(8), 5082–5094.',url:'https://doi.org/10.3168/jds.2013-6620'},
 {k:'schutz',ref:'Schütz, K.E., Rogers, A.R., Cox, N.R. & Tucker, C.B. (2009). Dairy cows prefer shade that offers greater protection against solar radiation in summer: shade use, behaviour, and body temperature. Applied Animal Behaviour Science, 116(1), 28–34.',url:'https://doi.org/10.1016/j.applanim.2008.07.005'},
 {k:'chen',ref:'Chen, J.M., Schütz, K.E. & Tucker, C.B. (2016). Cooling cows efficiently with water spray: behavioral, physiological, and production responses to sprinklers at the feed bunk. Journal of Dairy Science, 99(6), 4607–4618.',url:'https://doi.org/10.3168/jds.2015-10714'},
 {k:'heinicke',ref:'Heinicke, J., Pinto, S., Müschner-Siemens, T., Hoffmann, G., Ammon, C., Zhang, G. & Amon, T. (2020). Analysis of effects on physiological and behavioral characteristics to detect heat load of lactating dairy cows. Asian Conference on Precision Livestock Farming (ACPLF2020), Beijing.',url:'https://bib.vetmed.fu-berlin.de/pubdb/pub/26939-analysis-of-effects-on-physiological-and-behavioral-characteris/'},
 {k:'davison',ref:'Davison, C., Michie, C., Hamilton, A., Tachtatzis, C., Andonovic, I. & Gilroy, M. (2020). Detecting heat stress in dairy cattle using neck-mounted activity collars. Agriculture, 10(6), 210.',url:'https://doi.org/10.3390/agriculture10060210'},
 {k:'iqbal',ref:'Iqbal, M.W., Draganova, I., Morel, P.C.H. & Morris, S.T. (2021). Validation of an accelerometer sensor-based collar for monitoring grazing and rumination behaviours in grazing dairy cows. Animals, 11(9), 2724.',url:'https://doi.org/10.3390/ani11092724'},
 {k:'peng',ref:'Peng, Y., Kondo, N., Fujiura, T., Suzuki, T., Wulandari, Yoshioka, H. & Itoyama, E. (2019). Classification of multiple cattle behavior patterns using a recurrent neural network with long short-term memory and inertial measurement units. Computers and Electronics in Agriculture, 157, 247–253.',url:'https://doi.org/10.1016/j.compag.2018.12.023'},
 {k:'rudin',ref:'Rudin, C. (2019). Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead. Nature Machine Intelligence, 1(5), 206–215.',url:'https://doi.org/10.1038/s42256-019-0048-x'},
 {k:'zhang',ref:'Zhang, Y., Liao, Q.V. & Bellamy, R.K.E. (2020). Effect of confidence and explanation on accuracy and trust calibration in AI-assisted decision making. Proceedings of the 2020 Conference on Fairness, Accountability, and Transparency, 295–305.',url:'https://doi.org/10.1145/3351095.3372852'},
 {k:'goddard',ref:'Goddard, K., Roudsari, A. & Wyatt, J.C. (2011). Automation bias: a systematic review of frequency, effect mediators, and mitigators. Journal of the American Medical Informatics Association, 19(1), 121–127.',url:'https://doi.org/10.1136/amiajnl-2011-000089'},
 {k:'bucinca',ref:'Buçinca, Z., Malaya, M.B. & Gajos, K.Z. (2021). To trust or to think: cognitive forcing functions can reduce overreliance on AI in AI-assisted decision-making. Proceedings of the ACM on Human-Computer Interaction, 5(CSCW1), 1–21.',url:'https://doi.org/10.1145/3449287'},
 {k:'hogeveen',ref:'Hogeveen, H., Kamphuis, C., Steeneveld, W. & Mollenhorst, H. (2010). Sensors and clinical mastitis: the quest for the perfect alert. Sensors, 10(9), 7991–8009.',url:'https://doi.org/10.3390/s100907991'},
 {k:'sendelbach',ref:'Sendelbach, S. & Funk, M. (2013). Alarm fatigue: a patient safety concern. AACN Advanced Critical Care, 24(4), 378–386.',url:'https://doi.org/10.4037/nci.0b013e3182a903f9'},
 {k:'werkheiser',ref:'Werkheiser, I. (2018). Precision livestock farming and farmers\' duties to livestock. Journal of Agricultural and Environmental Ethics, 31(2), 181–195.',url:'https://doi.org/10.1007/s10806-018-9720-0'},
 {k:'bos',ref:'Bos, J.M., Bovenkerk, B., Feindt, P.H. & van Dam, Y.K. (2018). The quantified animal: precision livestock farming and the ethical implications of objectification. Food Ethics, 2(1), 77–92.',url:'https://doi.org/10.1007/s41055-018-00029-x'},
 {k:'wiseman',ref:'Wiseman, L., Sanderson, J., Zhang, A. & Jakku, E. (2019). Farmers and their data: an examination of farmers\' reluctance to share their data through the lens of the laws impacting smart farming. NJAS: Wageningen Journal of Life Sciences, 90–91, 1–10.',url:'https://doi.org/10.1016/j.njas.2019.04.007'},
 {k:'gdpr',ref:'Regulation (EU) 2016/679 (General Data Protection Regulation), Article 5(1)(c): data minimisation.',url:'https://eur-lex.europa.eu/eli/reg/2016/679/oj'},
 {k:'wet',ref:'Wet dieren (2011), Article 1.3 (intrinsic value) and Article 1.4 (general duty of care).',url:'https://wetten.overheid.nl/BWBR0030250'},
 {k:'winner',ref:'Winner, L. (1980). Do artifacts have politics? Daedalus, 109(1), 121–136.',url:'https://www.jstor.org/stable/20024652'},
 {k:'poel',ref:'Van de Poel, I., Nihlén Fahlquist, J., Doorn, N., Zwart, S. & Royakkers, L. (2012). The problem of many hands: climate change as an example. Science and Engineering Ethics, 18(1), 49–67.',url:'https://doi.org/10.1007/s11948-011-9276-0'},
 {k:'hleg',ref:'High-Level Expert Group on AI (2019). Ethics Guidelines for Trustworthy AI. European Commission.',url:'https://digital-strategy.ec.europa.eu/en/library/ethics-guidelines-trustworthy-ai'},
 {k:'hoven',ref:'Van den Hoven, J., Vermaas, P.E. & Van de Poel, I. (Eds.) (2015). Handbook of Ethics, Values, and Technological Design. Springer.',url:'https://doi.org/10.1007/978-94-007-6970-0'},
 {k:'hoffmann',ref:'Hoffmann, G., Herbut, P., Pinto, S., Heinicke, J., Kuhla, B. & Amon, T. (2019). Animal-related, non-invasive indicators for determining heat stress in dairy cows. Biosystems Engineering, 199, 83–96.',url:'https://doi.org/10.1016/j.biosystemseng.2019.10.017'},
 {k:'oliveira',ref:'Oliveira, C.P., de Sousa, F.C., da Silva, A.L., Schultz, É.B., Valderrama Londoño, R.I. & de Souza, P.A.R. (2025). Heat stress in dairy cows: impacts, identification, and mitigation strategies. A review. Animals, 15(2), 249.',url:'https://doi.org/10.3390/ani15020249'},
 {k:'vaneerd',ref:'Van Eerdenburg, F. & Plekkenpol, S. (2005). Heat stress in Dutch dairy cattle during summer. Proceedings of the ISAH, 229–232.'},
 {k:'report',ref:'Group A (2026). Detecting Heat Stress in Dairy Cows: An AI Decision Support System for Dutch Farms. 5ARF0 Phase 2 report, TU Eindhoven.'},
];
const SRCN=Object.fromEntries(SRC.map((s,i)=>[s.k,i+1]));
const cite=(...ks)=>`<sup class="cite">${ks.map(k=>`<a href="#sources" data-src="${k}">${SRCN[k]}</a>`).join(',')}</sup>`;
const CLAIMS=[
 ['Heat stress in Dutch dairy cows','Heat stress occurs in Dutch dairy cattle in summer',['vaneerd']],
 ['THI as the main heat index','THI is the most widely used index of the thermal environment',['oliveira']],
 ['THI and behaviour','Higher THI goes with less lying, more standing, more drinking and less rumination',['cook','soriani','report']],
 ['Which indicators to measure','Respiration rate and body temperature suit individual cows best; milk loss is more a consequence than an early sign; no agreed thresholds exist for animal-based indicators',['hoffmann','becker']],
 ['THI calculation','Temperature-humidity index from air temperature and humidity',['nrc']],
 ['Alert line at THI 68','High-yielding cows start losing milk at THI 68; lying and standing shift around THI 68',['zim','cook']],
 ['Normal breathing','26 to 50 breaths per minute in a cow without heat stress',['p3465']],
 ['Panting flag at 60/min, heat stress score in "Your check"','Score 1 from 60 breaths/min with slight drooling, standing, grouping; score 2 lethargy, head low; score 3 open mouth, tongue out',['p3464']],
 ['Panting detected by the neck collar','Neck-mounted accelerometers pick up exaggerated breathing motions',['davison']],
 ['Rumination from the collar, less rumination in heat','Collar rumination validated against observation; rumination drops in hot conditions',['iqbal','soriani']],
 ['Standing more, lying less','Heat stress shifts time from lying to standing',['cook','allen']],
 ['Body temperature','Cows are more likely to stand as core body temperature rises (50% at 38.93 °C)',['allen']],
 ['Eating less, milk yield dropping','Heat stress lowers dry matter intake and milk yield',['west','hoffmann']],
 ['Alert wording: panting, irregular breathing','Wording from the report narrative; collars detect exaggerated breathing motions',['report','davison']],
 ['Activity reading','Collars measure activity; not flagged, because activity as a heat sign depends on the cow\'s state',['davison','hoffmann']],
 ['"Eating less" and "Standing in full sun" in your check','Feed intake drops in heat; cows use shade',['west','schutz']],
 ['Drinking more','Time spent drinking rose from 0.3 to 0.5 h/day as THI rose',['cook']],
 ['Sun exposure and shade','Cows spend more time in shade when solar radiation is higher; shade, fans and sprinklers lower body temperature',['schutz','west']],
 ['Each cow compared with her own normal','Heat responses differ between individual cows',['heinicke']],
 ['Testing results per breed','Heat tolerance has a genetic component, so results may differ between breeds',['west','report']],
 ['Stage 1 neural network','Neural networks classify cattle behaviour from collar motion data',['peng']],
 ['Stage 2 decision tree','Use interpretable models for high-stakes decisions',['rudin']],
 ['Likelihood shown with a range','Showing confidence helps people calibrate trust',['zhang']],
 ['Actions: shade, sprinklers, fans, water, vet','Cooling and care steps per heat stress score; sprinklers, shade and fans lower body temperature',['p3464','chen','west','becker']],
 ['Alert level leans towards alerting, capped at 70%','Sensor alerts trade sensitivity against specificity; many false alarms cause desensitisation and missed alarms',['hogeveen','sendelbach','report']],
 ['Independent check mode','Cognitive forcing designs reduce overreliance on AI; automation bias is common in decision support',['bucinca','goddard']],
 ['Farmer stays the one who knows the cows','PLF may cost farmers their identity and relationship with their animals',['werkheiser']],
 ['Collect only what is needed','Data minimisation',['gdpr']],
 ['Farmer controls who sees the data','Unclear data ownership and trust stop farmers from sharing',['wiseman']],
 ['Care kept separate from surveillance','Design choices decide who gains power',['winner','report']],
 ['Responsibility table','With many actors involved, responsibility can fall to no one; roles are set in advance',['poel','report']],
 ['Farmer legally responsible for care','Duty of care and intrinsic value of animals',['wet']],
 ['Limits of the system','Quantification objectifies animals; welfare includes affective states that sensors do not measure',['bos','polsky']],
 ['Values used','Robustness, privacy, human oversight, transparency, fairness, accountability',['hleg']],
 ['Design for Values method','Identify, embed and assess values in design',['hoven']],
];
function sourcesHtml(){
  return `<section class="panel"><div class="ph"><h2>Sources</h2><span class="pill mod">Demo only</span></div>
   <div class="tscroll"><table><thead><tr><th>In the app</th><th>Based on</th><th>Ref.</th></tr></thead><tbody>
   ${CLAIMS.map(([a,b,ks])=>`<tr><td><b>${a}</b></td><td>${b}</td><td class="num" style="text-align:left;white-space:nowrap">${ks.map(k=>`<a class="reflink" href="#ref-${k}" data-src="${k}">[${SRCN[k]}]</a>`).join(' ')}</td></tr>`).join('')}
   </tbody></table></div></section>
  <section class="panel"><div class="ph"><h2>Not from literature</h2></div>
   <ul class="list">${[
    'All cows, readings, the farm and the day are made up.',
    'Model weights, likelihoods and ranges are invented to show the interface.',
    'Model card, per-breed results, change log and the missed-case and false-alarm estimates are illustrative.',
    'Default alert level 60%, the 70% cap, the 60 m radius and the NVWA rule (3 alerts, 80%, 2 h, 7 days) are design choices from the report.',
    'The Moderate band from 40%, the "30 min in the sun" step in the decision tree path and the GPS update every 10 minutes are design choices.',
    'Cut-offs that turn a reading red are illustrative, except breathing above 50 or 60 per minute and THI 68. The literature gives no agreed thresholds for animal-based indicators (Hoffmann et al.).',
    'Collar IDs, battery levels and fit-check dates are sample data. Walking time assumes 80 m per minute.',
    'Collar comfort checks follow the report\'s recommendation. We found no study on how neck collars affect cow comfort.',
   ].map(t=>`<li class="no">${I.info}<span>${t}</span></li>`).join('')}</ul></section>
  <section class="panel"><div class="ph"><h2>References</h2></div>
   <ol class="refs">${SRC.map(s=>`<li id="ref-${s.k}" class="${S.hl===s.k?'hl':''}">${esc(s.ref)}${s.url?` <a href="${s.url}" target="_blank" rel="noopener">${esc(s.url.replace(/^https?:\/\//,''))}</a>`:''}</li>`).join('')}</ol></section>`;}

/* ---------- views ---------- */
function bannerHtml(sim){const open=sim.alerts.filter(a=>status(a).k==='open');
  if(!open.length){const done=sim.alerts.length;
    return `<section class="banner calm"><span class="dot" aria-hidden="true"></span><div class="msg"><strong>No unchecked alerts</strong><span>THI ${thiAt(clk(S.step)).toFixed(1)}</span></div></section>`;}
  open.sort((a,b)=>sim.tl[b.cow][S.step].p-sim.tl[a.cow][S.step].p);
  const a=open[0],r=sim.tl[a.cow][S.step],b=bearing(r.x,r.y);
  const why=[r.panting?'Panting':null,...topReasons(r,2).map(k=>LABEL[k])].filter(Boolean).slice(0,3).map((w,i)=>i?w.toLowerCase():w).join(', ');
  const more=open.length>1?` · ${open.length-1} more cow${open.length>2?'s':''} waiting`:'';
  return `<section class="banner" role="status"><span class="dot" aria-hidden="true"></span>
    <div class="msg"><strong>Cow ${a.cow} needs checking${more}</strong>
    <span>${why} · THI ${r.thi.toFixed(0)} · ${Math.round(r.p*100)}% likely (${Math.round(Math.max(0,r.p*100-r.u))} to ${Math.round(Math.min(100,r.p*100+r.u))}%) · ${b.dist} m ${b.name} · flagged ${fmtClock(clk(a.step))}</span></div>
    <button class="btn danger" type="button" data-goto="${a.cow}">Check cow ${a.cow}</button></section>`;}

function tilesHtml(sim){const m=clk(S.step),thi=thiAt(m),h=humAt(m),t=tempFrom(thi,h),band=thiBand(thi);
  const now=COWS.map(c=>sim.tl[c.id][S.step].p*100);const hi=now.filter(p=>p>=S.thr).length,mod=now.filter(p=>p>=40&&p<S.thr).length;
  const open=sim.alerts.filter(a=>status(a).k==='open').length;const escl=escalation(sim);
  return `<section class="tiles" aria-label="Conditions now">
    <div class="tile ${band[1]==='ok'?'':band[1]==='mod'?'warm':'hot'}"><span class="k">THI now${cite('zim')}</span><span class="v">${thi.toFixed(1)}</span><span class="s"><span class="pill ${band[1]}">${band[0]}</span></span></div>
    <div class="tile"><span class="k">Temperature</span><span class="v">${t.toFixed(1)}<small>°C</small></span><span class="s">Humidity ${Math.round(h)}%</span></div>
    <div class="tile ${open?'hot':''}"><span class="k">Unchecked alerts</span><span class="v">${open}</span><span class="s">${hi} above alert level</span></div>
    <div class="tile ${escl.q.length?'warm':''}"><span class="k">Watch list</span><span class="v">${mod}</span><span class="s">Moderate</span></div>
  </section>`;}

function herdHtml(sim){const rows=COWS.map(c=>({c,r:sim.tl[c.id][S.step]})).map(o=>({...o,pct:o.r.p*100,lv:level(o.r.p*100)}));
  rows.sort((a,b)=>b.pct-a.pct);
  const f=S.filter;const shown=rows.filter(o=>f==='all'||(f==='att'&&o.lv==='high')||(f==='watch'&&o.lv==='mod'));
  const cnt={all:rows.length,att:rows.filter(o=>o.lv==='high').length,watch:rows.filter(o=>o.lv==='mod').length};
  const where=r=>r.iv&&(r.iv.kind==='barn')?'In the barn':r.iv&&r.iv.kind==='yard'?'Shaded yard':r.inSun?`Sun ${fmtDur(r.sun)}`.replace('Sun 0 min','In the sun'):'In shade';
  return `<section class="panel" aria-labelledby="herdT">
    <div class="ph"><h2 id="herdT">Herd</h2><p>Alert level ${S.thr}%</p></div>
    <div class="filters" role="group" aria-label="Filter herd">
      ${[['all','All'],['att','Above alert level'],['watch','Watch list']].map(([k,t])=>`<button type="button" class="fchip" data-filter="${k}" aria-pressed="${f===k}">${t} <span class="num">${cnt[k]}</span></button>`).join('')}
    </div>
    <div class="herd">${shown.length?shown.map(({c,r,pct,lv})=>`
      <button type="button" class="hrow" data-cow="${c.id}" aria-pressed="${c.id===S.sel}">
        <span class="who"><b>${c.id} <em>${esc(c.name)}</em></b><span><i class="dot ${lv}"></i>${LV[lv]} · ${where(r)}${r.gap?' · data gap':''}</span></span>
        ${riskBar(pct,r.u,lv)}
        <span class="num" style="text-align:right">${Math.round(pct)}%</span>
      </button>`).join(''):`<p class="muted" style="padding:12px 6px">None</p>`}</div>
  </section>`;}

function whyHtml(r,c,lv){const items=Object.entries(r.contrib).filter(([,v])=>v>0.05).sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1.5,...items.map(i=>i[1]));
  const reading={breathing:`${r.resp}/min, her normal ${c.baseResp}`,bodyTemp:`${r.temp} °C, normal ${c.baseTemp}`,rumination:`down ${Math.max(0,r.rumDrop)}% vs her normal`,
    standing:`lying down ${Math.max(0,r.lieDrop)}% less`,thi:`THI ${r.thi.toFixed(1)}, limit 68`,sun:`${fmtDur(r.sun)} in direct sun`,milk:`on track for −${r.milk}% today`};
  if(!items.length)return `<p class="note">No signals raised.</p>`;
  return `<div class="why">${items.slice(0,6).map(([k,v])=>`<div class="row"><div class="lab">${LABEL[k]} <span>· ${reading[k]}</span></div><div class="mini" aria-hidden="true"><i style="width:${Math.min(100,v/max*100)}%;background:var(--${lv})"></i></div></div>`).join('')}</div>`;}

function rulePath(r,pct){const n=[[`Breathing 60+/min`,r.resp>=60],[`THI 68+`,r.thi>=68],[`In sun 30+ min`,r.inSun&&r.sun>=30]];
  const path=[];for(const [t,y] of n){path.push(`<span class="node ${y?'yes':'no'}">${t}: ${y?'yes':'no'}</span>`);if(!y)break;}
  return `<div class="rulepath"><span class="note">Decision tree path (illustrative)${cite('p3464','zim','report')}</span>${path.join('<span class="arr">→</span>')}<span class="arr">→</span><span class="node leaf ${level(pct)}">${LV[level(pct)]}</span></div>`;}
function signalsHtml(r,c){const f=(cond)=>cond?'flag':'';
  const rum=r.gap==='rumination'?`<dd class="gap">no data <small>sensor gap</small></dd>`:`<dd class="${f(r.rumDrop>=20)}">${r.rum} min/h <small>(${c.baseRum})</small></dd>`;
  return `<div class="sigs">
   <div class="sig"><h4>Behavioural <small>collar</small></h4><dl>
     <dt>Activity${cite('davison')}</dt><dd>${Math.round(80+rnd(c.n,12)*40+(rnd(c.n*31+S.step,9)-0.5)*10)} steps/h</dd>
     <dt>Lying down${cite('cook')}</dt><dd class="${f(r.lieDrop>=25)}">${r.lie} min/h <small>(${c.baseLie})</small></dd>
     <dt>Rumination${cite('soriani')}</dt>${rum}
     <dt>Feeding${cite('west')}</dt><dd class="${f(r.feedDrop>=25)}">${r.feed} min/h <small>(${c.baseFeed})</small></dd>
     <dt>Drinking visits${cite('cook')}</dt><dd>${r.drink}/h <small>(${c.baseDrink})</small></dd>
     <dt>Panting${cite('davison','p3464')}</dt><dd class="${f(r.panting)}">${r.panting?'Yes, 60+/min':'No'}</dd></dl></div>
   <div class="sig"><h4>Physiological <small>collar</small></h4><dl>
     <dt>Breathing rate${cite('p3465')}</dt><dd class="${f(r.resp>50)}">${r.resp}/min <small>(${c.baseResp})</small></dd>
     <dt>Body temperature${cite('allen')}</dt><dd class="${f(r.temp-c.baseTemp>=0.5)}">${r.temp} °C <small>(${c.baseTemp})</small></dd></dl></div>
   <div class="sig"><h4>Environmental <small>weather station, GPS</small></h4><dl>
     <dt>THI${cite('nrc','zim')}</dt><dd class="${f(r.thi>=68)}">${r.thi.toFixed(1)}</dd>
     <dt>Sun exposure${cite('schutz')}</dt><dd class="${f(r.inSun&&r.sun>=30)}">${r.inSun?fmtDur(r.sun):'shade'}</dd></dl></div>
   <div class="sig"><h4>Production <small>milking robot</small></h4><dl>
     <dt>Milk vs 7-day avg${cite('west')}</dt><dd class="${f(r.milk>=2)}">−${r.milk}% <small>(${c.milk} kg)</small></dd></dl></div>
  </div><p class="note">(Brackets) her normal. Normal breathing 26 to 50/min${cite('p3465','heinicke')}. Other red marks use illustrative cut-offs: no agreed thresholds exist for animal-based indicators${cite('hoffmann')}</p>`;}

function checkFormHtml(a,c,sim){const f=S.form;const r=sim.tl[c.id][S.step];
  const chips=(set,dict,attr,cls='')=>Object.entries(dict).map(([k,t])=>`<button type="button" class="opt ${cls}" data-${attr}="${k}" data-v="${k}" aria-pressed="${attr==='call'?f.call===k:set.has(k)}">${t}</button>`).join('');
  return `<div class="check" id="checkForm">
    <div class="q"><span class="n">1</span>What do you see?${cite('p3464','west','schutz')}</div>
    <div class="opts">${chips(f.obs,OBS,'obs')}</div>
    ${f.obs.size?(()=>{const sc=heatScore(f.obs);return `<div class="scorebox s${sc}"><b>Heat stress score ${SCORE[sc]}</b>${sc?`<span>${SCORE_ACT[sc]}</span>`:''}</div>`;})():''}
    <div class="q"><span class="n">2</span>Your call</div>
    <div class="opts">${chips(null,CALL,'call','call')}</div>
    <div class="q"><span class="n">3</span>Action taken${cite('p3464','chen','west')}</div>
    <div class="opts">${chips(f.acts,ACTS,'act')}</div>
    <label class="cb"><input type="checkbox" id="nearby" ${f.nearby?'checked':''}> Also move cows within 60 m (${nearbyCows(sim,c.id).length} cows)</label>
    <label for="checkNote" class="note">Note</label>
    <textarea id="checkNote">${esc(f.note)}</textarea>
    ${f.err?`<p class="err" role="alert">${esc(f.err)}</p>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="saveCheck" data-alert="${a.id}">Save check</button>
    </div>
  </div>`;}
function nearbyCows(sim,id){const r=sim.tl[id][S.step];return COWS.filter(c=>c.id!==id).filter(c=>{const o=sim.tl[c.id][S.step];return !o.iv&&Math.hypot(o.x-r.x,o.y-r.y)<=60;});}

function missedHtml(c){const f=S.missForm;
  if(!S.missOpen)return `<div class="locked">${I.info}<div>No alert for this cow.<div style="margin-top:8px"><button class="btn" type="button" id="openMissed">Report a missed case</button></div></div></div>`;
  return `<div class="check" id="missForm"><div class="q">What do you see?</div>
    <div class="opts">${Object.entries(OBS).filter(([k])=>k!=='normal').map(([k,t])=>`<button type="button" class="opt" data-mobs="${k}" aria-pressed="${f.obs.has(k)}">${t}</button>`).join('')}</div>
    <label for="missNote" class="note">Note</label><textarea id="missNote">${esc(f.note)}</textarea>
    ${f.err?`<p class="err" role="alert">${esc(f.err)}</p>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="saveMissed">Send report</button><button class="btn" type="button" id="cancelMissed">Cancel</button></div></div>`;}

function detailHtml(sim){const c=COW[S.sel];const r=sim.tl[c.id][S.step];const pct=r.p*100,lv=level(pct);const b=bearing(r.x,r.y);
  const oa=openAlertFor(sim,c.id),la=latestAlertFor(sim,c.id),st=la?status(la):null;
  const lo=Math.round(Math.max(0,pct-r.u)),hi=Math.round(Math.min(100,pct+r.u));
  const hideWhy=S.independent&&oa;
  const where=r.iv&&r.iv.kind==='barn'?'In the barn':r.iv&&r.iv.kind==='yard'?'In the shaded yard by the barn':`${b.dist} m ${b.name} of the farmhouse`;
  const whereSub=r.iv&&(r.iv.kind==='barn'||r.iv.kind==='yard')?'Moved after check':`About ${Math.max(1,Math.round(b.dist/80))} min on foot · ${r.inSun?`in full sun for ${fmtDur(r.sun)}`:'in shade'} · GPS fix ${fmtClock(clk(S.step))}`;
  const advKeys=topReasons(r,3);
  let statusLine='';
  if(oa)statusLine=`<span class="pill high">Alert sent ${fmtClock(clk(oa.step))}</span><span>Unchecked for ${fmtDur(status(oa).age)}${oa.peak>=80?' · high confidence':''}</span>`;
  else if(la)statusLine=`<span class="pill ${st.cls}">${st.label}</span><span>Alert ${fmtClock(clk(la.step))}, checked ${fmtClock(clk(st.ck.step))}</span>`;
  else statusLine=`<span class="pill plain">No alert today</span>`;
  let check='';
  if(oa)check=checkFormHtml(oa,c,sim);
  else if(la){const ck=st.ck;check=`<div class="check done"><div><b>${CALL[ck.call]}</b> · ${fmtClock(clk(ck.step))}</div>
    <div class="note">Score ${SCORE[ck.score]}. Saw: ${ck.obs.map(k=>OBS[k]).join(', ')}${ck.acts.length?`<br>Did: ${ck.acts.map(k=>ACTS[k]).join(', ')}`:''}${ck.note?`<br>Note: ${esc(ck.note)}`:''}</div></div>${missedHtml(c)}`;}
  else check=missedHtml(c);
  const subs=[['why','Why'],['where','Where'],['check','Check'],['readings','Readings']];
  const sub=S.sub||'why';
  let body='';
  if(sub==='why')body=`${spark(c.id,sim)}
    ${r.gap?`<div class="warnbox">${I.warn}<div><b>Rumination sensor has no data since ${fmtClock(c.gap.from)}.</b> Left out of the likelihood.</div></div>`:''}
    <div class="ph"><h3>Reasons${cite('rudin')}</h3></div>
    ${hideWhy?`<div class="locked">${I.lock}<div>Hidden until you save your check.</div></div>`:whyHtml(r,c,lv)+rulePath(r,pct)}
    ${advKeys.length&&lv!=='ok'?`<div class="ph"><h3>Suggested actions</h3></div><ul class="advice">${advKeys.map(k=>`<li>${I.arrow}<span><b>${ADVICE[k][0]}.</b> ${ADVICE[k][1]}${cite(...ADVICE[k][2])}</span></li>`).join('')}</ul>`:''}
    ${oa?`<div><button class="btn primary" type="button" data-sub="where">Next: where she is</button></div>`:''}`;
  else if(sub==='where')body=`<div class="where-box"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/><text x="22" y="10" text-anchor="middle" style="font-size:8px;font-weight:700;fill:var(--muted);font-family:var(--sans)">N</text><g transform="rotate(${b.deg} 22 22)"><path d="M22 8 L27 24 L22 21 L17 24Z" fill="var(--accent)"/></g></svg>
      <div><b>${where}</b><span>${whereSub}</span></div></div>
    ${mapSvg(sim)}
    <div class="legend"><span><i style="background:var(--high)"></i>High</span><span><i style="background:var(--mod)"></i>Moderate</span><span><i style="background:var(--ok)"></i>Low</span><span><i class="sq" style="background:var(--tree)"></i>Trees, shade</span><span><i class="sq" style="background:var(--water)"></i>Ditch, trough</span></div>
    ${oa?`<div><button class="btn primary" type="button" data-sub="check">Next: check her</button></div>`:''}`;
  else if(sub==='check')body=check;
  else body=`${signalsHtml(r,c)}
    <div class="collar"><span>Collar <b>C-${(4400+c.n*7)}</b></span><span>Battery <b style="${c.battery<15?'color:var(--high)':''}">${c.battery}%</b></span>
      <span>Fit checked <b>${c.fitDate}</b></span><span>Comfort <b style="${c.fit==='due'?'color:var(--mod)':''}">${c.fit==='due'?'Fit check due':'OK'}</b></span></div>`;
  return `<section class="panel cowcard" id="detail" aria-live="polite" aria-labelledby="detT">
    <div class="d-head"><div><h2 id="detT">Cow ${c.id} · ${esc(c.name)}</h2><p>${c.breed} · ${c.age} years · ${c.tag}</p></div><span class="pill ${lv}">${LV[lv]}</span></div>
    <div class="likely"><span class="big">${Math.round(pct)}%</span>
      <div class="rng">${riskBar(pct,r.u,lv)}<small>Range ${lo} to ${hi}%${cite('zhang')}</small></div></div>
    <div class="statusline">${statusLine}</div>
    <div class="subtabs" role="tablist" aria-label="Cow details">${subs.map(([k,t])=>`<button type="button" role="tab" data-sub="${k}" aria-selected="${sub===k}">${t}${k==='check'&&oa?'<i class="dot high"></i>':''}</button>`).join('')}</div>
    <div class="subbody">${body}</div>
  </section>`;}

function todayHtml(sim){
  return `${bannerHtml(sim)}${tilesHtml(sim)}
  <div class="work"><aside class="work-list">${herdHtml(sim)}</aside>${detailHtml(sim)}</div>
  <section class="panel" aria-labelledby="dayT"><div class="ph"><h2 id="dayT">THI today${cite('nrc','zim','oliveira')}</h2></div>${thiChart(sim)}</section>`;}

function alertsHtml(sim){const list=[...sim.alerts].sort((a,b)=>b.step-a.step);
  const by=k=>list.filter(a=>status(a).k===k).length;
  const checks=Object.entries(S.checks).filter(([,v])=>v.step<=S.step);
  const fb=[...checks.map(([id,v])=>({t:v.step,kind:v.call==='no'?'False alarm':v.call==='vet'?'Unsure, vet asked':'Confirmed heat stress',cow:id.split('-')[0],cls:v.call==='no'?'plain':v.call==='vet'?'info':'high'})),
    ...S.missed.filter(m=>m.step<=S.step).map(m=>({t:m.step,kind:'Missed case reported',cow:m.cow,cls:'mod'})),
    ...(S.sysFb||[]).filter(m=>m.step<=S.step).map(m=>({t:m.step,kind:'System feedback',cow:'·',cls:'info'}))].sort((a,b)=>b.t-a.t);
  const escl=escalation(sim);
  return `<div class="tiles">
    <div class="tile ${by('open')?'hot':''}"><span class="k">Unchecked</span><span class="v">${by('open')}</span><span class="s">${escl.q.length} high-confidence for over ${ESC_HOURS} h</span></div>
    <div class="tile"><span class="k">Confirmed</span><span class="v">${by('confirmed')+by('resolved')}</span><span class="s">${by('resolved')} resolved with action</span></div>
    <div class="tile"><span class="k">False alarms</span><span class="v">${by('false')}</span></div>
    <div class="tile"><span class="k">Missed cases</span><span class="v">${S.missed.filter(m=>m.step<=S.step).length}</span></div></div>
  <section class="panel"><div class="ph"><h2>Alerts today</h2></div>
  ${list.length?`<div class="tscroll"><table><thead><tr><th>Time</th><th>Cow</th><th class="num">Peak</th><th>Main reasons</th><th>Status</th><th></th></tr></thead><tbody>
   ${list.map(a=>{const st=status(a);return `<tr><td class="num" style="text-align:left">${fmtClock(clk(a.step))}</td><td><b class="num">${a.cow}</b> ${esc(COW[a.cow].name)}</td><td class="num">${Math.round(a.peak)}%</td>
     <td>${topReasons(a.start,3).map(k=>LABEL[k]).join(', ')||'Combined small changes'}</td>
     <td><span class="pill ${st.cls}">${st.label}</span>${st.k==='open'?`<div class="note">for ${fmtDur(st.age)}${a.open?'':', signs have eased'}</div>`:''}</td>
     <td><button class="linkbtn" type="button" data-goto="${a.cow}" data-goto-sub="${st.k==='open'?'check':'why'}">${st.k==='open'?'Check':'View'}</button></td></tr>`;}).join('')}</tbody></table></div>`
   :`<div class="empty">${I.check}<b>No alerts yet today</b></div>`}
  <div class="infobox">${I.lock}<div>Response times are not shared.${cite('report','winner')}</div></div></section>
  <section class="panel"><div class="ph"><h2>Feedback</h2><p>${S.share.dev?'Shared anonymised with developers':'Not shared'}</p></div>
   ${fb.length?`<div class="tscroll"><table><thead><tr><th>Time</th><th>Cow</th><th>Your feedback</th><th>Used for</th></tr></thead><tbody>${fb.map(x=>`<tr><td class="num" style="text-align:left">${fmtClock(clk(x.t))}</td><td class="num">${x.cow}</td><td><span class="pill ${x.cls}">${x.kind}</span></td><td class="note">${x.kind==='False alarm'?'False alarm rate':x.kind==='Missed case reported'||x.kind==='System feedback'?'Developer review':'Evaluation label'}</td></tr>`).join('')}</tbody></table></div>`
   :`<p class="note">No feedback yet.</p>`}
   <label for="sysNote" class="note">Problems, limitations or false alerts to report to the developers</label>
   <textarea id="sysNote">${esc(S.sysNote||'')}</textarea>
   <div><button class="btn" type="button" id="sendSys">Send feedback</button></div>
  </section>`;}

function summaryDoc(escl){const reasons={};escl.q.forEach(a=>topReasons(a.start,3).forEach(k=>reasons[k]=(reasons[k]||0)+1));
  return `<div class="summary-doc"><b>Welfare summary · Melkveebedrijf De Hoeve</b><dl>
    <dt>Period</dt><dd>9 to 15 Jul 2026 (last 7 days)</dd>
    <dt>Unchecked alerts</dt><dd><b class="num">${escl.q.length}</b> high-confidence heat stress alerts left unchecked for over ${ESC_HOURS} h</dd>
    <dt>Reasons given</dt><dd>${Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${LABEL[k]} (${n})`).join(', ')||'None'}</dd>
    <dt>Not included</dt><dd>Cow IDs, locations, sensor readings, milk data, response times, anything about farm workers</dd></dl></div>`;}

function dataHtml(sim){const escl=escalation(sim);
  const sw=(id,on,label)=>`<label class="switch"><input type="checkbox" id="${id}" ${on?'checked':''} aria-label="${label}"><span></span></label>`;
  const rows=COWS.length;
  return `<div class="g2">
  <section class="panel"><div class="ph"><h2>Data collected${cite('gdpr','report')}</h2></div>
   <div class="g2" style="gap:24px">
    <div><h3 style="margin-bottom:8px">Collected</h3><ul class="list">${['Collar sensors','Collar GPS','Barn temperature and humidity','Milk yield','Alert count and reasons'].map(t=>`<li class="yes">${I.check}<span>${t}</span></li>`).join('')}</ul></div>
    <div><h3 style="margin-bottom:8px">Never collected</h3><ul class="list">${['Cameras','Worker locations','Who checked an alert'].map(t=>`<li class="no">${I.cross}<span>${t}</span></li>`).join('')}</ul></div>
   </div>
  </section>
  <section class="panel"><div class="ph"><h2>Access${cite('wiseman','report')}</h2></div>
   <div>
    <div class="share-row"><b>You and your workers</b><span class="lockchip">Always</span><p>All data</p></div>
    <div class="share-row"><b>Your vet</b>${sw('shVet',S.share.vet,'Share with your vet')}<p>Readings and alerts</p></div>
    <div class="share-row"><b>Developers</b>${sw('shDev',S.share.dev,'Share with developers')}<p>Anonymised alerts and feedback</p></div>
    <div class="share-row"><b>Cooperative or Beter Leven auditor</b>${sw('shCoop',S.share.coop,'Share with cooperative')}<p>${S.share.coop?'Monthly summary':'Nothing'}</p></div>
    <div class="share-row"><b>NVWA</b><span class="lockchip">Fixed rule</span><p>Summary only, when the rule below is met</p></div>
   </div>
  </section></div>

  <section class="panel"><div class="ph"><h2>NVWA escalation rule${cite('winner','report')}</h2></div>
   <div class="g2">
    <div style="display:flex;flex-direction:column;gap:18px">
     <p style="font-size:15px">Summary sent when <b>${ESC_LIMIT}+ alerts at 80% or higher</b> stay <b>unchecked over ${ESC_HOURS} h</b> within 7 days.</p>
     <div><div class="meter" aria-label="${Math.min(escl.q.length,ESC_LIMIT)} of ${ESC_LIMIT}">${Array.from({length:ESC_LIMIT},(_,i)=>`<i class="${i<escl.q.length?'on':''}"></i>`).join('')}</div>
     <p class="note" style="margin-top:6px"><b class="num" style="color:var(--ink)">${Math.min(escl.q.length,ESC_LIMIT)}/${ESC_LIMIT}</b> this week${escl.q.length?`: cow${escl.q.length>1?'s':''} ${escl.q.map(a=>a.cow).join(', ')} unchecked`:''}</p></div>
     ${escl.shared?`<div class="warnbox">${I.warn}<div><b>Summary shared with the NVWA at ${fmtClock(clk(S.step))}.</b></div></div>`:`<div class="infobox">${I.shield}<div>Nothing has been shared with the NVWA.</div></div>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px"><h3>${escl.shared?'Sent to NVWA':'Preview'}</h3>${summaryDoc(escl)}</div>
   </div>
  </section>

  <div class="g2">
  <section class="panel"><div class="ph"><h2>Alert settings</h2></div>
   <div class="slider-row"><label for="thrSlider"><b>Alert level</b> <b class="num">${S.thr}%</b></label>
    <input type="range" id="thrSlider" min="50" max="70" step="5" value="${S.thr}">
    <div class="vals"><span>50%</span><span>70%</span></div></div>
   <div class="tradeoff"><div><b>${Math.round(4+(70-S.thr)*0.55)}%</b><span>missed cases (illustrative)</span></div><div><b>${Math.round(14+(70-S.thr)*0.9)}%</b><span>false alarms (illustrative)</span></div></div>
   <p class="note">Max 70%. Missed cases are worse than false alarms${cite('hogeveen','sendelbach','report')}</p>
   <div class="share-row" style="border-top:1px solid var(--line)"><b>Independent check mode</b>${sw('indep',S.independent,'Independent check mode')}<p>Hide alert reasons until you save your own check${cite('bucinca','goddard')}</p></div>
  </section>
  <section class="panel"><div class="ph"><h2>Responsibility${cite('poel','wet','report')}</h2></div>
   <div class="tscroll"><table><thead><tr><th>Situation</th><th>Responsible</th></tr></thead><tbody>
    <tr><td>An alert is ignored</td><td><b>Farmer</b></td></tr>
    <tr><td>Heat stress is not flagged</td><td><b>Developers</b></td></tr>
    <tr><td>Too many false alarms</td><td><b>Developers</b></td></tr>
    <tr><td>Summary is misread or misused</td><td><b>NVWA or auditor</b></td></tr>
    <tr><td>The AI is wrong</td><td><b>Not the AI</b></td></tr>
   </tbody></table></div>
  </section></div>`;}

function modelHtml(){
  const steps=[
    ['Input','Collar sensors','Motion, breathing, rumination, body temperature, GPS, barn climate, milk yield.','Collar comfort · farm workers\' privacy',['davison','iqbal']],
    ['Stage 1','Behaviour classifier','Neural network: collar motion to lying, standing, ruminating, feeding, panting.','Who decides what poor welfare looks like',['peng','davison']],
    ['Stage 2','Decision tree','Behaviours, THI, sun and milk to a likelihood with reasons and a range.','False alarms vs missed cases · bias across herds',['rudin','report']],
    ['Output','Alert with reasons','Phone alert above the alert level, with reasons, range and location.','Care or surveillance · trusting it too much',['zhang','winner']],
    ['Farmer','Checks and decides','Checks the cow, makes the call, acts.','Final say',['goddard','werkheiser']],
  ];
  return `<section class="panel"><div class="ph"><h2>Pipeline${cite('report')}</h2><p>Red: ethical risks</p></div>
   <div class="pipe">${steps.map(([t,b,p,risk,ks],i)=>`<div class="step ${i===4?'human':''}"><span class="tag">${t}</span><b>${b}${cite(...ks)}</b><p>${p}</p><span class="risk">${risk}</span></div>`).join('')}
   <div class="loop" aria-hidden="true"></div><div class="loop-label">Farmer checks feed back into the model${cite('report')}</div></div>
  </section>
  <div class="g2">
  <section class="panel"><div class="ph"><h2>Model card${cite('report')}</h2><span class="pill plain">Illustrative · v0.4</span></div>
   <div class="summary-doc" style="background:none;border:0;padding:0"><dl>
    <dt>Labels</dt><dd>Welfare experts and vets. Unclear cases marked uncertain.</dd>
    <dt>Training data</dt><dd>2,405 cow-days, 11 Dutch farms, summers 2024 and 2025</dd>
    <dt>Stage 2 model</dt><dd>Decision tree. A multilayer perceptron is used only if validation shows it detects heat stress better.</dd>
    <dt>Retrained</dt><dd>15 Jun 2026</dd></dl></div>
   <h3>Results per breed${cite('west')}</h3>
   <div class="tscroll"><table><thead><tr><th>Breed</th><th class="num">Cases</th><th class="num">Caught</th><th class="num">False alarms</th></tr></thead><tbody>
    ${BREED_EVAL.map(e=>`<tr><td>${e.b}${e.note?`<div class="note">${e.note}</div>`:''}</td><td class="num">${e.n.toLocaleString('en')}</td><td class="num" style="${e.rec<80?'color:var(--high)':''}">${e.rec}%</td><td class="num">${e.fa}%</td></tr>`).join('')}
   </tbody></table></div>
   <p class="note">Illustrative figures</p>
  </section>
  <section class="panel"><div class="ph"><h2>Change log</h2><span class="pill plain">Illustrative</span></div>
   <ul class="list">
    <li class="yes">${I.check}<span><b>v0.4 · 15 Jun 2026.</b> Sun exposure weighted higher on hot days. Recall 87% to 91%.</span></li>
    <li class="yes">${I.check}<span><b>v0.3 · 2 Apr 2026.</b> Per-cow baselines instead of herd average.</span></li>
    <li class="yes">${I.check}<span><b>v0.2 · 10 Jan 2026.</b> Uncertainty range and sensor gap warnings.</span></li>
   </ul>
   <h3>Limits${cite('bos','polsky','report')}</h3>
   <ul class="list">
    ${['How the cow feels','Overall herd welfare','Certainty'].map(t=>`<li class="no">${I.cross}<span>${t}</span></li>`).join('')}
   </ul>
  </section></div>
  <section class="panel"><div class="ph"><h2>Design for Values${cite('hoven','hleg','report')}</h2></div>
   <div class="tscroll"><table><thead><tr><th>Recommendation</th><th>Value</th><th>In the app</th></tr></thead><tbody>
    <tr><td>Test collar comfort and behaviour effects</td><td>Animal welfare</td><td>Collar fit and comfort per cow</td></tr>
    <tr><td>Alert-leaning level, every alert explained</td><td>Safety, transparency</td><td>Alert settings, Reasons</td></tr>
    <tr><td>Test across breeds, farms and seasons; track missed cases</td><td>Fairness</td><td>Model card, Report a missed case</td></tr>
    <tr><td>Collect the minimum, farmer controls sharing</td><td>Privacy, data governance</td><td>Data &amp; sharing</td></tr>
    <tr><td>Agree responsibilities in advance</td><td>Accountability</td><td>Responsibility</td></tr>
    <tr><td>Keep evaluating with farmers and vets</td><td>Human agency, oversight</td><td>Your check, feedback log</td></tr>
   </tbody></table></div></section>`;}

function nvwaHtml(sim){const escl=escalation(sim);
  return `<section class="panel"><div class="ph"><h2>NVWA view</h2><span class="pill info">Surveillance access</span></div>
   ${escl.shared?`<div class="warnbox">${I.warn}<div><b>Summary received ${fmtClock(clk(S.step))} today.</b> Farmer notified.</div></div>${summaryDoc(escl)}`
   :`<div class="empty">${I.shield}<b>No summary has been shared</b><span>${escl.q.length} of ${ESC_LIMIT} towards the rule</span></div>`}
  </section>
  <div class="g2">
   <section class="panel"><div class="ph"><h2>Visible${cite('report')}</h2></div><ul class="list">${['Escalation summary','Count and reasons of unchecked alerts','Period covered'].map(t=>`<li class="yes">${I.check}<span>${t}</span></li>`).join('')}</ul></section>
   <section class="panel"><div class="ph"><h2>Not visible${cite('report')}</h2></div><ul class="list">${['Herd map and locations','Sensor readings and milk data','Checked alerts','Response times','Farm workers'].map(t=>`<li class="no">${I.lock}<span>${t}</span></li>`).join('')}</ul></section>
  </div>`;}

/* ---------- render ---------- */
const TABS=[['today','Today'],['alerts','Alerts & feedback'],['data','Data & sharing'],['model','How it decides']];
function render(sim=compute()){
  $('#clockNow').textContent=fmtClock(clk(S.step));$('#timeSlider').value=S.step;
  $('#playBtn').innerHTML=S.timer?I.pause:I.play;$('#playBtn').setAttribute('aria-label',S.timer?'Pause':'Play the day');
  $('#roleFarmer').setAttribute('aria-pressed',S.role==='farmer');$('#roleNvwa').setAttribute('aria-pressed',S.role==='nvwa');
  const open=sim.alerts.filter(a=>status(a).k==='open').length;
  const tabs=$('#tabs');tabs.hidden=S.role!=='farmer';
  tabs.innerHTML=TABS.map(([k,t])=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab===k}">${t}${k==='alerts'&&open?`<span class="count">${open}</span>`:''}</button>`).join('');
  const main=$('#main');const y=window.scrollY;
  main.innerHTML=`<div class="stack">${S.role==='nvwa'?nvwaHtml(sim):S.tab==='today'?todayHtml(sim):S.tab==='alerts'?alertsHtml(sim):S.tab==='data'?dataHtml(sim):S.tab==='sources'?sourcesHtml():modelHtml()}</div>`;
  window.scrollTo(0,y);
}

/* ---------- toast (phone notification) ---------- */
function toast(html,cls=''){const host=$('#toastHost');host.innerHTML=`<div class="toast ${cls}" role="status">${html}</div>`;clearTimeout(S.toastTimer);S.toastTimer=setTimeout(()=>{host.innerHTML='';},cls==='good'?3500:7000);}
function alertToast(a,sim){const r=sim.tl[a.cow][S.step],b=bearing(r.x,r.y);
  toast(`<div class="ic">${I.bell}</div><span class="app">Herd Heat Monitor</span><b>Cow ${a.cow} may have heat stress</b><span>${Math.round(r.p*100)}% likely · ${[r.panting?'panting':null,...topReasons(r,2).map(k=>LABEL[k].toLowerCase())].filter(Boolean).join(', ')} · THI ${r.thi.toFixed(0)} · ${b.dist} m ${b.name}</span>
   <div class="acts"><button type="button" data-goto="${a.cow}">Open</button><button type="button" class="ghost" data-dismiss>Later</button></div>`);}

/* ---------- time ---------- */
function setStep(s,{notify=false}={}){const prev=S.step;S.step=Math.max(0,Math.min(N,s));const sim=compute();
  if(notify){const fresh=sim.alerts.filter(a=>a.step>prev&&a.step<=S.step);if(fresh.length)alertToast(fresh[fresh.length-1],sim);}
  render(sim);}
function stop(){clearInterval(S.timer);S.timer=null;render();}
function play(){if(S.timer){stop();return;}if(S.step>=N)S.step=0;S.timer=setInterval(()=>{if(S.step>=N){stop();return;}setStep(S.step+1,{notify:true});},900);render();}

/* ---------- events ---------- */
function selectCow(id,scroll,sub){S.sel=id;S.sub=sub||S.sub||'why';S.form=newForm();S.missOpen=false;S.missForm=newForm();S.tab='today';S.role='farmer';render();
  if(scroll){const d=$('#detail');if(d)d.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}
document.addEventListener('click',e=>{const t=e.target;
  const sl=t.closest('[data-src]');if(sl){e.preventDefault();S.hl=sl.dataset.src;S.tab='sources';S.role='farmer';render();const el=document.getElementById('ref-'+S.hl);if(el&&!sl.classList.contains('reflink'))window.scrollTo(0,0);if(el&&sl.classList.contains('reflink'))el.scrollIntoView({block:'center'});return;}
  if(t.closest('#srcLink')){e.preventDefault();S.tab='sources';S.hl=null;render();window.scrollTo(0,0);return;}
  const sb=t.closest('[data-sub]');if(sb){S.sub=sb.dataset.sub;render();return;}
  const g=t.closest('[data-goto]');if(g){$('#toastHost').innerHTML='';selectCow(g.dataset.goto,true,g.dataset.gotoSub||'why');return;}
  if(t.closest('[data-dismiss]')){$('#toastHost').innerHTML='';return;}
  const cow=t.closest('[data-cow]');if(cow){selectCow(cow.dataset.cow,window.innerWidth<980);return;}
  const tab=t.closest('[data-tab]');if(tab){S.tab=tab.dataset.tab;render();return;}
  const fl=t.closest('[data-filter]');if(fl){S.filter=fl.dataset.filter;render();return;}
  const ob=t.closest('[data-obs]');if(ob){const k=ob.dataset.obs,f=S.form;if(k==='normal'){f.obs.clear();f.obs.add('normal');}else{f.obs.delete('normal');f.obs.has(k)?f.obs.delete(k):f.obs.add(k);}f.err='';render();return;}
  const cl=t.closest('[data-call]');if(cl){S.form.call=cl.dataset.call;S.form.err='';render();return;}
  const ac=t.closest('[data-act]');if(ac){const k=ac.dataset.act,f=S.form;if(k==='yard')f.acts.delete('barn');if(k==='barn')f.acts.delete('yard');f.acts.has(k)?f.acts.delete(k):f.acts.add(k);render();return;}
  const mo=t.closest('[data-mobs]');if(mo){const k=mo.dataset.mobs,f=S.missForm;f.obs.has(k)?f.obs.delete(k):f.obs.add(k);f.err='';render();return;}
  if(t.closest('#saveCheck'))return saveCheck(t.closest('#saveCheck').dataset.alert);
  if(t.closest('#openMissed')){S.missOpen=true;render();return;}
  if(t.closest('#cancelMissed')){S.missOpen=false;S.missForm=newForm();render();return;}
  if(t.closest('#saveMissed'))return saveMissed();
  if(t.closest('#sendSys')){const v=(S.sysNote||'').trim();if(!v)return;(S.sysFb=S.sysFb||[]).push({step:S.step,text:v});S.sysNote='';toast(`<div class="ic">${I.check}</div><span class="app">Sent</span><b>Feedback ${S.share.dev?'sent to the developers':'saved'}</b><span>${S.share.dev?'':'Switch on sharing with developers to send it.'}</span>`,'good');render();return;}
  if(t.closest('#thiChart')){const svg=t.closest('#thiChart');const rc=svg.getBoundingClientRect();const vx=(e.clientX-rc.left)/rc.width*760;const m=START+(vx-40)/(760-56)*(END-START);setStep(Math.round((m-START)/STEP));}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g.cow')){e.preventDefault();selectCow(e.target.dataset.cow,true);}});
document.addEventListener('input',e=>{const id=e.target.id;
  if(id==='checkNote')S.form.note=e.target.value;
  if(id==='missNote')S.missForm.note=e.target.value;
  if(id==='sysNote')S.sysNote=e.target.value;
  if(id==='timeSlider'){if(S.timer){clearInterval(S.timer);S.timer=null;}setStep(+e.target.value);}
});
document.addEventListener('change',e=>{const id=e.target.id;
  if(id==='nearby')S.form.nearby=e.target.checked;
  if(id==='shVet'){S.share.vet=e.target.checked;render();}
  if(id==='shDev'){S.share.dev=e.target.checked;render();}
  if(id==='shCoop'){S.share.coop=e.target.checked;render();}
  if(id==='indep'){S.independent=e.target.checked;render();}
  if(id==='thrSlider'){S.thr=+e.target.value;render();}
});
document.addEventListener('focusin',e=>{if(S.timer&&e.target.matches('#checkNote,#missNote'))stop();});

function saveCheck(alertId){const f=S.form;const sim=compute();const a=sim.alerts.find(x=>x.id===alertId);if(!a)return;
  if(!f.obs.size){f.err='Tick at least one thing you saw, or "Looks normal".';render();return;}
  if(!f.call){f.err='Choose your call: heat stress, not heat stress, or not sure.';render();return;}
  const rec={step:S.step,obs:[...f.obs],call:f.call,acts:[...f.acts],note:f.note.trim(),score:heatScore(f.obs)};
  for(const o of cowAlerts(sim,a.cow))if(status(o).k==='open')S.checks[o.id]=rec;
  const kind=f.acts.has('barn')?'barn':f.acts.has('yard')?'yard':f.acts.has('fans')?'fans':null;
  let moved=0;
  if(kind){(S.ivs[a.cow]=S.ivs[a.cow]||[]).push({step:S.step,kind,fans:f.acts.has('fans')});
    if(f.nearby&&kind!=='fans'){for(const c of nearbyCows(sim,a.cow)){(S.ivs[c.id]=S.ivs[c.id]||[]).push({step:S.step,kind:'yard',fans:false});moved++;}}}
  const call=f.call;S.form=newForm();
  toast(`<div class="ic">${I.check}</div><span class="app">Saved</span><b>Check saved for cow ${a.cow}: ${CALL[call].toLowerCase()}</b><span>${kind&&kind!=='fans'?`Moved ${moved?`with ${moved} other cow${moved>1?'s':''} `:''}to the ${kind==='barn'?'barn':'shaded yard'}. `:''}</span>`,'good');
  render();}
function saveMissed(){const f=S.missForm;if(!f.obs.size){f.err='Tick at least one sign you saw.';render();return;}
  S.missed.push({cow:S.sel,step:S.step,obs:[...f.obs],note:f.note.trim()});S.missOpen=false;S.missForm=newForm();
  toast(`<div class="ic">${I.check}</div><span class="app">Report sent</span><b>Missed case reported for cow ${S.sel}</b><span>Sent to developers</span>`,'good');render();}

$('#playBtn').addEventListener('click',play);
$('#roleFarmer').addEventListener('click',()=>{S.role='farmer';render();});
$('#roleNvwa').addEventListener('click',()=>{S.role='nvwa';render();});
$('#jumpAlert').addEventListener('click',()=>{if(S.timer){clearInterval(S.timer);S.timer=null;}
  const all=simulate(N,S.ivs,S.checks,S.thr).alerts;const first=all.sort((a,b)=>a.step-b.step)[0];
  S.step=first?first.step:START_STEP;S.sel=first?first.cow:S.sel;S.form=newForm();const sim=compute();if(first)alertToast(first,sim);render(sim);});
$('#resetDemo').addEventListener('click',()=>{clearInterval(S.timer);S.timer=null;Object.assign(S,{step:START_STEP,thr:60,sel:'001',filter:'all',independent:false,checks:{},ivs:{},missed:[],sysFb:[],sysNote:'',form:newForm(),missOpen:false,missForm:newForm(),share:{vet:false,dev:false,coop:false}});$('#toastHost').innerHTML='';render();});
if(location.hash==='#sources')S.tab='sources';
render();
if(S.tab!=='sources')alertToast(compute().alerts.find(a=>a.cow==='001'),compute());
</script>
