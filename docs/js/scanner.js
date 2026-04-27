// ═══════════════════════════════════════════════════════════════════
// scanner.js — Hervin Scanner v9.2
// runMarketScan, preFilterCoins, scanAccumulation, scanPumpShort, scanTopMovers
// exportResults, cancelScan, quick scan buttons
// Depends on: config.js, utils.js, api.js, analysis.js, scoring.js, ui.js
// ═══════════════════════════════════════════════════════════════════

function sanitizeSym(raw){return(raw||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);}

// ── QUICK SCAN BUTTONS ───────────────────────────────────────────────
async function runQuickScan(){
  const sym=sanitizeSym(document.getElementById('symInput').value);if(!sym)return;
  setDot('loading');closeResult();
  try{const d=await analyzeCoin(sym);const s=scoreAccum(d);const smart=detectSmartAccumulation(d,d.klines4h,d.klines1d);const tradeSignal=calcTradeSignal(d);renderResult(sym,d,s,smart.signals,null,'long',1,tradeSignal);setDot('active');}
  catch(e){showToast(`Error: ${e.message}`,'error');setDot('error');}
}
async function runShortCheck(){
  const sym=sanitizeSym(document.getElementById('symInput').value);if(!sym)return;
  setDot('loading');closeResult();
  try{const d=await analyzeCoin(sym);const s=scoreShort(d);const pump=detectPumpExhaustion(d,d.klines4h,d.klines1d);const tradeSignal=calcTradeSignal(d);renderResult(sym,d,s,pump.signals,null,'short',1,tradeSignal);setDot('active');}
  catch(e){showToast(`Error: ${e.message}`,'error');setDot('error');}
}
async function runAccumCheck(){
  const sym=sanitizeSym(document.getElementById('symInput').value);if(!sym)return;
  setDot('loading');closeResult();
  try{const d=await analyzeCoin(sym);const s=scoreAccum(d);const smart=detectSmartAccumulation(d,d.klines4h,d.klines1d);const tradeSignal=calcTradeSignal(d);renderResult(sym,d,s,smart.signals,null,'long',1,tradeSignal);setDot('active');}
  catch(e){showToast(`Error: ${e.message}`,'error');setDot('error');}
}

function cancelScan(){
  CancelToken.cancel();apiLimiter.drain();
  logMsg('🛑 Scan dibatalkan','warn');showToast('Scan dibatalkan','warn');
  document.getElementById('btnCancel').style.display='none';
  setDot('error');hideProgress();scanning=false;
  ['btnAccumScan','btnPumpScan','btnShortScan','btnTopScan'].forEach(id=>{const b=document.getElementById(id);b.disabled=false;b.classList.remove('running');});
}

// ── PRE-FILTER ───────────────────────────────────────────────────────
async function preFilterCoins(mode){
  logMsg('🔍 Stage 1: Fetching tickers...');
  const tickers=await binance('ticker/24hr',{},1);if(CancelToken.cancelled)return[];
  const STABLES=new Set(['BUSD','USDC','DAI','TUSD','FDUSD','USDP','USDD']);
  const candidates=tickers.filter(t=>{
    if(!t.symbol.endsWith('USDT'))return false;
    const base=t.symbol.replace('USDT','');if([...STABLES].some(s=>base.includes(s)))return false;
    const vol=parseFloat(t.quoteVolume),change=parseFloat(t.priceChangePercent),price=parseFloat(t.lastPrice);
    if(mode==='accum'&&vol<10000)return false;if(mode!=='accum'&&vol<50000)return false;
    if(price<THRESHOLDS.MIN_PRICE||price>THRESHOLDS.MAX_PRICE)return false;
    if(mode==='accum')return change>=-30&&change<=35;
    if(mode==='pump')return change>=THRESHOLDS.PUMP_GAIN_MIN&&change<=THRESHOLDS.PUMP_GAIN_MAX;
    if(mode==='short')return change>=-20&&change<=80;
    return true;
  });
  logMsg(`✓ ${candidates.length} candidates`);
  const sorted=candidates.sort((a,b)=>{
    if(mode==='accum'){
      const va=parseFloat(a.quoteVolume),vb=parseFloat(b.quoteVolume);
      const ca=parseFloat(a.priceChangePercent),cb=parseFloat(b.priceChangePercent);
      const ha=parseFloat(a.highPrice),la=parseFloat(a.lowPrice),hb=parseFloat(b.highPrice),lb=parseFloat(b.lowPrice);
      const ra=ha>0?(ha-la)/ha*100:99,rb=hb>0?(hb-lb)/hb*100:99;
      const sa=(va>500000?2:va>100000?1:0)+(Math.abs(ca)<10?2:Math.abs(ca)<20?1:0)+(ra<10?2:ra<20?1:0);
      const sb=(vb>500000?2:vb>100000?1:0)+(Math.abs(cb)<10?2:Math.abs(cb)<20?1:0)+(rb<10?2:rb<20?1:0);
      return sb-sa;
    }
    if(mode==='pump')return parseFloat(b.priceChangePercent)-parseFloat(a.priceChangePercent);
    if(mode==='short'){const da=(parseFloat(a.highPrice)-parseFloat(a.lastPrice))/(parseFloat(a.highPrice)||1);const db=(parseFloat(b.highPrice)-parseFloat(b.lastPrice))/(parseFloat(b.highPrice)||1);return db-da;}
    return 0;
  }).slice(0,mode==='accum'?200:80);
  logMsg(`🎯 Top ${sorted.length} for deep analysis`);
  return sorted.map(t=>t.symbol.replace('USDT',''));
}

