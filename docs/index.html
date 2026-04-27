// ═══════════════════════════════════════════════════════════════════
// analysis.js — Hervin Scanner v9.2
// Technical indicators, pattern detection, signal detection
// Depends on: config.js, utils.js
// ═══════════════════════════════════════════════════════════════════

// ── CORE INDICATORS ─────────────────────────────────────────────────
function calcRSI(closes,period=14){if(closes.length<period+1)return 50;let g=0,l=0;for(let i=1;i<=period;i++){const d=closes[i]-closes[i-1];if(d>0)g+=d;else l-=d;}let ag=g/period,al=l/period;for(let i=period+1;i<closes.length;i++){const d=closes[i]-closes[i-1];ag=(ag*(period-1)+Math.max(d,0))/period;al=(al*(period-1)+Math.max(-d,0))/period;}return al===0?100:Math.round(100-100/(1+ag/al));}
function calcStochRSI(closes,rsiPeriod=14,stochPeriod=14){if(closes.length<rsiPeriod+stochPeriod)return 50;const rv=[];for(let i=rsiPeriod;i<=closes.length-1;i++)rv.push(calcRSI(closes.slice(0,i+1),rsiPeriod));const recent=rv.slice(-stochPeriod);const mn=Math.min(...recent),mx=Math.max(...recent);if(mx===mn)return 50;return Math.round(((rv[rv.length-1]-mn)/(mx-mn))*100);}
function calcATR(klines,period=14){if(klines.length<period+1)return 0;const trs=[];for(let i=1;i<klines.length;i++){const h=parseFloat(klines[i][2]),l=parseFloat(klines[i][3]),pc=parseFloat(klines[i-1][4]);trs.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)));}return trs.slice(-period).reduce((a,b)=>a+b,0)/period;}
function calcMA(arr,period){if(arr.length<period)return arr[arr.length-1]||0;return arr.slice(-period).reduce((a,b)=>a+b,0)/period;}
function calcEMA(arr,period){if(arr.length<period)return arr[arr.length-1]||0;const k=2/(period+1);let ema=arr.slice(0,period).reduce((a,b)=>a+b,0)/period;for(let i=period;i<arr.length;i++)ema=arr[i]*k+ema*(1-k);return ema;}
function calcMACD(closes){if(closes.length<26)return{macd:0,signal:0,hist:0};const e12=calcEMA(closes,12),e26=calcEMA(closes,26);const macd=e12-e26;const ma=[];for(let i=26;i<=closes.length;i++){const a=calcEMA(closes.slice(0,i),12),b=calcEMA(closes.slice(0,i),26);ma.push(a-b);}const signal=calcEMA(ma,9);return{macd,signal,hist:macd-signal};}
function calcBollingerBands(closes,period=20,mult=2){if(closes.length<period)return{upper:0,mid:0,lower:0,width:0};const slice=closes.slice(-period);const mid=slice.reduce((a,b)=>a+b,0)/period;const std=Math.sqrt(slice.reduce((a,b)=>a+(b-mid)**2,0)/period);const upper=mid+mult*std,lower=mid-mult*std;return{upper,mid,lower,width:mid>0?(upper-lower)/mid*100:0};}
function calculateTrend(arr){if(arr.length<5)return 0;const n=arr.length,sumX=n*(n-1)/2,sumY=arr.reduce((a,b)=>a+b,0),sumXY=arr.reduce((s,v,i)=>s+i*v,0),sumX2=n*(n-1)*(2*n-1)/6;const denom=n*sumX2-sumX*sumX;if(denom===0)return 0;const slope=(n*sumXY-sumX*sumY)/denom,avg=sumY/n;return avg===0?0:Math.max(-1,Math.min(1,slope/(avg*0.1)));}

// ── DIVERGENCE ──────────────────────────────────────────────────────
function detectBullishDivergence(klines){if(klines.length<25)return false;const c=klines.map(k=>parseFloat(k[4])),l=klines.map(k=>parseFloat(k[3]));const c1=c.slice(-20,-10),c2=c.slice(-10),l1=l.slice(-20,-10),l2=l.slice(-10);return Math.min(...l2)<Math.min(...l1)&&calcRSI(c2)>calcRSI(c1);}
function detectBearishDivergence(klines){if(klines.length<25)return false;const c=klines.map(k=>parseFloat(k[4])),h=klines.map(k=>parseFloat(k[2]));const c1=c.slice(-20,-10),c2=c.slice(-10),h1=h.slice(-20,-10),h2=h.slice(-10);return Math.max(...h2)>Math.max(...h1)&&calcRSI(c2)<calcRSI(c1);}
function detectOBVDivergence(closes,vols){if(closes.length<20)return null;let obv=[0];for(let i=1;i<closes.length;i++){if(closes[i]>closes[i-1])obv.push(obv[i-1]+vols[i]);else if(closes[i]<closes[i-1])obv.push(obv[i-1]-vols[i]);else obv.push(obv[i-1]);}const n=10;const pe=closes[closes.length-1],ps=Math.min(...closes.slice(-n));const os=Math.min(...obv.slice(-n)),oe=obv[obv.length-1];if(pe<=ps&&oe>os*1.05)return 'bullish';if(pe>=ps&&oe<os*0.95)return 'bearish';return null;}

