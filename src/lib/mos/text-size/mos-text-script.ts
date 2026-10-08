// MultiplyOS text size on the web: the pre-paint script, setTextSize and onTextSizeSync.
//
// MOS_TEXT_SCRIPT runs as a blocking inline script in <head> (the same pattern as the mos_ui flag in
// lib/mos/ui-flag.ts), so html[data-mos-text] is set before first paint and nothing jumps. It also installs
// window.MOSText, the one runtime the <mos-text-size> picker and the helpers below talk to.
// Device copy: cookie mos_text=<key>.<epoch ms, always a whole minute>, Domain=.futures.church on futures.church hosts,
// so one choice holds across every app on that device. The browser sends that cookie to EVERY futures.church host (and
// any script on those pages can read it), so it carries only the step and a whole minute: a time to the millisecond
// made it a per-device marker. A cookie still holding milliseconds is rewritten to the minute on the first page load.
// The server copy is the app's business (onTextSizeSync); every time handed to it is a whole minute too.
import {
  COOKIE_MAX_AGE, MAX_FUTURE_MS, TEXT_SIZE_ATTR, TEXT_SIZE_COOKIE, TEXT_SIZE_STEPS, TIME_STEP_MS,
  buildTextSizeCookie, isTextSizeKey, localChoiceAt, minuteAt, normalizeValue, planSync, readTextSizeCookie,
  type SyncPlan, type TextSizeKey, type TextSizeValue,
} from './text-scale-core';

const STEPS_JSON = JSON.stringify(TEXT_SIZE_STEPS.map(s => ({ key: s.key, scale: s.scale, label: s.label })));

// ES5 on purpose: it runs before any bundle, in every browser the apps support. No storage but the cookie,
// no network. Every path is inside try/catch: a failure leaves the page at Default, never broken.
// K has no prototype and ks() is the ONE step check (read, adopt, preview, set, the other-tab message, apply): only the
// eight step keys pass, never "constructor" or "__proto__". up() and nw() are text-scale-core's minuteAt() and
// localChoiceAt(); mn() keeps a value from elsewhere and rewrites the cookie when its time was not a whole minute.
// Two different steps stamped the same minute (two tabs saved in that minute): the cookie, the last one written, wins,
// so the other tab's message makes this page re-read the cookie (recheck) instead of taking the message's step.
export const MOS_TEXT_SCRIPT = `(function(w,d){try{
var F=${MAX_FUTURE_MS},M=${TIME_STEP_MS},C=${JSON.stringify(TEXT_SIZE_COOKIE)},A=${JSON.stringify(TEXT_SIZE_ATTR)},S=${STEPS_JSON},K=Object.create(null),i;
for(i=0;i<S.length;i++)K[S[i].key]=S[i];
function ks(k){return typeof k==="string"&&!!K[k]}
function up(t){var u=Math.ceil(t/M)*M;return u>Date.now()+F?Math.floor(t/M)*M:u}
function nw(){var n=Date.now(),c=Math.ceil(n/M)*M,t=Math.max(c,r0?Math.floor(r0.at/M)*M+M:0);return t>n+F?c:t}
function rd(){var c=d.cookie||"",p=c.split(";"),b=null,j,e,v,m;for(j=0;j<p.length;j++){e=p[j].indexOf("=");if(e<0)continue;if(p[j].slice(0,e).replace(/^\\s+|\\s+$/g,"")!==C)continue;v=p[j].slice(e+1).replace(/^\\s+|\\s+$/g,"");try{v=decodeURIComponent(v)}catch(x){continue}m=/^([a-z0-9]+)\\.(\\d{1,16})$/.exec(v);if(m&&ks(m[1])&&+m[2]<=Date.now()+F&&(!b||+m[2]>b.at))b={size:m[1],at:+m[2]}}return b}
function dom(){var h=(location.hostname||"").toLowerCase().replace(/\\.$/,"");return h==="futures.church"||/\\.futures\\.church$/.test(h)?"; Domain=.futures.church":""}
function wr(v){d.cookie=C+"="+v.size+"."+v.at+"; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax"+dom()+(location.protocol==="https:"?"; Secure":"")}
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
}catch(e){}})(window,document);`;

// globalThis, not window/document: this file type-checks in apps with or without the DOM lib.
const G = globalThis as any;

interface MOSTextRuntime {
  steps: Array<{ key: TextSizeKey; scale: number; label: string }>;
  get(): TextSizeValue | null;
  /** The SAVED choice. */
  current(): TextSizeKey;
  /** What the page shows now: the preview while one is open, else the saved choice. */
  shown(): TextSizeKey;
  previewing(): boolean;
  /** Show a step live without keeping it (no cookie, no other tab, no server). */
  preview(key: TextSizeKey): TextSizeKey | null;
  /** Leave without Save: put the saved choice back. Returns the saved key. */
  revert(): TextSizeKey;
  /** Save: keep what is shown (the preview) on this device, tell other tabs, and let onTextSizeSync save it to the server. */
  save(): TextSizeValue | null;
  set(key: TextSizeKey): TextSizeValue | null;
  adopt(v: TextSizeValue): TextSizeValue | null;
  recheck(): void;
}

function runtime(): MOSTextRuntime | null {
  return G.window && G.window.MOSText ? (G.window.MOSText as MOSTextRuntime) : null;
}

/** The device's current choice (null when the person never chose: that is Default). */
export function getTextSize(): TextSizeValue | null {
  const rt = runtime();
  if (rt) return rt.get();
  return G.document ? readTextSizeCookie(G.document.cookie) : null;
}

