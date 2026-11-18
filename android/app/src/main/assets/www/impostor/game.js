(function(){
'use strict';
// Lógica pura del juego (sin red). El servidor es la única autoridad sobre roles, acciones y resultados.
const CHARS=['policia','medica','delincuente','empresaria','profesor','periodista','bombero','desconocida'];
const ROLES=['impostor','policia','medico','ninguno','ninguno','ninguno','ninguno','ninguno'];
const ACT={impostor:'kill',policia:'investigate',medico:'protect'};
const SCENES=['mansion','pueblo','hotel','bosque','crucero','hospital'];
const T={night:30,day:60,vote:35};
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
class Game{
  constructor(seats,rnd=Math.random){
    if(seats.length!==8)throw new Error('Se necesitan 8 jugadores');
    this.rnd=rnd;const ch=shuffle(CHARS,rnd),ro=shuffle(ROLES,rnd); // personaje y rol se sortean por separado
    const fl=shuffle(['delincuente','empresaria','profesor','periodista','bombero'],rnd); // tarjetas de los 5 personajes sin acción
    const cardOf=r=>r==='impostor'?'desconocida':r==='policia'?'policia':r==='medico'?'medica':fl.pop();
    this.scene=shuffle(SCENES,rnd)[0];
    this.p=seats.map((s,i)=>({id:s.id,name:s.name,bot:!!s.bot,char:ch[i],role:ro[i],card:cardOf(ro[i]),alive:true,selfUsed:false}));
    this.phase='lobby';this.round=0;this.acts={};this.votes={};this.stage=1;this.cands=null;this.revealed={};this.winners=null;this.kind=null;
  }
  get(id){return this.p.find(x=>x.id===id)}
  alive(){return this.p.filter(x=>x.alive)}
  pick(l){return l[Math.floor(this.rnd()*l.length)]}
  startNight(){
    this.phase='night';this.round++;this.acts={};
    for(const x of this.alive())if(x.bot&&ACT[x.role]){
      const c=this.alive().filter(y=>y.id!==x.id||(x.role==='medico'&&!x.selfUsed));
      this.act(x.id,this.pick(c).id);
    }
  }
  act(id,target){
    const x=this.get(id),y=this.get(target);
    if(this.phase!=='night'||!x||!y||!x.alive||!y.alive||!ACT[x.role]||this.acts[ACT[x.role]])return{ok:false};
    if(y.id===x.id&&(x.role!=='medico'||x.selfUsed))return{ok:false};
    if(y.id===x.id)x.selfUsed=true; // la autoprotección se gasta al elegirse
    this.acts[ACT[x.role]]=y.id;
    return{ok:true,result:x.role==='policia'?{target:y.id,impostor:y.role==='impostor'}:undefined};
  }
  allActed(){return this.alive().filter(x=>ACT[x.role]).every(x=>this.acts[ACT[x.role]])}
  resolveNight(){
    const v=this.acts.kill,saved=!!v&&this.acts.protect===v;let death=null;
    if(v&&!saved){this.get(v).alive=false;death=v}
    if(!this.checkWin())this.phase='resolve'; // cerrada la noche, ya no se aceptan acciones
    return{death,saved};
  }
  checkWin(){
    const a=this.alive(),imp=a.filter(x=>x.role==='impostor');
    if(imp.length&&a.length-imp.length<=imp.length){this.winners=imp.map(x=>x.id);this.kind='impostor';this.phase='end'}
    return this.phase==='end';
  }
  startVote(){this.phase='vote';this.stage=1;this.cands=null;this.votes={};this.botVotes()}
  botVotes(){ // los bots votan (casi siempre) a quien acusaron; a veces se equivocan y votan al azar
    for(const x of this.alive())if(x.bot){
      const ok=y=>y.alive&&y.id!==x.id&&(!this.cands||this.cands.includes(y.id)),s=x.suspect&&this.get(x.suspect);
      const t=(s&&ok(s)&&this.rnd()<.8)?s:this.pick(this.alive().filter(ok));
      this.vote(x.id,t.id);
    }
  }
  vote(id,target){
    const x=this.get(id),y=this.get(target);
    if(this.phase!=='vote'||!x||!y||!x.alive||!y.alive||id===target||id in this.votes||(this.cands&&!this.cands.includes(target)))return{ok:false};
    this.votes[id]=target;return{ok:true};
  }
  allVoted(){return this.alive().every(x=>x.id in this.votes)}
  closeVote(){
    const c={};for(const t of Object.values(this.votes))c[t]=(c[t]||0)+1;
    const m=Math.max(0,...Object.values(c)),top=Object.keys(c).filter(k=>c[k]===m);
    if(!top.length||(top.length>1&&this.stage===2)){this.phase='expel';return{expelled:null,tie:top.length>1}} // 2.º empate: nadie sale
    if(top.length>1){this.stage=2;this.cands=top;this.votes={};this.botVotes();return{runoff:top}}
    const r=this.expel(top[0]);if(this.phase!=='end')this.phase='expel'; // cerrada la votación, ya no se aceptan votos
    return r;
  }
  expel(id){
    const x=this.get(id);x.alive=false;this.revealed[id]=x.role;
    const voters=Object.keys(this.votes).filter(k=>this.votes[k]===id);
    if(x.role==='impostor'){this.winners=voters;this.kind='descubridores';this.phase='end'} // ganan quienes lo votaron
    else this.checkWin();
    return{expelled:id,role:x.role,card:x.card,name:x.name,voters};
  }
  pub(){ // vista pública (TV): nunca incluye roles secretos
    const end=this.phase==='end';
    return{phase:this.phase,round:this.round,scene:this.scene,voted:Object.keys(this.votes).length,cands:this.cands,winners:this.winners,kind:this.kind,
      players:this.p.map(x=>({id:x.id,name:x.name,char:x.char,alive:x.alive,...((end||this.revealed[x.id])?{role:x.role}:{})}))};
  }
  priv(id){const x=this.get(id);return{id,char:x.char,role:x.role,card:x.card,selfUsed:x.selfUsed}}
}
window.IG={Game,CHARS,T};

})();