// ── WYCKOFF & CLUSTERS ──────────────────────────────────────────────
function detectWyckoffPhase(closes,vols){if(closes.length<30)return null;const recent=closes.slice(-30),minP=Math.min(...recent),maxP=Math.max(...recent);const range=maxP-minP,curr=range===0?0.5:(recent[recent.length-1]-minP)/range;const av=vols.slice(-10).reduce((a,b)=>a+b,0)/10,pv=vols.slice(-20,-10).reduce((a,b)=>a+b,0)/10;if(curr<0.3&&av<pv*0.9)return 'accumulation';if(curr>0.7&&av>pv*1.2)return 'distribution';return null;}
function detectSupportCluster(klines,price){const lows=klines.map(k=>parseFloat(k[3]));const seen=[];for(const low of lows){if(!seen.some(c=>Math.abs(c-low)/(c||1)<0.02)){const count=lows.filter(l=>Math.abs(l-low)/(low||1)<0.02).length;if(count>=3)seen.push(low);}}return seen.filter(c=>Math.abs(c-price)/(price||1)<0.05).length;}
function detectResistanceCluster(klines,price){const highs=klines.map(k=>parseFloat(k[2]));const seen=[];for(const h of highs){if(!seen.some(c=>Math.abs(c-h)/(c||1)<0.015)){const count=highs.filter(h2=>Math.abs(h2-h)/(h||1)<0.015).length;if(count>=3)seen.push(h);}}return seen.filter(c=>c>price&&(c-price)/(price||1)<0.1).length;}

// ── BB SQUEEZE DETECTOR ─────────────────────────────────────────────
function detectBBSqueeze(klines4h) {
  if(!klines4h||klines4h.length<50) return null;
  const closes = klines4h.map(k=>parseFloat(k[4]));
  const calcBBWidth = (arr,period=20) => {
    if(arr.length<period) return 0;
    const slice=arr.slice(-period);
    const mid=slice.reduce((a,b)=>a+b,0)/period;
    const std=Math.sqrt(slice.reduce((a,b)=>a+(b-mid)**2,0)/period);
    return mid>0?(std*4/mid*100):0;
  };
  const widthNow  = calcBBWidth(closes);
  const width5d   = calcBBWidth(closes.slice(0,-20));
  const width10d  = calcBBWidth(closes.slice(0,-40));
  const squeezing = widthNow < width5d * 0.80 && widthNow < width10d * 0.70;
  const expanding = widthNow > width5d * 1.25;
  const extremeNarrow = widthNow < 3.0;
  const allWidths = [];
  for(let i=20;i<=closes.length;i+=4) allWidths.push(calcBBWidth(closes.slice(0,i)));
  const minWidth=Math.min(...allWidths), maxWidth=Math.max(...allWidths);
  const percentile = maxWidth>minWidth ? ((widthNow-minWidth)/(maxWidth-minWidth))*100 : 50;
  return {
    widthNow, width5d, width10d,
    squeezing, expanding, extremeNarrow,
    percentile: Math.round(percentile),
    compressionScore: squeezing ? (extremeNarrow ? 3 : 2) : 0,
  };
}

// ── PRE-PUMP SILENCE ────────────────────────────────────────────────
function detectPrePumpSilence(klines4h,klines1d){
  const result={detected:false,score:0,signals:[],consolidationDays:0,volCompression:false};
  if(!klines4h||klines4h.length<40)return result;
  const c4=klines4h.map(k=>parseFloat(k[4])),h4=klines4h.map(k=>parseFloat(k[2])),l4=klines4h.map(k=>parseFloat(k[3])),v4=klines4h.map(k=>parseFloat(k[5]));
  const ro=arr=>{const h=Math.max(...arr),l=Math.min(...arr);return h>0?(h-l)/h*100:99;};
  const r20=ro(c4.slice(-80)),r10=ro(c4.slice(-40)),r5=ro(c4.slice(-20));
  if(r10<r20*0.7&&r5<r10*0.8){result.score+=3;result.consolidationDays=Math.round(r20/4);result.signals.push({strength:'strong',text:`🔲 Range compression: ${r20.toFixed(1)}% → ${r10.toFixed(1)}% → ${r5.toFixed(1)}% — coiling ketat`});}
  else if(r10<10){result.score+=1;result.signals.push({strength:'medium',text:`🔲 Konsolidasi 10D dalam range ${r10.toFixed(1)}%`});}
  const va20=v4.slice(-80,-40).reduce((a,b)=>a+b,0)/40,va10=v4.slice(-40,-20).reduce((a,b)=>a+b,0)/20,va5=v4.slice(-20).reduce((a,b)=>a+b,0)/20;
  if(va5<va10*0.75&&va10<va20*0.85){result.volCompression=true;result.score+=2;result.signals.push({strength:'strong',text:`📉 Volume contraction: sellers exhausted, akumulasi aktif`});}
  else if(va5<va20*0.7){result.score+=1;result.signals.push({strength:'medium',text:`📉 Volume drop ${((1-va5/va20)*100).toFixed(0)}% dari rata-rata`});}
  const sup=Math.min(...l4.slice(-80)),curr=c4[c4.length-1],dist=(curr-sup)/(curr||1)*100;
  if(dist>2&&dist<15){result.score+=1;result.signals.push({strength:'medium',text:`🧱 Harga bertahan ${dist.toFixed(1)}% di atas support`});}
  const hT=calculateTrend(h4.slice(-40).filter((_,i)=>i%4===0)),lT=calculateTrend(l4.slice(-40).filter((_,i)=>i%4===0));
  if(hT<-0.1&&lT>0.05){result.score+=2;result.signals.push({strength:'strong',text:`🔺 Descending wedge / symmetrical triangle — spring loaded`});}
  if(klines1d&&klines1d.length>=20){const c1=klines1d.map(k=>parseFloat(k[4])),v1=klines1d.map(k=>parseFloat(k[5]));const r1m=ro(c1.slice(-30));const ve=v1.slice(-30,-15).reduce((a,b)=>a+b,0)/15,vl=v1.slice(-15).reduce((a,b)=>a+b,0)/15;if(r1m<25&&vl<ve*0.8){result.score+=2;result.consolidationDays=30;result.signals.push({strength:'strong',text:`📅 1D: konsolidasi ${r1m.toFixed(1)}% sebulan + vol menurun — institutional accum`});}}
  result.detected=result.score>=4;return result;
}

