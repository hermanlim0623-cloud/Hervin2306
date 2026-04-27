// ═══════════════════════════════════════════════════════════════════
// portfolio.js — Hervin Scanner v9.2
// Portfolio: add/remove/scan positions, PnL, CSV export
// Depends on: config.js, utils.js, api.js, analysis.js, scoring.js, ui.js
// ═══════════════════════════════════════════════════════════════════

const PF_KEY='hervin_portfolio_v92';

function pfLoad(){try{return JSON.parse(localStorage.getItem(PF_KEY))||[];}catch{return[];}}
function pfSave(c){localStorage.setItem(PF_KEY,JSON.stringify(c));}
function pfTypeChanged(sel){sel.classList.toggle('short-selected',sel.value==='short');}

function togglePortfolio(){
  const b=document.getElementById('portfolioBody'),h=document.getElementById('portfolioHead'),c=document.getElementById('portfolioChevron');
  const o=b.classList.contains('open');b.classList.toggle('open',!o);h.classList.toggle('open',!o);c.classList.toggle('open',!o);
}

function pfRenderChips(){
  const coins=pfLoad(),wrap=document.getElementById('pfChips'),badge=document.getElementById('portfolioBadge');
  badge.textContent=`${coins.length} position${coins.length!==1?'s':''}`;
  if(coins.length===0){wrap.innerHTML=`<span class="portfolio-empty">No positions yet</span>`;return;}
  wrap.innerHTML=coins.map((c,i)=>{
    const side=c.type||'long',icon=side==='short'?'📉':'📈';
    const lev=c.leverage&&c.leverage>1?` ${c.leverage}×`:'';
    return `<div class="portfolio-chip ${side}"><span>${icon} ${c.sym}</span>${c.entry?`<span style="opacity:0.7;font-size:0.65rem">@${c.entry}${lev}</span>`:''}<button class="chip-remove" onclick="pfRemove(${i})">✕</button></div>`;
  }).join('');
}

