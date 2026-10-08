/* MultiplyOS text size pre-paint script. Generated from mos-text-script.ts MOS_TEXT_SCRIPT: do not hand-edit. Load it first in <head>, blocking: <script src="/multiplyos/mos-text-prepaint.js"></script> */
(function(w,d){try{
var F=86400000,M=60000,C="mos_text",A="data-mos-text",S=[{"key":"xs50","scale":0.5,"label":"50%"},{"key":"s65","scale":0.65,"label":"65%"},{"key":"s80","scale":0.8,"label":"80%"},{"key":"s90","scale":0.9,"label":"90%"},{"key":"default","scale":1,"label":"100%"},{"key":"l115","scale":1.15,"label":"115%"},{"key":"l130","scale":1.3,"label":"130%"},{"key":"l150","scale":1.5,"label":"150%"}],K=Object.create(null),i;
for(i=0;i<S.length;i++)K[S[i].key]=S[i];
function ks(k){return typeof k==="string"&&!!K[k]}
function up(t){var u=Math.ceil(t/M)*M;return u>Date.now()+F?Math.floor(t/M)*M:u}
function nw(){var n=Date.now(),c=Math.ceil(n/M)*M,t=Math.max(c,r0?Math.floor(r0.at/M)*M+M:0);return t>n+F?c:t}
function rd(){var c=d.cookie||"",p=c.split(";"),b=null,j,e,v,m;for(j=0;j<p.length;j++){e=p[j].indexOf("=");if(e<0)continue;if(p[j].slice(0,e).replace(/^\s+|\s+$/g,"")!==C)continue;v=p[j].slice(e+1).replace(/^\s+|\s+$/g,"");try{v=decodeURIComponent(v)}catch(x){continue}m=/^([a-z0-9]+)\.(\d{1,16})$/.exec(v);if(m&&ks(m[1])&&+m[2]<=Date.now()+F&&(!b||+m[2]>b.at))b={size:m[1],at:+m[2]}}return b}
function dom(){var h=(location.hostname||"").toLowerCase().replace(/\.$/,"");return h==="futures.church"||/\.futures\.church$/.test(h)?"; Domain=.futures.church":""}
function wr(v){d.cookie=C+"="+v.size+"."+v.at+"; Path=/; Max-Age=31536000; SameSite=Lax"+dom()+(location.protocol==="https:"?"; Secure":"")}
function mn(v){var t=up(v.at),r={size:v.size,at:t};if(t!==v.at)wr(r);return r}
function ap(k){var r=d.documentElement;if(ks(k)&&k!=="default")r.setAttribute(A,k);else r.removeAttribute(A)}
function cur(){return r0?r0.size:"default"}
function fire(v,src){try{w.dispatchEvent(new CustomEvent("mos-text-change",{detail:{size:v.size,at:v.at,source:src}}))}catch(x){}}
var r0=rd(),pv=null,bc=null;if(r0)r0=mn(r0);function show(){ap(pv||(r0&&r0.size))}show();
try{bc=new BroadcastChannel(C);bc.onmessage=function(e){var v=e&&e.data,t=v?+v.at:NaN;if(!v||!ks(v.size)||!(t>=0)||t>Date.now()+F)return;if(!r0||t>r0.at){r0=mn({size:v.size,at:t});show();fire(r0,"tab")}else if(t===r0.at&&v.size!==r0.size)recheck()}}catch(x){}
function adopt(v,src){var t=v?+v.at:NaN;if(!v||!ks(v.size)||!(t>=0)||t>Date.now()+F)return null;r0={size:v.size,at:up(t)};wr(r0);show();try{bc&&bc.postMessage(r0)}catch(x){}fire(r0,src||"sync");return{size:r0.size,at:r0.at}}
function recheck(){var v=rd();if(v&&(!r0||v.at>r0.at||(v.at===r0.at&&v.size!==r0.size))){r0=mn(v);show();fire(r0,"cookie")}}
function preview(k){if(!ks(k))return null;pv=k;show();fire({size:k,at:r0?r0.at:0},"preview");return k}
function revert(){if(pv===null)return cur();pv=null;show();fire(r0||{size:"default",at:0},"revert");return cur()}
w.addEventListener&&w.addEventListener("focus",recheck);
d.addEventListener&&d.addEventListener("visibilitychange",function(){if(d.visibilityState==="visible")recheck()});
w.MOSText={steps:S,get:function(){return r0?{size:r0.size,at:r0.at}:null},current:cur,
shown:function(){return pv||cur()},previewing:function(){return pv!==null},preview:preview,revert:revert,
save:function(){var k=pv||cur();pv=null;return adopt({size:k,at:nw()},"local")},
set:function(k){if(!ks(k))return null;pv=null;return adopt({size:k,at:nw()},"local")},
adopt:function(v){return adopt(v,"sync")},recheck:recheck};
}catch(e){}})(window,document);