// ── CANDLE PATTERNS ─────────────────────────────────────────────────
function detectCandlePatterns(klines1d,rsi1d,price){
  const patterns=[];if(!klines1d||klines1d.length<5)return patterns;
  const len=klines1d.length;
  const k=i=>({o:parseFloat(klines1d[i][1]),h:parseFloat(klines1d[i][2]),l:parseFloat(klines1d[i][3]),c:parseFloat(klines1d[i][4]),body:Math.abs(parseFloat(klines1d[i][4])-parseFloat(klines1d[i][1])),range:parseFloat(klines1d[i][2])-parseFloat(klines1d[i][3]),isBull:parseFloat(klines1d[i][4])>parseFloat(klines1d[i][1]),isBear:parseFloat(klines1d[i][4])<parseFloat(klines1d[i][1])});
  const c0=k(len-1),c1=k(len-2),c2=k(len-3);
  if(c1.isBull&&c0.isBear&&c0.o>=c1.c&&c0.c<=c1.o&&c0.body>=c1.body*0.9){const cv=rsi1d>55;patterns.push({name:'Bearish Engulfing',strength:cv?'strong':'medium',text:`🕯 Bearish Engulfing (1D)${cv?' + RSI '+rsi1d+' overbought':' (low confidence)'}`,contextValid:cv});}
  const sb=c1.body/(c2.body||1);if(c2.isBull&&c2.body>0&&sb<0.35&&c0.isBear&&c0.body>=c2.body*0.6&&c0.c<=(c2.o+c2.c)/2){const cv=rsi1d>60;patterns.push({name:'Evening Star',strength:cv?'strong':'medium',text:`🌟 Evening Star (1D)${cv?', RSI '+rsi1d:' (konfirmasi lemah)'}`,contextValid:cv});}
  const uw=c0.h-Math.max(c0.o,c0.c),lw=Math.min(c0.o,c0.c)-c0.l;
  if(c0.range>0&&uw>=c0.range*0.60&&uw>=c0.body*2.0&&lw<=c0.range*0.15){const cv=rsi1d>55;patterns.push({name:'Shooting Star',strength:cv?'strong':'medium',text:`⭐ Shooting Star (1D)${cv?' (RSI '+rsi1d+')':' (low conf)'}`,contextValid:cv});}
  return patterns;
}

// ── BREAKOUT DETECTION ──────────────────────────────────────────────
function detectBreakout(klines4h,klines1h,price){
  const result={broke:false,retesting:false,consolidating:false,volConfirmed:false,breakoutPct:0,level:0,score:0,signals:[]};
  if(!klines4h||klines4h.length<30)return result;
  const c=klines4h.map(k=>parseFloat(k[4])),h=klines4h.map(k=>parseFloat(k[2])),l=klines4h.map(k=>parseFloat(k[3])),v=klines4h.map(k=>parseFloat(k[5]));
  const rl=Math.max(...h.slice(-25,-3));result.level=rl;
  const bp=rl>0?(price-rl)/rl*100:0;result.breakoutPct=bp;
  if(bp>0.5&&bp<25){result.broke=true;result.score+=2;result.signals.push({strength:'strong',text:`🚀 Breakout dari resistance $${fmt(rl,5)} (+${bp.toFixed(1)}%)`});}
  const av=v.slice(-20,-5).reduce((a,b)=>a+b,0)/15,bv=v[v.length-1],vm=av>0?bv/av:1;
  if(result.broke&&vm>=1.8){result.volConfirmed=true;result.score+=1;result.signals.push({strength:'strong',text:`📊 Volume breakout ${vm.toFixed(1)}x avg — genuine move`});}
  else if(result.broke&&vm>=1.2)result.signals.push({strength:'medium',text:`📊 Volume ${vm.toFixed(1)}x — kurang meyakinkan`});
  if(result.broke&&bp>0&&bp<5){result.retesting=true;result.score+=2;result.signals.push({strength:'strong',text:`🎯 Retest resistance lama = entry terbaik`});}
  if(!result.broke){const rh=Math.max(...h.slice(-8)),rl2=Math.min(...l.slice(-8));const rw=rh>0?(rh-rl2)/rh*100:99;const ev=v.slice(-8,-4).reduce((a,b)=>a+b,0)/4,lv=v.slice(-4).reduce((a,b)=>a+b,0)/4;
  if(rw<6&&lv<ev*0.85){result.consolidating=true;result.score+=2;result.signals.push({strength:'strong',text:`🔲 Konsolidasi ketat ${rw.toFixed(1)}% + vol menyusut = coiling`});}
  else if(rw<10){result.score+=1;result.signals.push({strength:'medium',text:`🔲 Range sempit ${rw.toFixed(1)}%`});}
  const dt=rl>0?(rl-price)/rl*100:99;if(dt<3&&dt>0){result.score+=1;result.signals.push({strength:'medium',text:`⚡ Harga hanya ${dt.toFixed(1)}% dari resistance`});}}
  return result;
}

