/*MODEL-START*/
const SHADE_UNTIL=700; // cow 001 rests under the trees until 11:40, then follows the herd into the sun (report, section 4)
const STEP=10, START=360, END=1260, N=(END-START)/STEP;
const clk=s=>START+s*STEP;
const fmtClock=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const thiAt=m=>{const w=m<930?285:330;return 60+17*Math.exp(-(((m-930)/w)**2));};
const humAt=m=>86-38*Math.exp(-(((m-900)/300)**2));
const tempFrom=(thi,h)=>{const a=0.55-0.0055*h;return (thi-32-26*a)/(1.8*(1-a));};
const rnd=(a,b)=>{const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x);};
const W=640,H=420;
const BARN={x:60,y:40,w:90,h:46}, HOUSE={x:22,y:22}, TROUGH={x:178,y:70};
const SHADE=[{id:'yard',x:182,y:92,r:34,label:'Shaded yard'},{id:'t1',x:150,y:230,r:38},{id:'t2',x:330,y:356,r:44},{id:'t3',x:566,y:180,r:40}];
const HERD_PATH=[[360,200,120],[480,270,180],[630,380,260],[720,460,300],[900,490,318],[1080,420,262],[1260,250,150]];
function herdCentre(m){for(let i=0;i<HERD_PATH.length-1;i++){const[a,ax,ay]=HERD_PATH[i],[b,bx,by]=HERD_PATH[i+1];if(m<=b){const t=Math.max(0,(m-a)/(b-a));const e=t*t*(3-2*t);return[ax+(bx-ax)*e,ay+(by-ay)*e];}}const l=HERD_PATH[HERD_PATH.length-1];return[l[1],l[2]];}
const NAMES=['Bella','Daisy','Fenna','Klaar','Roosje','Anouk','Bertha','Clara','Dirkje','Elsje','Femke','Geesje','Ilse','Jantje','Kee','Lies','Marijke','Neeltje','Okje','Pietje','Rika','Saar','Tineke','Wietske'];
const BREED={6:'MRIJ',15:'MRIJ',11:'Blaarkop',22:'Blaarkop',19:'Jersey'};
const SENS={1:2.8,17:1.15,8:1.05,12:0.95,20:0.9,3:0.8};
const SUNNY=new Set([1,17,8,12,20,3,5,10,23]);
const COWS=NAMES.map((name,i)=>{const n=i+1,id=String(n).padStart(3,'0');const ang=n*2.39996,rad=14+11*Math.sqrt(n);
  return{n,id,name,breed:BREED[n]||'Holstein-Friesian',tag:'NL 64182'+id+(n%7),
  sens:SENS[n]||+(0.35+rnd(n,1)*0.4).toFixed(2),shade:!SUNNY.has(n),ox:Math.cos(ang)*rad,oy:Math.sin(ang)*rad*0.8,
  baseResp:Math.round(32+rnd(n,2)*8),baseTemp:+(38.4+rnd(n,3)*0.4).toFixed(1),baseRum:Math.round(26+rnd(n,4)*8),baseLie:Math.round(28+rnd(n,5)*8),baseFeed:Math.round(14+rnd(n,6)*6),baseDrink:+(2+rnd(n,7)*1.5).toFixed(1),
  milk:Math.round(26+rnd(n,8)*10),age:2+Math.floor(rnd(n,9)*7),
  battery:n===21?8:Math.round(55+rnd(n,10)*44),fit:n===14?'due':'ok',fitDate:n===14?'2 Jun':(1+Math.floor(rnd(n,11)*9))+' Jul',
  gap:n===9?{sensor:'rumination',from:660,to:840}:null,shadeUntil:n===1?SHADE_UNTIL:0};});
const inShade=(x,y)=>SHADE.find(s=>Math.hypot(x-s.x,y-s.y)<=s.r)||null;
function cowPos(c,m,iv){if(iv){if(iv.kind==='barn')return[BARN.x+18+((c.n*13)%55),BARN.y+10+((c.n*7)%26)];if(iv.kind==='yard'){const a=c.n*1.7;return[SHADE[0].x+Math.cos(a)*16,SHADE[0].y+Math.sin(a)*14];}}
  let[x,y]=herdCentre(m);x+=c.ox+Math.sin(m/47+c.n)*6;y+=c.oy+Math.cos(m/53+c.n*2)*5;
  if(c.shade||(c.shadeUntil&&m<c.shadeUntil)){const t=c.shadeUntil&&m<c.shadeUntil?1:Math.min(1,Math.max(0,(thiAt(m)-67)/3));if(t>0){let best=SHADE[1],bd=1e9;for(const s of SHADE.slice(1)){const d=Math.hypot(x-s.x,y-s.y);if(d<bd){bd=d;best=s;}}const a=c.n*2.1,tx=best.x+Math.cos(a)*best.r*0.55,ty=best.y+Math.sin(a)*best.r*0.5;x+= (tx-x)*t;y+=(ty-y)*t;}}
  return[Math.max(8,Math.min(W-8,x)),Math.max(8,Math.min(H-8,y))];}
