// ═══════════════════════════════════════════════════════════════════
// ui.js — Hervin Scanner v9.2
// All UI: clock, toast, progress, log, renderResult, renderCards, renderTradeSetupHtml
// Depends on: config.js, utils.js, scoring.js
// ═══════════════════════════════════════════════════════════════════

// ── CLOCK ────────────────────────────────────────────────────────────
setInterval(()=>{
  const n=new Date();
  document.getElementById('clock').textContent=`${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}:${String(n.getUTCSeconds()).padStart(2,'0')} UTC`;
},1000);

// ── LOG ───────────────────────────────────────────────────────────────
function logMsg(msg,type=''){const el=document.getElementById('logLines');const line=document.createElement('div');line.className=`log-line ${type}`;const ts=new Date().toUTCString().slice(17,25);line.textContent=`${ts} — ${msg}`;el.appendChild(line);while(el.children.length>120)el.removeChild(el.firstChild);el.scrollTop=el.scrollHeight;}
function showLog(){document.getElementById('scanLog').classList.add('show');}
function hideLog(){document.getElementById('scanLog').classList.remove('show');}
function clearLog(){document.getElementById('logLines').innerHTML='';}

// ── TOAST ──────────────────────────────────────────────────────────────
function showToast(msg,type='',duration=2800){const el=document.getElementById('toast');el.textContent=msg;el.className=`toast show ${type}`;setTimeout(()=>el.classList.remove('show'),duration);}

// ── STATUS DOT ─────────────────────────────────────────────────────────
function setDot(state){document.getElementById('liveDot').className='live-dot '+state;}

// ── PROGRESS ───────────────────────────────────────────────────────────
function showProgress(label){document.getElementById('progressWrap').classList.add('show');document.getElementById('progressLabel').textContent=label;setProgress(0);}
function setProgress(pct){const fill=document.getElementById('progressFill'),text=document.getElementById('progressPct'),p=Math.min(100,Math.max(0,pct));fill.style.width=p+'%';text.textContent=Math.round(p)+'%';fill.className='progress-fill'+(p>=100?' done':'');}
function hideProgress(){document.getElementById('progressWrap').classList.remove('show');}

// ── STATS ──────────────────────────────────────────────────────────────
function updateStats(){const t=results.accum.length+results.pump.length+results.short.length+results.top.length;document.getElementById('stTotal').textContent=t||'—';document.getElementById('stAccum').textContent=results.accum.length||'—';document.getElementById('stPump').textContent=results.pump.length||'—';document.getElementById('stShort').textContent=results.short.length||'—';}

// ── SKELETONS ──────────────────────────────────────────────────────────
function showSkeletons(){document.getElementById('cardsGrid').innerHTML=[1,2,3].map(()=>`<div class="skel-card"><div class="skel" style="width:88px;height:40px;border-radius:6px;flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:7px;"><div class="skel" style="height:14px;width:90px;"></div><div class="skel" style="height:11px;width:150px;"></div></div></div>`).join('');}

// ── CLOSE RESULT ───────────────────────────────────────────────────────
function closeResult(){document.getElementById('resultPanel').classList.remove('show');}