function pfAddCoin(){
  const sym=(document.getElementById('pfInput').value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
  const entry=parseFloat(document.getElementById('pfEntryPrice').value)||null;
  const type=document.getElementById('pfType').value;
  const lev=parseFloat(document.getElementById('pfLeverage').value)||1;
  if(!sym){showToast('Masukkan symbol','warn');return;}
  const coins=pfLoad();if(coins.find(c=>c.sym===sym)){showToast(`${sym} sudah ada`,'warn');return;}
  coins.push({sym,entry,type,leverage:lev>1?lev:null});pfSave(coins);pfRenderChips();
  document.getElementById('pfInput').value='';document.getElementById('pfEntryPrice').value='';document.getElementById('pfLeverage').value='';
  showToast(`✅ ${type.toUpperCase()} ${sym} ditambahkan`,'success');
}

function pfImportFromText(){
  const raw=prompt('Paste daftar coin:\nContoh: EDU,WLD,BIO');if(!raw)return;
  const syms=raw.toUpperCase().split(/[\s,;]+/).map(s=>s.replace(/[^A-Z0-9]/g,'')).filter(Boolean);
  const coins=pfLoad();let added=0;
  for(const sym of syms){if(!sym||coins.find(c=>c.sym===sym))continue;coins.push({sym,entry:null,type:'long',leverage:null});added++;}
  pfSave(coins);pfRenderChips();showToast(`✅ ${added} positions ditambahkan`,'success');
}

function pfRemove(idx){const coins=pfLoad(),sym=coins[idx]?.sym;coins.splice(idx,1);pfSave(coins);pfRenderChips();document.getElementById(`pf-card-${sym}`)?.remove();if(document.getElementById('pfCards').children.length===0)document.getElementById('pfResultsWrap').style.display='none';showToast(`Removed ${sym}`,'');}
function pfClearAll(){if(!confirm('Hapus semua?'))return;pfSave([]);pfRenderChips();document.getElementById('pfCards').innerHTML='';document.getElementById('pfResultsWrap').style.display='none';showToast('Cleared','');}

async function pfScanAll(mode='accum'){
  const coins=pfLoad();if(coins.length===0){showToast('Tidak ada posisi','warn');return;}
  const btn=document.getElementById('pfScanBtn');btn.disabled=true;btn.textContent='⏳ Fetching...';
  const wrap=document.getElementById('pfResultsWrap'),grid=document.getElementById('pfCards');
  wrap.style.display='block';grid.innerHTML='';
  if(!document.getElementById('portfolioBody').classList.contains('open'))togglePortfolio();
  setDot('loading');logMsg(`🔄 Portfolio scan ${coins.length} positions`,'info');showLog();

  for(const c of coins){
    const side=c.type||'long';
    document.getElementById(`pf-card-${c.sym}`)?.remove();
    const ph=document.createElement('div');ph.id=`pf-card-${c.sym}`;ph.className='skel-card';
    ph.innerHTML=`<div class="skel" style="width:80px;height:36px;border-radius:6px;flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px;"><div class="skel" style="height:13px;width:80px;"></div><div class="skel" style="height:11px;width:140px;"></div></div>`;
    grid.appendChild(ph);

    try{
      const d=await analyzeCoin(c.sym,true);
      let s,signals;
      if(side==='short'){s=scoreShort(d);signals=detectPumpExhaustion(d,d.klines4h,d.klines1d).signals;}
      else{s=mode==='short'?scoreShort(d):scoreAccum(d);signals=mode==='short'?detectPumpExhaustion(d,d.klines4h,d.klines1d).signals:detectSmartAccumulation(d,d.klines4h,d.klines1d).signals;}

      let pnlHtml='';
      if(c.entry&&c.entry>0){
        const raw=side==='short'?(c.entry-d.price)/c.entry*100:(d.price-c.entry)/c.entry*100;
        const lm=c.leverage&&c.leverage>1?c.leverage:1;const pl=raw*lm;
        const cls=pl>=0?'green':'red';const ll=lm>1?` (${lm}×)`:'';
        pnlHtml=`<div class="portfolio-card-pnl ${cls}">${pl>=0?'+':''}${pl.toFixed(2)}%${ll}</div><div style="font-family:var(--mono);font-size:0.62rem;color:var(--faint);">from $${c.entry}</div>`;
      }

      const vc=s.score>=Math.ceil(s.max*0.65)?'g':s.score>=Math.ceil(s.max*0.4)?'a':'r';
      const tags=[
        {label:fmtPct(d.gain24h),cls:d.gain24h>=0?'g':'r'},
        {label:`RSI ${d.rsi4h}`,cls:d.rsi4h<40?'g':d.rsi4h>65?'r':''},
        {label:`Vol ${d.volRatio.toFixed(1)}x`,cls:d.volRatio>=2?'b':''},
        d.funding!==null?{label:`F:${d.funding.toFixed(3)}%`,cls:d.funding<THRESHOLDS.FUNDING_NEG?'b':d.funding>THRESHOLDS.FUNDING_POS?'r':''}:null,
        {label:`OI${d.oiChange>=0?'+':''}${d.oiChange.toFixed(1)}%`,cls:d.oiChange>5?'g':d.oiChange<-5?'r':''},
        d.fundingHist?.currentNegStreak>=4?{label:`🔥F×${d.fundingHist.currentNegStreak}`,cls:'b'}:null,
        d.rvolData?.isSpike?{label:'⚡RVOL',cls:'r'}:null,
        d.bbSqueeze?.squeezing?{label:'🔲BBsq',cls:'b'}:null,
      ].filter(Boolean);

      const th=tags.map(t=>`<span class="tag ${t.cls}">${t.label}</span>`).join('');
      const chart=`https://www.tradingview.com/chart/?symbol=BINANCE:${c.sym}USDT.P`;
      const si=side==='short'?'📉':'📈';
      const sb=`<span class="pos-badge ${side}">${side.toUpperCase()}</span>`;
      const ll=c.leverage&&c.leverage>1?` ${c.leverage}×`:'';

      const cardHtml=`<div class="portfolio-card pos-${side}" id="pf-card-${c.sym}">
        <div>
          <div class="portfolio-card-sym">${si} ${c.sym}/USDT</div>
          <div style="display:flex;gap:5px;align-items:center;margin-top:4px;">${sb}${c.entry?`<span style="font-family:var(--mono);font-size:0.65rem;color:var(--muted);">@${c.entry}${ll}</span>`:''}</div>
        </div>
        <div>
          <div class="portfolio-card-tags">${th}</div>
          ${signals.slice(0,2).map(sig=>`<div style="font-size:0.7rem;color:var(--${sig.strength==='strong'?'g':'a'});margin-top:4px;">◈ ${sig.text}</div>`).join('')}
        </div>
        <div class="portfolio-card-right">
          <div class="portfolio-card-price">$${fmt(d.price,5)}</div>
          <span class="tag ${vc}" style="font-size:0.66rem;">${s.score}/${s.max}</span>
          ${pnlHtml}
          <div style="display:flex;gap:5px;margin-top:5px;">
            <button class="btn-sm" onclick="pfShowDetail('${c.sym}','${side}',${c.entry||0},${c.leverage||1})">Detail</button>
            <a class="btn-sm" href="${chart}" target="_blank">Chart ↗</a>
          </div>
        </div>
      </div>`;

      const ex=document.getElementById(`pf-card-${c.sym}`);
      if(ex){ex.insertAdjacentHTML('afterend',cardHtml);ex.remove();}else grid.insertAdjacentHTML('beforeend',cardHtml);
    }catch(e){
      const eh=`<div class="portfolio-card" id="pf-card-${c.sym}" style="opacity:0.6"><div><div class="portfolio-card-sym">❌ ${c.sym}/USDT</div></div><div style="font-size:0.75rem;color:var(--r);">${e.message}</div><div></div></div>`;
      const ex=document.getElementById(`pf-card-${c.sym}`);
      if(ex){ex.insertAdjacentHTML('afterend',eh);ex.remove();}else grid.insertAdjacentHTML('beforeend',eh);
    }
    await sleep(350);
  }
  btn.disabled=false;btn.textContent='⚡ Scan All Positions';
  setDot('active');logMsg('✅ Portfolio scan selesai','ok');showToast(`✅ ${coins.length} positions updated`,'success');
}

async function pfShowDetail(sym, side='long', entryPrice=null, leverage=1) {
  setDot('loading');
  try {
    const d = await analyzeCoin(sym);
    let s, signals;
    if (side === 'short') {
      s = scoreShort(d);
      signals = detectPumpExhaustion(d, d.klines4h, d.klines1d).signals;
    } else {
      s = scoreAccum(d);
      signals = detectSmartAccumulation(d, d.klines4h, d.klines1d).signals;
    }
    renderResult(sym, d, s, signals, entryPrice > 0 ? entryPrice : null, side, leverage);
    window.scrollTo({ top:0, behavior:'smooth' });
    setDot('active');
  } catch(e) { showToast(`Error: ${e.message}`,'error'); setDot('error'); }
}

function pfExportCSV(){
  const coins=pfLoad();if(!coins.length){showToast('Kosong','warn');return;}
  const hdr=['Symbol','Side','Lev','Entry','Current','PnL%','PnLLev%','RSI4H','24h%','Funding','FundAvg3D','FundNegStreak','OI%','RVOL/hr','BBSqueeze','Silence','Candles'];
  const rows=coins.map(c=>{
    const d=Cache.get(c.sym,'analysis');const side=c.type||'long';const lev=c.leverage||1;
    if(!d)return[c.sym,side,lev,c.entry||'','','','','','','','','','','','','',''];
    let pnl='',pnlL='';
    if(c.entry&&c.entry>0){const raw=side==='short'?(c.entry-d.price)/c.entry*100:(d.price-c.entry)/c.entry*100;pnl=raw.toFixed(2)+'%';pnlL=(raw*lev).toFixed(2)+'%';}
    return[c.sym,side,lev,c.entry||'',fmt(d.price,5),pnl,pnlL,d.rsi4h,fmtPct(d.gain24h),
      d.funding!=null?`${d.funding.toFixed(4)}%`:'N/A',
      d.fundingHist?.avg3d?.toFixed(4)??'N/A',d.fundingHist?.currentNegStreak??0,
      `${d.oiChange.toFixed(1)}%`,d.rvolData?.rvolVsAvg?.toFixed(2)??'N/A',
      d.bbSqueeze?.squeezing?`squeeze(${d.bbSqueeze.widthNow.toFixed(1)})`:d.bbSqueeze?.expanding?'expanding':'ok',
      d.prePumpSilence?.detected?`yes(${d.prePumpSilence.score})`:'no',
      d.candlePatterns?.length>0?d.candlePatterns.map(p=>p.name).join('|'):'none',
    ];
  });
  const csv=[hdr,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`hervin_positions_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('📥 Exported','success');
}