// ── MARKET SCAN ORCHESTRATOR ─────────────────────────────────────────
async function runMarketScan(mode){
  if(scanning)return;scanning=true;CancelToken.reset();
  const bm={accum:'btnAccumScan',pump:'btnPumpScan',short:'btnShortScan',top:'btnTopScan',whale:'btnWhaleScan'};
  const btn=document.getElementById(bm[mode]);btn.classList.add('running');
  Object.values(bm).forEach(id=>{document.getElementById(id).disabled=true;});
  document.getElementById('btnCancel').style.display='';
  showLog();clearLog();setDot('loading');showSkeletons();results[mode]=[];updateStats();
  const tm={accum:'Accumulation Scan',pump:'Pump Scan (24H)',short:'Short Scan',top:'Top Movers',whale:'🐋 Whale Accumulation'};
  document.getElementById('sectionTitle').textContent=tm[mode];
  try{
    if(mode==='top')await scanTopMovers();
    else if(mode==='accum')await scanAccumulation();
    else if(mode==='whale')await scanWhaleAccumulation();
    else await scanPumpShort(mode);
  }catch(e){if(e.message!=='Cancelled'){logMsg(`Fatal: ${e.message}`,'bad');showToast(`Error: ${e.message}`,'error');}setDot('error');}
  scanning=false;
  Object.values(bm).forEach(id=>{const b=document.getElementById(id);b.disabled=false;b.classList.remove('running');});
  document.getElementById('btnCancel').style.display='none';
  if(!CancelToken.cancelled){btn.classList.add('done');setTimeout(()=>btn.classList.remove('done'),3000);setDot('active');showToast(`✅ ${results[mode].length} signal ditemukan`,'success');}
  renderCards();updateStats();hideProgress();logMsg('─ Scan complete ─','ok');
}

// ── SCAN MODES ───────────────────────────────────────────────────────
async function scanTopMovers(){
  logMsg('Fetching tickers...');
  const tickers=await binance('ticker/24hr',{},1);if(CancelToken.cancelled)return;
  const usdt=tickers.filter(t=>t.symbol.endsWith('USDT')&&!['BUSD','USDC','DAI','TUSD'].some(s=>t.symbol.includes(s)))
    .sort((a,b)=>parseFloat(b.priceChangePercent)-parseFloat(a.priceChangePercent)).slice(0,20);
  showProgress('Top Movers');
  for(let i=0;i<Math.min(usdt.length,15);i++){
    if(CancelToken.cancelled)return;
    const t=usdt[i],sym=t.symbol.replace('USDT',''),gain=parseFloat(t.priceChangePercent),vol=parseFloat(t.quoteVolume);
    if(vol<1000000)continue;logMsg(`${sym}: ${fmtPct(gain)}`);
    results.top.push({sym,price:parseFloat(t.lastPrice),gain24h:gain,vol24h:vol,type:'TOP',scorePct:Math.min(Math.abs(gain)*1.5,100),tags:[{label:fmtPct(gain),cls:gain>0?'g':'r'},{label:fmtVol(vol),cls:''}]});
    setProgress((i+1)/15*100);renderCards();updateStats();await sleep(80);
  }
}

