const E=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),$=s=>document.querySelector(s);
const D=[["Clásico","#111"],["Azul","linear-gradient(135deg,#2a7be4,#0b3c8c)"],["Verde","linear-gradient(135deg,#34b24d,#0e5c25)"],["Amarillo","linear-gradient(135deg,#ffd83a,#e0a800)"],["Morado","linear-gradient(135deg,#8e44d6,#4a1a8c)"],["Naranja","linear-gradient(135deg,#ff8a1f,#d35400)"],["Turquesa","linear-gradient(135deg,#20c4c4,#0a7a82)"],["Rosa","linear-gradient(135deg,#ff3d8b,#b0125a)"],["Negro","linear-gradient(135deg,#3a3a3a,#050505)"],["Arcoíris","conic-gradient(red,orange,yellow,green,cyan,blue,violet,red)"]];
const CH=[["🪓","Leñador"],["🧑‍🚀","Astronauta"],["👸","Princesa"],["🎸","Rockero"],["🤡","Payaso"],["🎪","Payasa"],["💃","Bailarina"],["💪","Fisicoculturista"],["⚔️","Samurái"],["🪖","Soldado"],["🐺","Hombre lobo"],["🦸","Héroe"]];
const CC={R:'#d32f2f',Y:'#f5c400',G:'#2e9e44',B:'#1e6fd9'},SYM={skip:'⊘',rev:'⇄','+2':'+2','+4':'+4',W:'✦'};
const bk=(i,cls='')=>`<div class="card back ${cls}" style="background-image:url(/decks/${i}.webp)"></div>`;
const cardH=(c,cls='',click='')=>`<div class="card ${c.c} ${cls}" ${click}>${c.c==='W'?'<b>'+SYM[c.v]+'</b>':(SYM[c.v]||c.v)}</div>`;
const av=(ch,cls='')=>`<img class="chimg ${cls}" src="/chars/${ch}.webp">`;
const qr=(t,px=260)=>{const q=new __QR.QRCode(-1,__QR.ECL.M);q.addData(t);q.make();const n=q.getModuleCount(),m=4;let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m},${r+m}h1v1h-1z`;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*m} ${n+2*m}" width="${px}" height="${px}" shape-rendering="crispEdges" style="background:#fff;border-radius:12px"><path d="${d}" fill="#000"/></svg>`};

const SL={B:[50,81],L:[14,58],TL:[24,23],TC:[50,30],TR:[76,23],R:[86,58]};
const ORD={2:['B','TC'],3:['B','TL','TR'],4:['B','L','TC','R'],5:['B','L','TL','TR','R'],6:['B','L','TL','TC','TR','R']};
const fig=(ch,cls='')=>`<img class="chimg ${cls}" src="/chars/full/${ch}.webp" onerror="this.onerror=null;this.src='/chars/${ch}.webp'">`;
const fakeCard=(i,k)=>({id:0,c:'RYGB'[(i*3+k*5+1)%4],v:['1','2','3','4','5','6','7','8','9','skip','rev','+2'][(i*7+k*11+3)%12]});
{const im=new Image();im.onload=()=>document.documentElement.classList.add('scene-img');im.src='/scene.jpg'}
function tvView(s){
document.body.classList.toggle('tvb',s.phase!=='lobby');
if(s.phase==='lobby')return `<div class="pn"><h1>🃏 UNO</h1><div style="float:right;text-align:center">${qr(s.urls[0]+'?c='+s.code)}<br><b>Escaneá con la cámara del celular</b></div><p>Dirección para el Modo celular de la app:</p><h1 style="font-size:56px">${new URL(s.urls[0]).hostname}</h1><p>Código de sala:</p><h1 style="font-size:72px;letter-spacing:10px">${s.code}</h1><div class="row">${s.players.map(p=>`<div class="lp">${av(p.ch,'xs')}${E(p.name)}</div>`).join('')||'Esperando jugadores…'}</div><p>Mazo: <b>${D[s.deck][0]}</b> (lo elige ${s.players[0]?E(s.players[0].name):'el Jugador 1'})</p>${bk(s.deck,'lg')}</div>`;
const n=s.players.length,o=ORD[n]||ORD[6];
const seats=s.players.map((p,i)=>{const m=Math.min(p.n,10),bot=o[i]==='B';
const fan=Array.from({length:m},(_,k)=>`<span style="transform:rotate(${(k-(m-1)/2)*(bot?5:4)}deg)">${bot?cardH(fakeCard(i,k),'fk'):bk(s.deck,'fk')}</span>`).join('');
return `<div class="st ${o[i]} ${i==s.turn&&!s.over?'act':''}" data-i="${i}" style="left:${SL[o[i]][0]}%;top:${SL[o[i]][1]}%">${fig(p.ch,'fg')}<div class="fan2">${fan}</div><div class="tag">${E(p.name)} · ${p.sc} pts · ${p.n} cartas</div></div>`}).join('');
return `<div class="scene"><div class="fx sky"><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i></div>${fire('f1')}${fire('f2')}<div class="moon"></div><div class="lamp l1"></div><div class="lamp l2"></div><div class="tbl"><div class="felt"></div></div><div class="ctr2"><span id="dpile">${bk(s.deck,'cd')}</span><span id="dtop">${cardH(s.top,'cd')}</span><i class="dot" style="background:${CC[s.col]}"></i><b class="dr">${s.dir>0?'↻':'↺'}</b></div>${seats}<div class="pill">${E(s.log)} · mazo: ${s.drawN}</div>${s.over?`<div class="win">🏆 ${E(s.players[s.win.i].name)} gana la ronda (+${s.win.pts} pts)</div>`:''}${s.shout!=null?yell(s,o):''}</div>`}
const fire=c=>`<div class="fx fire ${c}"><b></b><i></i>${[['.1s','-1.4vh'],['.8s','1.2vh'],['1.5s','-.6vh'],['2.1s','1.8vh']].map(e=>`<u style="--d:${e[0]};--x:${e[1]}"></u>`).join('')}</div>`;

