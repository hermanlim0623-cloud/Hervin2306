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
function updateStats(){const t=results.accum.length+results.pump.length+results.short.length+results.top.length+results.whale.length;document.getElementById('stTotal').textContent=t||'—';document.getElementById('stAccum').textContent=results.accum.length||'—';document.getElementById('stPump').textContent=results.pump.length||'—';document.getElementById('stShort').textContent=results.short.length||'—';}

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

// ── RENDER RESULT PANEL — TABBED REDESIGN ─────────────────────────
function renderResult(sym, d, scoreData, smartSignals=[], entryPrice=null, side='long', leverage=1, tradeSignal=null, whaleData=null) {
  window._lastViewedData = d;
  const chart = `https://www.tradingview.com/chart/?symbol=BINANCE:${sym}USDT.P`;

  // ── Pre-compute all engines ─────────────────────────────────────
  const spikeProbData = calcSpikeProbability(d);
  const trendState    = detectTrendState(d);
  const sweepData     = detectLiquiditySweep(d);
  const mmTrap        = detectMMTrap(d);
  const srMap         = buildSRMap(d);
  const warnings      = detectSqueezeWarnings(d);
  const ladder        = calcAccumulationLadder(d, side);
  const decision      = spikeProbData ? buildDecisionVerdict(d, spikeProbData, trendState, warnings, side) : null;
  const isShort       = side === 'short';

  // ── HEAD: sym + price + score + verdict ────────────────────────
  document.getElementById('rpSym').textContent   = '';
  document.getElementById('rpPrice').textContent = '';
  const scoreClsMap = {high:'high',mid:'mid',low:'low'};
  const scoreCls = scoreClsMap[scoreData.cls] || 'low';

  // Build header
  const rpHead = document.querySelector('.rp-head');
  rpHead.innerHTML = `
    <div class="rp-head-left">
      <span class="rp-sym">${sym}/USDT</span>
      <span class="rp-price">$${fmt(d.price,6)}</span>
    </div>
    <span class="rp-score-pill ${scoreCls}">${scoreData.score}/${scoreData.max}</span>
    <span class="rp-verdict-pill ${scoreData.verdict.cls}">${scoreData.verdict.cls==='strong'?'STRONG':scoreData.verdict.cls==='medium'?'WATCH':'SKIP'}</span>
    <button class="btn-close" onclick="closeResult()">✕</button>`;

  // ── TAB 1: OVERVIEW ─────────────────────────────────────────────
  // Hero metrics: 4 most important numbers
  const heroHtml = `<div class="ov-hero">
    <div class="ov-metric">
      <div class="ov-label">RSI 4H</div>
      <div class="ov-value ${d.rsi4h>70?'red':d.rsi4h<35?'green':''}">${d.rsi4h}</div>
      <div class="ov-sub">${d.rsi4h>70?'Overbought':d.rsi4h<35?'Oversold':'Neutral'}</div>
    </div>
    <div class="ov-metric">
      <div class="ov-label">Gain 24H</div>
      <div class="ov-value ${d.gain24h>=0?'green':'red'}">${fmtPct(d.gain24h)}</div>
      <div class="ov-sub">7D: ${fmtPct(d.priceChg7d)}</div>
    </div>
    <div class="ov-metric">
      <div class="ov-label">Funding</div>
      <div class="ov-value ${d.funding!==null&&d.funding<-0.01?'blue':d.funding!==null&&d.funding>0.05?'red':''}">${d.funding!==null?(d.funding>=0?'+':'')+d.funding.toFixed(4)+'%':'N/A'}</div>
      ${d.fundingHist?`<div class="ov-sub">avg3D: ${d.fundingHist.avg3d.toFixed(4)}%</div>`:'<div class="ov-sub">—</div>'}
    </div>
    <div class="ov-metric">
      <div class="ov-label">OI Change</div>
      <div class="ov-value ${d.oiChange>5?'green':d.oiChange<-5?'red':''}">${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%</div>
      <div class="ov-sub">Vol ${d.volRatio.toFixed(1)}×</div>
    </div>
  </div>`;

  // Score bar
  const scoreHtml = `<div class="ov-score-row">
    <div class="ov-score-num ${scoreCls}">${scoreData.score}</div>
    <div class="ov-score-right">
      <div class="ov-score-bar"><div class="ov-score-fill ${scoreCls}" style="width:${scoreData.pct}%"></div></div>
      <div class="ov-verdict-text" style="color:var(--${scoreCls==='high'?'g':scoreCls==='mid'?'a':'r'})">${scoreData.verdict.text}</div>
    </div>
    <div style="font-family:var(--mono);font-size:0.7rem;color:var(--muted);white-space:nowrap;">${scoreData.score}/${scoreData.max}</div>
  </div>`;

  // Decision panel
  let decisionHtml = '';
  if(decision) {
    decisionHtml = `<div class="ov-decision">
      <div class="ov-decision-head ${decision.biasCls}">
        <span class="ov-bias">Current Bias: ${decision.bias}</span>
        <span class="ov-risk">Risk: ${decision.risk}</span>
      </div>
      <div class="ov-decision-body">
        <div class="ov-action">${decision.action}</div>
        <div class="ov-meta">
          <span class="ov-meta-item">Trend: <strong>${trendState?.state||'—'}</strong></span>
          <span class="ov-meta-item">Spike: <strong style="color:var(--r)">${decision.chanceSpike}</strong></span>
          <span class="ov-meta-item">Side: <strong>${side.toUpperCase()}</strong></span>
        </div>
      </div>
    </div>`;
  }

  // Trade signal card
  let signalHtml = '';
  const sig = tradeSignal;
  if(sig) {
    const isLong = sig.side==='long';
    const gradeClr = sig.grade==='A'?'var(--g)':sig.grade==='B'?'var(--b)':sig.grade==='C'?'var(--a)':'var(--muted)';
    signalHtml = `<div class="ov-signal-card">
      <div class="ov-signal-head ${sig.side}">
        <span class="ov-signal-title ${sig.side}">${isLong?'📈 LONG SIGNAL':'📉 SHORT SIGNAL'} — ${sig.confidence}% confidence</span>
        <span class="ov-signal-grade" style="color:${gradeClr}">${sig.grade}</span>
      </div>
      <div class="ov-signal-body">
        <div class="ov-signal-grid">
          <div class="ov-signal-cell"><div class="ov-signal-cell-label">Entry</div><div class="ov-signal-cell-val">$${fmt(sig.entry,5)}</div></div>
          <div class="ov-signal-cell"><div class="ov-signal-cell-label">Stop Loss</div><div class="ov-signal-cell-val" style="color:var(--r)">$${fmt(sig.sl,5)}</div></div>
          <div class="ov-signal-cell"><div class="ov-signal-cell-label">TP1</div><div class="ov-signal-cell-val" style="color:var(--g)">$${fmt(sig.tp1,5)}</div></div>
          <div class="ov-signal-cell"><div class="ov-signal-cell-label">RR</div><div class="ov-signal-cell-val" style="color:var(--b)">1:${typeof sig.rr==='number'?sig.rr.toFixed(1):sig.rr}</div></div>
        </div>
        ${sig.reasons.length>0?`<div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;">
          ${sig.reasons.slice(0,3).map(r=>`<div style="font-size:0.72rem;color:var(--muted);display:flex;gap:6px;"><span style="color:${isLong?'var(--g)':'var(--r)'};flex-shrink:0;">◈</span><span>${r}</span></div>`).join('')}
        </div>`:''}
      </div>
    </div>`;
  }

  // Warnings compact
  let warningsHtml = '';
  if(warnings.length>0) {
    warningsHtml = `<div class="ov-warnings">
      ${warnings.map(w=>`<div class="ov-warn-row ${w.cls}">
        <span class="ov-warn-icon">${w.icon}</span>
        <div class="ov-warn-body">
          <div class="ov-warn-type">${w.type}</div>
          <div class="ov-warn-desc">${w.desc}</div>
        </div>
      </div>`).join('')}
    </div>`;
  }

  const tab1 = heroHtml + scoreHtml + decisionHtml + signalHtml + warningsHtml +
    `<a class="chart-link" href="${chart}" target="_blank">↗ Open in TradingView</a>`;

  // ── TAB 2: ANALYSIS ─────────────────────────────────────────────
  const metricsHtml = `<div class="metrics">
    <div class="metric"><div class="metric-l">Price 24H</div><div class="metric-v ${d.gain24h>=0?'green':'red'}">${fmtPct(d.gain24h)}</div></div>
    <div class="metric"><div class="metric-l">RSI 4H</div><div class="metric-v ${d.rsi4h>70?'red':d.rsi4h<35?'green':''}">${d.rsi4h}</div></div>
    <div class="metric"><div class="metric-l">Vol 14D/30D</div><div class="metric-v ${d.volRatio>=2?'green':''}">${d.volRatio.toFixed(2)}×</div></div>
    <div class="metric"><div class="metric-l">Price 7D</div><div class="metric-v ${d.priceChg7d>=0?'green':'red'}">${fmtPct(d.priceChg7d)}</div></div>
    <div class="metric">
      <div class="metric-l">Funding (now)</div>
      <div class="metric-v ${d.funding!==null&&d.funding<-0.01?'blue':d.funding!==null&&d.funding>0.05?'red':''}">${d.funding!==null?(d.funding>=0?'+':'')+d.funding.toFixed(4)+'%':'N/A'}</div>
      ${d.fundingHist?`<div class="metric-sub">3D avg: ${d.fundingHist.avg3d.toFixed(4)}% (${d.fundingHist.negCount}/9 neg)</div>`:''}
    </div>
    <div class="metric"><div class="metric-l">OI Change</div><div class="metric-v ${d.oiChange>5?'green':d.oiChange<-5?'red':''}">${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%</div></div>
    <div class="metric"><div class="metric-l">Bid Depth</div><div class="metric-v ${d.bids>=150000?'green':d.bids<50000?'red':''}">$${(d.bids/1000).toFixed(0)}K</div></div>
    <div class="metric"><div class="metric-l">MACD Hist</div><div class="metric-v ${d.macd&&d.macd.hist>0?'green':'red'}">${d.macd?(d.macd.hist>=0?'+':'')+d.macd.hist.toFixed(4):'N/A'}</div></div>
    <div class="metric">
      <div class="metric-l">BB Width</div>
      <div class="metric-v ${d.bbSqueeze?.squeezing?'blue':d.bbSqueeze?.expanding?'amber':''}">${d.bb?d.bb.width.toFixed(1)+'%':'N/A'}</div>
      ${d.bbSqueeze?`<div class="metric-sub">${d.bbSqueeze.squeezing?'SQUEEZING':d.bbSqueeze.expanding?'EXPANDING':'stable'} (p${d.bbSqueeze.percentile})</div>`:''}
    </div>
  </div>`;

  // Funding trend
  let fundingTrendHtml = '';
  if(d.fundingHist&&d.fundingHist.rates) {
    const rates=d.fundingHist.rates;
    const maxR=Math.max(...rates.map(Math.abs),0.01);
    const bars=rates.map(r=>{const h=Math.max(2,Math.round(Math.abs(r)/maxR*16));const cls=r<0?'neg':r>0?'pos':'zero';return`<div class="ft-bar ${cls}" style="height:${h}px"></div>`;}).join('');
    const negS=d.fundingHist.currentNegStreak;
    fundingTrendHtml = `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r8);padding:9px 11px;">
      <div class="sec-label">Funding Rate Trend (3 hari)</div>
      <div style="display:flex;align-items:flex-end;gap:12px;">
        <div class="funding-trend">${bars}</div>
        <div style="font-size:0.68rem;color:var(--muted);flex:1;">
          <span style="color:var(--b);font-weight:700">■</span> negatif = squeeze fuel &nbsp;
          <span style="color:var(--r);font-weight:700">■</span> positif = longs paying
        </div>
      </div>
      <div style="font-family:var(--mono);font-size:0.68rem;color:var(--muted);margin-top:5px;">
        Trend: <strong>${d.fundingHist.avg3d<0?'↗ makin positif':'↘ makin negatif'}</strong>
        ${negS>=3?`&nbsp;· <span style="color:var(--b)">${negS} periods neg berturut</span>`:''}
        &nbsp;· Avg 3D: <strong>${d.fundingHist.avg3d.toFixed(4)}%</strong>
      </div>
      ${negS>=4?`<div style="margin-top:6px;padding:6px 9px;background:var(--b-bg);border:1px solid var(--b-border);border-radius:5px;font-size:0.7rem;color:var(--b);">🔥 Funding negatif ${negS} periode berturut — SHORT SQUEEZE PRESSURE TINGGI</div>`:''}
    </div>`;
  }

  // RVOL
  let rvolHtml = '';
  if(d.rvolData) {
    const rv=d.rvolData;const barMax=rv.chartMax||1;
    const bars=rv.chart24h.map((v,i)=>{const h=Math.max(2,Math.round(v/barMax*28));const isCur=i===rv.chart24h.length-1;const color=isCur?(rv.isSpike?'var(--r)':rv.isRising?'var(--g)':'var(--muted)'):(v>rv.avg7HourVol*2?'var(--a)':v>rv.avg7HourVol*1.3?'var(--g-border)':'var(--border2)');return`<div class="rvol-bar ${isCur?'current':'historical'}" style="height:${h}px;background:${color};"></div>`;}).join('');
    rvolHtml = `<div class="rvol-wrap">
      <div class="rvol-title">⏱ Relative Volume / Hour (vs 7-Day Avg)</div>
      <div class="rvol-bars">${bars}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;align-items:center;">
        <span class="metric-v ${rv.rvolVsAvg>=3?'red':rv.rvolVsAvg>=1.5?'green':''}" style="font-size:0.82rem;">${rv.rvolVsAvg.toFixed(1)}× avg</span>
        <span style="font-size:0.7rem;color:var(--muted);">vs yesterday: ${rv.rvolVsYest.toFixed(1)}× · accel: ${rv.volAccel.toFixed(1)}×</span>
        ${rv.isSpike?`<span class="tag r">🔥 VOLUME SPIKE</span>`:''}
        ${rv.isAccelerating&&!rv.isSpike?`<span class="tag g">↑ Accelerating</span>`:''}
      </div>
    </div>`;
  }

  // BB squeeze
  let bbHtml = '';
  if(d.bbSqueeze) {
    const bs=d.bbSqueeze;const cls=bs.squeezing?'coiling':bs.expanding?'expanding':'';
    const gW=Math.round(100-bs.percentile);const gC=bs.squeezing?'var(--b)':bs.expanding?'var(--r)':'var(--muted)';
    const stxt=bs.squeezing&&bs.extremeNarrow?'🔲 EXTREME SQUEEZE — meledak segera':bs.squeezing?'🔲 Squeezing — akumulasi energi':bs.expanding?'📈 Expanding — pump/dump sudah berjalan':'→ Normal';
    bbHtml = `<div class="bb-squeeze ${cls}">
      <div class="bb-gauge"><div class="bb-gauge-fill" style="width:${gW}%;background:${gC}"></div></div>
      <div class="bb-squeeze-text"><strong>${stxt}</strong><div style="font-size:0.64rem;color:var(--muted);margin-top:1px;">Width: ${bs.widthNow.toFixed(1)}% (hist. p${bs.percentile})</div></div>
    </div>`;
  }

  // Checklist in collapsible
  const checkHtml = `<div class="an-section">
    <div class="an-section-head" onclick="toggleAnSection(this)">
      <span class="an-section-title">Score Checklist</span>
      <span class="an-section-arrow">▼</span>
    </div>
    <div class="an-section-body">
      <div class="checklist">${scoreData.checks.map(c=>`<div class="check-row ${c.pass?'pass':c.fail?'fail':'warn'}"><span class="check-icon">${c.pass?'✓':c.fail?'✗':'⚠'}</span><span>${c.text}</span></div>`).join('')}</div>
    </div>
  </div>`;

  // Smart signals collapsible
  let smartHtml = '';
  if(smartSignals.length>0) {
    smartHtml = `<div class="an-section">
      <div class="an-section-head open" onclick="toggleAnSection(this)">
        <span class="an-section-title">Smart Signals</span>
        <span class="an-section-arrow open">▼</span>
      </div>
      <div class="an-section-body open">
        <div class="signals-list">${smartSignals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''} ${s.isBear?'bear':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>
      </div>
    </div>`;
  }

  // Candle patterns + silence
  let patternsHtml = '';
  const hasPatterns = (d.candlePatterns&&d.candlePatterns.length>0)||(d.prePumpSilence&&d.prePumpSilence.score>=2);
  if(hasPatterns) {
    patternsHtml = `<div class="an-section">
      <div class="an-section-head" onclick="toggleAnSection(this)">
        <span class="an-section-title">Patterns & Silence</span>
        <span class="an-section-arrow">▼</span>
      </div>
      <div class="an-section-body">
        ${d.candlePatterns&&d.candlePatterns.length>0?`<div class="signals-list">${d.candlePatterns.map(p=>`<div class="signal-row ${p.contextValid?'bear':'warn'}"><span style="flex-shrink:0">◈</span><span>${p.text}</span></div>`).join('')}</div>`:''}
        ${d.prePumpSilence&&d.prePumpSilence.score>=2?`<div class="signals-list">${d.prePumpSilence.signals.map(s=>`<div class="signal-row ${s.strength!=='strong'?'warn':''}"><span style="flex-shrink:0">◈</span><span>${s.text}</span></div>`).join('')}</div>`:''}
      </div>
    </div>`;
  }

  // Breakout + TFC collapsible
  const bo=d.breakout,tfc=d.tfConfluence;
  let brkHtml = '';
  if(bo||tfc) {
    brkHtml = `<div class="an-section">
      <div class="an-section-head" onclick="toggleAnSection(this)">
        <span class="an-section-title">Breakout & TF Confluence</span>
        <span class="an-section-arrow">▼</span>
      </div>
      <div class="an-section-body">
        ${bo?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px;">
          <div class="metric"><div class="metric-l">Status</div><div class="metric-v ${bo.broke?'green':bo.consolidating?'amber':''}">${bo.broke?(bo.retesting?'RETEST':'BROKE'):bo.consolidating?'COILING':'RANGING'}</div></div>
          <div class="metric"><div class="metric-l">Key Level</div><div class="metric-v">$${fmt(bo.level,5)}</div></div>
          <div class="metric"><div class="metric-l">Dist</div><div class="metric-v ${bo.breakoutPct>0?'green':'red'}">${bo.breakoutPct>=0?'+':''}${bo.breakoutPct.toFixed(1)}%</div></div>
        </div>`:''}
        ${tfc?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">
          <div class="metric"><div class="metric-l">1H</div><div class="metric-v ${tfc.tf.h1?.trend==='bullish'?'green':'red'}">${tfc.tf.h1?.trend?.toUpperCase()||'N/A'}</div></div>
          <div class="metric"><div class="metric-l">4H</div><div class="metric-v ${tfc.tf.h4?.trend==='bullish'?'green':'red'}">${tfc.tf.h4?.trend?.toUpperCase()||'N/A'}</div></div>
          <div class="metric"><div class="metric-l">1D</div><div class="metric-v ${tfc.tf.d1?.trend==='bullish'?'green':'red'}">${tfc.tf.d1?.trend?.toUpperCase()||'N/A'}</div></div>
        </div>`:''}
      </div>
    </div>`;
  }

  // SR Map
  let srHtml = '';
  if(srMap) {
    const price=d.price;
    const resRows=srMap.resistances.slice(0,4).map(r=>`<div class="srd-sr-level"><span class="srd-sr-price" style="color:var(--r)">$${fmt(r.price,5)}</span><span class="srd-sr-dist">+${((r.price-price)/price*100).toFixed(1)}%</span><span class="srd-sr-cnt">${r.count}×</span></div>`).join('')||'<div style="font-size:0.7rem;color:var(--faint)">None</div>';
    const supRows=srMap.supports.slice(0,4).map(s=>`<div class="srd-sr-level"><span class="srd-sr-price" style="color:var(--g)">$${fmt(s.price,5)}</span><span class="srd-sr-dist">-${((price-s.price)/price*100).toFixed(1)}%</span><span class="srd-sr-cnt">${s.count}×</span></div>`).join('')||'<div style="font-size:0.7rem;color:var(--faint)">None</div>';
    srHtml = `<div class="srd-sr-map">${['<div class="srd-sr-col"><div class="srd-sr-col-title res">↑ Resistance</div>'+resRows+'</div>','<div class="srd-sr-col"><div class="srd-sr-col-title sup">↓ Support</div>'+supRows+'</div>'].join('')}</div>`;
  }

  const tab2 = metricsHtml + fundingTrendHtml + rvolHtml + bbHtml + srHtml + smartHtml + patternsHtml + brkHtml + checkHtml;

  // ── TAB 3: TRADE ────────────────────────────────────────────────
  const tradeSetupHtml = renderTradeSetupHtml(d, sym, entryPrice, side, leverage);

  // Ladder
  let ladderHtml = '';
  if(ladder) {
    const entryRows=ladder.entries.map(e=>`<div class="srd-entry-row ${side}"><span class="srd-entry-label">${e.label}</span><span class="srd-entry-price">$${fmt(e.price,5)}</span><span class="srd-entry-pct ${side}">${isShort?'+':'-'}${e.pct}%</span><span class="srd-entry-weight">${e.weight}%</span><span class="srd-entry-note">${e.note}</span></div>`).join('');
    ladderHtml = `<div class="srd-ladder">
      <div class="srd-ladder-head"><span class="srd-ladder-title">${isShort?'📉 Short':'📈 Long'} Accumulation Ladder</span><span class="srd-ladder-avg">Weighted Avg: $${fmt(ladder.weightedAvg,5)}</span></div>
      <div class="srd-ladder-body">${entryRows}</div>
      <div class="srd-ladder-footer">
        <div class="srd-ladder-stat"><div class="srd-ladder-stat-l">Stop Loss</div><div class="srd-ladder-stat-v" style="color:var(--r)">$${fmt(ladder.sl,5)}</div></div>
        <div class="srd-ladder-stat"><div class="srd-ladder-stat-l">SL Dist</div><div class="srd-ladder-stat-v" style="color:var(--r)">${ladder.slPct}%</div></div>
        <div class="srd-ladder-stat"><div class="srd-ladder-stat-l">TP1 / RR</div><div class="srd-ladder-stat-v" style="color:var(--g)">$${fmt(ladder.tp1,5)} <span style="font-size:0.6rem;color:var(--muted)">1:${ladder.rr1}</span></div></div>
        <div class="srd-ladder-stat"><div class="srd-ladder-stat-l">TP2 / RR</div><div class="srd-ladder-stat-v" style="color:var(--g)">$${fmt(ladder.tp2,5)} <span style="font-size:0.6rem;color:var(--muted)">1:${ladder.rr2}</span></div></div>
        <div class="srd-ladder-stat"><div class="srd-ladder-stat-l">Invalidation</div><div class="srd-ladder-stat-v" style="color:var(--a)">$${fmt(ladder.invalidation,5)}</div></div>
      </div>
    </div>`;
  }

  const tab3 = tradeSetupHtml + ladderHtml;

  // ── TAB 4: ADVANCED ─────────────────────────────────────────────
  // Whale detail
  let whaleHtml = '';
  if(whaleData) {
    const ws=whaleData;const sw=Math.round(ws.score);
    const barC=sw>=75?'linear-gradient(90deg,#3b5bdb,#4c6ef5)':sw>=55?'linear-gradient(90deg,var(--g),#2d9b5a)':'linear-gradient(90deg,var(--a),#c47a00)';
    whaleHtml = `<div class="whale-header">
      <div class="whale-top">
        <div><div class="whale-title">🐋 Whale Accumulation</div><div class="whale-phase">${ws.phase}</div></div>
        <div class="whale-score">${sw}<span style="font-size:0.6rem;color:var(--muted);font-weight:400;">/100</span></div>
      </div>
      <div class="whale-score-bar"><div class="whale-score-fill" style="width:${sw}%;background:${barC}"></div></div>
      <div class="whale-signals">${ws.signals.map(s=>`<div class="whale-sig-row ${s.strength}"><span style="flex-shrink:0">${s.icon}</span><span>${s.text}</span></div>`).join('')}</div>
    </div>`;
  }

  // Short risk score
  let riskScoreHtml = '';
  if(spikeProbData) {
    const rs=spikeProbData.shortRiskScore;const rsC=rs>=65?'high':rs>=40?'medium':'low';
    const rsT=rs>=65?'High Squeeze Risk — Dangerous for Shorts':rs>=40?'Moderate Risk — Trade with Caution':'Low Risk — Conditions Acceptable';
    riskScoreHtml = `<div class="srd-risk-score">
      <div>
        <div class="srd-score-num ${rsC}">${rs}</div>
        <div style="font-size:0.6rem;color:var(--muted)">/100</div>
      </div>
      <div class="srd-score-right">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Short Risk Score</div>
        <div class="srd-score-track"><div class="srd-score-fill ${rsC}" style="width:${rs}%"></div></div>
        <div class="srd-score-status">${rsT}</div>
      </div>
    </div>`;
  }

  // Spike/dump prob
  let probHtml = '';
  if(spikeProbData) {
    const sp=spikeProbData;const sH=Math.max(8,Math.round(sp.spikePct*0.36));const dH=Math.max(8,Math.round(sp.dumpPct*0.36));
    probHtml = `<div class="srd-prob">
      <div class="srd-prob-header">
        <div><div class="srd-prob-pct spike">${sp.spikePct}%</div><div class="srd-prob-name">Further Spike</div></div>
        <div style="text-align:right"><div class="srd-prob-pct dump">${sp.dumpPct}%</div><div class="srd-prob-name" style="text-align:right">Dump/Reversal</div></div>
      </div>
      <div class="srd-prob-bars">
        <div class="srd-prob-bar-wrap"><div class="srd-prob-bar-fill spike" style="height:${sH}px"></div></div>
        <div class="srd-prob-bar-wrap"><div class="srd-prob-bar-fill dump" style="height:${dH}px"></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <span class="srd-status-pill ${sp.statusCls}">${sp.status}</span>
        <span style="font-family:var(--mono);font-size:0.62rem;color:var(--muted)">MA ext: 7D ${sp.extMa7}% | 25D ${sp.extMa25}% | 99D ${sp.extMa99}%</span>
      </div>
    </div>`;
  }

  // Trend + MM + Sweep in compact row
  let advRowHtml = '';
  if(trendState||mmTrap||sweepData?.sweepZoneLow) {
    const tCard=trendState?`<div class="adv-card"><div class="adv-card-title">Market State</div><div class="adv-card-main" style="color:var(--${trendState.color==='red'?'r':trendState.color==='amber'?'a':trendState.color==='blue'?'b':'g'})">${trendState.state}</div><div class="adv-card-sub">${trendState.description} (conf: ${trendState.confidence}%)</div></div>`:'';
    const mmCard=mmTrap?`<div class="adv-card"><div class="adv-card-title">MM Trap</div><div class="adv-card-main">${mmTrap.trapType}</div><div class="adv-card-sub">${mmTrap.trapDesc}</div></div>`:'';
    const swCard=sweepData?.sweepZoneLow?`<div class="adv-card"><div class="adv-card-title">Liquidity Sweep</div><div class="adv-card-main" style="color:var(--b)">$${fmt(sweepData.sweepZoneLow,5)} – $${fmt(sweepData.sweepZoneHigh,5)}</div><div class="adv-card-sub">${sweepData.sweepProb}% prob · ${sweepData.imbalanceSide}</div></div>`:'';
    advRowHtml = `<div class="adv-row">${tCard}${mmCard}${swCard}</div>`;
  }

  // Squeeze pressure map
  let sqMapHtml = '';
  if(d.squeezeMap&&d.squeezeMap.oiUSD>0) {
    const sm=d.squeezeMap;
    const levels=sm.levels.map(l=>{const bW=sm.maxUsd>0?Math.round(l.usd/sm.maxUsd*100):0;const bC=l.pct<=10?'var(--a)':'var(--r)';return`<div class="squeeze-level"><span class="squeeze-pct-label">${l.label}</span><div class="squeeze-bar-wrap"><div class="squeeze-bar-fill" style="width:${bW}%;background:${bC}"></div></div><span class="squeeze-usd" style="color:${bC}">${fmtK(l.usd)}</span></div>`;}).join('');
    sqMapHtml = `<div class="squeeze-meter"><div class="squeeze-title">💣 Short Squeeze Pressure — OI: ${fmtVol(sm.oiUSD)} | Est. short: ${fmtVol(sm.estimatedShortUSD)}</div><div class="squeeze-levels">${levels}</div></div>`;
  }

  const tab4 = whaleHtml + riskScoreHtml + probHtml + advRowHtml + sqMapHtml;

  // ── ASSEMBLE ─────────────────────────────────────────────────────
  document.getElementById('rpBody').innerHTML = `
    <div class="rp-tabs">
      <button class="rp-tab active" onclick="switchTab(this,'tab-overview')">Overview</button>
      <button class="rp-tab" onclick="switchTab(this,'tab-analysis')">Analysis</button>
      <button class="rp-tab" onclick="switchTab(this,'tab-trade')">Trade Setup</button>
      <button class="rp-tab" onclick="switchTab(this,'tab-advanced')">Advanced</button>
    </div>
    <div id="tab-overview" class="rp-tab-pane active">${tab1}</div>
    <div id="tab-analysis" class="rp-tab-pane">${tab2}</div>
    <div id="tab-trade"    class="rp-tab-pane">${tab3}</div>
    <div id="tab-advanced" class="rp-tab-pane">${tab4}</div>`;

  document.getElementById('resultPanel').classList.add('show');
}