function writeWithoutRuntime(value: TextSizeValue, source: string): TextSizeValue {
  // Kept as a whole minute, as the runtime keeps it (buildTextSizeCookie writes the cookie the same way).
  const v: TextSizeValue = { size: value.size, at: minuteAt(value.at) };
  const loc = G.location;
  G.document.cookie = buildTextSizeCookie(v, loc.hostname, loc.protocol === 'https:');
  const root = G.document.documentElement;
  if (v.size === 'default') root.removeAttribute(TEXT_SIZE_ATTR);
  else root.setAttribute(TEXT_SIZE_ATTR, v.size);
  try { G.dispatchEvent(new G.CustomEvent('mos-text-change', { detail: { ...v, source } })); } catch { /* old browser */ }
  return v;
}

/** The value handed to the server copy: the same step, its time as a whole minute. */
function forServer(v: TextSizeValue): TextSizeValue {
  return { size: v.size, at: minuteAt(v.at) };
}

export interface SetTextSizeOptions {
  /** Save the server copy too (the app's adapter). Errors are reported, never thrown: the device copy stands. */
  save?: (v: TextSizeValue) => Promise<unknown> | unknown;
  onSaveError?: (err: unknown) => void;
}

/**
 * The person picked a size: apply it now, keep it on this device, tell other tabs, and (when the app
 * passes save) write the server copy. Returns the stored value.
 */
export function setTextSize(key: TextSizeKey, opts: SetTextSizeOptions = {}): TextSizeValue | null {
  if (!isTextSizeKey(key)) return null;
  const rt = runtime();
  // Without the runtime, the cookie's copy is the choice this device holds: the new one steps past it.
  const v = rt ? rt.set(key) : writeWithoutRuntime({ size: key, at: localChoiceAt(Date.now(), getTextSize()) }, 'local');
  if (v && opts.save) {
    Promise.resolve().then(() => opts.save!(forServer(v))).catch(err => opts.onSaveError?.(err));
  }
  return v;
}

// Ashley, 5 Oct 2026: "there should be. save button on any screen where changes to the ui can be made like the text
// size for eg". A picker previews live, keeps the choice only on Save, and puts the saved one back on leave.

/** Show a step live without keeping it. Returns null for an unknown key or when the runtime is missing. */
export function previewTextSize(key: TextSizeKey): TextSizeKey | null {
  const rt = runtime();
  return rt && isTextSizeKey(key) ? rt.preview(key) : null;
}

/** Leave without Save (Cancel, back, close, navigation): the saved choice comes back. */
export function revertTextSize(): TextSizeKey | null {
  const rt = runtime();
  return rt ? rt.revert() : null;
}

/** Save: keep the previewed step (device now; server through onTextSizeSync or opts.save). */
export function saveTextSize(opts: SetTextSizeOptions = {}): TextSizeValue | null {
  const rt = runtime();
  if (!rt) return null;
  const v = rt.save();
  if (v && opts.save) Promise.resolve().then(() => opts.save!(forServer(v))).catch(err => opts.onSaveError?.(err));
  return v;
}

/** Listen for any change (this tab, another tab, another app on the device, or a server sync). */
export function onTextSizeChange(fn: (v: TextSizeValue & { source: string }) => void): () => void {
  if (!G.addEventListener) return () => {};
  const h = (e: any) => { if (e && e.detail) fn(e.detail); };
  G.addEventListener('mos-text-change', h);
  return () => G.removeEventListener('mos-text-change', h);
}

export interface TextSizeServerAdapter {
  /** The signed-in person's server copy, or null. */
  read(): Promise<TextSizeValue | null>;
  /** Write the server copy (merge-safe: never drop the person's other settings). */
  write(v: TextSizeValue): Promise<unknown>;
}

/**
 * Call once after sign-in. Reads both copies, keeps the newest on both (newest wins), then writes every
 * later choice the person makes on this device to the server. Returns the first sync's plan and stop().
 */
export function onTextSizeSync(adapter: TextSizeServerAdapter, opts: { onError?: (err: unknown) => void } = {}):
  { ready: Promise<SyncPlan>; stop: () => void } {
  const onError = opts.onError ?? (() => {});
  let stopped = false;
  const stopListening = onTextSizeChange(v => {
    if (stopped || v.source !== 'local') return;
    Promise.resolve(adapter.write(forServer(v))).catch(onError);
  });
  const ready = (async () => {
    let server: TextSizeValue | null = null;
    try { server = normalizeValue(await adapter.read()); } catch (err) { onError(err); return planSync(getTextSize(), null); }
    // The device copy is taken AFTER the read: a Save made while the read was in flight is then the newest and
    // wins, instead of being planned over from a stale copy (the adapter also refuses to write over a newer server copy).
    // Re-read the cookie first: another tab may have saved while the read was in flight.
    try { runtime()?.recheck(); } catch { /* old runtime */ }
    const device = getTextSize();
    const plan = planSync(device, server);
    if (stopped || !plan.winner) return plan;
    if (plan.writeDevice) {
      const rt = runtime();
      if (rt) rt.adopt(plan.winner); else writeWithoutRuntime(plan.winner, 'sync');
    }
    if (plan.writeServer) {
      try { await adapter.write(forServer(plan.winner)); } catch (err) { onError(err); }
    }
    return plan;
  })();
  return { ready, stop: () => { stopped = true; stopListening(); } };
}
