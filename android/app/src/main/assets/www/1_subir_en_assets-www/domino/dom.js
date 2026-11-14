const CH=['Ose','Deivid','Luty','Flor','Valen','Vos'],RC=['#2f7bff','#2fb24a','#c63bff','#33b34a','#ff8a1f','#3a8bff'];
const PP=[[],[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9],[1,3,4,5,6,7,9],[1,2,3,4,6,7,8,9],[1,2,3,4,5,6,7,8,9]];
const $=s=>document.querySelector(s),E=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const half=v=>'<i class=h>'+[1,2,3,4,5,6,7,8,9].map(k=>PP[v].includes(k)?'<b></b>':'<s></s>').join('')+'</i>';
const tile=(a,b,v,x)=>`<div class="t ${v?'v':''} ${x||''}">${half(a)}${half(b)}</div>`;
const canPlay=(t,ch)=>{if(!ch.length)return['L'];const l=ch[0][0],r=ch[ch.length-1][1],o=[];if(t[0]==l||t[1]==l)o.push('L');if(t[0]==r||t[1]==r)o.push('R');return o};
const av=c=>`<div class=av style="--rc:${RC[c]}"><img src="/domino/av${c}.jpg"></div>`;
function fit(){document.querySelectorAll('.stage').forEach(e=>e.style.transform=`scale(${Math.min(innerWidth/1600,innerHeight/900)})`)}
addEventListener('resize',fit);