// Tab switcher
function switchTab(btn, paneId) {
  document.querySelectorAll('.rp-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.rp-tab-pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(paneId)?.classList.add('active');
}

// Collapsible section toggle
function toggleAnSection(head) {
  const arrow = head.querySelector('.an-section-arrow');
  const body  = head.nextElementSibling;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
  head.classList.toggle('open', !isOpen);
}


// ── RENDER CARDS ────────────────────────────────────────────────────
function renderCards(){
  const all=[...results.accum.map(r=>({...r,_type:'ACCUM'})),...results.pump.map(r=>({...r,_type:'PUMP'})),...results.short.map(r=>({...r,_type:'SHORT'})),...results.top.map(r=>({...r,_type:'TOP'})),...results.whale.map(r=>({...r,_type:'WHALE'}))];
  const grid=document.getElementById('cardsGrid');
  if(all.length===0&&!scanning){grid.innerHTML=`<div class="empty"><div class="empty-icon">◎</div><div class="empty-msg">No signals found</div><div class="empty-sub">Try a scan mode above</div></div>`;document.getElementById('sectionCount').textContent='';document.getElementById('filterBar').style.display='none';return;}
  all.sort((a,b)=>(b.scorePct||0)-(a.scorePct||0));
  document.getElementById('sectionCount').textContent=`${all.length} result${all.length!==1?'s':''}`;

  // Show filter bar
  const fb = document.getElementById('filterBar');
  if (fb && all.length > 0) fb.style.display = 'flex';

  const pm={ACCUM:['pill-accum','Accum'],PUMP:['pill-pump','Pump 24H'],SHORT:['pill-short','Short'],TOP:['pill-top','Top'],WHALE:['pill-whale','🐋 Whale']};
  const fc=pct=>pct>=70?'var(--g)':pct>=40?'var(--a)':'var(--r)';
  grid.innerHTML=all.map((r,i)=>{
    const[pc,pl]=pm[r._type]||['pill-top',r._type];
    const pct=r.scorePct||0,chart=`https://www.tradingview.com/chart/?symbol=BINANCE:${r.sym}USDT.P`;
    const hd=r.data&&r.scoreData;
    const th=(r.tags||[]).map(t=>`<span class="tag ${t.cls}">${t.label}</span>`).join('');
    const sl=r.scoreMax&&r.scoreMax<=18&&typeof r.score==='number'?`<span style="font-family:var(--mono);font-size:0.63rem;color:var(--muted)">${r.score}/${r.scoreMax}</span>`:'';
    // Trade signal badge
    const sig = r.tradeSignal;
    const sigBadge = sig ? `<span class="signal-badge ${sig.side}${sig.confidence>=80?' high':''}">${sig.side==='long'?'📈 LONG':'📉 SHORT'} ${sig.confidence}% <span class="sig-grade">${sig.grade}</span></span>` : '';
    return `<div class="card" style="animation-delay:${Math.min(i*0.035,1)}s">
      <div class="card-type">
        <span class="pill ${pc}">${pl}</span>
        <div class="card-mini-bar"><div class="card-mini-fill" style="width:${pct}%;background:${fc(pct)}"></div></div>
        ${sl}
      </div>
      <div class="card-body">
        <div class="card-sym">${r.sym}/USDT ${sigBadge}</div>
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
  window._filteredResults=all;
}

function showDetail(idx){
  const r=window._scanResults?.[idx];
  if(!r||!r.data||!r.scoreData)return;
  const side=r._type==='SHORT'?'short':'long';
  renderResult(r.sym,r.data,r.scoreData,r.signals||[],null,side,1,r.tradeSignal||null,r.whaleData||null);
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════════
// v9.3: SPIKE RISK DASHBOARD RENDERER
// Renders interpretation-first dashboard BEFORE raw metrics
// Order: Decision → Risk Score → Spike Probs → Ladder → Warnings →
//        Trend State → Sweep → MM Trap → S/R Map → raw metrics
// ═══════════════════════════════════════════════════════════════════
function renderSpikeRiskDashboard(d, side = 'short', tradeSignal = null, whaleData = null) {
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

  // ── 0. TRADE SIGNAL SUMMARY (top of all) ────────────────────────
  let signalSummaryHtml = '';
  const sig = tradeSignal;
  if (sig) {
    const isLong = sig.side === 'long';
    const sigClr  = isLong ? 'var(--g)' : 'var(--r)';
    const sigBg   = isLong ? 'var(--g-bg)' : 'var(--r-bg)';
    const sigBdr  = isLong ? 'var(--g-border)' : 'var(--r-border)';
    const gradeClr = sig.grade === 'A' ? 'var(--g)' : sig.grade === 'B' ? 'var(--b)' : sig.grade === 'C' ? 'var(--a)' : 'var(--muted)';
    signalSummaryHtml = `
    <div style="background:${sigBg};border:2px solid ${sigBdr};border-radius:var(--r12);padding:14px 18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.3rem;">${isLong ? '📈' : '📉'}</span>
          <div>
            <div style="font-size:0.95rem;font-weight:800;color:${sigClr};">${isLong ? 'LONG SIGNAL' : 'SHORT SIGNAL'}</div>
            <div style="font-family:var(--mono);font-size:0.68rem;color:var(--muted);">Confidence: <strong style="color:${sigClr}">${sig.confidence}%</strong></div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--mono);font-size:1.5rem;font-weight:800;color:${gradeClr};line-height:1;">${sig.grade}</div>
          <div style="font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Grade</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r8);padding:7px 10px;">
          <div style="font-size:0.6rem;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Entry</div>
          <div style="font-family:var(--mono);font-size:0.78rem;font-weight:700;">$${fmt(sig.entry,5)}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r8);padding:7px 10px;">
          <div style="font-size:0.6rem;color:var(--r);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Stop Loss</div>
          <div style="font-family:var(--mono);font-size:0.78rem;font-weight:700;color:var(--r);">$${fmt(sig.sl,5)}</div>
          <div style="font-size:0.6rem;color:var(--muted);">${sig.slPct}%</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r8);padding:7px 10px;">
          <div style="font-size:0.6rem;color:var(--g);font-weight:700;text-transform:uppercase;margin-bottom:3px;">TP1</div>
          <div style="font-family:var(--mono);font-size:0.78rem;font-weight:700;color:var(--g);">$${fmt(sig.tp1,5)}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r8);padding:7px 10px;">
          <div style="font-size:0.6rem;color:var(--b);font-weight:700;text-transform:uppercase;margin-bottom:3px;">TP2 / RR</div>
          <div style="font-family:var(--mono);font-size:0.78rem;font-weight:700;color:var(--b);">$${fmt(sig.tp2,5)}</div>
          <div style="font-size:0.6rem;color:var(--muted);">1:${typeof sig.rr === 'number' ? sig.rr.toFixed(1) : sig.rr}</div>
        </div>
      </div>
      <div style="font-size:0.7rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;">Why this signal fired:</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        ${sig.reasons.map(r=>`<div style="font-size:0.76rem;color:var(--text);display:flex;gap:6px;align-items:flex-start;"><span style="color:${sigClr};flex-shrink:0;">◈</span><span>${r}</span></div>`).join('')}
      </div>
    </div>`;
  }

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
  const whaleDetailHtml = renderWhaleDetail(whaleData);
  return `
  <div style="display:flex;flex-direction:column;gap:14px;padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">
    ${whaleDetailHtml}
    ${signalSummaryHtml}
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

