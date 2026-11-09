/* TRUCO - sala y partida (1 vs 1). Corre en la página de la TV; el relé le pasa las acciones de los celulares. */
const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');var urls=[];
function send(){window.onChange&&window.onChange()}
const PALOS=['espada','basto','copa','oro'],NUMS=[1,2,3,4,5,6,7,10,11,12];
const RANK={espada1:14,basto1:13,espada7:12,oro7:11,3:10,2:9,copa1:8,oro1:8,12:7,11:6,10:5,copa7:4,basto7:4,6:3,5:2,4:1};
const rank=c=>RANK[c.s+c.n]!==undefined?RANK[c.s+c.n]:RANK[c.n];
const ev1=c=>c.n>=10?0:c.n;
function envidoPts(cs){let b=0;for(let i=0;i<3;i++){b=Math.max(b,ev1(cs[i]));for(let j=i+1;j<3;j++)if(cs[i].s===cs[j].s)b=Math.max(b,20+ev1(cs[i])+ev1(cs[j]))}return b}
const TN=['truco','retruco','valecuatro'],EN=['envido','real','falta'],TV=[2,3,4],TREF=[1,2,3];
const opp=p=>1-p;
let S={phase:'lobby',mode:'1v1',target:15,pl:[],score:[0,0],hands:0,H:null,ev:[],evId:0,over:null};
function E(type,d){S.ev.push(Object.assign({id:++S.evId,type},d));if(S.ev.length>40)S.ev.shift()}
const need=()=>S.mode==='2v2'?4:2;
function shuffle(){const d=[];for(const s of PALOS)for(const n of NUMS)d.push({n,s});for(let i=d.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[d[i],d[j]]=[d[j],d[i]]}return d}
function startHand(){const d=shuffle(),mano=S.hands%2;S.hands++;
 const c=[d.slice(0,3),d.slice(3,6)];
 S.H={mano,turn:mano,trick:0,cards:c.map(x=>x.slice()),dealt:c.map(x=>x.slice()),table:[[],[]],tw:[],T:{lvl:0,tc:-1},ev:{done:false,calls:[]},pend:null,stack:null,ended:false};
 E('deal',{hand:S.hands,mano})}
function tval(){return S.H.T.lvl?TV[S.H.T.lvl-1]:1}
function handWinner(){const H=S.H,tw=H.tw;if(tw.length<2)return -1;const a=tw[0],b=tw[1];
 if(a>=0&&b>=0&&a===b)return a;if(a>=0&&b===-1)return a;if(a===-1&&b>=0)return b;
 if(tw.length===3){const c=tw[2];if(c>=0)return c;return a>=0?a:H.mano}return -1}
function addScore(p,n){S.score[p]+=n;if(S.score[p]>=S.target&&!S.over){S.over={winner:p};S.phase='over';E('game',{w:p});if(S.H)S.H.ended=true;return true}return false}
function endHand(w,pts,reason){const H=S.H;H.ended=true;H.pend=null;H.stack=null;E('hand',{w,pts,reason});
 if(addScore(w,pts))return;setTimeout(()=>{if(S.phase==='play'&&S.H===H){startHand();send()}},4200)}
function falta(){return Math.max(1,S.target-Math.max(S.score[0],S.score[1]))}
function pot(calls){if(calls.includes(3))return falta();return calls.reduce((a,l)=>a+(l===1?2:3),0)}
function popStack(H){H.pend=H.stack;H.stack=null}
function resolveEnvido(H){const c=H.ev.calls,p=pot(c),pts=[envidoPts(H.dealt[0]),envidoPts(H.dealt[1])];
 const w=pts[0]>pts[1]?0:pts[1]>pts[0]?1:H.mano;H.ev.done=true;H.pend=null;if(H.stack)popStack(H);
 E('envido',{w,pot:p,pts});addScore(w,p)}