async function scanAccumulation(){
  const candidates=await preFilterCoins('accum');if(CancelToken.cancelled||candidates.length===0)return;
  logMsg(`Pre-score ${candidates.length}...`,'info');
  const tickers=await binance('ticker/24hr',{},1);if(CancelToken.cancelled)return;
  const tm={};tickers.forEach(t=>{tm[t.symbol]=t;});
  const preScored=candidates.map(sym=>{
    const t=tm[sym+'USDT'];if(!t)return{sym,preScore:0};
    const vol=parseFloat(t.quoteVolume),change=parseFloat(t.priceChangePercent),high=parseFloat(t.highPrice),low=parseFloat(t.lowPrice),price=parseFloat(t.lastPrice);
    const range=high>0?(high-low)/high*100:99;let ps=0;
    if(vol>5000000)ps+=2;else if(vol>1000000)ps+=1;
    if(Math.abs(change)<5)ps+=3;else if(Math.abs(change)<10)ps+=2;else if(Math.abs(change)<20)ps+=1;
    if(range<5)ps+=3;else if(range<10)ps+=2;else if(range<20)ps+=1;
    const pir=(high-price)/(high-low||1);if(pir>0.5)ps+=1;
    return{sym,preScore:ps};
  }).sort((a,b)=>b.preScore-a.preScore).slice(0,80);
  logMsg(`Deep analysis ${preScored.length} coins (${CONCURRENCY} concurrent)...`,'info');
  showProgress('Accumulation Scan');let done=0;

  await runChunked(preScored,async(item)=>{
    if(CancelToken.cancelled)return;
    logMsg(`[${done+1}/${preScored.length}] 🔬 ${item.sym}...`);
    try{
      const d=await analyzeCoin(item.sym);if(CancelToken.cancelled)return;
      const smart=detectSmartAccumulation(d,d.klines4h,d.klines1d);
      const s=scoreAccum(d);
      if(s.score>=3){
        logMsg(`✅ ${item.sym}: ${s.score}/${s.max}`,'ok');
        const tradeSignal = calcTradeSignal(d);
        results.accum.push({
          sym:item.sym,price:d.price,score:s.score,scoreMax:s.max,
          scorePct:Math.round(s.score/s.max*100),gain24h:d.gain24h,
          type:'ACCUM',data:d,scoreData:s,signals:smart.signals,tradeSignal,
          tags:[
            {label:`Vol ${d.volRatio.toFixed(1)}x`,cls:d.volRatio>=2?'b':''},
            {label:`7D ${fmtPct(d.priceChg7d)}`,cls:''},
            {label:`RSI ${d.rsi4h}`,cls:d.rsi4h<40?'g':d.rsi4h>65?'r':''},
            d.funding!==null?{label:`F:${d.funding.toFixed(3)}%`,cls:d.funding<THRESHOLDS.FUNDING_NEG?'b':''}:null,
            d.oiChange!==0?{label:`OI${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%`,cls:d.oiChange>5?'g':d.oiChange<-5?'r':''}:null,
            d.prePumpSilence?.detected?{label:'🤫 Silence',cls:'b'}:null,
            d.bbSqueeze?.squeezing?{label:`🔲 BBsq`,cls:'b'}:null,
            d.fundingHist?.currentNegStreak>=4?{label:`F🔥${d.fundingHist.currentNegStreak}`,cls:'b'}:null,
            d.rvolData?.isSpike?{label:'⚡ RVOL',cls:'r'}:null,
          ].filter(Boolean),
        });
        renderCards();updateStats();
      }
    }catch(e){logMsg(`❌ ${item.sym}: ${e.message}`,'bad');}
  },(doneCnt,total)=>{done=doneCnt;setProgress(done/total*100);});
  document.getElementById('stScanned').textContent=preScored.length;
}

