// ═══════════════════════════════════════════════════════════════════
// utils.js — Hervin Scanner v9.2
// Helpers: sleep, fmt, Cache, RateLimiter, runChunked, binance
// ═══════════════════════════════════════════════════════════════════

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function fmt(n,p=4){return Number(n).toPrecision(p);}
function fmtPct(n,sign=true){return `${sign&&n>=0?'+':''}${Number(n).toFixed(2)}%`;}
function fmtVol(n){return n>=1e9?`$${(n/1e9).toFixed(1)}B`:n>=1e6?`$${(n/1e6).toFixed(0)}M`:`$${(n/1e3).toFixed(0)}K`;}
function fmtK(n){return n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n.toFixed(0)}`;}

// ── RATE LIMITER ────────────────────────────────────────────────────
class RateLimiter {
  constructor(maxWeight=1000,windowMs=60000) { this.maxWeight=maxWeight; this.windowMs=windowMs; this.queue=[]; this.currentWeight=0; this.windowStart=Date.now(); this.processing=false; }
  async request(fn,weight=1) { return new Promise((resolve,reject)=>{ this.queue.push({fn,weight,resolve,reject}); this.process(); }); }
  async process() {
    if(this.processing||this.queue.length===0) return;
    this.processing=true;
    if(Date.now()-this.windowStart>this.windowMs){this.currentWeight=0;this.windowStart=Date.now();}
    const item=this.queue[0];
    if(this.currentWeight+item.weight<=this.maxWeight) {
      this.currentWeight+=item.weight;
      try{const r=await item.fn();item.resolve(r);}catch(e){item.reject(e);}
      this.queue.shift(); await sleep(35);
    } else {
      const wait=this.windowMs-(Date.now()-this.windowStart);
      logMsg(`⏳ Rate limit — waiting ${Math.ceil(wait/1000)}s`,'warn');
      await sleep(wait+500); this.currentWeight=0; this.windowStart=Date.now();
    }
    this.processing=false; this.process();
  }
  drain(){this.queue.forEach(i=>i.reject(new Error('Cancelled')));this.queue=[];this.processing=false;}
}
const apiLimiter = new RateLimiter(900,60000);

// ── BINANCE FETCH ───────────────────────────────────────────────────
async function binance(path,params={},weight=1,base=FAPI) {
  return apiLimiter.request(async()=>{
    const qs=new URLSearchParams(params).toString();
    const url=`${base}/${path}${qs?'?'+qs:''}`;
    const r=await fetch(url);
    if(r.status===429){const retry=parseInt(r.headers.get('Retry-After')||'30',10);await sleep(retry*1000);return binance(path,params,weight,base);}
    if(!r.ok) throw new Error(`Binance ${r.status} on /${path}`);
    return r.json();
  },weight);
}

// ── CACHE ────────────────────────────────────────────────────────────
const MemCache=new Map();
const Cache={
  prefix:'hervin_v92_',
  ttls:{klines:5*60*1000,analysis:5*60*1000,oi:2*60*1000,funding:3*60*1000,liqmap:4*60*1000,rvol:2*60*1000},
  _key(sym,type){return `${this.prefix}${type}_${sym}`;},
  get(sym,type){
    const mk=`${type}_${sym}`;
    if(MemCache.has(mk)){const{ts,data}=MemCache.get(mk);if(Date.now()-ts<=(this.ttls[type]||this.ttls.analysis))return data;MemCache.delete(mk);}
    try{const raw=localStorage.getItem(this._key(sym,type));if(!raw)return null;const{ts,data}=JSON.parse(raw);if(Date.now()-ts>(this.ttls[type]||this.ttls.analysis)){localStorage.removeItem(this._key(sym,type));return null;}MemCache.set(mk,{ts,data});return data;}catch{return null;}
  },
  set(sym,type,data){const ts=Date.now(),mk=`${type}_${sym}`;MemCache.set(mk,{ts,data});try{localStorage.setItem(this._key(sym,type),JSON.stringify({ts,data}));}catch(e){if(e.name==='QuotaExceededError')this.clearOld();}},
  clearOld(){const now=Date.now();Object.keys(localStorage).filter(k=>k.startsWith(this.prefix)).forEach(k=>{try{const{ts}=JSON.parse(localStorage.getItem(k));if(now-ts>10*60*1000)localStorage.removeItem(k);}catch{localStorage.removeItem(k);}});}
};

// ── CONCURRENT TASK RUNNER ───────────────────────────────────────────
async function runChunked(items, asyncFn, onProgress) {
  const total=items.length; let done=0, idx=0;
  async function worker() {
    while(idx<total) {
      if(CancelToken.cancelled) return;
      const i=idx++; await asyncFn(items[i],i); done++;
      if(onProgress) onProgress(done,total);
    }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,total)},()=>worker()));
}