function act(b,i){
 const H=S.H;
 if(b.t==='join'){
  if(S.phase!=='lobby')return{err:'La partida ya empezó'};
  if(String(b.code).toUpperCase()!==code)return{err:'Código incorrecto'};
  if(S.pl.length>=4)return{err:'Sala llena'};
  const id=Math.random().toString(36).slice(2);S.pl.push({id,name:String(b.name||'Jugador').trim().slice(0,12)||'Jugador'});return{id}}
 if(i<0)return{err:'Jugador desconocido'};
 if(S.phase==='lobby'){
  if(b.t==='mode'&&i===0)S.mode=b.m==='2v2'?'2v2':'1v1';
  else if(b.t==='target'&&i===0)S.target=b.v===30?30:15;
  else if(b.t==='leave'){S.pl.splice(i,1)}
  else if(b.t==='start'&&i===0&&S.mode==='1v1'&&S.pl.length===2){S.score=[0,0];S.hands=0;S.over=null;S.ev=[];S.phase='play';startHand()}
  return{}}
 if(b.t==='leave'){S.pl.splice(i,1);S.phase='lobby';S.H=null;S.over=null;return{}}
 if(S.phase==='over'){if(b.t==='rematch'&&i===0){S.score=[0,0];S.hands=0;S.over=null;S.ev=[];S.phase='play';startHand()}else if(b.t==='lobby'&&i===0){S.phase='lobby';S.H=null;S.over=null}return{}}
 if(!H||H.ended)return{err:'Esperá la próxima mano'};
 const P=H.pend,resp=P&&P.by!==i;
 if(b.t==='play'){
  if(P||H.turn!==i)return{err:'No es tu turno'};const k=+b.k;const c=H.cards[i][k];if(!c)return{err:'Carta inválida'};
  H.cards[i].splice(k,1);H.table[i][H.trick]=c;E('play',{p:i,card:c,t:H.trick});
  if(H.table[opp(i)][H.trick]){const a=rank(H.table[0][H.trick]),bb=rank(H.table[1][H.trick]),w=a>bb?0:bb>a?1:-1;H.tw.push(w);E('trick',{t:H.trick,w});
   const hw=handWinner();if(hw>=0){endHand(hw,tval(),'cartas')}else{H.trick++;H.turn=w>=0?w:H.mano}}
  else H.turn=opp(i)}
 else if(b.t==='truco'){
  if(P&&P.kind==='truco'&&resp&&P.lvl<3){H.T.lvl=P.lvl;H.T.tc=P.by;H.pend={kind:'truco',by:i,lvl:P.lvl+1,prev:P.prev};E('call',{p:i,k:TN[P.lvl]})}
  else if(!P&&H.turn===i&&H.T.lvl<3&&H.T.tc!==i){H.pend={kind:'truco',by:i,lvl:H.T.lvl+1,prev:H.turn};E('call',{p:i,k:TN[H.T.lvl]})}
  else return{err:'No podés cantar truco ahora'}}
 else if(b.t==='envido'){
  if(H.ev.done||H.trick!==0)return{err:'Ya no se puede cantar envido'};
  if(P&&P.kind==='envido'&&resp&&P.lvl<3){H.ev.calls.push(P.lvl);H.pend={kind:'envido',by:i,lvl:P.lvl+1};E('call',{p:i,k:EN[P.lvl]})}
  else if(P&&P.kind==='truco'&&resp){H.stack=P;H.pend={kind:'envido',by:i,lvl:1};E('call',{p:i,k:'envido'})}
  else if(!P&&H.turn===i){H.pend={kind:'envido',by:i,lvl:1};E('call',{p:i,k:'envido'})}
  else return{err:'No podés cantar envido ahora'}}
 else if(b.t==='quiero'){
  if(!resp)return{err:'Nada que responder'};E('resp',{p:i,r:'quiero',kind:P.kind});
  if(P.kind==='truco'){H.T.lvl=P.lvl;H.T.tc=P.by;H.turn=P.prev;H.pend=null}
  else{H.ev.calls.push(P.lvl);resolveEnvido(H)}}
 else if(b.t==='noquiero'){
  if(!resp)return{err:'Nada que responder'};E('resp',{p:i,r:'noquiero',kind:P.kind});
  if(P.kind==='truco'){endHand(P.by,TREF[P.lvl-1],'noquiero')}
  else{const pts=H.ev.calls.length?pot(H.ev.calls):1;H.ev.done=true;H.pend=null;if(H.stack)popStack(H);addScore(P.by,pts);E('envido',{w:P.by,pot:pts,refused:1})}}
 else if(b.t==='mazo'){
  if(!((H.turn===i&&!P)||resp))return{err:'No podés irte al mazo ahora'};
  E('mazo',{p:i});endHand(opp(i),(P&&P.kind==='truco')?TREF[P.lvl-1]:tval(),'mazo')}
 return{}}
