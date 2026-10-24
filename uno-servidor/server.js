// UNO TV - servidor de prueba. Uso: node server.js  (sin instalar nada más)
const http=require('http'),fs=require('fs'),os=require('os'),path=require('path'),PORT=3000;
const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
const FILES={'/':'tv.html','/play':'play.html','/common.js':'common.js','/style.css':'style.css','/qr.js':'qr.js'};
const TYPE={html:'text/html',js:'text/javascript',css:'text/css'};
const num=v=>/^[0-9]$/.test(v);
let S={phase:'lobby',deck:0,pl:[],draw:[],disc:[],turn:0,dir:1,col:'',drawn:null,over:false,win:null,log:'',shout:null};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function mkDeck(){let d=[],id=0;'RYGB'.split('').forEach(c=>{d.push({id:id++,c,v:'0'});for(let n=1;n<=9;n++)for(let k=0;k<2;k++)d.push({id:id++,c,v:''+n});['skip','rev','+2'].forEach(v=>{for(let k=0;k<2;k++)d.push({id:id++,c,v})})});for(let k=0;k<4;k++){d.push({id:id++,c:'W',v:'W'});d.push({id:id++,c:'W',v:'+4'})}return shuffle(d)}
function begin(){Object.assign(S,{phase:'game',draw:mkDeck(),disc:[],dir:1,drawn:null,over:false,win:null,shout:null,log:'¡Que empiece el juego!'});
S.pl.forEach(p=>{p.hand=[];p.uno=false;p.vuln=false;for(let k=0;k<7;k++)p.hand.push(S.draw.pop())});
let t;while(!num((t=S.draw.pop()).v))S.draw.unshift(t);S.disc.push(t);S.col=t.c;S.turn=Math.random()*S.pl.length|0}
const nxt=(i,s=1)=>{const n=S.pl.length;return((i+S.dir*s)%n+n)%n};
function take(i,k){const p=S.pl[i];for(let j=0;j<k;j++){if(!S.draw.length){const t=S.disc.pop();S.draw=shuffle(S.disc);S.disc=[t]}if(!S.draw.length)break;p.hand.push(S.draw.pop())}p.uno=false}
function ok(c,p){if(c.c==='W')return c.v==='W'||!p.hand.some(x=>x.c===S.col);return c.c===S.col||c.v===S.disc[S.disc.length-1].v}
function can(c,p){if(S.over)return false;if(S.drawn!=null&&c.id!==S.drawn)return false;return ok(c,p)}
function flash(i){S.shout=i;setTimeout(()=>{S.shout=null;send()},1800)}
function play(i,id,col){if(S.over||i!==S.turn)return;const p=S.pl[i],c=p.hand.find(x=>x.id===id);if(!c||!can(c,p))return;if(c.c==='W'&&!'RYGB'.includes(col))return;
S.pl.forEach(x=>x.vuln=false);p.hand=p.hand.filter(x=>x.id!==id);S.drawn=null;S.disc.push(c);S.col=c.c==='W'?col:c.c;
if(!p.hand.length){const pts=S.pl.reduce((s,q)=>s+q.hand.reduce((a,x)=>a+(num(x.v)?+x.v:x.c==='W'?50:20),0),0);p.sc+=pts;S.over=true;S.win={i,pts};S.log=p.name+' se quedó sin cartas';return}
if(p.hand.length===1){if(p.uno)flash(i);else p.vuln=true}
let s=1;const nx=nxt(i);
if(c.v==='skip'){s=2;S.log=S.pl[nx].name+' pierde el turno'}
else if(c.v==='rev'){S.dir*=-1;s=S.pl.length===2?2:1;S.log='Cambio de sentido'}
else if(c.v==='+2'){take(nx,2);s=2;S.log=S.pl[nx].name+' roba 2 y pierde el turno'}
else if(c.v==='+4'){take(nx,4);s=2;S.log=S.pl[nx].name+' roba 4 y pierde el turno'}
else S.log=p.name+' jugó';
S.turn=nxt(i,s)}
function act(b,i){
if(b.t==='join'){if(S.phase!=='lobby')return{err:'La partida ya empezó'};if(S.pl.length>=6)return{err:'Sala llena'};if(String(b.code).toUpperCase()!==code)return{err:'Código incorrecto'};
const id=Math.random().toString(36).slice(2);S.pl.push({id,name:String(b.name||'Jugador').slice(0,12),ch:-1,cur:[...Array(12).keys()].find(k=>!S.pl.some(q=>q.ch===k||q.cur===k)),hand:[],uno:false,vuln:false,sc:0});return{id}}
if(i<0)return{err:'Jugador desconocido'};const p=S.pl[i];
if(S.phase==='lobby'){if(i===0&&b.t==='deck')S.deck=+b.i%10;if(b.t==='move'){const d=+b.d||0;p.cur=((p.cur+d)%12+12)%12}if(b.t==='pick'){if(p.ch===p.cur)p.ch=-1;else if(!S.pl.some((q,j)=>j!==i&&q.ch===p.cur))p.ch=p.cur}if(i===0&&b.t==='start'&&S.pl.length>=2&&S.pl.every(q=>q.ch>=0))begin();return{}}
if(b.t==='again'&&i===0&&S.over)begin();
else if(b.t==='menu'&&i===0){S.phase='lobby';S.pl.forEach(q=>q.sc=0)}
else if(b.t==='play')play(i,b.cid,b.col);
else if(b.t==='draw'&&!S.over&&i===S.turn&&S.drawn==null){S.pl.forEach(x=>x.vuln=false);take(i,1);const c=p.hand[p.hand.length-1];if(c&&ok(c,p)){S.drawn=c.id;S.log=p.name+' robó una carta jugable'}else{S.log=p.name+' robó y pasó';S.turn=nxt(i)}}
else if(b.t==='pass'&&i===S.turn&&S.drawn!=null){S.drawn=null;S.log=p.name+' pasó';S.turn=nxt(i)}
else if(b.t==='uno'&&p.hand.length<=2){p.uno=true;p.vuln=false;flash(i)}
else if(b.t==='cazar'){const k=S.pl.findIndex((x,j)=>x.vuln&&j!==i);if(k>=0){take(k,2);S.pl[k].vuln=false;S.log='¡'+p.name+' cazó a '+S.pl[k].name+'! Roba 2'}}
return{}}
const urls=Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>`http://${n.address}:${PORT}/play`);
function view(id){const i=S.pl.findIndex(p=>p.id===id),p=S.pl[i];
const v={phase:S.phase,code,urls,deck:S.deck,players:S.pl.map(q=>({name:q.name,ch:q.ch,cur:q.cur,n:q.hand.length,sc:q.sc})),turn:S.turn,dir:S.dir,col:S.col,top:S.disc[S.disc.length-1],drawN:S.draw.length,log:S.log,over:S.over,win:S.win,shout:S.shout,me:i};
if(p&&S.phase==='game'){v.hand=p.hand.map(c=>({...c,ok:i===S.turn&&can(c,p)}));v.drawn=S.drawn;v.vul=S.pl.some((x,j)=>x.vuln&&j!==i);v.said=!!p.uno}return v}
let clients=[];
function send(){clients.forEach(c=>c.res.write('data: '+JSON.stringify(view(c.id))+'\n\n'))}
setInterval(()=>clients.forEach(c=>c.res.write(': ping\n\n')),15000);
http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
if(u.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});const c={res,id:u.searchParams.get('id')};clients.push(c);res.write('data: '+JSON.stringify(view(c.id))+'\n\n');req.on('close',()=>clients=clients.filter(x=>x!==c));return}
if(u.pathname==='/act'&&req.method==='POST'){let d='';req.on('data',x=>d+=x);req.on('end',()=>{let r;try{const b=JSON.parse(d);r=act(b,S.pl.findIndex(p=>p.id===b.id))}catch(e){r={err:'Error'}}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(r));send()});return}
if(/^\/(decks|chars|seat)\/(full\/)?\d+\.webp$/.test(u.pathname)){try{const d=fs.readFileSync(path.join(__dirname,u.pathname));res.writeHead(200,{'Content-Type':'image/webp'});return res.end(d)}catch(e){res.writeHead(404);return res.end()}}
if(u.pathname==='/state'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(view(u.searchParams.get('id')||'')))}
if(u.pathname==='/scene.jpg'||u.pathname==='/select-bg.jpg'){try{const d=fs.readFileSync(path.join(__dirname,u.pathname.slice(1)));res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(d)}catch(e){res.writeHead(404);return res.end()}}
const f=FILES[u.pathname];if(!f){res.writeHead(404);return res.end('No encontrado')}
res.writeHead(200,{'Content-Type':TYPE[f.split('.')[1]]+';charset=utf-8'});res.end(fs.readFileSync(path.join(__dirname,f)))
}).listen(PORT,'0.0.0.0',()=>{console.log('\nUNO TV listo.\n  TV (abrir en el navegador de la TV o de esta PC): http://localhost:'+PORT+'\n  Celulares: '+urls.join('  ')+'\n  Código de sala: '+code+'\n')});
