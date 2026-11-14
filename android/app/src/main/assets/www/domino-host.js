/* DOMINÓ - sala y partida (1 a 6). Corre en la página de la TV; el relé le pasa las acciones de los celulares. */
function snd(){}
const sum=h=>h.reduce((s,t)=>s+t[0]+t[1],0);
const newSet=n=>{const s=[];for(let a=0;a<=n;a++)for(let b=a;b<=n;b++)s.push([a,b]);for(let i=s.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[s[i],s[j]]=[s[j],s[i]]}return s};
const S={ph:'lobby',code:'',target:100,pl:[],chain:[],pozo:[],turn:0,v:0,left:20,msg:null,votes:[],mesa:'g',pass:0,prev:-1,seen:{},nr:0};
function place(t,side){const c=S.chain;if(!c.length){c.push([t[0],t[1]]);return}if(side=='L'){const l=c[0][0];c.unshift(t[1]==l?[t[0],t[1]]:[t[1],t[0]])}else{const r=c[c.length-1][1];c.push(t[0]==r?[t[0],t[1]]:[t[1],t[0]])}}
function start(){S.pl=S.pl.filter(p=>!p.bot);if(!S.pl.length)return;const u=S.pl.map(p=>p.char);S.pl.forEach(p=>{if(p.char<0){const c=[0,1,2,3,4,5].find(x=>!u.includes(x));p.char=c;p.name=CH[c];u.push(c)}p.score=0});
while(S.pl.length<4){const c=[0,1,2,3,4,5].find(x=>!u.includes(x));if(c==null)break;u.push(c);S.pl.push({pid:'b'+c,name:CH[c],char:c,bot:true,score:0,hand:[]})}
S.mesa=Math.random()<.5?'g':'r';S.prev=-1;S.votes=[];deal()}
function deal(){const n=S.pl.length,mx=n>=5?9:6,per=n>=5?6:7;let h,st,hd;
for(;;){hd=-1;st=-1;const s=newSet(mx);h=S.pl.map((_,i)=>s.slice(i*per,i*per+per));S.pozo=s.slice(n*per);h.forEach((x,i)=>x.forEach(t=>{if(t[0]==t[1]&&t[0]>hd){hd=t[0];st=i}}));if(hd>=0)break}
S.pl.forEach((p,i)=>p.hand=h[i]);S.chain=[];S.pass=0;S.msg=null;S.ph='play';S.left=20;
if(S.prev<0){S.turn=st;const p=S.pl[st],k=p.hand.findIndex(t=>t[0]==hd&&t[1]==hd);place(p.hand.splice(k,1)[0]);nxt()}else S.turn=S.prev;
sched();pub()}
function nxt(){S.turn=(S.turn+1)%S.pl.length;S.left=20}
function play(i,t,side){const p=S.pl[i],k=p.hand.findIndex(x=>x[0]==t[0]&&x[1]==t[1]);if(k<0)return;const o=canPlay(p.hand[k],S.chain);if(!o.includes(side))side=o[0];if(!side)return;place(p.hand.splice(k,1)[0],side);S.pass=0;if(!p.hand.length)return endR(i);nxt();sched();pub()}
function draw(i){const p=S.pl[i];if(S.pozo.length&&!p.hand.some(t=>canPlay(t,S.chain).length)){p.hand.push(S.pozo.pop());pub()}}
function pass(i){if(S.pozo.length||S.pl[i].hand.some(t=>canPlay(t,S.chain).length))return;S.pass++;if(S.pass>=S.pl.length)return endR(-1);nxt();sched();pub()}
function auto(i){const p=S.pl[i];for(;;){const o=p.hand.filter(t=>canPlay(t,S.chain).length);if(o.length){o.sort((a,b)=>(b[0]+b[1])-(a[0]+a[1]));return play(i,o[0],canPlay(o[0],S.chain)[0])}if(S.pozo.length)p.hand.push(S.pozo.pop());else return pass(i)}}
function sched(){clearTimeout(S.bt);const p=S.pl[S.turn];if(S.ph=='play'&&p&&p.bot){const i=S.turn;S.bt=setTimeout(()=>{if(S.ph=='play'&&S.turn==i)auto(i)},1200+Math.random()*1000)}}
function endR(w){clearTimeout(S.bt);if(w<0){let m=1e9;S.pl.forEach((p,i)=>{const s=sum(p.hand);if(s<m){m=s;w=i}})}
const pts=S.pl.reduce((s,p,i)=>s+(i==w?0:sum(p.hand)),0);S.pl[w].score+=pts;S.msg={w:S.pl[w].pid,name:S.pl[w].name,pts};S.prev=w;
S.ph='end';S.votes=[];pub()}
function rematch(){S.mesa=Math.random()<.5?'g':'r';S.votes=[];deal()}

const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');var urls=[];
function send(){window.onChange&&window.onChange()}
function pub(){S.v++;send()}
setInterval(()=>{if(S.ph=='play'){S.left--;if(S.left<=0)auto(S.turn);else window.onTick&&window.onTick()}},1000);
function act(b,i){
if(b.t=='join'){if(S.ph!='lobby')return{err:'La partida ya empezó'};if(String(b.code).toUpperCase()!==code)return{err:'Código incorrecto'};if(S.pl.length>=6)return{err:'Sala llena'};const id=Math.random().toString(36).slice(2);S.pl.push({pid:id,name:'',char:-1,bot:false,score:0,hand:[]});return{id}}
if(i<0)return{err:'Jugador desconocido'};const p=S.pl[i];
if(b.t=='leave'){if(S.ph=='lobby')S.pl.splice(i,1);else{p.bot=true;p.pid='x'+p.pid;sched()}return{}}
if(S.ph=='lobby'){
 if(b.t=='pick'&&b.c>=0&&b.c<6&&!S.pl.some(q=>q!=p&&q.char==b.c)){p.char=b.c;p.name=CH[b.c]}
 else if(b.t=='target'&&i==0)S.target=[50,100,150].includes(+b.n)?+b.n:100;
 else if(b.t=='start'&&i==0)start();
 return{}}
if(S.ph=='play'){if(i!=S.turn)return{err:'No es tu turno'};if(b.t=='play')play(i,b.tile,b.side);else if(b.t=='draw')draw(i);else if(b.t=='pass')pass(i)}
else if(S.ph=='end'&&b.t=='again'){if(!S.votes.includes(p.pid))S.votes.push(p.pid);if(i==0||S.votes.length>=S.pl.filter(q=>!q.bot).length)rematch();else pub()}
return{}}
function view(id){const me=S.pl.findIndex(p=>p.pid===id),m=S.msg;
return{game:'domino',phase:S.ph,code,urls,target:S.target,mesa:S.mesa,me,pl:S.pl.map(p=>({name:p.name,char:p.char,bot:p.bot,score:p.score,n:p.hand.length})),hand:me>=0?S.pl[me].hand:[],chain:S.chain,pozo:S.pozo.length,turn:S.turn,left:S.left,msg:m?{w:S.pl.findIndex(p=>p.pid===m.w),name:m.name,pts:m.pts}:null,votes:S.votes.map(v=>S.pl.findIndex(p=>p.pid===v))}}
function hostAct(s){let r;try{const b=JSON.parse(s);r=act(b,S.pl.findIndex(p=>p.pid===b.id))}catch(e){r={err:'Error: '+e.message}}send();return JSON.stringify(r)}
function hostView(id){return JSON.stringify(view(id))}
