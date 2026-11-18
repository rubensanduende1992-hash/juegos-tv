(function(){
/* EL JUEGO DEL IMPOSTOR - sala y partida (1 a 8 jugadores + bots). Corre en la página de la TV; el relé le pasa las acciones de los celulares. */
const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');var urls=[];
const {Game,T}=window.IG,R={seats:[],g:null,rolled:{},tm:null,until:0,evs:[],en:0,ready:{},cn:0,chat:[],rev:0,talkT:null};
const BOTN=['Tito','Lola','Nico','Vero','Gus','Mimi','Rulo','Pepa'],rnd=a=>a[Math.random()*a.length|0],fm=(s,n)=>s.replace('%s',n);
const LN={acc:['¡Creo que %s es el impostor!','%s se comporta muy raro…','¡Yo desconfío de %s!','¡Fue %s, estoy seguro!','%s, ¿dónde estabas anoche?'],agr:['Yo también desconfío de %s.','¡Cierto! %s está raro.','Tenés razón, %s me da mala espina.'],def:['¡Yo no fui, lo juro!','¡Soy inocente!','¿Yo? ¡Jamás!','No me miren a mí…'],pro:['%s es de fiar, yo lo defiendo.','Dejen en paz a %s.'],nerv:['Esto me da mala espina…','Alguien aquí miente.','Uy, qué tensión…']};
function send(){window.onChange&&window.onChange()}
function later(s,fn){if(R.g&&!R.seats.some(x=>R.g.get(x.id).alive))s=Math.min(s,1.5); // si no quedan humanos vivos, los bots juegan rápido
 clearTimeout(R.tm);R.until=Date.now()+s*1000;R.tm=setTimeout(fn,s*1000)}
function ev(name,data,to){const m=Object.assign({n:++R.en,name,to:to||null},data||{});if(name!=='say'){R.evs.push(m);if(R.evs.length>40)R.evs.shift()}window.onEv&&window.onEv(m)}
function chat(p,text,target){R.chat.push({n:++R.cn,name:p.name,text});if(R.chat.length>8)R.chat.shift();ev('say',{player:p.id,text,target:target||null})}
function humansAlive(){return R.seats.some(x=>R.g.get(x.id).alive)}
function talk(){clearTimeout(R.talkT);if(!R.g||R.g.phase!=='day'||!humansAlive())return;
 const al=R.g.alive(),bots=al.filter(x=>x.bot);
 if(bots.length){const b=rnd(bots),others=al.filter(x=>x.id!==b.id),r=Math.random();
  if(r<.55){const t=rnd(others);b.suspect=t.id;chat(b,fm(rnd(LN.acc),t.name),t.id);
   const f=bots.filter(x=>x.id!==b.id&&x.id!==t.id);if(f.length&&Math.random()<.45){const c=rnd(f);setTimeout(()=>{if(R.g.phase==='day'&&c.alive){c.suspect=t.id;chat(c,fm(rnd(LN.agr),t.name),t.id)}},1700)}}
  else if(r<.75)chat(b,rnd(LN.def));else if(r<.9)chat(b,fm(rnd(LN.pro),rnd(others).name));else chat(b,rnd(LN.nerv))}
 R.talkT=setTimeout(talk,2200+Math.random()*1600)}
function reveal(){if(!humansAlive())return;const bots=R.g.alive().filter(x=>x.bot);R.rev=Date.now()+700+bots.length*900;
 bots.forEach((b,i)=>setTimeout(()=>{const v=R.g.votes[b.id];if(R.g.phase==='vote'&&v)ev('say',{player:b.id,text:'Voto por '+R.g.get(v).name,target:v})},700+i*900))}
function start(){if(R.g||!R.seats.length)return;const seats=R.seats.map(s=>({id:s.id,name:s.name}));const used=seats.map(s=>s.name.toLowerCase()),bn=BOTN.filter(n=>!used.includes(n.toLowerCase()));
 for(let i=1;seats.length<8;i++)seats.push({id:'b'+i,name:bn[i-1]||'Bot '+i,bot:true});
 R.g=new Game(seats);ev('start');later(20,night);send()}
function night(){R.g.startNight();ev('night');later(R.g.allActed()?3:T.night,resolve);send()}
function resolve(){if(R.g.phase!=='night')return;const r=R.g.resolveNight();if(r.death){ev('death',{player:r.death});ev('dead',{},r.death)}else if(r.saved)ev('saved');
 send();if(R.g.phase==='end')return later(5.5,end);later(r.death?5.5:r.saved?4:1,day)}
function day(){R.g.phase='day';R.ready={};R.g.p.forEach(x=>x.suspect=null);ev('day');const h=R.seats.filter(x=>R.g.get(x.id).alive).length;later(Math.max(25,Math.min(90,20+15*h)),vote);setTimeout(talk,1800);send()}
function vote(){clearTimeout(R.talkT);R.g.startVote();ev('vote');reveal();later(T.vote,close);send()}
function close(){if(R.g.phase!=='vote')return;ev('endvote');const r=R.g.closeVote();
 if(r.runoff){ev('tie',{cands:r.runoff});reveal();later(20,close);return send()}
 if(r.expelled){ev('expel',{player:r.expelled,role:r.role,card:r.card,who:r.name});ev('expelled',{},r.expelled);if(r.role==='impostor')ev('discovered',{},r.expelled);
  later(4,()=>R.g.phase==='end'?end():night());return send()}
 ev('none');later(4,night);send()}
function end(){const g=R.g;ev('end',{kind:g.kind,winners:g.winners});R.seats.forEach(s=>ev(g.winners.includes(s.id)?'winner':'loser',{},s.id));send()}
function act(b){
 if(b.t==='join'){if(String(b.code||'').toUpperCase()!==code)return{err:'Código incorrecto'};
  const ex=b.cid&&R.seats.find(x=>x.cid===b.cid);if(ex)return{id:ex.id}; // el mismo celular que vuelve a entrar no se duplica
  if(R.g)return{err:'La partida ya empezó'};if(R.seats.length>=8)return{err:'Sala llena'};
  const id=Math.random().toString(36).slice(2);R.seats.push({id,cid:b.cid||'',name:String(b.name||'Jugador').replace(/[<>&"'`]/g,'').trim().slice(0,12)||'Jugador'});return{id}}
 const s=R.seats.find(x=>x.id===b.id);if(!s)return{err:'Jugador desconocido'};
 if(b.t==='leave'){if(!R.g)R.seats.splice(R.seats.indexOf(s),1);return{}}
 if(b.t==='start'){start();return{}}
 if(!R.g)return{};
 if(b.t==='ready'){if(R.g.phase==='day'){R.ready[s.id]=1;if(R.seats.every(x=>!R.g.get(x.id).alive||R.ready[x.id]))later(.5,vote)}return{}}
 if(b.t==='roll'){R.rolled[s.id]=1;if(R.g.phase==='lobby'&&R.seats.every(x=>R.rolled[x.id]))later(5,night)}
 else if(b.t==='act'){const r=R.g.act(s.id,b.target);if(!r.ok)return{err:'Acción no válida'};if(R.g.allActed())later(.5,resolve);return{ok:1,result:r.result}}
 else if(b.t==='vote'){const r=R.g.vote(s.id,b.target);if(!r.ok)return{err:'Voto no válido'};if(R.g.allVoted())later(Math.max(1,(R.rev-Date.now())/1000),close);return{ok:1}}
 return{}}
function view(id){const g=R.g,i=R.seats.findIndex(s=>s.id===id),left=Math.max(0,Math.round((R.until-Date.now())/1000));
 const base={game:'impostor',code,urls,me:i,left,en:R.en,ready:!!R.ready[id],chat:R.chat.slice(-3),phase:g?({lobby:'roll',resolve:'night',expel:'vote'}[g.phase]||g.phase):'lobby'};
 if(!g)return Object.assign(base,{players:R.seats.map(s=>({id:s.id,name:s.name})),first:i>=0});
 const p=g.pub();return Object.assign(base,{round:p.round,scene:p.scene,voted:p.voted,cands:p.cands,winners:p.winners,kind:p.kind,players:p.players,you:i>=0?g.priv(id):null,evs:R.evs.filter(e=>!e.to||e.to===id).slice(-12)})}
function hostAct(s){let r;try{r=act(JSON.parse(s))}catch(e){r={err:'Error: '+e.message}}send();return JSON.stringify(r)}
function hostView(id){return JSON.stringify(view(id))}
window.hostAct=hostAct;window.hostView=hostView;window.start=start;window.IMP={R,night,resolve,day,vote,close,end};
})();