// ── TRADE SETUP HTML ───────────────────────────────────────────────────
function renderTradeSetupHtml(d, sym, entryPrice = null, side = 'long', leverage = 1) {
  const setup = calcTradeSetup(d, entryPrice, side, leverage);
  if (!setup) return '';

  const isLong   = setup.side === 'long';
  const sideIcon = isLong ? '📈' : '📉';
  const sideClr  = isLong ? 'var(--g)' : 'var(--r)';
  const sideLbl  = isLong ? 'LONG' : 'SHORT';
  const rrLabel  = `RR 1:${setup.rr2.toFixed(1)} ${setup.rr2 >= 2 ? '✅' : '⚠'}`;
  const hb       = setup.isGoodSetup ? '' : 'no-setup';
  const rc       = { excellent:'var(--g)', good:'var(--b)', fair:'var(--a)', poor:'var(--r)' }[setup.setupRating];

  const maxPct = setup.tp3Pct || 1;
  const t1w = Math.max(5, Math.round(setup.tp1Pct / maxPct * 100));
  const t2w = Math.max(10, Math.round(setup.tp2Pct / maxPct * 100));

  const currentPnlHtml = setup.currentPnl !== null ? (() => {
    const cls = setup.currentPnl >= 0 ? 'green' : 'red';
    const dist = isLong
      ? (d.price > setup.em ? `+${((d.price-setup.em)/setup.em*100).toFixed(2)}% dari entry` : `-${((setup.em-d.price)/setup.em*100).toFixed(2)}% dari entry`)
      : (d.price < setup.em ? `+${((setup.em-d.price)/setup.em*100).toFixed(2)}% dari entry` : `-${((d.price-setup.em)/setup.em*100).toFixed(2)}% dari entry`);
    return `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r8);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted);margin-bottom:3px;">Current PnL (${setup.lev}× lev)</div>
        <div style="font-family:var(--mono);font-size:1.1rem;font-weight:700;color:var(--${cls});">${setup.currentPnl>=0?'+':''}${setup.currentPnl.toFixed(2)}%</div>
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--faint);">${dist}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.66rem;color:var(--muted);margin-bottom:3px;">Harga sekarang</div>
        <div style="font-family:var(--mono);font-size:0.85rem;font-weight:600;">$${fmt(d.price,6)}</div>
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--faint);">Entry: $${fmt(setup.em,6)}</div>
      </div>
    </div>`;
  })() : '';

  const tpColor = ['var(--g)', 'var(--b)', 'var(--a)'];
  const tpRows = [
    { tag:'TP1', price:setup.tp1, pct:setup.tp1Pct, pnl:setup.pnlTP1, w:t1w, cls:'', rr:setup.rr1 },
    { tag:'TP2', price:setup.tp2, pct:setup.tp2Pct, pnl:setup.pnlTP2, w:t2w, cls:'tp2', rr:setup.rr2 },
    { tag:'TP3', price:setup.tp3, pct:setup.tp3Pct, pnl:setup.pnlTP3, w:100, cls:'tp3', rr:setup.rr3 },
  ].map((tp,i) => `
    <div class="tp-level">
      <span class="tp-level-tag">${tp.tag}</span>
      <div class="tp-bar-wrap"><div class="tp-bar-fill ${tp.cls}" style="width:${tp.w}%"></div></div>
      <span class="tp-level-price" style="color:${tpColor[i]}">$${fmt(tp.price, 5)}</span>
      <span style="font-family:var(--mono);font-size:0.65rem;color:${tpColor[i]};min-width:40px;text-align:right;">${isLong?'+':'−'}${tp.pct.toFixed(1)}%</span>
      ${setup.lev > 1 ? `<span style="font-family:var(--mono);font-size:0.65rem;color:${tpColor[i]};min-width:52px;text-align:right;font-weight:700;">${tp.pnl>=0?'+':''}${tp.pnl.toFixed(1)}% lev</span>` : ''}
      <span style="font-family:var(--mono);font-size:0.6rem;color:var(--faint);min-width:38px;text-align:right;">RR 1:${tp.rr.toFixed(1)}</span>
    </div>`).join('');

  const keyLevelsHtml = (() => {
    if (!setup.resistances.length && !setup.supports.length) return '';
    const resRows = setup.resistances.slice(0,3).map(r =>
      `<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.68rem;padding:3px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--r);">↑ Resistance (${r.count}×)</span>
        <span style="font-weight:600;">$${fmt(r.price,5)}</span>
        <span style="color:var(--muted);">${isLong?'+':'-'}${Math.abs((r.price-setup.em)/setup.em*100).toFixed(1)}%</span>
      </div>`).join('');
    const supRows = setup.supports.slice(0,3).map(s =>
      `<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.68rem;padding:3px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--g);">↓ Support (${s.count}×)</span>
        <span style="font-weight:600;">$${fmt(s.price,5)}</span>
        <span style="color:var(--muted);">-${Math.abs((s.price-setup.em)/setup.em*100).toFixed(1)}%</span>
      </div>`).join('');
    return `<div>
      <div style="font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted);margin-bottom:6px;">Key Levels dari Chart</div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r8);padding:8px 12px;">
        ${resRows}${supRows}
      </div>
    </div>`;
  })();

  return `
  <div class="trade-setup ${hb}" style="border-color:${isLong?'var(--g-border)':'var(--r-border)'};">
    <div class="trade-setup-head" style="background:${sideClr};">
      <span class="trade-setup-head-title">${sideIcon} Trade Setup — ${sideLbl} ${sym}/USDT${setup.lev>1?` ${setup.lev}×`:''}</span>
      <span class="trade-setup-rr">${rrLabel}</span>
    </div>
    <div class="trade-setup-body">
      ${currentPnlHtml}
      <div class="setup-row">
        <span class="setup-row-label">Entry</span>
        <span class="setup-price">$${fmt(setup.em,6)}</span>
        <span class="setup-note" style="color:${setup.hasRealEntry?'var(--g)':'var(--muted)'};">${setup.hasRealEntry?'✅ Dari posisi lo':'⚡ Estimasi market'}</span>
      </div>
      <div class="setup-row">
        <span class="setup-row-label">Stop Loss</span>
        <span class="setup-price" style="color:var(--r);">$${fmt(setup.sl,5)}</span>
        <span class="setup-pct red">-${setup.slPct.toFixed(1)}%${setup.lev>1?` / -${(setup.slPct*setup.lev).toFixed(1)}% lev`:''}</span>
        <span class="setup-note">❌ Invalidasi setup</span>
      </div>
      <div>
        <div class="setup-row" style="margin-bottom:8px;">
          <span class="setup-row-label">Take Profit</span>
          <span style="font-size:0.7rem;color:var(--muted);">TP1 50% → TP2 30% → TP3 20%${setup.lev>1?` (${setup.lev}× leverage)`:''}</span>
        </div>
        <div class="tp-levels">${tpRows}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <div class="metric" style="flex:1;min-width:90px;"><div class="metric-l">Quality</div><div class="metric-v" style="color:${rc};text-transform:capitalize;">${setup.setupRating}</div></div>
        <div class="metric" style="flex:1;min-width:90px;"><div class="metric-l">Lev Saran</div><div class="metric-v amber">${setup.levSugg}</div></div>
        <div class="metric" style="flex:1;min-width:90px;"><div class="metric-l">Best RR</div><div class="metric-v ${setup.rr2>=2?'green':'red'}">1:${setup.rr2.toFixed(1)}</div></div>
        <div class="metric" style="flex:1;min-width:90px;"><div class="metric-l">Max Profit</div><div class="metric-v green">+${setup.pnlTP3.toFixed(1)}%</div></div>
      </div>
      ${keyLevelsHtml}
      <div class="possize-wrap">
        <div class="possize-title">💰 Position Size Calculator</div>
        <div class="possize-row">
          <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap;">Modal (USDT)</span>
          <input class="possize-input" id="psCapital" type="number" placeholder="e.g. 100"
            oninput="calcPosSize('${sym}',${setup.em},${setup.sl},'${setup.side}',${setup.lev})">
          <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap;">Risk %</span>
          <input class="possize-input" id="psRisk" type="number" placeholder="1–3" value="2" style="width:70px"
            oninput="calcPosSize('${sym}',${setup.em},${setup.sl},'${setup.side}',${setup.lev})">
        </div>
        <div class="possize-result" id="psResult" style="display:none">
          <div class="possize-stat"><div class="possize-stat-l">Position Size</div><div class="possize-stat-v" id="psSize">—</div></div>
          <div class="possize-stat"><div class="possize-stat-l">Max Loss</div><div class="possize-stat-v" id="psLoss" style="color:var(--r)">—</div></div>
          <div class="possize-stat"><div class="possize-stat-l">Profit @ TP2</div><div class="possize-stat-v" id="psProfit" style="color:var(--g)">—</div></div>
        </div>
      </div>
      ${!setup.isGoodSetup ? `<div style="font-size:0.78rem;color:var(--a);background:var(--a-bg);border:1px solid var(--a-border);border-radius:var(--r8);padding:10px 14px;">⚠ Setup kurang ideal (RR ${setup.rr2.toFixed(1)}x) — pertimbangkan adjust entry lebih rendah</div>` : ''}
    </div>
  </div>`;
}