function actions(i){const H=S.H;const off={on:false};
 if(S.phase!=='play'||!H||H.ended||i<0)return{play:false,truco:{on:false,label:'TRUCO'},envido:{on:false,label:'ENVIDO'},quiero:false,mazo:false};
 const P=H.pend,resp=P&&P.by!==i,T=H.T;
 let tr={on:false,label:T.lvl<3?TN[T.lvl].toUpperCase().replace('VALECUATRO','VALE CUATRO'):'VALE CUATRO'};
 if(P&&P.kind==='truco'&&resp&&P.lvl<3)tr={on:true,label:TN[P.lvl].toUpperCase().replace('VALECUATRO','VALE CUATRO')};
 else if(!P&&H.turn===i&&T.lvl<3&&T.tc!==i)tr={on:true,label:TN[T.lvl].toUpperCase().replace('VALECUATRO','VALE CUATRO')};
 let en={on:false,label:'ENVIDO'};
 if(!H.ev.done&&H.trick===0){
  if(P&&P.kind==='envido'&&resp&&P.lvl<3)en={on:true,label:['ENVIDO','REAL ENVIDO','FALTA ENVIDO'][P.lvl]};
  else if(P&&P.kind==='truco'&&resp)en={on:true,label:'ENVIDO'};
  else if(!P&&H.turn===i)en={on:true,label:'ENVIDO'}}
 return{play:!P&&H.turn===i,truco:tr,envido:en,quiero:!!resp,mazo:(H.turn===i&&!P)||!!resp}}
function view(id){const i=S.pl.findIndex(p=>p.id===id),H=S.H;
 const v={game:'truco',phase:S.phase,code,urls,mode:S.mode,need:need(),target:S.target,players:S.pl.map(q=>({name:q.name})),me:i,score:S.score,hands:S.hands,over:S.over,evId:S.evId,events:S.ev.slice(-12),canStart:S.mode==='1v1'&&S.pl.length===2};
 if(H&&S.phase!=='lobby'){v.counts=H.cards.map(c=>c.length);v.turn=H.turn;v.mano=H.mano;v.trick=H.trick;v.table=H.table.map(t=>[0,1,2].map(k=>t[k]||null));v.tw=H.tw;v.tval=tval();v.ended=H.ended;
  v.pend=H.pend?{kind:H.pend.kind,by:H.pend.by,lvl:H.pend.lvl}:null;v.envPot=H.ev.done?0:(H.pend&&H.pend.kind==='envido'?pot(H.ev.calls.concat(H.pend.lvl)):(H.ev.calls.length?pot(H.ev.calls):0));
  if(i>=0){v.mine=H.cards[i];v.act=actions(i)}}
 return v}
function hostAct(s){let r;try{const b=JSON.parse(s);r=act(b,S.pl.findIndex(p=>p.id===b.id))}catch(e){r={err:'Error: '+e.message}}send();return JSON.stringify(r)}
function hostView(id){return JSON.stringify(view(id))}
