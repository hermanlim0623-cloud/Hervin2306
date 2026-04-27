// ═══════════════════════════════════════════════════════════════════
// scoring.js — Hervin Scanner v9.2
// scoreAccum, scoreShort, scorePump + calcTradeSetup
// Depends on: config.js, utils.js, analysis.js
// ═══════════════════════════════════════════════════════════════════

function scoreAccum(d){
  const checks=[];let score=0;

  if(d.volRatio>=THRESHOLDS.VOLUME_SPIKE){score++;checks.push({pass:true,text:`Volume 14D: ${d.volRatio.toFixed(1)}x avg — silent buying detected`});}
  else if(d.volRatio>=THRESHOLDS.VOLUME_MODERATE)checks.push({warn:true,text:`Volume 14D: ${d.volRatio.toFixed(1)}x avg — sedikit naik`});
  else checks.push({fail:true,text:`Volume 14D: ${d.volRatio.toFixed(1)}x avg — normal`});

  if(d.priceChg7d>=THRESHOLDS.PRICE_FLAT_MIN&&d.priceChg7d<=THRESHOLDS.PRICE_FLAT_MAX){score++;checks.push({pass:true,text:`Harga 7D flat: ${fmtPct(d.priceChg7d)}`});}
  else if(d.priceChg7d>THRESHOLDS.PRICE_FLAT_MAX)checks.push({warn:true,text:`Harga 7D pump: ${fmtPct(d.priceChg7d)}`});
  else checks.push({fail:true,text:`Harga 7D turun: ${fmtPct(d.priceChg7d)}`});

  if(d.bullDiv){score++;checks.push({pass:true,text:`RSI Bullish Divergence (4H)`});}
  else checks.push({fail:true,text:`Tidak ada RSI bullish divergence (4H)`});

  if(d.rsi4h<THRESHOLDS.RSI_OVERSOLD){score++;checks.push({pass:true,text:`RSI 4H: ${d.rsi4h} — masih murah`});}
  else if(d.rsi4h<THRESHOLDS.RSI_OVERBOUGHT)checks.push({warn:true,text:`RSI 4H: ${d.rsi4h} — neutral`});
  else checks.push({fail:true,text:`RSI 4H: ${d.rsi4h} — overbought`});

  if(d.fundingHist) {
    const fh=d.fundingHist;
    if(fh.avg3d<THRESHOLDS.FUNDING_EXTREME_NEG&&fh.negCount>=6){score+=3;checks.push({pass:true,text:`Funding: avg3D ${fh.avg3d.toFixed(4)}% EXTREME NEG × ${fh.currentNegStreak} periods berturut — SQUEEZE IMMINENT 🔥`});}
    else if(fh.avg3d<THRESHOLDS.FUNDING_NEG&&fh.negCount>=4){score+=2;checks.push({pass:true,text:`Funding trend negatif ${fh.negCount}/9 periods, avg ${fh.avg3d.toFixed(4)}% — shorts overloaded`});}
    else if(d.funding!==null&&d.funding<THRESHOLDS.FUNDING_NEG){score++;checks.push({pass:true,text:`Funding snapshot: ${d.funding.toFixed(4)}% negatif`});}
    else if(d.funding!==null)checks.push({warn:true,text:`Funding: ${d.funding?.toFixed(4)}%`});
    else checks.push({fail:true,text:`Funding: N/A`});
  } else {
    if(d.funding!==null&&d.funding<THRESHOLDS.FUNDING_NEG){score++;checks.push({pass:true,text:`Funding: ${d.funding.toFixed(4)}% negatif`});}
    else checks.push({warn:true,text:`Funding: ${d.funding?.toFixed(4)||'N/A'}%`});
  }

  if(d.bids>=THRESHOLDS.BID_DEPTH_STRONG){score++;checks.push({pass:true,text:`Bid wall kuat: $${(d.bids/1000).toFixed(0)}K`});}
  else if(d.bids>=THRESHOLDS.BID_DEPTH_OK)checks.push({warn:true,text:`Bid cukup: $${(d.bids/1000).toFixed(0)}K`});
  else checks.push({fail:true,text:`Bid tipis: $${(d.bids/1000).toFixed(0)}K`});

  if(d.macd&&d.macd.hist>0){score++;checks.push({pass:true,text:`MACD histogram positif — bullish momentum`});}
  else checks.push({fail:true,text:`MACD histogram negatif`});

  if(d.oiChange>5){score++;checks.push({pass:true,text:`OI ↑ ${d.oiChange.toFixed(1)}% — fresh longs`});}
  else if(d.oiChange<-5)checks.push({warn:true,text:`OI ↓ ${d.oiChange.toFixed(1)}%`});
  else checks.push({warn:true,text:`OI: ${d.oiChange.toFixed(1)}% — flat`});

  if(d.rvolData){
    if(d.rvolData.isSpike){score+=2;checks.push({pass:true,text:`Relative Vol/hour: ${d.rvolData.rvolVsAvg.toFixed(1)}x avg — VOLUME SPIKE jam ini 🔥`});}
    else if(d.rvolData.isRising){score++;checks.push({pass:true,text:`Relative Vol/hour: ${d.rvolData.rvolVsAvg.toFixed(1)}x avg — above average`});}
    else checks.push({fail:true,text:`Rel Vol/hour: ${d.rvolData.rvolVsAvg.toFixed(1)}x avg — normal`});
  }

  if(d.bbSqueeze){
    if(d.bbSqueeze.squeezing&&d.bbSqueeze.extremeNarrow){score+=2;checks.push({pass:true,text:`BB Squeeze EXTREME (width ${d.bbSqueeze.widthNow.toFixed(1)}%, bottom ${d.bbSqueeze.percentile}% hist) — siap meledak`});}
    else if(d.bbSqueeze.squeezing){score++;checks.push({pass:true,text:`BB Squeeze: width menyempit ${d.bbSqueeze.width10d.toFixed(1)}%→${d.bbSqueeze.widthNow.toFixed(1)}%`});}
    else if(d.bbSqueeze.expanding)checks.push({warn:true,text:`BB expanding — pump mungkin sudah dimulai`});
    else checks.push({warn:true,text:`BB width: ${d.bbSqueeze.widthNow.toFixed(1)}% — normal`});
  }

  if(d.breakout){
    if(d.breakout.broke&&d.breakout.volConfirmed){score+=2;checks.push({pass:true,text:`🚀 Breakout terkonfirmasi (+${d.breakout.breakoutPct.toFixed(1)}%)`});}
    else if(d.breakout.retesting){score+=2;checks.push({pass:true,text:`🎯 Retest level breakout`});}
    else if(d.breakout.consolidating){score++;checks.push({pass:true,text:`🔲 Konsolidasi ketat — coiling`});}
    else if(d.breakout.broke)checks.push({warn:true,text:`Breakout tapi volume lemah`});
    else checks.push({warn:true,text:`Belum breakout`});
  }

  if(d.tfConfluence){
    if(d.tfConfluence.aligned){score+=2;checks.push({pass:true,text:`🎯 TRIPLE CONFLUENCE — 1H+4H+1D bullish`});}
    else if(d.tfConfluence.score>=4){score++;checks.push({pass:true,text:`📐 TF Confluence kuat (${d.tfConfluence.score}/6)`});}
    else if(d.tfConfluence.score>=2)checks.push({warn:true,text:`📐 TF Confluence partial (${d.tfConfluence.score}/6)`});
    else checks.push({warn:true,text:`📐 TF mayoritas bearish`});
  }

  if(d.prePumpSilence&&d.prePumpSilence.detected){score+=2;checks.push({pass:true,text:`🤫 Pre-pump silence: konsolidasi${d.prePumpSilence.consolidationDays?' '+d.prePumpSilence.consolidationDays+'D':''} + vol compression`});}
  else if(d.prePumpSilence&&d.prePumpSilence.score>=2){score++;checks.push({warn:true,text:`🤫 Tanda pre-pump silence (${d.prePumpSilence.score}/9)`});}

  const max=18;
  const pct=Math.round(score/max*100);
  const cls=score>=12?'high':score>=7?'mid':'low';
  const verdict=score>=12?{cls:'strong',text:'🟢 PUMP SETUP KUAT — High probability, siap entry'}:score>=7?{cls:'medium',text:'🟡 AKUMULASI TERDETEKSI — Monitor, tunggu konfirmasi'}:{cls:'weak',text:'⚪ Signal lemah — Skip'};
  return{score,max,pct,cls,checks,verdict};
}