// ═══════════════════════════════════════════════════════════════════
// FILTER / SORT ENGINE
// ═══════════════════════════════════════════════════════════════════
let _filterType = 'all';
let _sortKey    = 'score';
let _sortDir    = 'desc'; // 'asc' | 'desc'

function setFilterType(type) {
  _filterType = type;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  applyFilter();
}

function toggleSortDir() {
  _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
  const btn = document.getElementById('sortDirBtn');
  if (btn) {
    btn.textContent = _sortDir === 'desc' ? '↓ DESC' : '↑ ASC';
    btn.classList.toggle('asc', _sortDir === 'asc');
  }
  applyFilter();
}

function resetFilter() {
  _filterType = 'all';
  _sortKey    = 'score';
  _sortDir    = 'desc';
  const sk = document.getElementById('sortKey');
  const mv = document.getElementById('minVol');
  const ms = document.getElementById('minScore');
  const db = document.getElementById('sortDirBtn');
  if (sk) sk.value = 'score';
  if (mv) mv.value = '0';
  if (ms) ms.value = '';
  if (db) { db.textContent = '↓ DESC'; db.classList.remove('asc'); }
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === 'all');
  });
  applyFilter();
}

function applyFilter() {
  if (!window._scanResults || window._scanResults.length === 0) return;

  const sortKey  = document.getElementById('sortKey')?.value  || 'score';
  const minVol   = parseFloat(document.getElementById('minVol')?.value)   || 0;
  const minScore = parseFloat(document.getElementById('minScore')?.value) || 0;
  _sortKey = sortKey;

  // ── Filter ───────────────────────────────────────────────────────
  let filtered = window._scanResults.filter(r => {
    if (_filterType !== 'all' && r._type !== _filterType) return false;
    if (minScore > 0 && (r.score || 0) < minScore) return false;
    if (minVol   > 0 && (r.vol24h || r.data?.vol24h || 0) < minVol) return false;
    return true;
  });

  // ── Sort ─────────────────────────────────────────────────────────
  const getVal = r => {
    switch (sortKey) {
      case 'score':   return r.scorePct || 0;
      case 'vol':     return r.vol24h || r.data?.vol24h || 0;
      case 'gain':    return r.gain24h || 0;
      case 'rsi':     return r.data?.rsi4h || 0;
      case 'oi':      return r.data?.oiChange || 0;
      case 'funding': return r.data?.funding || 0;
      case 'price':   return r.price || 0;
      default:        return 0;
    }
  };
  filtered.sort((a, b) => _sortDir === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b));

  // ── Re-render filtered subset ────────────────────────────────────
  const grid = document.getElementById('cardsGrid');
  const count = document.getElementById('sectionCount');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">◎</div><div class="empty-msg">No results match filter</div><div class="empty-sub">Try adjusting the filters above</div></div>`;
    if (count) count.textContent = '0 results';
    return;
  }

  if (count) count.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}${filtered.length < window._scanResults.length ? ` (filtered from ${window._scanResults.length})` : ''}`;

  const pm  = { ACCUM:['pill-accum','Accum'], PUMP:['pill-pump','Pump 24H'], SHORT:['pill-short','Short'], TOP:['pill-top','Top'], WHALE:['pill-whale','🐋 Whale'] };
  const fc  = pct => pct >= 70 ? 'var(--g)' : pct >= 40 ? 'var(--a)' : 'var(--r)';

  grid.innerHTML = filtered.map((r, i) => {
    const [pc, pl] = pm[r._type] || ['pill-top', r._type];
    const pct   = r.scorePct || 0;
    const chart = `https://www.tradingview.com/chart/?symbol=BINANCE:${r.sym}USDT.P`;
    const hd    = r.data && r.scoreData;
    const th    = (r.tags || []).map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('');
    const sl    = r.scoreMax && r.scoreMax <= 18 && typeof r.score === 'number'
      ? `<span style="font-family:var(--mono);font-size:0.63rem;color:var(--muted)">${r.score}/${r.scoreMax}</span>` : '';

    // Sort key highlight badge
    const sortBadge = (() => {
      if (sortKey === 'vol' && (r.vol24h || r.data?.vol24h)) {
        return `<span class="tag b" style="font-size:0.6rem;">${fmtVol(r.vol24h || r.data?.vol24h)}</span>`;
      }
      if (sortKey === 'rsi' && r.data?.rsi4h) {
        const rc = r.data.rsi4h > 70 ? 'r' : r.data.rsi4h < 35 ? 'g' : '';
        return `<span class="tag ${rc}" style="font-size:0.6rem;">RSI ${r.data.rsi4h}</span>`;
      }
      if (sortKey === 'oi' && r.data?.oiChange !== undefined) {
        const oc = r.data.oiChange;
        return `<span class="tag ${oc > 5 ? 'g' : oc < -5 ? 'r' : ''}" style="font-size:0.6rem;">OI ${oc >= 0 ? '+' : ''}${oc.toFixed(1)}%</span>`;
      }
      if (sortKey === 'funding' && r.data?.funding !== null && r.data?.funding !== undefined) {
        const fv = r.data.funding;
        return `<span class="tag ${fv < -0.01 ? 'b' : fv > 0.05 ? 'r' : ''}" style="font-size:0.6rem;">F:${fv >= 0 ? '+' : ''}${fv.toFixed(3)}%</span>`;
      }
      return '';
    })();

    const sig = r.tradeSignal;
    const sigBadge = sig ? `<span class="signal-badge ${sig.side}${sig.confidence>=80?' high':''}">${sig.side==='long'?'📈 LONG':'📉 SHORT'} ${sig.confidence}% <span class="sig-grade">${sig.grade}</span></span>` : '';

    return `<div class="card" style="animation-delay:${Math.min(i * 0.03, 0.6)}s">
      <div class="card-type">
        <span class="pill ${pc}">${pl}</span>
        <div class="card-mini-bar"><div class="card-mini-fill" style="width:${pct}%;background:${fc(pct)}"></div></div>
        ${sl}
      </div>
      <div class="card-body">
        <div class="card-sym">${r.sym}/USDT ${sigBadge}</div>
        <div class="card-tags">${th}${sortBadge}</div>
      </div>
      <div class="card-right">
        <span class="card-price">$${fmt(r.price, 5)}</span>
        ${r.data?.oiChange !== undefined ? `<span class="card-oi">OI ${r.data.oiChange >= 0 ? '+' : ''}${r.data.oiChange.toFixed(1)}%</span>` : ''}
        <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap;justify-content:flex-end;">
          ${hd ? `<button class="btn-sm" onclick="showDetailFromFiltered(${i})">Detail</button>` : ''}
          <a class="btn-sm" href="${chart}" target="_blank">Chart ↗</a>
        </div>
      </div>
    </div>`;
  }).join('');

  // Store filtered results for detail lookup
  window._filteredResults = filtered;
}