function calcPosSize(sym, em, sl, side='long', lev=1) {
  const cap = parseFloat(document.getElementById('psCapital')?.value) || 0;
  const rp  = parseFloat(document.getElementById('psRisk')?.value) || 2;
  if (cap <= 0) return;
  const riskAmt = cap * rp / 100;
  const slDist  = Math.abs(em - sl) / em;
  if (slDist <= 0) return;
  const posSize = riskAmt / slDist;
  document.getElementById('psResult').style.display = 'grid';
  document.getElementById('psSize').textContent  = `$${posSize.toFixed(2)}`;
  document.getElementById('psLoss').textContent  = `-$${riskAmt.toFixed(2)}`;
  document.getElementById('psProfit').textContent = `+$${(riskAmt * 2).toFixed(2)}`;
}

// ── RENDER RESULT PANEL ────────────────────────────────────────────
function renderResult(sym, d, scoreData, smartSignals=[], entryPrice=null, side='long', leverage=1) {
  document.getElementById('rpSym').textContent=`${sym}/USDT`;
  document.getElementById('rpPrice').textContent=`$${fmt(d.price,6)}`;
  const chart=`https://www.tradingview.com/chart/?symbol=BINANCE:${sym}USDT.P`;

  // ── v9.3 SPIKE RISK DASHBOARD (renders first) ──────────────────
  const spikeRiskHtml = renderSpikeRiskDashboard(d, side);


  const metricsHtml=`<div class="metrics">
    <div class="metric"><div class="metric-l">Price 24H</div><div class="metric-v ${d.gain24h>=0?'green':'red'}">${fmtPct(d.gain24h)}</div></div>
    <div class="metric"><div class="metric-l">RSI 4H</div><div class="metric-v ${d.rsi4h>70?'red':d.rsi4h<35?'green':''}">${d.rsi4h}</div></div>
    <div class="metric"><div class="metric-l">Vol 14D/30D</div><div class="metric-v ${d.volRatio>=2?'green':''}">${d.volRatio.toFixed(2)}x</div></div>
    <div class="metric"><div class="metric-l">Price 7D</div><div class="metric-v ${d.priceChg7d>=0?'green':'red'}">${fmtPct(d.priceChg7d)}</div></div>
    <div class="metric">
      <div class="metric-l">Funding (now)</div>
      <div class="metric-v ${d.funding!==null&&d.funding<THRESHOLDS.FUNDING_NEG?'blue':d.funding!==null&&d.funding>THRESHOLDS.FUNDING_POS?'red':''}">${d.funding!==null?(d.funding>=0?'+':'')+d.funding.toFixed(4)+'%':'N/A'}</div>
      ${d.fundingHist?`<div class="metric-sub">3D avg: ${d.fundingHist.avg3d.toFixed(4)}% (${d.fundingHist.negCount}/9 neg)</div>`:''}
    </div>
    <div class="metric"><div class="metric-l">OI Change</div><div class="metric-v ${d.oiChange>5?'green':d.oiChange<-5?'red':''}">${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%</div></div>
    <div class="metric"><div class="metric-l">Bid Depth</div><div class="metric-v ${d.bids>=THRESHOLDS.BID_DEPTH_STRONG?'green':d.bids<THRESHOLDS.BID_DEPTH_OK?'red':''}">$${(d.bids/1000).toFixed(0)}K</div></div>
    <div class="metric"><div class="metric-l">MACD Hist</div><div class="metric-v ${d.macd&&d.macd.hist>0?'green':'red'}">${d.macd?(d.macd.hist>=0?'+':'')+d.macd.hist.toFixed(4):'N/A'}</div></div>
    <div class="metric">
      <div class="metric-l">BB Width</div>
      <div class="metric-v ${d.bbSqueeze?.squeezing?'blue':d.bbSqueeze?.expanding?'amber':''}">${d.bb?d.bb.width.toFixed(1)+'%':'N/A'}</div>
      ${d.bbSqueeze?`<div class="metric-sub">${d.bbSqueeze.squeezing?'🔲 SQUEEZING':d.bbSqueeze.expanding?'📈 EXPANDING':'stable'} (p${d.bbSqueeze.percentile})</div>`:''}
    </div>
  </div>`;

  let fundingTrendHtml = '';
  if(d.fundingHist && d.fundingHist.rates.length>0) {
    const rates = d.fundingHist.rates;
    const maxAbs = Math.max(...rates.map(r=>Math.abs(r)),0.01);
    const bars = rates.map(r=>{
      const h = Math.max(4,Math.round(Math.abs(r)/maxAbs*20));
      const cls = r<0?'neg':r>0?'pos':'zero';
      return `<div class="ft-bar ${cls}" style="height:${h}px;" title="${r>=0?'+':''}${r.toFixed(4)}%"></div>`;
    }).join('');
    const streakTxt = d.fundingHist.currentNegStreak>0 ? `<span style="color:var(--b);font-weight:700;">${d.fundingHist.currentNegStreak} periods neg berturut</span>` : `<span style="color:var(--r);">funding positif — shorts berkurang</span>`;
    const trendArr = d.fundingHist.trend < -0.005 ? '↘ makin negatif' : d.fundingHist.trend > 0.005 ? '↗ makin positif' : '→ stabil';
    fundingTrendHtml = `<div>
      <div class="sec-label">📊 Funding Rate Trend (3 Hari)</div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r8);padding:12px 14px;">
        <div style="display:flex;align-items:flex-end;gap:3px;margin-bottom:8px;">
          <div class="funding-trend">${bars}</div>
          <div style="font-family:var(--mono);font-size:0.65rem;color:var(--muted);margin-left:8px;line-height:1.4;">
            <div style="color:var(--b);">■ negatif = squeeze fuel</div>
            <div style="color:var(--r);">■ positif = longs paying</div>
          </div>
        </div>
        <div style="font-size:0.75rem;display:flex;gap:12px;flex-wrap:wrap;">
          <span>Trend: <strong>${trendArr}</strong></span>
          <span>${streakTxt}</span>
          <span>Avg 3D: <strong style="color:${d.fundingHist.avg3d<0?'var(--b)':'var(--r)'}">${d.fundingHist.avg3d>=0?'+':''}${d.fundingHist.avg3d.toFixed(4)}%</strong></span>
        </div>
        ${d.fundingHist.currentNegStreak>=5?`<div class="signal-row info" style="margin-top:8px;font-size:0.78rem;"><span>🔥</span><span>Funding negatif ${d.fundingHist.currentNegStreak} periode berturut — SHORT SQUEEZE PRESSURE TINGGI, mirip setup HYPER sebelum pump</span></div>`:''}
      </div>
    </div>`;
  }

  let rvolHtml = '';
  if(d.rvolData) {
    const rv = d.rvolData;
    const barMax = rv.chartMax || 1;
    const bars24 = rv.chart24h.map((v,i)=>{
      const h = Math.max(2,Math.round(v/barMax*36));
      const isCurrent = i===rv.chart24h.length-1;
      const color = isCurrent
        ? (rv.isSpike?'var(--r)':rv.isRising?'var(--g)':'var(--muted)')
        : (v>rv.avg7HourVol*2?'var(--a)':v>rv.avg7HourVol*1.3?'var(--g-border)':'var(--border2)');
      return `<div class="rvol-bar ${isCurrent?'current':'historical'}" style="height:${h}px;background:${color};" title="${isCurrent?'Current hour':''}${fmtVol(v)}"></div>`;
    }).join('');
    const rvolCls = rv.rvolVsAvg>=3?'red':rv.rvolVsAvg>=1.5?'green':'';
    rvolHtml = `<div class="rvol-wrap">
      <div class="rvol-title">⏱ Relative Volume / Hour (vs 7-Day Avg)</div>
      <div class="rvol-bars">${bars24}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
        <div class="metric-v ${rvolCls}" style="font-size:0.85rem;">${rv.rvolVsAvg.toFixed(1)}× avg</div>
        <div style="font-size:0.75rem;color:var(--muted);">vs yesterday: ${rv.rvolVsYest.toFixed(1)}× | accel: ${rv.volAccel.toFixed(1)}×</div>
        ${rv.isSpike?`<span class="tag r">🔥 VOLUME SPIKE</span>`:''}
        ${rv.isAccelerating&&!rv.isSpike?`<span class="tag g">↑ Accelerating</span>`:''}
      </div>
    </div>`;
  }

  let squeezeHtml = '';
  if(d.squeezeMap && d.squeezeMap.oiUSD > 0) {
    const sm = d.squeezeMap;
    const levels = sm.levels.map(l=>{
      const barW = sm.maxUsd>0?Math.round(l.usd/sm.maxUsd*100):0;
      const barColor = l.pct<=10?'var(--a)':'var(--r)';
      return `<div class="squeeze-level">
        <span class="squeeze-pct-label">${l.label}</span>
        <div class="squeeze-bar-wrap"><div class="squeeze-bar-fill" style="width:${barW}%;background:${barColor}"></div></div>
        <span class="squeeze-usd" style="color:${barColor}">${fmtK(l.usd)}</span>
      </div>`;
    }).join('');
    squeezeHtml = `<div class="squeeze-meter">
      <div class="squeeze-title">💣 Short Squeeze Pressure Map</div>
      <div style="font-family:var(--mono);font-size:0.68rem;color:var(--muted);margin-bottom:8px;">OI: ${fmtVol(sm.oiUSD)} | Est. short exposure: ${fmtVol(sm.estimatedShortUSD)} (${Math.round(sm.shortBias*100)}%)</div>
      <div class="squeeze-levels">${levels}</div>
      ${sm.estimatedShortUSD>1e6?`<div style="font-size:0.72rem;color:var(--muted);margin-top:8px;">Estimasi berdasarkan OI + funding bias.</div>`:''}
    </div>`;
  }

  let bbSqueezeHtml = '';
  if(d.bbSqueeze) {
    const bs=d.bbSqueeze;
    const cls = bs.squeezing?'coiling':bs.expanding?'expanding':'';
    const gaugeW = Math.round((100-bs.percentile));
    const gaugeColor = bs.squeezing?'var(--b)':bs.expanding?'var(--r)':'var(--muted)';
    const statusText = bs.squeezing&&bs.extremeNarrow ? '🔲 EXTREME SQUEEZE — meledak segera' : bs.squeezing ? '🔲 Squeezing — akumulasi energi' : bs.expanding ? '📈 Expanding — pump/dump sudah berjalan' : '→ Normal';
    bbSqueezeHtml = `<div class="bb-squeeze ${cls}">
      <div class="bb-gauge"><div class="bb-gauge-fill" style="width:${gaugeW}%;background:${gaugeColor}"></div></div>
      <div class="bb-squeeze-text">
        <div style="font-weight:600;font-size:0.78rem;">${statusText}</div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">Width: ${bs.widthNow.toFixed(1)}% (hist. percentile: ${bs.percentile}%)</div>
      </div>
    </div>`;
  }

  const silenceHtml = d.prePumpSilence&&d.prePumpSilence.score>=2?`<div>
    <div class="sec-label">🤫 Pre-Pump Silence Analysis</div>
    <div class="signals-list">${d.prePumpSilence.signals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>
  </div>`:'';

  const candleHtml = d.candlePatterns&&d.candlePatterns.length>0?`<div>
    <div class="sec-label">🕯 Candlestick Patterns (1D)</div>
    <div class="signals-list">${d.candlePatterns.map(p=>`<div class="signal-row ${p.contextValid?'bear':'warn'}"><span style="flex-shrink:0">◈</span><span>${p.text}</span></div>`).join('')}</div>
  </div>`:'';

  const checkHtml=`<div class="checklist">${scoreData.checks.map(c=>`<div class="check-row ${c.pass?'pass':c.fail?'fail':'warn'}"><span class="check-icon">${c.pass?'✓':c.fail?'✗':'⚠'}</span><span>${c.text}</span></div>`).join('')}</div>`;

  const smartHtml = smartSignals.length>0?`<div>
    <div class="sec-label">Smart Signals</div>
    <div class="signals-list">${smartSignals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''} ${s.isBear?'bear':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>
  </div>`:'';

  const bo=d.breakout,tfc=d.tfConfluence;
  const pumpSetupHtml = (bo||tfc)?`<div>
    <div class="sec-label">🚀 Pump Setup Analysis</div>
    ${bo?`<div style="margin-bottom:10px;">
      <div style="font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--faint);margin-bottom:6px;">Breakout Detection</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">
        <div class="metric"><div class="metric-l">Status</div><div class="metric-v ${bo.broke?'green':bo.consolidating?'amber':''}">${bo.broke?(bo.retesting?'RETEST':'BROKE'):bo.consolidating?'COILING':'RANGING'}</div></div>
        <div class="metric"><div class="metric-l">Key Level</div><div class="metric-v">$${fmt(bo.level,5)}</div></div>
        <div class="metric"><div class="metric-l">Dist</div><div class="metric-v ${bo.breakoutPct>0?'green':'red'}">${bo.breakoutPct>=0?'+':''}${bo.breakoutPct.toFixed(1)}%</div></div>
      </div>
      <div class="signals-list">${bo.signals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>
    </div>`:''}
    ${tfc?`<div>
      <div style="font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--faint);margin-bottom:6px;">Timeframe Confluence</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">
        <div class="metric"><div class="metric-l">1H</div><div class="metric-v ${tfc.tf.h1?.trend==='bullish'?'green':'red'}">${tfc.tf.h1?.trend?.toUpperCase()||'N/A'}</div></div>
        <div class="metric"><div class="metric-l">4H</div><div class="metric-v ${tfc.tf.h4?.trend==='bullish'?'green':'red'}">${tfc.tf.h4?.trend?.toUpperCase()||'N/A'}</div></div>
        <div class="metric"><div class="metric-l">1D</div><div class="metric-v ${tfc.tf.d1?.trend==='bullish'?'green':'red'}">${tfc.tf.d1?.trend?.toUpperCase()||'N/A'}</div></div>
      </div>
      <div style="margin-bottom:8px;"><div class="score-section"><span class="score-label" style="font-size:0.72rem;">Confluence</span><div class="score-track"><div class="score-fill ${tfc.score>=5?'high':tfc.score>=3?'mid':'low'}" style="width:${Math.round(tfc.score/6*100)}%"></div></div><span class="score-val">${tfc.score}/6${tfc.aligned?' 🎯':''}</span></div></div>
      <div class="signals-list">${tfc.signals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>
    </div>`:''}
  </div>`:'';

  const scoreHtml=`<div class="score-section"><span class="score-label">Score</span><div class="score-track"><div class="score-fill ${scoreData.cls}" style="width:${scoreData.pct}%"></div></div><span class="score-val">${scoreData.score}/${scoreData.max}</span></div>`;
  const verdictHtml=`<div class="verdict ${scoreData.verdict.cls}">${scoreData.verdict.text}</div>`;
  const tradeHtml=renderTradeSetupHtml(d,sym,entryPrice,side,leverage);

  document.getElementById('rpBody').innerHTML =
    spikeRiskHtml +
    metricsHtml + fundingTrendHtml + rvolHtml + squeezeHtml + bbSqueezeHtml +
    silenceHtml + candleHtml + checkHtml + smartHtml + pumpSetupHtml +
    scoreHtml + verdictHtml + tradeHtml +
    `<a class="chart-link" href="${chart}" target="_blank">↗ Open in TradingView</a>`;

  document.getElementById('resultPanel').classList.add('show');
}

// ── RENDER CARDS ────────────────────────────────────────────────────
function renderCards(){
  const all=[...results.accum.map(r=>({...r,_type:'ACCUM'})),...results.pump.map(r=>({...r,_type:'PUMP'})),...results.short.map(r=>({...r,_type:'SHORT'})),...results.top.map(r=>({...r,_type:'TOP'}))];
  const grid=document.getElementById('cardsGrid');
  if(all.length===0&&!scanning){grid.innerHTML=`<div class="empty"><div class="empty-icon">◎</div><div class="empty-msg">No signals found</div><div class="empty-sub">Try a scan mode above</div></div>`;document.getElementById('sectionCount').textContent='';return;}
  all.sort((a,b)=>(b.scorePct||0)-(a.scorePct||0));
  document.getElementById('sectionCount').textContent=`${all.length} result${all.length!==1?'s':''}`;
  const pm={ACCUM:['pill-accum','Accum'],PUMP:['pill-pump','Pump 24H'],SHORT:['pill-short','Short'],TOP:['pill-top','Top']};
  const fc=pct=>pct>=70?'var(--g)':pct>=40?'var(--a)':'var(--r)';
  grid.innerHTML=all.map((r,i)=>{
    const[pc,pl]=pm[r._type]||['pill-top',r._type];
    const pct=r.scorePct||0,chart=`https://www.tradingview.com/chart/?symbol=BINANCE:${r.sym}USDT.P`;
    const hd=r.data&&r.scoreData;
    const th=(r.tags||[]).map(t=>`<span class="tag ${t.cls}">${t.label}</span>`).join('');
    const sl=r.scoreMax&&r.scoreMax<=18&&typeof r.score==='number'?`<span style="font-family:var(--mono);font-size:0.63rem;color:var(--muted)">${r.score}/${r.scoreMax}</span>`:'';
    return `<div class="card" style="animation-delay:${Math.min(i*0.035,1)}s">
      <div class="card-type">
        <span class="pill ${pc}">${pl}</span>
        <div class="card-mini-bar"><div class="card-mini-fill" style="width:${pct}%;background:${fc(pct)}"></div></div>
        ${sl}
      </div>
      <div class="card-body">
        <div class="card-sym">${r.sym}/USDT</div>
        <div class="card-tags">${th}</div>
      </div>
      <div class="card-right">
        <span class="card-price">$${fmt(r.price,5)}</span>
        ${r.data?.oiChange!==undefined?`<span class="card-oi">OI ${r.data.oiChange>=0?'+':''}${r.data.oiChange.toFixed(1)}%</span>`:''}
        <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap;justify-content:flex-end;">
          ${hd?`<button class="btn-sm" onclick="showDetail(${i})">Detail</button>`:''}
          <a class="btn-sm" href="${chart}" target="_blank">Chart ↗</a>
        </div>
      </div>
    </div>`;
  }).join('');
  window._scanResults=all;
}

function showDetail(idx){
  const r=window._scanResults?.[idx];
  if(!r||!r.data||!r.scoreData)return;
  const side=r._type==='SHORT'?'short':'long';
  renderResult(r.sym,r.data,r.scoreData,r.signals||[],null,side,1);
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: SPIKE RISK DASHBOARD RENDERER
// Renders interpretation-first dashboard BEFORE raw metrics
// Order: Decision → Risk Score → Spike Probs → Ladder → Warnings →
//        Trend State → Sweep → MM Trap → S/R Map → raw metrics
// ═══════════════════════════════════════════════════════════════════
function renderSpikeRiskDashboard(d, side = 'short') {
  const isShort = side === 'short';

  // ── Run all engines ──────────────────────────────────────────────
  const spikeProbData = calcSpikeProbability(d);
  const trendState    = detectTrendState(d);
  const sweepData     = detectLiquiditySweep(d);
  const mmTrap        = detectMMTrap(d);
  const srMap         = buildSRMap(d);
  const warnings      = detectSqueezeWarnings(d);
  const ladder        = calcAccumulationLadder(d, side);
  const decision      = buildDecisionVerdict(d, spikeProbData, trendState, warnings, side);

  if (!spikeProbData) return '';

  const price = d.price;

  // ── 1. DECISION PANEL ────────────────────────────────────────────
  const decisionHtml = `
  <div>
    <div class="srd-section-label">🎯 Decision</div>
    <div class="srd-decision">
      <div class="srd-decision-head ${decision.biasCls}">
        <span class="srd-bias">Current Bias: ${decision.bias}</span>
        <span class="srd-risk-badge">Risk: ${decision.risk}</span>
      </div>
      <div class="srd-decision-body">
        <div class="srd-action">${decision.action}</div>
        <div class="srd-meta">
          <span class="srd-meta-item">Trend: <strong>${trendState?.state || '—'}</strong></span>
          <span class="srd-meta-item">Spike Chance: <strong style="color:var(--r)">${decision.chanceSpike}</strong></span>
          <span class="srd-meta-item">Side: <strong>${side.toUpperCase()}</strong></span>
        </div>
      </div>
    </div>
  </div>`;

  // ── 2. SHORT RISK SCORE ─────────────────────────────────────────
  const rs = spikeProbData.shortRiskScore;
  const rsClass = rs >= 65 ? 'high' : rs >= 40 ? 'medium' : 'low';
  const rsStatus = rs >= 65 ? 'High Squeeze Risk — Dangerous for Shorts'
    : rs >= 40 ? 'Moderate Risk — Trade with Caution'
    : 'Low Risk — Conditions Acceptable';
  const riskScoreHtml = `
  <div>
    <div class="srd-section-label">🌡️ Short Risk Score</div>
    <div class="srd-risk-score">
      <div class="srd-score-row">
        <div>
          <div class="srd-score-num ${rsClass}">${rs}</div>
          <div class="srd-score-label" style="color:var(--muted);font-size:0.62rem;">/100</div>
        </div>
        <div class="srd-score-track">
          <div class="srd-score-fill ${rsClass}" style="width:${rs}%"></div>
        </div>
      </div>
      <div class="srd-score-status">${rsStatus}</div>
    </div>
  </div>`;

  // ── 3. SPIKE / DUMP PROBABILITY ──────────────────────────────────
  const spikeH = Math.max(10, Math.round(spikeProbData.spikePct * 0.48));
  const dumpH  = Math.max(10, Math.round(spikeProbData.dumpPct  * 0.48));
  const probHtml = `
  <div>
    <div class="srd-section-label">📊 Spike / Dump Probability</div>
    <div class="srd-prob">
      <div class="srd-prob-label">
        <div>
          <div class="srd-prob-pct spike">${spikeProbData.spikePct}%</div>
          <div class="srd-prob-name">Further Spike</div>
        </div>
        <div style="text-align:right">
          <div class="srd-prob-pct dump">${spikeProbData.dumpPct}%</div>
          <div class="srd-prob-name" style="text-align:right">Dump / Reversal</div>
        </div>
      </div>
      <div class="srd-prob-bars">
        <div class="srd-prob-bar-wrap">
          <div class="srd-prob-bar-fill spike" style="height:${spikeH}px"></div>
        </div>
        <div class="srd-prob-bar-wrap">
          <div class="srd-prob-bar-fill dump"  style="height:${dumpH}px"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span class="srd-status-pill ${spikeProbData.statusCls}">${spikeProbData.status}</span>
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--muted);">
          MA ext: 7D ${spikeProbData.extMa7}% | 25D ${spikeProbData.extMa25}% | 99D ${spikeProbData.extMa99}%
        </span>
      </div>
    </div>
  </div>`;

  // ── 4. ACCUMULATION LADDER ───────────────────────────────────────
  let ladderHtml = '';
  if (ladder) {
    const entryRows = ladder.entries.map(e => `
      <div class="srd-entry-row ${side}">
        <span class="srd-entry-label">${e.label}</span>
        <span class="srd-entry-price">$${fmt(e.price, 5)}</span>
        <span class="srd-entry-pct ${side}">${isShort ? '+' : '-'}${e.pct}%</span>
        <span class="srd-entry-weight">${e.weight}%</span>
        <span class="srd-entry-note">${e.note}</span>
      </div>`).join('');

    ladderHtml = `
    <div>
      <div class="srd-section-label">${isShort ? '📉' : '📈'} ${isShort ? 'Short' : 'Long'} Accumulation Ladder</div>
      <div class="srd-ladder">
        <div class="srd-ladder-head">
          <span class="srd-ladder-title">${isShort ? '3-Zone Short Entry' : '3-Zone Long Entry'}</span>
          <span class="srd-ladder-avg">Weighted Avg: $${fmt(ladder.weightedAvg, 5)}</span>
        </div>
        <div class="srd-ladder-body">${entryRows}</div>
        <div class="srd-ladder-footer">
          <div class="srd-ladder-stat">
            <div class="srd-ladder-stat-l">Stop Loss</div>
            <div class="srd-ladder-stat-v" style="color:var(--r);">$${fmt(ladder.sl, 5)}</div>
          </div>
          <div class="srd-ladder-stat">
            <div class="srd-ladder-stat-l">SL Distance</div>
            <div class="srd-ladder-stat-v" style="color:var(--r);">${ladder.slPct}%</div>
          </div>
          <div class="srd-ladder-stat">
            <div class="srd-ladder-stat-l">TP1 / RR</div>
            <div class="srd-ladder-stat-v" style="color:var(--g);">$${fmt(ladder.tp1, 5)} <span style="font-size:0.65rem;color:var(--muted)">1:${ladder.rr1}</span></div>
          </div>
          <div class="srd-ladder-stat">
            <div class="srd-ladder-stat-l">TP2 / RR</div>
            <div class="srd-ladder-stat-v" style="color:var(--g);">$${fmt(ladder.tp2, 5)} <span style="font-size:0.65rem;color:var(--muted)">1:${ladder.rr2}</span></div>
          </div>
          <div class="srd-ladder-stat">
            <div class="srd-ladder-stat-l">Invalidation</div>
            <div class="srd-ladder-stat-v" style="color:var(--a);">$${fmt(ladder.invalidation, 5)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── 5. SQUEEZE WARNINGS ─────────────────────────────────────────
  let warningsHtml = '';
  if (warnings.length > 0) {
    warningsHtml = `
    <div>
      <div class="srd-section-label">⚠️ Active Trigger Warnings</div>
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${warnings.map(w => `
          <div class="srd-warning ${w.cls}">
            <span class="srd-warning-icon">${w.icon}</span>
            <div class="srd-warning-body">
              <div class="srd-warning-type">${w.type}</div>
              <div class="srd-warning-desc">${w.desc}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // ── 6. TREND STATE ───────────────────────────────────────────────
  let trendHtml = '';
  if (trendState) {
    trendHtml = `
    <div>
      <div class="srd-section-label">📈 Market State</div>
      <div class="srd-trend">
        <div>
          <div class="srd-trend-state ${trendState.color}">${trendState.state}</div>
          <div class="srd-trend-conf">Conf: ${trendState.confidence}%</div>
          <div class="srd-conf-bar"><div class="srd-conf-fill" style="width:${trendState.confidence}%;background:var(--${trendState.color === 'red' ? 'r' : trendState.color === 'amber' ? 'a' : trendState.color === 'blue' ? 'b' : 'g'})"></div></div>
        </div>
        <div class="srd-trend-desc">${trendState.description}</div>
      </div>
    </div>`;
  }

  // ── 7. LIQUIDITY SWEEP ───────────────────────────────────────────
  let sweepHtml = '';
  if (sweepData && sweepData.sweepZoneLow) {
    sweepHtml = `
    <div>
      <div class="srd-section-label">💧 Liquidity Sweep Zone</div>
      <div class="srd-sweep">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--b);margin-bottom:6px;">Likely Sweep Target</div>
        <div class="srd-sweep-zone">
          <span class="srd-sweep-range">${fmt(sweepData.sweepZoneLow, 5)} – ${fmt(sweepData.sweepZoneHigh, 5)}</span>
          <span class="srd-sweep-prob">${sweepData.sweepProb}% prob</span>
        </div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.5;margin-top:4px;">
          Orderbook: <strong>${sweepData.imbalanceSide}</strong> (bid/ask ${sweepData.bidAskRatio})
          ${sweepData.clusters.length > 0 ? ` · ${sweepData.clusters.length} wick cluster${sweepData.clusters.length>1?'s':''} detected` : ''}
          ${sweepData.roundLevels.length > 0 ? ` · Round number magnet: $${sweepData.roundLevels.map(l=>fmt(l,4)).join(', ')}` : ''}
        </div>
      </div>
    </div>`;
  }

  // ── 8. MM TRAP DETECTOR ─────────────────────────────────────────
  let mmHtml = '';
  if (mmTrap) {
    const mmColor = mmTrap.trapType === 'Genuine Breakout' ? 'var(--r)'
      : mmTrap.trapType === 'Liquidation Cascade' ? 'var(--g)'
      : mmTrap.trapType === 'Stop-Hunt Wick' ? 'var(--g)'
      : 'var(--muted)';
    mmHtml = `
    <div>
      <div class="srd-section-label">🎭 Market Maker Trap Detector</div>
      <div class="srd-mm">
        <div>
          <div class="srd-mm-type" style="color:${mmColor}">${mmTrap.trapType}</div>
          <div class="srd-mm-conf">Confidence: ${mmTrap.trapConf}% · Wick ratio: ${mmTrap.wickRatio}×</div>
        </div>
        <div class="srd-mm-desc">${mmTrap.trapDesc}</div>
      </div>
    </div>`;
  }

  // ── 9. S/R MAP ──────────────────────────────────────────────────
  let srHtml = '';
  if (srMap) {
    const resRows = srMap.resistances.slice(0,4).map(r => `
      <div class="srd-sr-level">
        <span class="srd-sr-price" style="color:var(--r)">$${fmt(r.price,5)}</span>
        <span class="srd-sr-dist">+${((r.price-price)/price*100).toFixed(1)}%</span>
        <span class="srd-sr-cnt">${r.count}×</span>
      </div>`).join('') || '<div style="font-size:0.72rem;color:var(--faint)">No resistance above</div>';

    const supRows = srMap.supports.slice(0,4).map(s => `
      <div class="srd-sr-level">
        <span class="srd-sr-price" style="color:var(--g)">$${fmt(s.price,5)}</span>
        <span class="srd-sr-dist">-${((price-s.price)/price*100).toFixed(1)}%</span>
        <span class="srd-sr-cnt">${s.count}×</span>
      </div>`).join('') || '<div style="font-size:0.72rem;color:var(--faint)">No support below</div>';

    srHtml = `
    <div>
      <div class="srd-section-label">🗺️ Dynamic S/R Map</div>
      <div class="srd-sr-map">
        <div class="srd-sr-col">
          <div class="srd-sr-col-title res">↑ Resistance</div>
          ${resRows}
        </div>
        <div class="srd-sr-col">
          <div class="srd-sr-col-title sup">↓ Support</div>
          ${supRows}
        </div>
      </div>
      ${srMap.spikeTargets.length > 0 ? `
      <div style="margin-top:10px;background:var(--r-bg);border:1px solid var(--r-border);border-radius:var(--r8);padding:8px 12px;">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--r);margin-bottom:5px;">Spike Targets</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${srMap.spikeTargets.map(t=>`<span style="font-family:var(--mono);font-size:0.75rem;color:var(--r);font-weight:600;">${t.label}: $${fmt(t.price,5)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
  }

  // ── Assemble full dashboard ──────────────────────────────────────
  return `
  <div style="display:flex;flex-direction:column;gap:14px;padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">
    ${decisionHtml}
    ${riskScoreHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${probHtml}
      ${trendHtml || '<div></div>'}
    </div>
    ${warningsHtml}
    ${ladderHtml}
    ${sweepHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${mmHtml || '<div></div>'}
      <div></div>
    </div>
    ${srHtml}
    <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--faint);padding-top:4px;">▼ Raw Metrics & Indicators</div>
  </div>`;
}