let __p=null;
function tvFx(s){
const p=__p;__p=s;
if(!p||p.phase!=='game'||s.phase!=='game'||p.over||p.players.length!==s.players.length||!Element.prototype.animate)return;
const sc=document.querySelector('.scene'),pile=document.querySelector('#dpile>.card'),top=document.querySelector('#dtop>.card');
if(!sc||!pile||!top)return;
const R=e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
const P=R(pile),T=R(top);
const ev=[];s.players.forEach((pl,i)=>{const d=pl.n-p.players[i].n;if(d)ev.push([i,d])});
if(s.shout!=null&&p.shout==null){say('¡Uno!');const f=document.querySelector(`.st[data-i="${s.shout}"] .fg`);f&&f.animate([{transform:'rotate(0)'},{transform:'rotate(-5deg) scale(1.1)'},{transform:'rotate(5deg) scale(1.1)'},{transform:'rotate(-3deg)'},{transform:'rotate(0)'}],{duration:500})}
if(!ev.length||ev.reduce((a,e)=>a+Math.abs(e[1]),0)>8)return;
const fly=(html,A,B,s0,s1,delay,rot,after)=>{
 const w=document.createElement('div');w.className='fly';w.innerHTML=html;sc.appendChild(w);
 const r=w.getBoundingClientRect(),hw=r.width/2,hh=r.height/2;
 const k=(x,y,sc_,ro)=>`translate(${x-hw}px,${y-hh}px) scale(${sc_}) rotate(${ro}deg)`;
 const a=w.animate([{transform:k(A.x,A.y,s0,0)},{transform:k((A.x+B.x)/2,(A.y+B.y)/2-innerHeight*.09,(s0+s1)/2,rot/2),offset:.5},{transform:k(B.x,B.y,s1,rot)}],{duration:620,delay,easing:'ease-in-out',fill:'both'});
 a.onfinish=()=>{w.remove();after&&after()}};
const lean=(el,A,B,dur)=>{if(!el)return;const dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1,m=Math.min(d*.12,innerHeight*.045);
 el.animate([{transform:'none'},{transform:`translate(${dx/d*m}px,${dy/d*m}px) scale(1.09)`,offset:.4},{transform:'none'}],{duration:dur,easing:'ease-out'})};
ev.forEach(([i,d])=>{
 const seat=document.querySelector(`.st[data-i="${i}"]`);if(!seat)return;
 const fan=seat.querySelector('.fan2'),fg=seat.querySelector('.fg'),F=R(fan);
 if(d<0&&s.top.id!==p.top.id){
  top.style.visibility='hidden';
  fly(cardH(s.top,'cd'),F,T,.55,1,0,(i%2?1:-1)*8,()=>{top.style.visibility='visible';top.animate([{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:200})});
  lean(fg,F,T,700);fan&&fan.animate([{transform:'none'},{transform:'translateY(-1.4vh)'},{transform:'none'}],{duration:500});
 }else if(d>0){
  for(let j=0;j<d;j++)fly(bk(s.deck,'cd'),P,F,1,.62,j*220,(j%2?-1:1)*10);
  lean(fg,F,P,700+d*120);
 }});
}

const yell=(s,o)=>{const k=o[s.shout],x=SL[k][0],y=SL[k][1],dx=k==='B'?0:k==='TC'?14:(x<50?14:-14),by=k==='B'?-24:-4;return `<div class="yell" style="left:${x+dx}%;top:${y+by}%"><b>¡UNO!</b></div>`};
function say(t){try{const u=new SpeechSynthesisUtterance(t);u.lang='es-ES';u.rate=1.05;u.pitch=1.5;u.volume=1;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