function showDetailFromFiltered(idx) {
  const r = window._filteredResults?.[idx];
  if (!r || !r.data || !r.scoreData) return;
  const side = r._type === 'SHORT' ? 'short' : 'long';
  renderResult(r.sym, r.data, r.scoreData, r.signals || [], null, side, 1, r.tradeSignal || null, r.whaleData || null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════
// WHALE ACCUMULATION DETAIL CARD (injected top of result panel)
// ═══════════════════════════════════════════════════════════════════
function renderWhaleDetail(whaleData) {
  if (!whaleData) return '';
  const ws = whaleData;
  const scoreW = Math.round(ws.score);
  const barColor = scoreW >= 75 ? 'linear-gradient(90deg,#3b5bdb,#4c6ef5)'
    : scoreW >= 55 ? 'linear-gradient(90deg,var(--g),#2d9b5a)'
    : 'linear-gradient(90deg,var(--a),#c47a00)';

  const sigRows = ws.signals.map(s => `
    <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 12px;border-radius:var(--r8);background:${s.strength==='strong'?'var(--b-bg)':'var(--bg)'};border:1px solid ${s.strength==='strong'?'var(--b-border)':'var(--border)'};font-size:0.78rem;color:${s.strength==='strong'?'var(--b)':'var(--text)'};">
      <span style="flex-shrink:0;font-size:0.9rem;">${s.icon}</span>
      <span>${s.text}</span>
    </div>`).join('');

  return `
  <div style="background:#f0f4ff;border:2px solid #bac8ff;border-radius:var(--r12);padding:14px 18px;margin-bottom:4px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.5rem;">🐋</span>
        <div>
          <div style="font-size:0.92rem;font-weight:800;color:#3b5bdb;">WHALE ACCUMULATION DETECTED</div>
          <div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">${ws.phase}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--mono);font-size:1.8rem;font-weight:800;color:#3b5bdb;line-height:1;">${scoreW}</div>
        <div style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">/100</div>
      </div>
    </div>
    <div style="background:var(--border);height:8px;border-radius:4px;overflow:hidden;margin-bottom:12px;">
      <div style="height:100%;border-radius:4px;width:${scoreW}%;background:${barColor};transition:width 0.7s ease;"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);">Whale Signals Detected</div>
      ${sigRows}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// SPIKE PROJECTION CALCULATOR
// ═══════════════════════════════════════════════════════════════════
function toggleSpikeCalc() {
  const panel = document.getElementById('spikeCalcPanel');
  const btn   = document.getElementById('btnSpikeCalc');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  btn.classList.toggle('spike-active', !isOpen);
  if (!isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearSpikeCalc() {
  ['scPrice','scFunding','scHigh','scLow','scMa7','scMa25','scMa99','scGain'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('scResults').style.display = 'none';
}

// Auto-fill from last scanned coin data
function autoFillFromScan() {
  // Try last detail-viewed coin data
  const last = window._lastViewedData;
  if (!last) { showToast('Scan dulu satu coin via Quick Scan','warn'); return; }
  const d = last;
  document.getElementById('scPrice').value   = d.price   || '';
  document.getElementById('scFunding').value = d.funding != null ? d.funding : '';
  document.getElementById('scHigh').value    = d.high24h  || '';
  document.getElementById('scGain').value    = d.gain24h  || '';

  // MA from closes
  if (d.closes4h && d.closes4h.length >= 25) {
    const ma7v  = calcMA(d.closes4h, 7);
    const ma25v = calcMA(d.closes4h, 25);
    const ma99v = calcMA(d.closes4h, Math.min(99, d.closes4h.length));
    document.getElementById('scMa7').value  = ma7v.toFixed(6);
    document.getElementById('scMa25').value = ma25v.toFixed(6);
    document.getElementById('scMa99').value = ma99v.toFixed(6);
  }
  // Low from closes
  if (d.closes4h) {
    const low = Math.min(...d.closes4h.slice(-6));
    document.getElementById('scLow').value = low.toFixed(6);
  }
  showToast(`✅ Auto-filled dari ${last.symbol}`, 'success');
  runSpikeCalc();
}

function scFmt(n) {
  if (!n || isNaN(n)) return '—';
  if (n >= 1) return Number(n).toFixed(4);
  return Number(n).toPrecision(5);
}
function scFmtPct(n) { return `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`; }

function runSpikeCalc() {
  const price   = parseFloat(document.getElementById('scPrice').value)   || 0;
  const funding = parseFloat(document.getElementById('scFunding').value) || 0;
  const high24  = parseFloat(document.getElementById('scHigh').value)    || 0;
  const low24   = parseFloat(document.getElementById('scLow').value)     || 0;
  const ma7     = parseFloat(document.getElementById('scMa7').value)     || 0;
  const ma25    = parseFloat(document.getElementById('scMa25').value)    || 0;
  const ma99    = parseFloat(document.getElementById('scMa99').value)    || 0;
  const gain24  = parseFloat(document.getElementById('scGain').value)    || 0;

  if (!price) { showToast('Masukkan harga dulu', 'warn'); return; }

  const range24  = high24 - low24;
  const atr_est  = range24 > 0 ? range24 * 0.25 : price * 0.03;

  // ── SPIKE TARGETS ──────────────────────────────────────────────
  // Fibonacci extensions dari Low → High
  const fib_1618 = low24 > 0 ? low24 + range24 * 1.618 : 0;
  const fib_2618 = low24 > 0 ? low24 + range24 * 2.618 : 0;
  const fib_4236 = low24 > 0 ? low24 + range24 * 4.236 : 0;

  // ATR projections dari harga sekarang
  const atr1 = price + atr_est * 1.0;
  const atr2 = price + atr_est * 2.0;
  const atr3 = price + atr_est * 3.0;

  // Round number magnets
  const magnitude = Math.pow(10, Math.floor(Math.log10(price)));
  const roundTargets = [];
  for (let m = 0.5; m <= 4; m += 0.5) {
    const level = Math.ceil(price / (magnitude * m)) * (magnitude * m);
    if (level > price * 1.005 && level < price * 4) roundTargets.push(level);
  }

  // MA over-extension zones
  const ma7_25x = ma7 > 0 ? ma7 * 2.5 : 0;
  const ma7_3x  = ma7 > 0 ? ma7 * 3.0 : 0;

  // Funding momentum residual
  const funding_push_pct = funding * 4 * 2;
  const funding_spike    = price * (1 + funding_push_pct / 100);

  const allTargets = [
    { price: roundTargets[0], label: 'Round #1',  type: 'mild', note: 'Nearest round number' },
    { price: roundTargets[1], label: 'Round #2',  type: 'mild', note: 'Round number magnet' },
    { price: fib_1618,        label: 'Fib 1.618', type: 'warn', note: 'Fib ext dari low' },
    { price: atr1,            label: 'ATR ×1',    type: 'mild', note: '1× ATR projection' },
    { price: atr2,            label: 'ATR ×2',    type: 'warn', note: '2× ATR projection' },
    { price: high24 > price ? high24 : 0, label: 'High 24H', type: 'warn', note: 'Previous peak' },
    { price: funding_spike > price * 1.01 ? funding_spike : 0, label: 'Fund Push', type: 'warn', note: `Funding ${funding_push_pct.toFixed(1)}% residual` },
    { price: ma7_25x > price ? ma7_25x : 0, label: 'MA7 ×2.5', type: 'hot', note: 'Parabolic zone' },
    { price: fib_2618 > price ? fib_2618 : 0, label: 'Fib 2.618', type: 'hot', note: 'Extreme extension' },
    { price: ma7_3x > price ? ma7_3x : 0, label: 'MA7 ×3', type: 'hot', note: 'Max parabolic' },
  ].filter(t => t.price && t.price > price * 1.005).sort((a,b) => a.price - b.price);

  // Deduplicate within 3%
  const deduped = [];
  for (const t of allTargets) {
    if (!deduped.some(d => Math.abs(d.price - t.price) / t.price < 0.03)) deduped.push(t);
  }
  const topTargets = deduped.slice(0, 7);

  document.getElementById('scSpikeTargets').innerHTML = topTargets.map(t => {
    const pct = (t.price - price) / price * 100;
    return `<div class="sc-spike-row ${t.type}">
      <span class="sc-spike-label ${t.type}">${t.label}</span>
      <span class="sc-spike-price">$${scFmt(t.price)}</span>
      <span class="sc-spike-pct ${t.type}">${scFmtPct(pct)}</span>
    </div>`;
  }).join('');

  // ── SHORT SETUP ────────────────────────────────────────────────
  const e1 = topTargets[0]?.price || price * 1.05;
  const e2 = topTargets[1]?.price || price * 1.10;
  const e3 = topTargets[2]?.price || price * 1.18;
  const avgEntry = e1 * 0.5 + e2 * 0.3 + e3 * 0.2;
  const shortSL  = (topTargets[topTargets.length - 1]?.price || high24) * 1.025;
  const tp1 = price * 0.85;
  const tp2 = ma7  > 0 ? ma7  : price * 0.72;
  const tp3 = ma25 > 0 ? ma25 : price * 0.55;
  const slPct  = avgEntry > 0 ? (shortSL - avgEntry) / avgEntry * 100 : 0;
  const rr2    = slPct > 0 ? (avgEntry - tp2) / avgEntry * 100 / slPct : 0;

  document.getElementById('scShortSetup').innerHTML = [
    { l: 'Entry 1 (50%)',  v: `$${scFmt(e1)}`,       cls: 'var(--r)' },
    { l: 'Entry 2 (30%)',  v: `$${scFmt(e2)}`,       cls: 'var(--r)' },
    { l: 'Entry 3 (20%)',  v: `$${scFmt(e3)}`,       cls: 'var(--r)' },
    { l: 'Avg Entry',      v: `$${scFmt(avgEntry)}`,  cls: 'var(--a)' },
    { l: 'Stop Loss',      v: `$${scFmt(shortSL)} (+${slPct.toFixed(1)}%)`, cls: 'var(--r)' },
    { l: 'TP1 (−15%)',     v: `$${scFmt(tp1)}`,       cls: 'var(--g)' },
    { l: 'TP2 (MA7)',      v: `$${scFmt(tp2)}`,       cls: 'var(--g)' },
    { l: 'TP3 (MA25)',     v: `$${scFmt(tp3)}`,       cls: 'var(--g)' },
    { l: 'RR (TP2)',       v: `1 : ${rr2.toFixed(2)}`, cls: rr2 >= 2 ? 'var(--g)' : 'var(--a)' },
  ].map(r => `<div class="sc-setup-row">
    <span class="sc-setup-label">${r.l}</span>
    <span class="sc-setup-val" style="color:${r.cls}">${r.v}</span>
  </div>`).join('');

  // ── MA EXTENSION ───────────────────────────────────────────────
  const extMa7  = ma7  > 0 ? (price - ma7)  / ma7  * 100 : null;
  const extMa25 = ma25 > 0 ? (price - ma25) / ma25 * 100 : null;
  const extMa99 = ma99 > 0 ? (price - ma99) / ma99 * 100 : null;
  const extHigh = high24 > 0 ? (price - high24) / high24 * 100 : null;
  const clsExt  = v => v === null ? '' : v > 30 ? 'red' : v > 15 ? 'amber' : 'green';

  document.getElementById('scMaMetrics').innerHTML = [
    { l: 'vs MA7',    v: extMa7,  suffix: '%' },
    { l: 'vs MA25',   v: extMa25, suffix: '%' },
    { l: 'vs MA99',   v: extMa99, suffix: '%' },
    { l: 'vs High24H',v: extHigh, suffix: '%' },
    { l: 'ATR Est',   v: null, raw: `$${scFmt(atr_est)}`, cls: 'blue' },
    { l: 'Range 24H', v: null, raw: low24 > 0 ? `${((range24/low24)*100).toFixed(1)}%` : '—', cls: 'amber' },
  ].map(m => {
    const val = m.raw || (m.v !== null ? `${scFmtPct(m.v)}` : '—');
    const cls = m.cls || clsExt(m.v);
    return `<div class="sc-metric"><div class="sc-metric-l">${m.l}</div><div class="sc-metric-v ${cls}">${val}</div></div>`;
  }).join('');

  // ── FUNDING COST TABLE ─────────────────────────────────────────
  const periods = [8, 16, 24, 48, 72];
  document.getElementById('scFundingTable').innerHTML = `
    <table class="sc-funding-table">
      <thead><tr><th>Hold</th><th>Periods</th><th>Cost</th><th>Breakeven harga</th><th>Status</th></tr></thead>
      <tbody>
        ${periods.map(h => {
          const pc   = Math.floor(h / 8);
          const cost = funding * pc;
          const be   = price * (1 + cost / 100);
          const cls  = cost > 1.5 ? 'red' : cost > 0.5 ? 'amber' : 'green';
          const status = cost > 1.5 ? '🔴 Danger' : cost > 0.5 ? '🟡 High' : '🟢 OK';
          return `<tr>
            <td>${h}H</td><td>${pc}×</td>
            <td class="${cls}">${cost > 0 ? '-' : ''}${cost.toFixed(4)}%</td>
            <td class="${cls}">${cost > 0 ? '$' + scFmt(be) : '—'}</td>
            <td>${status}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  // ── VERDICT ────────────────────────────────────────────────────
  let vCls, vTitle, vText;
  const nearestTarget = topTargets[0];
  const nearestPct    = nearestTarget ? ((nearestTarget.price - price) / price * 100).toFixed(1) : '?';
  if (funding > 0.5 && gain24 > 80) {
    vCls = 'danger'; vTitle = '🚨 EXTREME — DO NOT LONG';
    vText = `Funding ${funding.toFixed(4)}% per 8 jam = EKSTREM. Hold 24 jam = bayar ~${(funding * 3).toFixed(2)}% hanya funding. Spike lanjutan masih mungkin ke $${scFmt(e1)}–$${scFmt(e2)} (+${nearestPct}%), tapi risk/reward untuk long sangat buruk. Tunggu spike → short di resistance.`;
  } else if (funding > 0.1 || gain24 > 30) {
    vCls = 'warn'; vTitle = '⚠️ HIGH RISK — Hati-hati';
    vText = `Funding tinggi, longs sedang overloaded. Spike ke $${scFmt(e1)} (+${nearestPct}%) masih ada peluang, tapi distribusi bisa mulai. Prioritaskan short setup di atas.`;
  } else {
    vCls = 'ok'; vTitle = '✅ Kondisi Normal';
    vText = `Funding wajar. Spike ke $${scFmt(e1)} (+${nearestPct}%) memungkinkan dengan momentum yang sehat.`;
  }
  document.getElementById('scVerdict').innerHTML = `
    <div class="sc-verdict ${vCls}">
      <div class="sc-verdict-title ${vCls}">${vTitle}</div>
      <div class="sc-verdict-text">${vText}</div>
    </div>`;

  document.getElementById('scResults').style.display = 'block';
}
