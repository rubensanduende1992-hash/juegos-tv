// Sonido: 3 canales (música, avisos, efectos). Los avisos suenan de a uno (cola) y bajan la música; nunca se cortan entre sí.
const A=(()=>{
  const C=new(window.AudioContext||window.webkitAudioContext)(),g={m:C.createGain(),v:C.createGain(),s:C.createGain()};
  g.m.gain.value=.45;g.v.gain.value=1;g.s.gain.value=.8;for(const k in g)g[k].connect(C.destination);
  const buf={},q=[];let busy=0,mus=null,musId=null;
  const load=id=>buf[id]||(buf[id]=fetch('/sonidos/impostor/'+id+'.mp3').then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>C.decodeAudioData(b,ok,no))).catch(()=>null));
  const play=async(id,bus,end)=>{const b=await load(id);if(!b){end&&end();return}const s=C.createBufferSource();s.buffer=b;s.connect(g[bus]);if(end)s.onended=end;s.start()};
  const next=()=>{if(busy||!q.length)return;const x=q.shift();if(!x.keep&&Date.now()-x.t>2500)return next();busy=1;
    g.m.gain.setTargetAtTime(.12,C.currentTime,.1);
    play(x.id,'v',()=>{busy=0;g.m.gain.setTargetAtTime(.45,C.currentTime+.4,.2);next()})};
  return{
    unlock(){if(C.state!=='running')C.resume()},
    preload(ids){ids.forEach(load)},
    say(id,keep){q.push({id,keep,t:Date.now()});next()},
    sfx(id){play(id,'s')},
    music(id){if(musId===id)return;musId=id;const old=mus;
      if(old){old.g.gain.setTargetAtTime(0,C.currentTime,.5);setTimeout(()=>old.s.stop(),2500)}
      load(id).then(b=>{if(!b||musId!==id)return;const s=C.createBufferSource(),x=C.createGain();s.buffer=b;s.loop=true;x.gain.value=0;s.connect(x);x.connect(g.m);s.start();x.gain.setTargetAtTime(1,C.currentTime,.5);mus={s,g:x}})}
  };
})();
