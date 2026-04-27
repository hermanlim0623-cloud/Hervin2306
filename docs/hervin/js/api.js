// ═══════════════════════════════════════════════════════════════════
// api.js — Hervin Scanner v9.2
// All Binance API data fetchers: klines, OI, funding, rvol, squeeze
// Depends on: config.js, utils.js
// ═══════════════════════════════════════════════════════════════════

async function getKlines(symbol,interval,limit){
  const ck=`${symbol}_${interval}_${limit}`;const cached=Cache.get(ck,'klines');if(cached)return cached;
  const data=await binance('klines',{symbol:symbol+'USDT',interval,limit},5);
  Cache.set(ck,'klines',data);return data;
}

async function getOIChange(symbol){
  const cached=Cache.get(symbol,'oi');if(cached!==null)return cached;
  try{const data=await binance('openInterestHist',{symbol:symbol+'USDT',period:'1h',limit:6},1);
  if(!data||data.length<2)return 0;
  const oldest=parseFloat(data[0].sumOpenInterestValue),newest=parseFloat(data[data.length-1].sumOpenInterestValue);
  const pct=oldest>0?((newest-oldest)/oldest*100):0;Cache.set(symbol,'oi',pct);return pct;}catch{return 0;}
}

// ── FUNDING RATE HISTORY (3 days / 9 periods) ───────────────────────
async function getFundingHistory(symbol) {
  const cached = Cache.get(symbol,'funding');
  if(cached) return cached;
  try {
    const data = await binance('fundingRate',{symbol:symbol+'USDT',limit:9},1);
    if(!data||!data.length) return null;
    const rates = data.map(d=>parseFloat(d.fundingRate)*100);
    const result = {
      rates,
      avg3d: rates.reduce((a,b)=>a+b,0)/rates.length,
      negCount: rates.filter(r=>r<0).length,
      trend: rates.length>=3 ? rates[rates.length-1]-rates[0] : 0,
      currentNegStreak: 0,
    };
    for(let i=rates.length-1;i>=0;i--){
      if(rates[i]<0) result.currentNegStreak++;
      else break;
    }
    Cache.set(symbol,'funding',result);
    return result;
  } catch { return null; }
}

// ── SHORT SQUEEZE PRESSURE MAP ──────────────────────────────────────
async function getSqueezeMap(symbol, price) {
  const cached = Cache.get(symbol,'liqmap');
  if(cached) return cached;
  try {
    const [oiData, liqData] = await Promise.all([
      binance('openInterest',{symbol:symbol+'USDT'},1).catch(()=>null),
      binance('forceOrders',{symbol:symbol+'USDT',limit:50},1).catch(()=>null),
    ]);
    const oiUSD = oiData ? parseFloat(oiData.openInterestValue||0) : 0;
    const fundingHist = Cache.get(symbol,'funding');
    const currentFunding = fundingHist ? fundingHist.rates[fundingHist.rates.length-1] : 0;
    const shortBias = currentFunding < 0 ? Math.min(0.5 + Math.abs(currentFunding)/0.05*0.1, 0.75) : 0.45;
    const estimatedShortUSD = oiUSD * shortBias;
    const levels = [
      { pct:5,  label:'+5%',  usd: estimatedShortUSD * 0.15 },
      { pct:10, label:'+10%', usd: estimatedShortUSD * 0.25 },
      { pct:15, label:'+15%', usd: estimatedShortUSD * 0.20 },
      { pct:20, label:'+20%', usd: estimatedShortUSD * 0.15 },
    ];
    const maxUsd = Math.max(...levels.map(l=>l.usd));
    let liqVolUSD = 0;
    if(liqData && Array.isArray(liqData)) {
      liqData.filter(l=>l.side==='SELL').forEach(l=>{ liqVolUSD += parseFloat(l.origQty||0)*parseFloat(l.price||price); });
    }
    const result = { oiUSD, estimatedShortUSD, levels, maxUsd, liqVolUSD, currentFunding, shortBias };
    Cache.set(symbol,'liqmap',result);
    return result;
  } catch { return null; }
}

// ── RELATIVE VOLUME PER HOUR ────────────────────────────────────────
async function getRelativeVolHour(symbol) {
  const cached = Cache.get(symbol,'rvol');
  if(cached) return cached;
  try {
    const klines1h = await getKlines(symbol,'1h',48);
    if(!klines1h||klines1h.length<25) return null;
    const vols = klines1h.map(k=>parseFloat(k[5])*parseFloat(k[4]));
    const currentHourVol = vols[vols.length-1];
    const sameHourYestVol = vols.length>=25 ? vols[vols.length-25] : vols[0];
    const avg7HourVol = vols.slice(-169,-1).reduce((a,b)=>a+b,0)/168;
    const recentVols = vols.slice(-6);
    const volAccel = recentVols.length>=3 ?
      (recentVols.slice(-3).reduce((a,b)=>a+b,0)/3) / (recentVols.slice(0,3).reduce((a,b)=>a+b,0)/3) : 1;
    const rvolVsYest = sameHourYestVol>0 ? currentHourVol/sameHourYestVol : 1;
    const rvolVsAvg = avg7HourVol>0 ? currentHourVol/avg7HourVol : 1;
    const chart24h = vols.slice(-25);
    const chartMax = Math.max(...chart24h);
    const result = {
      currentHourVol, sameHourYestVol, avg7HourVol,
      rvolVsYest, rvolVsAvg, volAccel,
      chart24h, chartMax,
      isSpike: rvolVsAvg > 3.0,
      isRising: rvolVsAvg > 1.5,
      isAccelerating: volAccel > 1.5,
    };
    Cache.set(symbol,'rvol',result);
    return result;
  } catch { return null; }
}