// ── TIMEFRAME CONFLUENCE ─────────────────────────────────────────────
function detectTFConfluence(d,klines1h){
  const result={score:0,aligned:false,signals:[],tf:{h1:null,h4:null,d1:null}};
  const tf4h={trend:d.trend4h,rsi:d.rsi4h,macdBull:d.macd&&d.macd.hist>0};
  const tf1d={trend:d.trend1d,rsi:d.rsi1d};result.tf.h4=tf4h;result.tf.d1=tf1d;
  let tf1h={trend:null,rsi:50,macdBull:false};
  if(klines1h&&klines1h.length>=22){const c=klines1h.map(k=>parseFloat(k[4]));const ma=calcMA(c,20),ri=calcRSI(c),mc=calcMACD(c);tf1h={trend:d.price>ma?'bullish':'bearish',rsi:ri,macdBull:mc.hist>0};}
  result.tf.h1=tf1h;
  if(tf1h.trend==='bullish')result.score+=1;
  if(tf1h.macdBull&&tf1h.rsi>40&&tf1h.rsi<70){result.score+=1;result.signals.push({strength:'medium',text:`⏱ 1H bullish — RSI ${tf1h.rsi}, MACD positif`});}
  else if(tf1h.trend==='bullish')result.signals.push({strength:'medium',text:`⏱ 1H bullish (RSI ${tf1h.rsi})`});
  else result.signals.push({strength:'weak',text:`⏱ 1H bearish — belum konfirmasi`});
  if(tf4h.trend==='bullish'&&tf4h.macdBull){result.score+=2;result.signals.push({strength:'strong',text:`📐 4H bullish + MACD hijau`});}
  else if(tf4h.trend==='bullish'){result.score+=1;result.signals.push({strength:'medium',text:`📐 4H bullish (MACD pending)`});}
  else result.signals.push({strength:'weak',text:`📐 4H bearish`});
  if(tf1d.trend==='bullish'&&tf1d.rsi<70){result.score+=2;result.signals.push({strength:'strong',text:`📅 1D bullish + RSI ${tf1d.rsi}`});}
  else if(tf1d.trend==='bullish'){result.score+=1;result.signals.push({strength:'medium',text:`📅 1D bullish, RSI ${tf1d.rsi} mulai tinggi`});}
  else result.signals.push({strength:'weak',text:`📅 1D bearish`});
  const ab=tf1h.trend==='bullish'&&tf4h.trend==='bullish'&&tf1d.trend==='bullish';
  const nb=tf1h.trend==='bearish'&&tf4h.trend==='bearish'&&tf1d.trend==='bearish';
  if(ab){result.aligned=true;result.score=Math.min(result.score+1,6);result.signals.unshift({strength:'strong',text:'🎯 TRIPLE CONFLUENCE — 1H+4H+1D bullish'});}
  else if(nb)result.signals.unshift({strength:'weak',text:'⛔ Semua TF bearish'});
  return result;
}

// ── SMART ACCUMULATION SIGNALS ──────────────────────────────────────
function detectSmartAccumulation(d,klines4h,klines1d){
  const signals=[];let score=0;
  const v4=klines4h.map(k=>parseFloat(k[5]));
  const vt=calculateTrend(v4.slice(-20)),pt=calculateTrend(d.closes4h.slice(-20));
  if(vt>0.3&&Math.abs(pt)<0.1){score+=2;signals.push({strength:'strong',text:'📊 Volume ↑ harga flat = smart money accumulation'});}
  const od=detectOBVDivergence(d.closes4h,v4);
  if(od==='bullish'){score+=2;signals.push({strength:'strong',text:'📈 OBV bullish divergence = hidden buying pressure'});}
  const wy=detectWyckoffPhase(d.closes1d,d.vols1d);
  if(wy==='accumulation'){score+=2;signals.push({strength:'strong',text:'🔄 Wyckoff Accumulation phase'});}
  if(d.funding!==null&&d.funding<THRESHOLDS.FUNDING_NEG&&d.oiChange>5){score+=2;signals.push({strength:'strong',text:'💥 Funding negatif + OI ↑ = short squeeze brewing'});}
  const sup=detectSupportCluster(klines4h,d.price);
  if(sup>=3){score+=1;signals.push({strength:'medium',text:`🧱 ${sup} support clusters terkonfirmasi`});}
  const sr=calcStochRSI(d.closes4h);
  if(sr<20){score+=1;signals.push({strength:'medium',text:`📉 Stoch RSI ${sr} — extreme oversold`});}
  const mc=calcMACD(d.closes4h);
  if(mc.hist>0&&mc.macd<0){score+=1;signals.push({strength:'medium',text:'🔀 MACD histogram turning bullish'});}
  return{score,maxScore:11,signals};
}