async function scanPumpShort(mode){
  logMsg('🔍 Fetching tickers...','info');
  const tickers=await binance('ticker/24hr',{},1);if(CancelToken.cancelled)return;
  const STABLES=new Set(['USDC','BUSD','DAI','TUSD','USDT','USDP','USDD','FDUSD']);
  const prescored=tickers.filter(t=>{
    if(!t.symbol.endsWith('USDT'))return false;
    const base=t.symbol.replace('USDT','');if([...STABLES].some(s=>base.includes(s)))return false;
    const vol=parseFloat(t.quoteVolume),change=parseFloat(t.priceChangePercent),price=parseFloat(t.lastPrice);
    if(price<THRESHOLDS.MIN_PRICE||price>THRESHOLDS.MAX_PRICE)return false;if(vol<50000)return false;
    if(mode==='pump')return change>=10&&change<=200;else return change>=15&&change<=150;
  }).map(t=>{
    const vol=parseFloat(t.quoteVolume),change=parseFloat(t.priceChangePercent);
    const high=parseFloat(t.highPrice),low=parseFloat(t.lowPrice),price=parseFloat(t.lastPrice),trades=parseFloat(t.count)||1;
    let ms=0;
    if(vol>100e6)ms+=3;else if(vol>10e6)ms+=2;else if(vol>1e6)ms+=1;
    if(change>=15&&change<=80)ms+=3;else if(change>80&&change<=150)ms+=1;else if(change>=10)ms+=1;
    const range=high-low,pid=range>0?(price-low)/range:0.5;
    if(pid>0.8)ms+=2;else if(pid>0.5)ms+=1;
    const funding=parseFloat(t.lastFundingRate||0)*100;
    if(funding<-0.01)ms+=2;else if(funding<0.05)ms+=1;
    if(trades>50000)ms+=1;
    if(mode==='short'){const dfh=high>0?(high-price)/high*100:0;if(dfh>=5)ms+=2;else ms-=1;}
    return{sym:t.symbol.replace('USDT',''),mScore:ms,vol,change,price,high,low,posInDay:pid,funding};
  }).filter(t=>t.mScore>=4).sort((a,b)=>b.mScore-a.mScore).slice(0,40);

  if(prescored.length===0){logMsg('No candidates','warn');return;}
  logMsg(`✅ ${prescored.length} candidates...`,'info');
  showProgress(mode==='pump'?'🚀 Pump Scan':'▼ Short Scan');let done=0;

  await runChunked(prescored,async(pre)=>{
    if(CancelToken.cancelled)return;
    logMsg(`[${done+1}/${prescored.length}] ${pre.sym}: +${pre.change.toFixed(1)}%`);
    try{
      const d=await analyzeCoin(pre.sym);if(CancelToken.cancelled)return;
      if(mode==='pump'){
        const s=scorePump(d,pre);
        if(s.score>=4){
          const tradeSignal = calcTradeSignal(d);
          results.pump.push({sym:pre.sym,price:d.price,score:s.score,scoreMax:s.max,scorePct:Math.round(s.score/s.max*100),gain24h:d.gain24h,type:'PUMP',data:d,scoreData:s,signals:s.signals,tradeSignal,
            tags:[{label:fmtPct(d.gain24h),cls:'g'},{label:`Vol ${fmtVol(pre.vol)}`,cls:pre.vol>10e6?'g':''},
                  {label:`RSI ${d.rsi4h}`,cls:d.rsi4h>70?'r':d.rsi4h<40?'g':''},
                  d.funding!==null?{label:`F:${d.funding.toFixed(3)}%`,cls:d.funding<0?'b':d.funding>0.05?'r':''}:null,
                  {label:`OI${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%`,cls:d.oiChange>5?'g':''},
                  d.rvolData?.isSpike?{label:'⚡RVOL',cls:'r'}:null,
                 ].filter(Boolean)});
          logMsg(`✅ ${pre.sym} pump ${s.score}/${s.max}`,'ok');
        }
      } else {
        const pe=detectPumpExhaustion(d,d.klines4h,d.klines1d);
        const s=scoreShort(d);
        const fs=Math.round((s.score+pe.score/pe.maxScore*s.max)/2);
        if(fs>=3){
          const tradeSignal = calcTradeSignal(d);
          const ct=d.candlePatterns?.length>0?[{label:`🕯 ${d.candlePatterns[0].name.split(' ')[0]}`,cls:'r'}]:[];
          results.short.push({sym:pre.sym,price:d.price,score:fs,scoreMax:s.max,scorePct:Math.round(fs/s.max*100),gain24h:d.gain24h,type:'SHORT',data:d,scoreData:s,signals:pe.signals,tradeSignal,
            tags:[{label:fmtPct(d.gain24h),cls:'r'},{label:`RSI ${d.rsi4h}`,cls:d.rsi4h>65?'r':''},
                  d.funding!==null?{label:`F:${d.funding.toFixed(3)}%`,cls:d.funding>THRESHOLDS.FUNDING_POS?'r':''}:null,
                  {label:`SL $${fmt(d.sl,4)}`,cls:''},...ct].filter(Boolean)});
          logMsg(`✅ ${pre.sym} short ${fs}/${s.max}`,'ok');
        }
      }
      renderCards();updateStats();
    }catch(e){logMsg(`✗ ${pre.sym}: ${e.message}`,'bad');}
  },(doneCnt,total)=>{done=doneCnt;setProgress(done/total*100);});
  document.getElementById('stScanned').textContent=prescored.length;
}

