const E=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),$=s=>document.querySelector(s);
const D=[["Clásico","#111"],["Azul","linear-gradient(135deg,#2a7be4,#0b3c8c)"],["Verde","linear-gradient(135deg,#34b24d,#0e5c25)"],["Amarillo","linear-gradient(135deg,#ffd83a,#e0a800)"],["Morado","linear-gradient(135deg,#8e44d6,#4a1a8c)"],["Naranja","linear-gradient(135deg,#ff8a1f,#d35400)"],["Turquesa","linear-gradient(135deg,#20c4c4,#0a7a82)"],["Rosa","linear-gradient(135deg,#ff3d8b,#b0125a)"],["Negro","linear-gradient(135deg,#3a3a3a,#050505)"],["Arcoíris","conic-gradient(red,orange,yellow,green,cyan,blue,violet,red)"]];
const CH=[["🪓","Leñador"],["🧑‍🚀","Astronauta"],["👸","Princesa"],["🎸","Rockero"],["🤡","Payaso"],["🎪","Payasa"],["💃","Bailarina"],["💪","Fisicoculturista"],["⚔️","Samurái"],["🪖","Soldado"],["🐺","Hombre lobo"],["🦸","Héroe"]];
const CC={R:'#d32f2f',Y:'#f5c400',G:'#2e9e44',B:'#1e6fd9'},SYM={skip:'⊘',rev:'⇄','+2':'+2','+4':'+4',W:'✦'};
const bk=(i,cls='')=>`<div class="card back ${cls}" style="background-image:url(/decks/${i}.webp)"></div>`;
const cardH=(c,cls='',click='')=>`<div class="card ${c.c} ${cls}" ${click}>${c.c==='W'?'<b>'+SYM[c.v]+'</b>':(SYM[c.v]||c.v)}</div>`;
const av=(ch,cls='')=>`<img class="chimg ${cls}" src="/chars/${ch}.webp">`;
const qr=(t,px=260)=>{const q=new __QR.QRCode(-1,__QR.ECL.M);q.addData(t);q.make();const n=q.getModuleCount(),m=4;let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m},${r+m}h1v1h-1z`;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*m} ${n+2*m}" width="${px}" height="${px}" shape-rendering="crispEdges" style="background:#fff;border-radius:12px"><path d="${d}" fill="#000"/></svg>`};

const SL={B:[50,79],L:[14,58],TL:[24,23],TC:[50,18],TR:[76,23],R:[86,58]};
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
return `<div class="st ${o[i]} ${i==s.turn&&!s.over?'act':''}" style="left:${SL[o[i]][0]}%;top:${SL[o[i]][1]}%">${fig(p.ch,'fg')}<div class="fan2">${fan}</div><div class="tag">${E(p.name)} · ${p.sc} pts · ${p.n} cartas</div></div>`}).join('');
return `<div class="scene"><div class="moon"></div><div class="lamp l1"></div><div class="lamp l2"></div><div class="tbl"><div class="felt"></div></div><div class="ctr2">${bk(s.deck,'cd')}${cardH(s.top,'cd')}<i class="dot" style="background:${CC[s.col]}"></i><b class="dr">${s.dir>0?'↻':'↺'}</b></div>${seats}<div class="pill">${E(s.log)} · mazo: ${s.drawN}</div>${s.over?`<div class="win">🏆 ${E(s.players[s.win.i].name)} gana la ronda (+${s.win.pts} pts)</div>`:''}${s.shout!=null?`<div class="shout">¡UNO!<br>${av(s.players[s.shout].ch,'big')}</div>`:''}</div>`}