const COOL={barn:8,yard:5,fans:3};
const WEIGHTS={breathing:0.06,bodyTemp:1.2,rumination:0.022,standing:0.015,thi:0.12,sun:0.008,milk:0.05};
const BIAS=-4.6;
function simulate(now,ivs,checks,thr){
  const out={};const alerts=[];
  for(const c of COWS){const tl=[];let Ls=0,sun=0,cum=0,active=null,quiet=0,suppress=-1;
    const myIv=(ivs[c.id]||[]).filter(v=>v.step<=now).sort((a,b)=>a.step-b.step);
    for(let s=0;s<=now;s++){const m=clk(s);const thi=thiAt(m);const iv=myIv.filter(v=>v.step<s).pop(),movedNow=myIv.filter(v=>v.step<=s).pop();
      const [x,y]=cowPos(c,m,movedNow||iv);const sh=iv?{id:iv.kind}:inShade(x,y);const inSun=!sh;
      sun=inSun&&thi>66?sun+STEP:Math.max(0,sun-2*STEP);
      const cool=iv?(COOL[iv.kind]||0)+(iv.fans?COOL.fans:0):0;
      const E=thi+(inSun?2.5+Math.min(2,sun/30):0)-cool;
      const L=Math.max(0,E-67.5)*c.sens;Ls=Ls*0.4+L*0.6;
      const nz=(k)=>rnd(c.n*31+s,k)-0.5;
      const resp=Math.round(c.baseResp+2.7*Ls+nz(1)*3);
      const temp=+(c.baseTemp+0.085*Ls+nz(2)*0.08).toFixed(1);
      const rumDrop=Math.round(Math.min(60,3.2*Ls+nz(3)*4));
      const lieDrop=Math.round(Math.min(70,4*Ls+nz(4)*4));
      const feedDrop=Math.round(Math.min(60,3*Ls+nz(5)*4));
      cum+=Ls*STEP/60;const milk=+Math.min(14,cum*0.16).toFixed(1);
      const gap=c.gap&&m>=c.gap.from&&m<c.gap.to?c.gap.sensor:null;
      const contrib={breathing:WEIGHTS.breathing*(resp-c.baseResp),bodyTemp:WEIGHTS.bodyTemp*(temp-c.baseTemp),
        rumination:gap==='rumination'?0:WEIGHTS.rumination*Math.max(0,rumDrop),standing:WEIGHTS.standing*Math.max(0,lieDrop),
        thi:WEIGHTS.thi*Math.max(0,thi-68),sun:inSun&&thi>68?WEIGHTS.sun*sun:0,milk:WEIGHTS.milk*milk};
      const z=BIAS+Object.values(contrib).reduce((a,b)=>a+b,0);const p=1/(1+Math.exp(-z));
      let u=4+6*(1-Math.abs(p-0.5)*2)+(gap?9:0)+(c.battery<15?3:0);
      tl.push({s,m,thi,x,y,inSun,shadeId:sh&&sh.id,sun,resp,temp,rumDrop,lieDrop,feedDrop,milk,gap,contrib,p,u,iv:movedNow||iv||null,
        lie:Math.round(c.baseLie*(1-lieDrop/100)),rum:Math.round(c.baseRum*(1-Math.max(0,rumDrop)/100)),feed:Math.round(c.baseFeed*(1-Math.max(0,feedDrop)/100)),drink:+(c.baseDrink*(1+0.05*Ls)).toFixed(1),panting:resp>=60});
      const pct=p*100;
      if(active){active.peak=Math.max(active.peak,pct);
        const ck=checks[active.id];
        if(ck&&ck.step<=s){active.open=false;active=null;suppress=s+6;}
        else if(pct<thr-15){quiet++;if(quiet>=3){active.open=false;active.cleared=s;active=null;}}else quiet=0;}
      if(!active&&pct>=thr&&s>=suppress){active={id:c.id+'-'+s,cow:c.id,step:s,p:pct,peak:pct,open:true,start:tl[tl.length-1]};alerts.push(active);quiet=0;}
    }
    out[c.id]=tl;}
  return{tl:out,alerts};
}
/*MODEL-END*/