// ── EXPORT CSV ───────────────────────────────────────────────────────
function exportResults(mode){
  const data=mode==='all'?[...results.accum,...results.pump,...results.short,...results.top]:(results[mode]||[]);
  if(!data.length){showToast('Tidak ada data','warn');return;}
  const hdr=['Symbol','Price','Score','Type','24h%','7D%','RSI4H','Funding','FundingAvg3D','FundingNegStreak','OI%','VolRatio','RVOL/hr','BBSqueeze','PrePumpSilence','CandlePatterns','Signals'];
  const rows=data.map(r=>[
    r.sym,r.price,`${r.score??'-'}/${r.scoreMax??'-'}`,r.type,
    `${r.gain24h>=0?'+':''}${r.gain24h?.toFixed(2)??'-'}%`,
    `${r.data?.priceChg7d>=0?'+':''}${r.data?.priceChg7d?.toFixed(1)??'-'}%`,
    r.data?.rsi4h??'-',
    r.data?.funding!=null?`${r.data.funding>=0?'+':''}${r.data.funding.toFixed(4)}%`:'N/A',
    r.data?.fundingHist?.avg3d!=null?`${r.data.fundingHist.avg3d.toFixed(4)}%`:'N/A',
    r.data?.fundingHist?.currentNegStreak??0,
    r.data?.oiChange!=null?`${r.data.oiChange>=0?'+':''}${r.data.oiChange.toFixed(2)}%`:'N/A',
    r.data?.volRatio?.toFixed(2)??'-',
    r.data?.rvolData?.rvolVsAvg?.toFixed(2)??'N/A',
    r.data?.bbSqueeze?.squeezing?`squeezing(w${r.data.bbSqueeze.widthNow.toFixed(1)})`:r.data?.bbSqueeze?.expanding?'expanding':'normal',
    r.data?.prePumpSilence?.detected?`yes(${r.data.prePumpSilence.score})`:'no',
    r.data?.candlePatterns?.length>0?r.data.candlePatterns.map(p=>p.name).join('|'):'none',
    (r.signals?.map(s=>s.text.replace(/[,\n]/g,' ')).join(' | ')||'-'),
  ]);
  const csv=[hdr,...rows].map(row=>row.map(v=>`"${v}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`hervin_v92_${mode}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast(`📥 ${data.length} rows exported`,'success');
}

// ═══════════════════════════════════════════════════════════════════
// WHALE ACCUMULATION SCANNER
// Stage 1: pre-filter by OI anomaly + funding + vol pattern
// Stage 2: deep score each candidate with scoreWhale()
// ═══════════════════════════════════════════════════════════════════
async function scanWhaleAccumulation() {
  logMsg('🐋 Whale scan — fetching tickers + OI baseline...', 'info');

  const tickers = await binance('ticker/24hr', {}, 1);
  if (CancelToken.cancelled) return;

  const STABLES = new Set(['BUSD','USDC','DAI','TUSD','FDUSD','USDP','USDD']);

  // Stage 1: Pre-filter
  // Looking for: decent vol, price NOT already pumped, some OI activity
  const candidates = tickers.filter(t => {
    if (!t.symbol.endsWith('USDT')) return false;
    const base = t.symbol.replace('USDT','');
    if ([...STABLES].some(s => base.includes(s))) return false;
    const vol    = parseFloat(t.quoteVolume);
    const change = parseFloat(t.priceChangePercent);
    const price  = parseFloat(t.lastPrice);
    if (price < 0.000001 || price > 100000) return false;
    if (vol < 200000) return false;                   // min liquidity
    if (change > 25 || change < -30) return false;    // already pumped/dumped
    return true;
  });

  // Pre-score using ticker data only (fast pass)
  const preScored = candidates.map(t => {
    const vol    = parseFloat(t.quoteVolume);
    const change = parseFloat(t.priceChangePercent);
    const high   = parseFloat(t.highPrice);
    const low    = parseFloat(t.lowPrice);
    const price  = parseFloat(t.lastPrice);
    const range  = high > 0 ? (high - low) / high * 100 : 99;
    const funding= parseFloat(t.lastFundingRate || 0) * 100;

    let ps = 0;
    // Flat price = potential accumulation
    if (Math.abs(change) < 3) ps += 4;
    else if (Math.abs(change) < 8) ps += 2;

    // Tight range = compression
    if (range < 5) ps += 3;
    else if (range < 10) ps += 2;

    // Negative funding = short bias = whale long opportunity
    if (funding < -0.03) ps += 4;
    else if (funding < -0.01) ps += 3;
    else if (funding < 0) ps += 1;

    // Good volume (liquid enough for whale)
    if (vol > 50e6) ps += 3;
    else if (vol > 10e6) ps += 2;
    else if (vol > 2e6) ps += 1;

    return { sym: t.symbol.replace('USDT',''), preScore: ps, vol, change, funding, price };
  })
  .filter(t => t.preScore >= 5)
  .sort((a, b) => b.preScore - a.preScore)
  .slice(0, 100);

  if (preScored.length === 0) { logMsg('No whale candidates found', 'warn'); return; }
  logMsg(`✅ ${preScored.length} candidates — deep analysis...`, 'info');
  showProgress('🐋 Whale Accumulation Scan');
  let done = 0;

  await runChunked(preScored, async (pre) => {
    if (CancelToken.cancelled) return;
    logMsg(`[${done+1}/${preScored.length}] 🔬 ${pre.sym}...`);
    try {
      const d = await analyzeCoin(pre.sym);
      if (CancelToken.cancelled) return;

      const ws = scoreWhale(d, pre);
      if (ws.score >= 40) {
        logMsg(`🐋 ${pre.sym}: whale score ${ws.score} — ${ws.tier}`, 'ok');
        const tradeSignal = calcTradeSignal(d);

        // Build display tags
        const tags = [
          { label: `🐋 ${ws.tier}`, cls: ws.tierCls === 'strong' ? 'b' : ws.tierCls === 'medium' ? 'g' : '' },
          { label: `OI ${d.oiChange >= 0 ? '+' : ''}${d.oiChange.toFixed(1)}%`, cls: d.oiChange > 5 ? 'b' : '' },
          d.funding !== null ? { label: `F:${d.funding.toFixed(3)}%`, cls: d.funding < -0.01 ? 'b' : '' } : null,
          { label: `Vol ${d.volRatio.toFixed(1)}×`, cls: d.volRatio >= 1.5 ? 'g' : '' },
          { label: `RSI ${d.rsi4h}`, cls: d.rsi4h < 40 ? 'g' : d.rsi4h > 68 ? 'r' : '' },
          d.bbSqueeze?.squeezing ? { label: '🔲 BBsq', cls: 'b' } : null,
          d.prePumpSilence?.detected ? { label: '🤫 Silence', cls: 'b' } : null,
          d.fundingHist?.currentNegStreak >= 4 ? { label: `🔥 F×${d.fundingHist.currentNegStreak}`, cls: 'b' } : null,
          { label: ws.phase.split('—')[0].trim(), cls: '' },
        ].filter(Boolean);

        results.whale.push({
          sym: pre.sym,
          price: d.price,
          score: ws.score,
          scoreMax: 100,
          scorePct: ws.score,
          gain24h: d.gain24h,
          type: 'WHALE',
          vol24h: d.vol24h,
          data: d,
          scoreData: { score: ws.score, max: 100, pct: ws.score, cls: ws.tierCls === 'strong' ? 'high' : 'mid',
            checks: ws.signals.map(s => ({ pass: true, text: s.text })),
            verdict: { cls: ws.tierCls === 'strong' ? 'strong' : 'medium',
              text: `🐋 ${ws.tier} WHALE ACCUMULATION — ${ws.phase}` }
          },
          signals: ws.signals,
          whaleData: ws,
          tradeSignal,
          tags,
        });
        renderCards(); updateStats();
      }
    } catch(e) { logMsg(`✗ ${pre.sym}: ${e.message}`, 'bad'); }
  }, (doneCnt, total) => { done = doneCnt; setProgress(done / total * 100); });

  document.getElementById('stScanned').textContent = preScored.length;
}
