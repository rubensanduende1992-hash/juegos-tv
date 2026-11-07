/* TRUCO - sala (lobby). Corre en la página de la TV; el relé le pasa las acciones de los celulares. */
const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');var urls=[];
function send(){window.onChange&&window.onChange()}
let S={phase:'lobby',mode:'1v1',pl:[]};
const need=()=>S.mode==='2v2'?4:2;
function act(b,i){
 if(b.t==='join'){
  if(S.phase!=='lobby')return{err:'La partida ya empezó'};
  if(String(b.code).toUpperCase()!==code)return{err:'Código incorrecto'};
  if(S.pl.length>=4)return{err:'Sala llena'};
  const id=Math.random().toString(36).slice(2);
  S.pl.push({id,name:String(b.name||'Jugador').trim().slice(0,12)||'Jugador'});return{id}}
 if(i<0)return{err:'Jugador desconocido'};
 if(b.t==='mode'&&i===0&&S.phase==='lobby'){S.mode=b.m==='2v2'?'2v2':'1v1'}
 else if(b.t==='leave'){S.pl.splice(i,1);if(S.phase!=='lobby')S.phase='lobby'}
 else if(b.t==='start'&&i===0&&S.phase==='lobby'&&S.pl.length===need()){S.phase='ready'}
 else if(b.t==='back'&&i===0){S.phase='lobby'}
 return{}}
function view(id){const i=S.pl.findIndex(p=>p.id===id);
 return{game:'truco',phase:S.phase,code,urls,mode:S.mode,need:need(),players:S.pl.map(q=>({name:q.name})),me:i}}
function hostAct(s){let r;try{const b=JSON.parse(s);r=act(b,S.pl.findIndex(p=>p.id===b.id))}catch(e){r={err:'Error'}}send();return JSON.stringify(r)}
function hostView(id){return JSON.stringify(view(id))}
