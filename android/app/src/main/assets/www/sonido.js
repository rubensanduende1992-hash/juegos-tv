/* Sonido compartido (TV y celular). Voces: /sonidos/{f|m}/<clave>.mp3 · Música: fondo_1..5 · winner / loser */
const SND=(()=>{
 let mus=null,last=0,on=false,duck=0;
 const vol=()=>duck>0?.14:.3;
 function play(src,v){return new Promise(res=>{let done=false;const fin=()=>{if(!done){done=true;res()}};
  try{const a=new Audio(src);a.volume=v===undefined?1:v;a.onended=fin;a.onerror=fin;setTimeout(fin,9000);const p=a.play();if(p&&p.catch)p.catch(fin)}catch(e){fin()}})}
 function say(sex,key){if(!key)return Promise.resolve();duck++;if(mus)mus.volume=vol();return play('/sonidos/'+sex+'/'+key+'.mp3',1).then(()=>{duck--;if(mus)mus.volume=vol()})}
 const num=n=>((n>=1&&n<=7)||(n>=20&&n<=33))?String(n):null;
 function next(){if(!on)return;let n;do{n=1+Math.floor(Math.random()*5)}while(n===last);last=n;mus=new Audio('/sonidos/fondo_'+n+'.mp3');mus.volume=vol();mus.onended=next;const p=mus.play();if(p&&p.catch)p.catch(()=>{on=false;armed=false;arm()})}
 let armed=false;function arm(){if(armed)return;armed=true;const go=()=>{removeEventListener('pointerdown',go);removeEventListener('keydown',go);if(!on){on=true;next()}};addEventListener('pointerdown',go);addEventListener('keydown',go)}
 function music(){if(on)return;on=true;next()}
 function stop(){on=false;if(mus){mus.pause();mus=null}}
 return{play,say,num,music,stop}})();