function scoreShort(d){
  const checks=[];let score=0;
  const drop=d.high24h>0?(d.high24h-d.price)/d.high24h*100:0;

  if(d.gain24h>=THRESHOLDS.PUMP_GAIN_MIN){score++;checks.push({pass:true,text:`Pump hari ini: ${fmtPct(d.gain24h)}`});}
  else checks.push({fail:true,text:`Gain 24H: ${fmtPct(d.gain24h)}`});

  if(drop>=THRESHOLDS.SHORT_DROP_MIN){score++;checks.push({pass:true,text:`Drop dari high: -${drop.toFixed(1)}%`});}
  else checks.push({fail:true,text:`Drop dari high: -${drop.toFixed(1)}%`});

  if(d.fundingHist){
    const fh=d.fundingHist;
    if(fh.avg3d>THRESHOLDS.FUNDING_POS&&fh.negCount===0){score+=2;checks.push({pass:true,text:`Funding trend POSITIF 3D: avg ${fh.avg3d.toFixed(4)}% — longs overloaded, reversal signal 🔻`});}
    else if(d.funding!==null&&d.funding>THRESHOLDS.FUNDING_POS){score++;checks.push({pass:true,text:`Funding: +${d.funding.toFixed(4)}% — longs paying heavy`});}
    else if(d.funding!==null&&d.funding<-THRESHOLDS.FUNDING_POS)checks.push({warn:true,text:`Funding NEGATIF: ${d.funding.toFixed(4)}% — SQUEEZE RISK untuk short!`});
    else checks.push({fail:true,text:`Funding: ${d.funding?.toFixed(4)||'N/A'}%`});
  } else {
    if(d.funding!==null&&d.funding>THRESHOLDS.FUNDING_POS){score++;checks.push({pass:true,text:`Funding: +${d.funding.toFixed(4)}%`});}
    else checks.push({fail:true,text:`Funding: ${d.funding?.toFixed(4)||'N/A'}%`});
  }

  if(d.liquid){score++;checks.push({pass:true,text:`Liquid — spread ${d.spread.toFixed(2)}%`});}
  else checks.push({warn:true,text:`Spread ${d.spread.toFixed(2)}% — kurang likuid`});

  if(d.rsi4h>THRESHOLDS.RSI_OVERBOUGHT){score++;checks.push({pass:true,text:`RSI 4H overbought: ${d.rsi4h}`});}
  else checks.push({fail:true,text:`RSI 4H: ${d.rsi4h} — belum OB`});

  if(d.bearDiv){score++;checks.push({pass:true,text:`RSI Bearish Divergence (4H)`});}
  else checks.push({fail:true,text:`Tidak ada bearish divergence`});

  if(d.trend1d==='bearish'){score++;checks.push({pass:true,text:`Trend 1D bearish — angin mendukung`});}
  else checks.push({fail:true,text:`Trend 1D masih bullish — counter-trend`});

  if(d.oiChange<-5){score++;checks.push({pass:true,text:`OI ↓ ${d.oiChange.toFixed(1)}% — longs keluar`});}
  else checks.push({fail:true,text:`OI: ${d.oiChange.toFixed(1)}%`});

  if(d.bbSqueeze&&d.bbSqueeze.expanding){score++;checks.push({pass:true,text:`BB expanding setelah pump — momentum tanda habis`});}

  let cb=0;
  if(d.candlePatterns&&d.candlePatterns.length>0){for(const p of d.candlePatterns){if(p.contextValid){cb+=p.strength==='strong'?2:1;checks.push({pass:true,text:p.text});}else checks.push({warn:true,text:p.text+' ⚠ konteks lemah'});}score+=Math.min(cb,3);}

  const max=12;const pct=Math.round(score/max*100);const cls=score>=8?'high':score>=5?'mid':'low';
  const verdict=score>=8?{cls:'strong',text:`🟢 LAYAK SHORT — SL $${fmt(d.sl,5)}`}:score>=5?{cls:'medium',text:'🟡 TUNGGU konfirmasi'}:{cls:'weak',text:'🔴 SKIP'};
  return{score,max,pct,cls,checks,verdict};
}