// ── MAIN COIN ANALYZER ──────────────────────────────────────────────
async function analyzeCoin(symbol,force=false){
  if(!force){const cached=Cache.get(symbol,'analysis');if(cached)return cached;}
  else{
    try{localStorage.removeItem(Cache._key(symbol,'analysis'));}catch{}
    try{localStorage.removeItem(Cache._key(symbol,'oi'));}catch{}
    try{localStorage.removeItem(Cache._key(symbol,'funding'));}catch{}
    try{localStorage.removeItem(Cache._key(symbol,'liqmap'));}catch{}
    try{localStorage.removeItem(Cache._key(symbol,'rvol'));}catch{}
    MemCache.delete(`analysis_${symbol}`);MemCache.delete(`oi_${symbol}`);MemCache.delete(`funding_${symbol}`);MemCache.delete(`liqmap_${symbol}`);MemCache.delete(`rvol_${symbol}`);
    [['4h',120],['1d',60],['1h',48]].forEach(([iv,lm])=>{const k=`${symbol}_${iv}_${lm}`;try{localStorage.removeItem(Cache._key(k,'klines'));}catch{}MemCache.delete(`klines_${k}`);});
  }

  const sym=symbol.toUpperCase();

  const [ticker,klines4h,klines1d,klines1h,ob,premium,oiChange,fundingHist] = await Promise.all([
    binance('ticker/24hr',{symbol:sym+'USDT'},1),
    getKlines(sym,'4h',120),
    getKlines(sym,'1d',60),
    getKlines(sym,'1h',48),
    binance('depth',{symbol:sym+'USDT',limit:20},2),
    binance('premiumIndex',{symbol:sym+'USDT'},1).catch(()=>null),
    getOIChange(sym),
    getFundingHistory(sym),
  ]);

  const price=parseFloat(ticker.lastPrice),gain24h=parseFloat(ticker.priceChangePercent);
  const high24h=parseFloat(ticker.highPrice),vol24h=parseFloat(ticker.quoteVolume);
  const funding=premium?parseFloat(premium.lastFundingRate)*100:null;

  const closes4h=klines4h.map(k=>parseFloat(k[4]));
  const closes1d=klines1d.map(k=>parseFloat(k[4]));
  const vols4h=klines4h.map(k=>parseFloat(k[5]));
  const vols1d=klines1d.map(k=>parseFloat(k[5]));

  const rsi4h=calcRSI(closes4h),rsi1d=calcRSI(closes1d);
  const atr4h=calcATR(klines4h);
  const ma20_4h=calcMA(closes4h,20),ma20_1d=calcMA(closes1d,20);
  const macd=calcMACD(closes4h),bb=calcBollingerBands(closes4h);

  const vol14dAvg=vols1d.slice(-14).reduce((a,b)=>a+b,0)/14;
  const vol30dAvg=vols1d.reduce((a,b)=>a+b,0)/vols1d.length;
  const volRatio=vol30dAvg>0?vol14dAvg/vol30dAvg:1;

  const price7d=closes1d.length>=7?closes1d[closes1d.length-7]:price;
  const priceChg7d=price7d>0?(price-price7d)/price7d*100:0;
  const priceChg30d=closes1d[0]>0?(price-closes1d[0])/closes1d[0]*100:0;

  const bids=ob.bids?ob.bids.slice(0,10).reduce((s,b)=>s+parseFloat(b[0])*parseFloat(b[1]),0):0;
  const asks=ob.asks?ob.asks.slice(0,10).reduce((s,a)=>s+parseFloat(a[0])*parseFloat(a[1]),0):0;
  const bestBid=ob.bids?.[0]?.[0]?parseFloat(ob.bids[0][0]):price;
  const bestAsk=ob.asks?.[0]?.[0]?parseFloat(ob.asks[0][0]):price;
  const spread=bestBid>0?(bestAsk-bestBid)/bestBid*100:99;
  const liquid=spread<=2.0&&bids>=50000;

  const bullDiv=detectBullishDivergence(klines4h),bearDiv=detectBearishDivergence(klines4h);
  const obvDiv=detectOBVDivergence(closes4h,vols4h);
  const wyckoff=detectWyckoffPhase(closes1d,vols1d);
  const trend4h=price>ma20_4h?'bullish':'bearish';
  const trend1d=price>ma20_1d?'bullish':'bearish';

  const sl=price+atr4h*1.5,tp=price-atr4h*3.0;

  const candlePatterns=detectCandlePatterns(klines1d,rsi1d,price);
  const prePumpSilence=detectPrePumpSilence(klines4h,klines1d);
  const bbSqueeze=detectBBSqueeze(klines4h);

  const rvolData = await getRelativeVolHour(sym).catch(()=>null);
  const squeezeMap = await getSqueezeMap(sym,price).catch(()=>null);

  const result={
    symbol,price,gain24h,high24h,vol24h,funding,oiChange,
    rsi4h,rsi1d,atr4h,volRatio,priceChg7d,priceChg30d,
    bids,asks,spread,liquid,bullDiv,bearDiv,
    trend4h,trend1d,sl,tp,ma20_4h,ma20_1d,
    closes4h,closes1d,vols4h,vols1d,obvDiv,wyckoff,macd,bb,
    klines4h,klines1d,klines1h,
    candlePatterns,prePumpSilence,
    fundingHist,
    bbSqueeze,
    rvolData,
    squeezeMap,
    breakout:detectBreakout(klines4h,klines1h,price),
    tfConfluence:detectTFConfluence({trend4h,trend1d,rsi4h,rsi1d,macd,ma20_4h,ma20_1d,price},klines1h),
  };

  Cache.set(symbol,'analysis',result);
  return result;
}