// ═══════════════════════════════════════════════════════════════════
// v9.3 UPGRADE: SPIKE/DUMP PROBABILITY ENGINE
// Weighted model using RSI overheat, funding, OI, BB, MA extension,
// volume exhaustion, range expansion
// ═══════════════════════════════════════════════════════════════════
function calcSpikeProbability(d) {
  const price = d.price;
  const closes = d.closes4h;
  if (!closes || closes.length < 30) return null;

  // MA extensions
  const ma7   = calcMA(closes, 7);
  const ma25  = calcMA(closes, 25);
  const ma99  = calcMA(closes, 99);
  const extMa7  = ma7  > 0 ? (price - ma7)  / ma7  * 100 : 0;
  const extMa25 = ma25 > 0 ? (price - ma25) / ma25 * 100 : 0;
  const extMa99 = ma99 > 0 ? (price - ma99) / ma99 * 100 : 0;

  // Volume exhaustion: current vol vs 20-period avg
  const vols = d.vols4h || [];
  const avgVol = vols.length >= 20 ? vols.slice(-20).reduce((a,b)=>a+b,0)/20 : 0;
  const lastVol = vols[vols.length-1] || 0;
  const volRatioNow = avgVol > 0 ? lastVol / avgVol : 1;

  // 24H range expansion
  const high24 = d.high24h || price;
  const low24  = closes[closes.length - 6] || price;
  const rangeExpansion = price > 0 ? (high24 - low24) / price * 100 : 0;

  // ── SPIKE SCORE (upside continuation) ───────────────────────────
  let spikeScore = 0;

  // RSI overheat → spike fuel (shorts squeezed up)
  if (d.rsi4h >= 78) spikeScore += 25;
  else if (d.rsi4h >= 70) spikeScore += 15;
  else if (d.rsi4h >= 65) spikeScore += 8;

  // Funding negative = shorts paying = more squeeze fuel
  const funding = d.funding || 0;
  const fhAvg = d.fundingHist?.avg3d || 0;
  if (fhAvg < -0.03) spikeScore += 20;
  else if (fhAvg < -0.01) spikeScore += 12;
  else if (funding < -0.01) spikeScore += 8;

  // OI rising = new positions opening (squeeze accelerant)
  if (d.oiChange > 15) spikeScore += 15;
  else if (d.oiChange > 7) spikeScore += 8;
  else if (d.oiChange > 3) spikeScore += 4;

  // BB expanding = momentum active
  if (d.bbSqueeze?.expanding) spikeScore += 10;
  else if (!d.bbSqueeze?.squeezing) spikeScore += 3;

  // Price well above MA = extension = squeeze territory
  if (extMa7 > 15) spikeScore += 10;
  else if (extMa7 > 8) spikeScore += 5;
  if (extMa25 > 25) spikeScore += 8;

  // Volume spike = FOMO / forced covering
  if (d.rvolData?.isSpike) spikeScore += 10;
  else if (d.rvolData?.isRising) spikeScore += 4;

  // ── DUMP SCORE (reversal / distribution) ───────────────────────
  let dumpScore = 0;

  // RSI overbought = distribution likely
  if (d.rsi4h >= 80) dumpScore += 20;
  else if (d.rsi4h >= 72) dumpScore += 10;

  // Funding positive + high = longs overloaded
  if (funding > 0.08) dumpScore += 20;
  else if (funding > 0.05) dumpScore += 12;
  else if (funding > 0.02) dumpScore += 5;

  // OI falling while price high = distribution
  if (d.oiChange < -10) dumpScore += 15;
  else if (d.oiChange < -5) dumpScore += 8;

  // Bearish divergence = hidden weakness
  if (d.bearDiv) dumpScore += 15;

  // Candle patterns = reversal signal
  const strongPatterns = (d.candlePatterns || []).filter(p => p.contextValid && p.strength === 'strong');
  dumpScore += Math.min(strongPatterns.length * 10, 20);

  // Price way above MA99 = unsustainable
  if (extMa99 > 60) dumpScore += 10;
  else if (extMa99 > 35) dumpScore += 5;

  // Volume exhaustion after pump
  if (volRatioNow < 0.5 && d.gain24h > 20) dumpScore += 10;

  // Range overexpansion
  if (rangeExpansion > 30) dumpScore += 8;

  // Normalize to 0-100
  const total = spikeScore + dumpScore || 1;
  const spikePct = Math.min(Math.round(spikeScore / total * 100), 95);
  const dumpPct  = 100 - spikePct;

  // Status label
  let status, statusCls;
  if (spikePct >= 70) { status = 'HIGH SPIKE RISK';       statusCls = 'danger'; }
  else if (spikePct >= 55) { status = 'SQUEEZE WARNING';  statusCls = 'warn'; }
  else if (dumpPct >= 65) { status = 'DISTRIBUTION FORMING'; statusCls = 'ok'; }
  else { status = 'LOW RISK';                              statusCls = 'neutral'; }

  // Short risk score 0-100 (how dangerous to be short right now)
  const shortRiskScore = Math.round(spikePct * 0.6 + (d.rsi4h > 70 ? 20 : 0) + (fhAvg < -0.02 ? 20 : 0));
  const shortRiskCapped = Math.min(shortRiskScore, 100);

  return {
    spikePct, dumpPct, status, statusCls,
    shortRiskScore: shortRiskCapped,
    extMa7: extMa7.toFixed(1), extMa25: extMa25.toFixed(1), extMa99: extMa99.toFixed(1),
    ma7, ma25, ma99,
    volRatioNow: volRatioNow.toFixed(2),
    rangeExpansion: rangeExpansion.toFixed(1),
  };
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: TREND STATE ENGINE
// Classify current market state with confidence score
// ═══════════════════════════════════════════════════════════════════
function detectTrendState(d) {
  const closes = d.closes4h;
  if (!closes || closes.length < 30) return null;
  const price = d.price;
  const ma7  = calcMA(closes, 7);
  const ma25 = calcMA(closes, 25);
  const ma99 = calcMA(closes, 99);
  const rsi  = d.rsi4h;

  let state = 'Ranging';
  let confidence = 40;
  let color = 'neutral';
  let description = '';

  // Fresh Breakout: price just broke above resistance with volume
  if (d.breakout?.broke && d.breakout?.volConfirmed && d.gain24h < 40) {
    state = 'Fresh Breakout';
    confidence = 70 + (d.rvolData?.isSpike ? 15 : 0);
    color = 'green';
    description = 'Price broke resistance with volume. Early stage — high continuation potential.';

  // Overextended Pump: big gain, RSI hot, price far above MAs
  } else if (d.gain24h > 30 && rsi > 72 && price > ma7 * 1.08) {
    state = 'Overextended Pump';
    confidence = Math.min(60 + Math.round((rsi - 70) * 2 + d.gain24h * 0.3), 95);
    color = 'red';
    description = 'Price moved too fast. Squeeze or FOMO driving price. Reversal risk elevated.';

  // Distribution: high, OI falling, bearish divergence or patterns
  } else if (rsi > 65 && d.oiChange < -3 && (d.bearDiv || (d.candlePatterns||[]).length > 0)) {
    state = 'Distribution';
    confidence = 65 + (d.bearDiv ? 10 : 0) + ((d.candlePatterns||[]).length * 5);
    color = 'amber';
    description = 'Smart money exiting. Volume & OI declining while price holds high. Trap forming.';

  // Cooling: RSI coming down from high, vol declining
  } else if (rsi > 60 && rsi < 72 && d.oiChange < 2) {
    state = 'Cooling';
    confidence = 55;
    color = 'amber';
    description = 'Momentum fading. Not yet reversing but upside limited. Wait for direction.';

  // Reversal: bearish divergence + funding flip + price below key MA
  } else if (d.bearDiv && price < ma25 && d.trend4h === 'bearish') {
    state = 'Reversal';
    confidence = 70 + (d.oiChange < -5 ? 10 : 0);
    color = 'green';
    description = 'Trend flipping bearish. Multiple confluence signals pointing down.';

  // Accumulation: flat, vol building, funding negative
  } else if (d.prePumpSilence?.detected || d.bbSqueeze?.squeezing) {
    state = 'Accumulation / Coiling';
    confidence = 60 + (d.bbSqueeze?.extremeNarrow ? 15 : 0);
    color = 'blue';
    description = 'Range compression detected. Energy building for directional move. Direction TBD.';

  } else {
    state = 'Ranging';
    confidence = 40;
    color = 'neutral';
    description = 'No clear dominant trend. Low conviction environment.';
  }

  confidence = Math.min(confidence, 95);
  return { state, confidence, color, description };
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: LIQUIDITY SWEEP DETECTOR
// Detects likely market maker sweep zones
// ═══════════════════════════════════════════════════════════════════
function detectLiquiditySweep(d) {
  const price = d.price;
  const klines = d.klines4h;
  if (!klines || klines.length < 20) return null;

  const highs  = klines.map(k => parseFloat(k[2]));
  const lows   = klines.map(k => parseFloat(k[3]));
  const closes = klines.map(k => parseFloat(k[4]));

  // Round number magnets (nearest 0.1, 1, 10 etc depending on price scale)
  const magnitude = Math.pow(10, Math.floor(Math.log10(price)));
  const roundLevels = [];
  for (let m = 0.5; m <= 3; m += 0.5) {
    const level = Math.round(price / (magnitude * m)) * (magnitude * m);
    if (level > price * 0.95 && level < price * 1.20) roundLevels.push(level);
  }

  // Previous swing highs (wick clusters = liquidity)
  const swingHighs = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i+1] &&
        highs[i] > highs[i-2] && highs[i] > highs[i+2]) {
      swingHighs.push(highs[i]);
    }
  }

  // Cluster near-identical highs (liquidity pool)
  const clusters = [];
  const visited = new Set();
  for (let i = 0; i < swingHighs.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [swingHighs[i]];
    for (let j = i+1; j < swingHighs.length; j++) {
      if (Math.abs(swingHighs[j] - swingHighs[i]) / swingHighs[i] < 0.015) {
        cluster.push(swingHighs[j]);
        visited.add(j);
      }
    }
    if (cluster.length >= 2) {
      const avg = cluster.reduce((a,b)=>a+b,0)/cluster.length;
      if (avg > price) clusters.push({ price: avg, count: cluster.length });
    }
    visited.add(i);
  }
  clusters.sort((a,b) => a.price - b.price);

  // Orderbook imbalance check (using bids/asks ratio)
  const bidAskRatio = d.asks > 0 ? d.bids / d.asks : 1;
  const imbalanceSide = bidAskRatio > 1.3 ? 'bid-heavy' : bidAskRatio < 0.7 ? 'ask-heavy' : 'balanced';

  // Best sweep zone: nearest round number or cluster above price
  const allAbove = [
    ...roundLevels.filter(l => l > price * 1.005),
    ...clusters.filter(c => c.price > price * 1.005).map(c => c.price),
  ].sort((a,b) => a - b);

  const nearestSweep = allAbove[0] || null;
  const sweepZoneLow  = nearestSweep ? nearestSweep * 0.998 : null;
  const sweepZoneHigh = nearestSweep ? nearestSweep * 1.012 : null;

  // Probability: more clusters + round numbers + high RSI = higher sweep prob
  let sweepProb = 40;
  if (clusters.length > 0 && clusters[0].price < price * 1.10) sweepProb += 15;
  if (roundLevels.length > 0) sweepProb += 12;
  if (d.rsi4h > 68) sweepProb += 10;
  if (d.fundingHist?.currentNegStreak >= 3) sweepProb += 10;
  if (imbalanceSide === 'ask-heavy') sweepProb -= 10;
  sweepProb = Math.min(sweepProb, 88);

  return {
    sweepZoneLow, sweepZoneHigh, sweepProb,
    nearestSweep, clusters: clusters.slice(0,3),
    roundLevels: roundLevels.slice(0,3),
    imbalanceSide,
    bidAskRatio: bidAskRatio.toFixed(2),
  };
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: MARKET MAKER TRAP DETECTOR
// Classify move type: genuine / spoof / stop-hunt / liq cascade
// ═══════════════════════════════════════════════════════════════════
function detectMMTrap(d) {
  const price = d.price;
  const klines = d.klines4h;
  if (!klines || klines.length < 10) return null;

  const recent = klines.slice(-10);
  const avgBody = recent.reduce((s,k) => s + Math.abs(parseFloat(k[4]) - parseFloat(k[1])), 0) / 10;
  const avgRange = recent.reduce((s,k) => s + (parseFloat(k[2]) - parseFloat(k[3])), 0) / 10;
  const lastCandle = recent[recent.length - 1];
  const lastBody  = Math.abs(parseFloat(lastCandle[4]) - parseFloat(lastCandle[1]));
  const lastRange = parseFloat(lastCandle[2]) - parseFloat(lastCandle[3]);
  const lastWickUp = parseFloat(lastCandle[2]) - Math.max(parseFloat(lastCandle[4]), parseFloat(lastCandle[1]));
  const lastClose = parseFloat(lastCandle[4]);
  const lastOpen  = parseFloat(lastCandle[1]);

  // Wick ratio: long wick vs body = spoof/stop-hunt
  const wickRatio = lastBody > 0 ? lastWickUp / lastBody : 0;
  const bodyVsAvg = avgBody > 0 ? lastBody / avgBody : 1;

  let trapType = null;
  let trapConf = 0;
  let trapDesc = '';

  // Stop hunt wick: spike up with long wick, closes back down
  if (wickRatio > 2.5 && lastClose < lastOpen && d.gain24h > 10) {
    trapType = 'Stop-Hunt Wick';
    trapConf = Math.min(55 + Math.round(wickRatio * 5), 88);
    trapDesc = 'Long upper wick with bearish close. Classic stop-hunt above resistance — price likely to revert.';

  // Liquidation cascade: OI dropping fast + price falling + vol spike
  } else if (d.oiChange < -12 && d.gain24h < -8 && d.rvolData?.isSpike) {
    trapType = 'Liquidation Cascade';
    trapConf = 75;
    trapDesc = 'OI collapsing + volume spike + sharp drop. Long liquidations cascading — potential bounce incoming.';

  // Spoof pump: price up but OI flat/down + vol weak
  } else if (d.gain24h > 15 && d.oiChange < 2 && !d.rvolData?.isRising) {
    trapType = 'Spoof Pump';
    trapConf = 60;
    trapDesc = 'Price rising but OI & volume not confirming. Potential spoofed move — thin orderbook manipulation.';

  // Genuine breakout: OI + vol both rising, RSI not extreme
  } else if (d.breakout?.volConfirmed && d.oiChange > 5 && d.rsi4h < 75) {
    trapType = 'Genuine Breakout';
    trapConf = 65 + (d.tfConfluence?.aligned ? 15 : 0);
    trapDesc = 'Volume + OI + price all aligned. Real demand entering market. Caution for shorts.';

  } else {
    trapType = 'Unclear';
    trapConf = 35;
    trapDesc = 'No dominant pattern detected. Mixed signals — wait for clearer setup.';
  }

  return { trapType, trapConf, trapDesc, wickRatio: wickRatio.toFixed(1) };
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: DYNAMIC SUPPORT/RESISTANCE MAP
// Projects spike targets, invalidation levels, dump targets
// ═══════════════════════════════════════════════════════════════════
function buildSRMap(d) {
  const price  = d.price;
  const klines = d.klines4h;
  if (!klines || klines.length < 30) return null;

  const highs  = klines.map(k => parseFloat(k[2]));
  const lows   = klines.map(k => parseFloat(k[3]));
  const atr    = d.atr4h || price * 0.02;

  // Build resistance clusters above price
  const rhc = [];
  for (const h of highs) {
    if (h <= price * 1.001) continue;
    const ex = rhc.find(c => Math.abs(c.price - h) / h < 0.015);
    if (ex) { ex.count++; ex.prices.push(h); }
    else rhc.push({ price: h, count: 1, prices: [h] });
  }
  const resistances = rhc
    .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
    .filter(c => c.count >= 2 || c.price < price * 1.15)
    .sort((a,b) => a.price - b.price)
    .slice(0, 4);

  // Build support clusters below price
  const slc = [];
  for (const l of lows) {
    if (l >= price * 0.999) continue;
    const ex = slc.find(c => Math.abs(c.price - l) / l < 0.02);
    if (ex) { ex.count++; ex.prices.push(l); }
    else slc.push({ price: l, count: 1, prices: [l] });
  }
  const supports = slc
    .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
    .filter(c => c.count >= 2)
    .sort((a,b) => b.price - a.price)
    .slice(0, 4);

  // Spike targets (ATR-based extensions above last resistance)
  const topRes = resistances[resistances.length - 1]?.price || price * 1.05;
  const spikeTargets = [
    { label: 'T1', price: price + atr * 1.5, note: '1.5× ATR extension' },
    { label: 'T2', price: topRes + atr, note: 'Above resistance cluster' },
    { label: 'T3', price: price * (1 + (d.gain24h > 0 ? Math.min(d.gain24h * 0.3 / 100, 0.25) : 0.10)), note: 'Momentum projection' },
  ].filter(t => t.price > price).sort((a,b) => a.price - b.price);

  // Dump targets (support levels below)
  const dumpTargets = supports.slice(0, 3).map((s, i) => ({
    label: `D${i+1}`, price: s.price, count: s.count,
    note: `${s.count}× tested support`,
  }));

  // Invalidation level for short: above strongest resistance
  const invalidation = resistances.length > 0
    ? resistances[Math.min(1, resistances.length-1)].price * 1.02
    : price * 1.12;

  return { resistances, supports, spikeTargets, dumpTargets, invalidation };
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: SQUEEZE WARNING TRIGGERS
// Fires specific alerts based on dangerous combinations
// ═══════════════════════════════════════════════════════════════════
function detectSqueezeWarnings(d) {
  const warnings = [];

  // SHORT TRAP: RSI > 78 + OI rising + price above resistance
  if (d.rsi4h > 78 && d.oiChange > 5 && d.breakout?.broke) {
    warnings.push({
      type: 'SHORT TRAP WARNING',
      cls: 'danger',
      icon: '🚨',
      desc: `RSI ${d.rsi4h} overheated + OI +${d.oiChange.toFixed(1)}% + breakout active. Shorts entering here face extreme squeeze risk.`,
    });
  }

  // LONG LIQUIDATION CASCADE: funding high + price falling + OI rising
  if ((d.funding||0) > 0.05 && d.gain24h < -5 && d.oiChange > 3) {
    warnings.push({
      type: 'LONG LIQUIDATION CASCADE',
      cls: 'ok',
      icon: '💥',
      desc: `Funding +${(d.funding||0).toFixed(4)}% with price dropping. Overloaded longs liquidating. Bounce risk before continuation.`,
    });
  }

  // EXTREME FUNDING SQUEEZE: multi-period negative funding + OI building
  if (d.fundingHist?.currentNegStreak >= 5 && d.oiChange > 8) {
    warnings.push({
      type: 'SQUEEZE IMMINENT',
      cls: 'danger',
      icon: '🔥',
      desc: `${d.fundingHist.currentNegStreak} consecutive neg funding periods + OI surging. Classic pre-squeeze setup like HYPER. Do NOT short here.`,
    });
  }

  // DISTRIBUTION TRAP: price high, OI falling, bearish div
  if (d.rsi4h > 65 && d.oiChange < -5 && d.bearDiv) {
    warnings.push({
      type: 'DISTRIBUTION CONFIRMED',
      cls: 'ok',
      icon: '📉',
      desc: 'Smart money exiting. OI dropping + bearish divergence = controlled distribution. Short entries opening up.',
    });
  }

  // BB SQUEEZE BREAKOUT PENDING: extreme squeeze, direction unknown
  if (d.bbSqueeze?.extremeNarrow && d.bbSqueeze?.squeezing) {
    warnings.push({
      type: 'VOLATILITY EXPLOSION PENDING',
      cls: 'warn',
      icon: '⚡',
      desc: `BB width at historical lows (${d.bbSqueeze.widthNow.toFixed(1)}%). Major move imminent — direction unclear. Do not short until break is confirmed.`,
    });
  }

  // VOLUME CLIMAX: spike vol + price near high + gain > 25%
  if (d.rvolData?.isSpike && d.gain24h > 25 && d.rsi4h > 70) {
    warnings.push({
      type: 'VOLUME CLIMAX ALERT',
      cls: 'warn',
      icon: '📊',
      desc: `Volume ${d.rvolData.rvolVsAvg.toFixed(1)}× avg during extended pump. Climax volume often marks exhaustion. Wait for rejection candle before shorting.`,
    });
  }

  return warnings;
}

// ── PUMP EXHAUSTION SIGNALS ─────────────────────────────────────────
function detectPumpExhaustion(d,klines4h,klines1d){
  const signals=[];let score=0;
  const cl=d.closes4h,ac=[];
  for(let i=2;i<cl.length;i++)ac.push(((cl[i]-cl[i-1])-(cl[i-1]-cl[i-2]))/(cl[i-2]||1));
  const aa=ac.slice(-5).reduce((a,b)=>a+b,0)/5;
  if(aa>THRESHOLDS.PARABOLIC_ACC&&d.gain24h>40){score+=2;signals.push({strength:'strong',text:'🚀 Move parabolik — rawan reversal tajam'});}
  const vs=klines4h.map(k=>parseFloat(k[5]));
  const av=vs.slice(-20,-5).reduce((a,b)=>a+b,0)/15,rv=vs.slice(-5).reduce((a,b)=>a+b,0)/5;
  const stall=Math.abs(d.closes4h.slice(-5).reduce((a,b)=>a+b,0)/5-d.price)/(d.price||1)<0.02;
  if(rv>av*2&&stall&&d.gain24h>30){score+=2;signals.push({strength:'strong',text:'💥 Volume climax + harga stagnan = distribusi'});}
  if(detectBearishDivergence(klines4h)){score+=2;signals.push({strength:'strong',text:'📉 Bearish divergence RSI (4H)'});}
  if(d.funding!==null&&d.funding>THRESHOLDS.FUNDING_POS&&d.oiChange<-5){score+=2;signals.push({strength:'strong',text:`🔻 Funding +${d.funding.toFixed(4)}% + OI ↓ = profit taking`});}
  const res=detectResistanceCluster(klines4h,d.price);
  if(res>=3){score+=1;signals.push({strength:'medium',text:`🧱 ${res} resistance cluster di atas`});}
  const bb=calcBollingerBands(d.closes4h);
  if(d.price>bb.upper){score+=1;signals.push({strength:'medium',text:'📊 Harga di atas BB Upper'});}
  if(d.candlePatterns&&d.candlePatterns.length>0){for(const p of d.candlePatterns){if(p.contextValid)score+=p.strength==='strong'?2:1;signals.push({strength:p.strength,text:p.text,isBear:true});}}
  return{score,maxScore:10+(d.candlePatterns?.length>0?2:0),signals};
}