function scorePump(d,pre){
  const checks=[],signals=[];let score=0;
  if(pre.vol>50e6){score+=2;checks.push({pass:true,text:`Volume: ${fmtVol(pre.vol)} — massive`});signals.push({strength:'strong',text:`📊 ${fmtVol(pre.vol)} — institutional`});}
  else if(pre.vol>5e6){score++;checks.push({pass:true,text:`Volume: ${fmtVol(pre.vol)} — solid`});}
  else checks.push({warn:true,text:`Volume: ${fmtVol(pre.vol)} — kecil`});
  if(pre.change>=15&&pre.change<=60){score+=2;checks.push({pass:true,text:`+${pre.change.toFixed(1)}% — early pump`});signals.push({strength:'strong',text:`🚀 +${pre.change.toFixed(1)}% early stage`});}
  else if(pre.change>60){score++;checks.push({warn:true,text:`+${pre.change.toFixed(1)}% — extended`});}
  else checks.push({warn:true,text:`+${pre.change.toFixed(1)}%`});
  if(pre.posInDay>0.8){score++;checks.push({pass:true,text:`Near daily HIGH — buyers control`});signals.push({strength:'strong',text:`📈 Holding near high`});}
  else if(pre.posInDay>0.5)checks.push({warn:true,text:`Mid range`});
  else checks.push({fail:true,text:`Near daily LOW — weakening`});

  if(d.fundingHist){
    const fh=d.fundingHist;
    if(fh.currentNegStreak>=3&&d.gain24h>20){score+=2;checks.push({pass:true,text:`Funding negatif ${fh.currentNegStreak} periods + pump = SHORT SQUEEZE AKTIF 🔥`});signals.push({strength:'strong',text:`💥 Funding neg streak ${fh.currentNegStreak}× + price up = squeeze ongoing`});}
    else if(d.funding!==null&&d.funding<0){score++;checks.push({pass:true,text:`Funding: ${d.funding.toFixed(4)}% negatif saat pump`});}
    else if(d.funding!==null)checks.push({warn:true,text:`Funding: ${d.funding.toFixed(4)}%`});
  } else {
    if(d.funding!==null&&d.funding<0){score+=2;checks.push({pass:true,text:`Funding negatif: ${d.funding.toFixed(4)}%`});}
    else if(d.funding!==null&&d.funding<0.05){score++;checks.push({pass:true,text:`Funding rendah`});}
    else if(d.funding!==null)checks.push({warn:true,text:`Funding: ${d.funding.toFixed(4)}%`});
  }

  if(d.oiChange>10){score+=2;checks.push({pass:true,text:`OI +${d.oiChange.toFixed(1)}% — fresh longs`});signals.push({strength:'strong',text:`📊 OI +${d.oiChange.toFixed(1)}% — new money entering`});}
  else if(d.oiChange>3){score++;checks.push({pass:true,text:`OI +${d.oiChange.toFixed(1)}%`});}
  else if(d.oiChange<-5)checks.push({fail:true,text:`OI ↓`});
  else checks.push({warn:true,text:`OI flat`});

  if(d.rvolData?.isSpike){score++;checks.push({pass:true,text:`RVOL spike jam ini: ${d.rvolData.rvolVsAvg.toFixed(1)}x avg — FOMO masuk 🔥`});signals.push({strength:'strong',text:`⚡ RVOL ${d.rvolData.rvolVsAvg.toFixed(1)}x avg — volume spike jam ini`});}
  else if(d.rvolData?.isRising)checks.push({warn:true,text:`RVOL: ${d.rvolData.rvolVsAvg.toFixed(1)}x avg`});

  if(d.rsi4h<60){score++;checks.push({pass:true,text:`RSI 4H: ${d.rsi4h} — belum OB`});}
  else if(d.rsi4h<75)checks.push({warn:true,text:`RSI 4H: ${d.rsi4h}`});
  else checks.push({fail:true,text:`RSI 4H: ${d.rsi4h} — OB`});
  if(d.tfConfluence?.aligned){score+=2;checks.push({pass:true,text:`Triple TF confluence`});signals.push({strength:'strong',text:`🎯 All TF aligned`});}
  else if(d.tfConfluence?.score>=4){score++;checks.push({pass:true,text:`TF ${d.tfConfluence.score}/6`});}
  else checks.push({warn:true,text:`TF lemah`});

  const max=14;const pct=Math.round(score/max*100);const cls=score>=10?'high':score>=6?'mid':'low';
  const verdict=score>=10?{cls:'strong',text:'🟢 MOMENTUM KUAT — Entry sekarang'}:score>=6?{cls:'medium',text:'🟡 Monitor'}:{cls:'weak',text:'⚪ Lemah'};
  return{score,max,pct,cls,checks,verdict,signals};
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: SHORT ACCUMULATION LADDER ENGINE
// Auto-generate 3 adaptive short entry zones based on
// resistance clusters, ATR, MA extensions, and spike probability
// Works for both long & short (adaptive)
// ═══════════════════════════════════════════════════════════════════
function calcAccumulationLadder(d, side = 'short') {
  const price = d.price;
  const atr   = d.atr4h || price * 0.02;
  const klines = d.klines4h;
  if (!klines || klines.length < 20 || atr <= 0) return null;

  const highs = klines.map(k => parseFloat(k[2]));
  const lows  = klines.map(k => parseFloat(k[3]));

  if (side === 'short') {
    // SHORT LADDER: entries stagger up into spike/resistance
    // Build resistance levels above current price
    const rhc = [];
    for (const h of highs) {
      if (h <= price) continue;
      const ex = rhc.find(c => Math.abs(c.price - h) / h < 0.015);
      if (ex) { ex.count++; ex.prices.push(h); }
      else rhc.push({ price: h, count: 1, prices: [h] });
    }
    const resLevels = rhc
      .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
      .filter(c => c.price > price * 1.005 && c.price < price * 1.35)
      .sort((a,b) => a.price - b.price);

    // Entry 1: conservative — just above current with small exposure
    const e1 = resLevels[0]?.price || (price + atr * 0.8);
    // Entry 2: mid — at next resistance or ATR extension
    const e2 = resLevels[1]?.price || (price + atr * 1.6);
    // Entry 3: aggressive — at spike target / strong resistance
    const e3 = resLevels[2]?.price || (price + atr * 2.8);

    const entries = [e1, e2, e3];
    // Weighted avg (50/30/20 split)
    const weightedAvg = (e1 * 0.5 + e2 * 0.3 + e3 * 0.2);

    // SL: above highest entry + ATR buffer
    const sl = Math.max(...entries) * 1.025 + atr * 0.5;

    // Invalidation: if price closes above sl cleanly on 4H
    const invalidation = sl * 1.01;

    // TP: nearest strong support below price
    const slc = [];
    for (const l of lows) {
      if (l >= price) continue;
      const ex = slc.find(c => Math.abs(c.price - l) / l < 0.02);
      if (ex) { ex.count++; ex.prices.push(l); }
      else slc.push({ price: l, count: 1, prices: [l] });
    }
    const supLevels = slc
      .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
      .filter(c => c.count >= 2)
      .sort((a,b) => b.price - a.price);

    const tp1 = supLevels[0]?.price || (price - atr * 2);
    const tp2 = supLevels[1]?.price || (price - atr * 4);

    const risk = sl - weightedAvg;
    const rr1  = risk > 0 ? (weightedAvg - tp1) / risk : 0;
    const rr2  = risk > 0 ? (weightedAvg - tp2) / risk : 0;

    return {
      side: 'short',
      entries: entries.map((e, i) => ({
        label: `Acc ${i+1}`,
        price: e,
        weight: [50, 30, 20][i],
        pct: ((e - price) / price * 100).toFixed(2),
        note: resLevels[i] ? `Resistance (${resLevels[i].count}×)` : `ATR extension ${(1+i).toFixed(1)}×`,
      })),
      weightedAvg,
      sl, invalidation,
      tp1, tp2,
      rr1: rr1.toFixed(2), rr2: rr2.toFixed(2),
      slPct: ((sl - weightedAvg) / weightedAvg * 100).toFixed(1),
    };

  } else {
    // LONG LADDER: entries stagger down into support/dip zones
    const slc = [];
    for (const l of lows) {
      if (l >= price) continue;
      const ex = slc.find(c => Math.abs(c.price - l) / l < 0.02);
      if (ex) { ex.count++; ex.prices.push(l); }
      else slc.push({ price: l, count: 1, prices: [l] });
    }
    const supLevels = slc
      .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
      .filter(c => c.price < price * 0.995 && c.price > price * 0.65)
      .sort((a,b) => b.price - a.price);

    const e1 = supLevels[0]?.price || (price - atr * 0.8);
    const e2 = supLevels[1]?.price || (price - atr * 1.6);
    const e3 = supLevels[2]?.price || (price - atr * 2.8);

    const entries = [e1, e2, e3];
    const weightedAvg = (e1 * 0.5 + e2 * 0.3 + e3 * 0.2);

    const sl = Math.min(...entries) * 0.975 - atr * 0.5;
    const invalidation = sl * 0.99;

    const rhc = [];
    for (const h of highs) {
      if (h <= price) continue;
      const ex = rhc.find(c => Math.abs(c.price - h) / h < 0.015);
      if (ex) { ex.count++; ex.prices.push(h); }
      else rhc.push({ price: h, count: 1, prices: [h] });
    }
    const resLevels = rhc
      .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
      .filter(c => c.count >= 2)
      .sort((a,b) => a.price - b.price);

    const tp1 = resLevels[0]?.price || (price + atr * 2);
    const tp2 = resLevels[1]?.price || (price + atr * 4);

    const risk = weightedAvg - sl;
    const rr1  = risk > 0 ? (tp1 - weightedAvg) / risk : 0;
    const rr2  = risk > 0 ? (tp2 - weightedAvg) / risk : 0;

    return {
      side: 'long',
      entries: entries.map((e, i) => ({
        label: `Buy ${i+1}`,
        price: e,
        weight: [50, 30, 20][i],
        pct: ((price - e) / price * 100).toFixed(2),
        note: supLevels[i] ? `Support (${supLevels[i].count}×)` : `ATR dip ${(1+i).toFixed(1)}×`,
      })),
      weightedAvg,
      sl, invalidation,
      tp1, tp2,
      rr1: rr1.toFixed(2), rr2: rr2.toFixed(2),
      slPct: ((weightedAvg - sl) / weightedAvg * 100).toFixed(1),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: DECISION ENGINE
// Plain-English verdict — most important panel
// Synthesizes all signals into bias + action + risk summary
// ═══════════════════════════════════════════════════════════════════
function buildDecisionVerdict(d, spikeProbData, trendState, warnings, side = 'short') {
  const price = d.price;
  const isShort = side === 'short';

  let bias = '';
  let action = '';
  let risk = '';
  let chanceSpike = '';
  let biasCls = '';

  const spikeP  = spikeProbData?.spikePct || 50;
  const dumpP   = spikeProbData?.dumpPct  || 50;
  const rsi     = d.rsi4h;
  const funding = d.funding || 0;
  const hasDangerWarning = warnings.some(w => w.cls === 'danger');
  const hasSqueezeWarning = warnings.some(w => w.type?.includes('SQUEEZE') || w.type?.includes('TRAP'));

  if (isShort) {
    // SHORT decision logic
    if (hasDangerWarning || spikeP >= 70) {
      bias   = 'Avoid Short / Reduce';
      biasCls = 'danger';
      action = `Do not enter short here. Spike probability ${spikeP}% — wait for exhaustion signal (RSI divergence, wick rejection, or funding flip to positive) before accumulating entries.`;
      risk   = 'EXTREME';
      chanceSpike = `${spikeP}%`;

    } else if (spikeP >= 55) {
      bias   = 'Hold — Wait for Better Entry';
      biasCls = 'warn';
      const sweepHigh = spikeProbData ? `${(price * (1 + parseFloat(spikeProbData.extMa7||'0') * 0.01 + 0.04)).toFixed(4)}` : 'nearby resistance';
      action = `Patience. Wait for price to spike into accumulation zone before adding. Ideal entry window higher — let the spike come to you.`;
      risk   = 'Moderate';
      chanceSpike = `${spikeP}%`;

    } else if (dumpP >= 65) {
      bias   = 'Short Bias Active';
      biasCls = 'ok';
      action = `Conditions favor short. RSI ${rsi}, dump probability ${dumpP}%. Scale in carefully. Maintain strict SL above invalidation level.`;
      risk   = 'Low–Moderate';
      chanceSpike = `${spikeP}%`;

    } else {
      bias   = 'Neutral — No Clear Edge';
      biasCls = 'neutral';
      action = 'Mixed signals. No strong conviction either way. Wait for trend state to clarify before committing capital.';
      risk   = 'Low';
      chanceSpike = `${spikeP}%`;
    }

  } else {
    // LONG decision logic
    if (d.prePumpSilence?.detected && d.bbSqueeze?.squeezing) {
      bias   = 'Long Bias — Pre-Pump Setup';
      biasCls = 'ok';
      action = `Accumulation + BB squeeze detected. Scale into longs on dips. Keep position size controlled — direction break not yet confirmed.`;
      risk   = 'Moderate';
      chanceSpike = `${spikeP}% upside`;

    } else if (spikeP >= 65 && rsi < 75) {
      bias   = 'Long — Squeeze Fuel Active';
      biasCls = 'ok';
      action = `Negative funding + OI building = squeeze fuel. Long bias while funding stays negative. Reduce if RSI breaks 78+.`;
      risk   = 'Moderate';
      chanceSpike = `${spikeP}% upside`;

    } else if (dumpP >= 65) {
      bias   = 'Avoid Long / Wait';
      biasCls = 'danger';
      action = `Distribution signals present. ${dumpP}% dump probability. Not a clean long setup. Wait for RSI reset or clear re-accumulation.`;
      risk   = 'High';
      chanceSpike = `${dumpP}% downside`;

    } else {
      bias   = 'Neutral';
      biasCls = 'neutral';
      action = 'No strong long or short conviction. Low-activity period. Best to observe.';
      risk   = 'Low';
      chanceSpike = `${spikeP}% upside`;
    }
  }

  return { bias, biasCls, action, risk, chanceSpike };
}

function calcTradeSetup(d, entryPrice = null, side = 'long', leverage = 1) {
  const price = d.price, atr = d.atr4h, klines = d.klines4h;
  if (!klines || klines.length < 20 || atr <= 0) return null;

  const highs = klines.map(k => parseFloat(k[2]));
  const lows  = klines.map(k => parseFloat(k[3]));

  const lc = [];
  for (const low of lows) {
    const ex = lc.find(c => Math.abs(c.price - low) / low < 0.02);
    if (ex) { ex.count++; ex.prices.push(low); }
    else lc.push({ price: low, count: 1, prices: [low] });
  }
  const supports = lc
    .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
    .filter(c => c.price < price * 0.999)
    .sort((a,b) => b.price - a.price);

  const hc = [];
  for (const h of highs) {
    const ex = hc.find(c => Math.abs(c.price - h) / h < 0.015);
    if (ex) { ex.count++; ex.prices.push(h); }
    else hc.push({ price: h, count: 1, prices: [h] });
  }
  const resistances = hc
    .map(c => ({ price: c.prices.reduce((a,b)=>a+b,0)/c.prices.length, count: c.count }))
    .filter(c => c.price > price * 1.001)
    .sort((a,b) => a.price - b.price);

  const em = entryPrice && entryPrice > 0 ? entryPrice : (() => {
    let el, eh;
    if (supports.length > 0 && supports[0].price > price * 0.93) {
      el = supports[0].price * 0.995; eh = supports[0].price * 1.015;
    } else {
      el = price - atr * 0.5; eh = price + atr * 0.2;
    }
    if (d.breakout?.retesting && d.breakout.level > 0) {
      el = d.breakout.level * 0.995; eh = d.breakout.level * 1.02;
    }
    return (el + eh) / 2;
  })();

  const hasRealEntry = entryPrice && entryPrice > 0;
  const lev = leverage && leverage > 1 ? leverage : 1;

  if (side === 'long') {
    let sl;
    const supBelow = supports.find(s => s.price < em * 0.99);
    if (supBelow && supBelow.count >= 2) sl = supBelow.price * 0.985;
    else sl = em - atr * 1.5;
    sl = Math.max(sl, em * 0.78);

    const slPct = (em - sl) / em * 100;
    const risk  = em - sl;

    const resAbove = resistances.filter(r => r.price > em * 1.005);
    let tp1 = resAbove.length >= 1 ? resAbove[0].price : em + risk * 1.5;
    let tp2 = resAbove.length >= 2 ? resAbove[1].price : em + risk * 3.0;
    let tp3 = resAbove.length >= 3 ? resAbove[2].price : em + risk * 5.0;

    if (tp2 <= tp1 * 1.01) tp2 = tp1 * 1.06;
    if (tp3 <= tp2 * 1.01) tp3 = tp2 * 1.15;

    const tp1Pct = (tp1 - em) / em * 100;
    const tp2Pct = (tp2 - em) / em * 100;
    const tp3Pct = (tp3 - em) / em * 100;
    const rr1 = risk > 0 ? (tp1 - em) / risk : 0;
    const rr2 = risk > 0 ? (tp2 - em) / risk : 0;
    const rr3 = risk > 0 ? (tp3 - em) / risk : 0;

    const pnlTP1 = tp1Pct * lev;
    const pnlTP2 = tp2Pct * lev;
    const pnlTP3 = tp3Pct * lev;
    const pnlSL  = -slPct  * lev;

    const currentPnl = hasRealEntry ? (price - em) / em * 100 * lev : null;

    const isGood   = rr2 >= 2.0 && slPct <= 20 && slPct >= 0.5;
    const rating   = rr2 >= 3 ? 'excellent' : rr2 >= 2 ? 'good' : rr2 >= 1.5 ? 'fair' : 'poor';
    const maxLevSafe = slPct > 0 ? Math.floor(20 / slPct) : 1;
    const levSugg  = Math.min(Math.max(maxLevSafe, 1), 20);

    return {
      side: 'long', em, sl, slPct, risk,
      tp1, tp2, tp3, tp1Pct, tp2Pct, tp3Pct,
      pnlTP1, pnlTP2, pnlTP3, pnlSL,
      rr1, rr2, rr3, lev,
      isGoodSetup: isGood, setupRating: rating,
      levSugg: `${levSugg}x – ${Math.min(levSugg+3,20)}x`,
      hasRealEntry, currentPnl,
      supports: supports.slice(0, 4),
      resistances: resAbove.slice(0, 4),
    };

  } else {
    const resAboveEntry = resistances.filter(r => r.price > em * 1.005);
    let sl;
    if (resAboveEntry.length > 0 && resAboveEntry[0].price < em * 1.20) {
      sl = resAboveEntry[0].price * 1.015;
    } else {
      sl = em + atr * 1.5;
    }
    sl = Math.min(sl, em * 1.22);

    const slPct = (sl - em) / em * 100;
    const risk  = sl - em;

    const supBelow = supports.filter(s => s.price < em * 0.995);
    let tp1 = supBelow.length >= 1 ? supBelow[0].price : em - risk * 1.5;
    let tp2 = supBelow.length >= 2 ? supBelow[1].price : em - risk * 3.0;
    let tp3 = supBelow.length >= 3 ? supBelow[2].price : em - risk * 5.0;

    if (tp2 >= tp1 * 0.99) tp2 = tp1 * 0.94;
    if (tp3 >= tp2 * 0.99) tp3 = tp2 * 0.88;
    tp3 = Math.max(tp3, em * 0.50);

    const tp1Pct = (em - tp1) / em * 100;
    const tp2Pct = (em - tp2) / em * 100;
    const tp3Pct = (em - tp3) / em * 100;
    const rr1 = risk > 0 ? (em - tp1) / risk : 0;
    const rr2 = risk > 0 ? (em - tp2) / risk : 0;
    const rr3 = risk > 0 ? (em - tp3) / risk : 0;

    const pnlTP1 = tp1Pct * lev;
    const pnlTP2 = tp2Pct * lev;
    const pnlTP3 = tp3Pct * lev;
    const pnlSL  = -slPct  * lev;

    const currentPnl = hasRealEntry ? (em - price) / em * 100 * lev : null;

    const isGood   = rr2 >= 2.0 && slPct <= 20 && slPct >= 0.5;
    const rating   = rr2 >= 3 ? 'excellent' : rr2 >= 2 ? 'good' : rr2 >= 1.5 ? 'fair' : 'poor';
    const maxLevSafe = slPct > 0 ? Math.floor(20 / slPct) : 1;
    const levSugg  = Math.min(Math.max(maxLevSafe, 1), 20);

    return {
      side: 'short', em, sl, slPct, risk,
      tp1, tp2, tp3, tp1Pct, tp2Pct, tp3Pct,
      pnlTP1, pnlTP2, pnlTP3, pnlSL,
      rr1, rr2, rr3, lev,
      isGoodSetup: isGood, setupRating: rating,
      levSugg: `${levSugg}x – ${Math.min(levSugg+3,20)}x`,
      hasRealEntry, currentPnl,
      supports: supBelow.slice(0, 4),
      resistances: resAboveEntry.slice(0, 4),
    };
  }
}
