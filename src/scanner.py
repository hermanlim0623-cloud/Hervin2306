"""
Crypto Signal Scanner v6 — ULTIMATE PRO
New in v6:
- RSI Bearish Divergence detection
- ATR-based Stop Loss & Take Profit suggestions
- Whale / Large Trade detector (aggTrades)
"""

import os
import sys
import time
import logging
import functools
import requests
from datetime import datetime, timezone
from supabase import create_client

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler()]
)
log = logging.getLogger("scanner-v6")

# ═══════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID   = os.environ["TELEGRAM_CHAT_ID"]
SUPABASE_URL       = os.environ["SUPABASE_URL"]
SUPABASE_KEY       = os.environ["SUPABASE_KEY"]

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
BINANCE_FAPI   = "https://fapi.binance.com/fapi/v1"
BINANCE_US     = "https://api.binance.us/api/v3"
BINANCE_GLOBAL = "https://api.binance.com/api/v3"

# ─── THRESHOLDS ──────────────────────────────────────────
PUMP_GAIN_5D      = 300
SHORT_GAIN_5D     = 500
LOW_SUPPLY_RATIO  = 30
LOW_FUNDING_RATE  = -0.05
MIN_MARKET_CAP    = 10_000_000
MIN_SHORT_MCAP    = 50_000_000
MIN_VOLUME_USD    = 1_000_000
ALERT_COOLDOWN_H  = 12

INTRADAY_GAIN_24H   = 50
VOLUME_SPIKE_MULT   = 5
REVERSAL_DROP_PCT   = 8
INTRADAY_COOLDOWN_H = 2

# ─── QUIET HOURS ─────────────────────────────────────────
QUIET_START     = 22
QUIET_END       = 7
QUIET_MIN_SCORE = 3

# ─── ORDER BOOK ──────────────────────────────────────────
MIN_BID_DEPTH_USDT = 50_000
MAX_SPREAD_PCT     = 2.0

# ─── WHALE DETECTION ─────────────────────────────────────
WHALE_TRADE_USD    = 50_000   # single trade > $50k = whale
WHALE_WINDOW_S     = 300      # look at last 5 minutes of trades
WHALE_SELL_RATIO   = 0.6      # >60% whale volume is sells = bearish

# ─── ATR ─────────────────────────────────────────────────
ATR_PERIOD         = 14
ATR_SL_MULTIPLIER  = 1.5      # SL = entry ± 1.5x ATR
ATR_TP_MULTIPLIER  = 3.0      # TP = entry ∓ 3.0x ATR (2:1 RR)

# ─── RSI DIVERGENCE ──────────────────────────────────────
DIV_LOOKBACK       = 20       # candles to look back for divergence
DIV_MIN_SWING      = 3        # min candles between swing points

# ─── MTF ─────────────────────────────────────────────────
MTF_TIMEFRAMES = ["1h", "4h", "1d"]

# ─── SUPABASE + CACHE ────────────────────────────────────
supabase   = create_client(SUPABASE_URL, SUPABASE_KEY)
_cg_cache: dict = {}
_scan_start_time = datetime.now(timezone.utc)


# ═══════════════════════════════════════════════════════════
# RETRY DECORATOR
# ═══════════════════════════════════════════════════════════

def retry(max_attempts=3, delay=5, backoff=2, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            wait = delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        log.error(f"{func.__name__} failed after {max_attempts}x: {e}")
                        return None
                    log.warning(f"{func.__name__} attempt {attempt} failed: {e} — retry in {wait}s")
                    time.sleep(wait)
                    wait *= backoff
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════

def is_quiet_hours() -> bool:
    h = datetime.now(timezone.utc).hour
    return h >= QUIET_START or h < QUIET_END if QUIET_START > QUIET_END else QUIET_START <= h < QUIET_END

def should_send_alert(score: int) -> bool:
    if is_quiet_hours() and score < QUIET_MIN_SCORE:
        log.info(f"Quiet hours, score {score} < {QUIET_MIN_SCORE}, skip")
        return False
    return True

def get_adaptive_cooldown(gain: float, signal_type: str) -> float:
    base = ALERT_COOLDOWN_H if signal_type in ("PUMP","SHORT") else INTRADAY_COOLDOWN_H
    if gain >= 1000: return max(base * 0.5, 2)
    if gain >= 500:  return max(base * 0.75, 3)
    if gain < 300:   return base * 1.5
    return base

def _mcap_str(mcap):
    if not mcap: return "N/A"
    return f"${mcap/1e6:.1f}M" if mcap < 1e9 else f"${mcap/1e9:.2f}B"

def get_chart_url(symbol: str) -> str:
    return f"https://www.tradingview.com/chart/?symbol=BINANCE:{symbol}USDT.P"


# ═══════════════════════════════════════════════════════════
# TELEGRAM
# ═══════════════════════════════════════════════════════════

@retry(max_attempts=3, delay=3, exceptions=(requests.RequestException,))
def send_telegram(text: str, chat_id: str = None):
    cid = chat_id or TELEGRAM_CHAT_ID
    r = requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        json={"chat_id": cid, "text": text, "parse_mode": "HTML",
              "disable_web_page_preview": True},
        timeout=15
    )
    r.raise_for_status()

def get_telegram_updates() -> list:
    try:
        r = requests.get(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates",
            params={"timeout": 5}, timeout=10
        )
        if r.status_code == 200:
            return r.json().get("result", [])
    except Exception as e:
        log.warning(f"Telegram poll: {e}")
    return []

def handle_telegram_commands():
    updates = get_telegram_updates()
    for update in updates:
        msg  = update.get("message", {})
        text = msg.get("text", "").strip()
        chat = str(msg.get("chat", {}).get("id", ""))
        if not text.startswith("/"): continue
        parts = text.split(); cmd = parts[0].lower(); args = parts[1:]
        log.info(f"CMD: {text}")

        if cmd == "/help":
            send_telegram("""🤖 <b>Scanner v6 ULTIMATE — Commands</b>

/help — Pesan ini
/status — Status scanner
/scan &lt;SYMBOL&gt; — Full analisis + divergence + whale
/short &lt;SYMBOL&gt; — Short viability score /6
/top — Top 5 gainers Binance Futures
/whale &lt;SYMBOL&gt; — Whale activity 5 menit terakhir
/atr &lt;SYMBOL&gt; — ATR SL/TP suggestion""", chat)

        elif cmd == "/status":
            uptime = datetime.now(timezone.utc) - _scan_start_time
            h = int(uptime.total_seconds()//3600); m = int((uptime.total_seconds()%3600)//60)
            try:
                c = supabase.table("alerts_log").select("id", count="exact").execute()
                total = c.count or 0
            except: total = "N/A"
            send_telegram(f"""📊 <b>Scanner v6 Status</b>
⏱ Uptime: <b>{h}h {m}m</b>
😴 Quiet hours: <b>{'YA' if is_quiet_hours() else 'TIDAK'}</b>
📬 Total alerts: <b>{total}</b>
🕐 UTC: <b>{datetime.now(timezone.utc).strftime('%H:%M:%S')}</b>""", chat)

        elif cmd == "/scan" and args:
            sym = args[0].upper()
            send_telegram(f"🔍 Scanning <b>{sym}</b>...", chat)
            send_telegram(scan_single_coin(sym), chat)

        elif cmd == "/short" and args:
            sym = args[0].upper()
            send_telegram(f"⚠️ Short check: <b>{sym}</b>...", chat)
            send_telegram(check_short_viability(sym), chat)

        elif cmd == "/whale" and args:
            sym = args[0].upper()
            send_telegram(f"🐋 Whale check: <b>{sym}</b>...", chat)
            send_telegram(format_whale_report(sym), chat)

        elif cmd == "/atr" and args:
            sym = args[0].upper()
            send_telegram(f"📐 ATR SL/TP: <b>{sym}</b>...", chat)
            send_telegram(format_atr_report(sym), chat)

        elif cmd == "/top":
            send_telegram("📈 Fetching top gainers...", chat)
            send_telegram(get_top_gainers_summary(), chat)


# ═══════════════════════════════════════════════════════════
# BINANCE API
# ═══════════════════════════════════════════════════════════

def _binance_get(endpoint: str, params: dict = None, fapi: bool = False):
    bases = [BINANCE_FAPI if fapi else BINANCE_GLOBAL,
             BINANCE_FAPI if fapi else BINANCE_US]
    for base in bases:
        try:
            r = requests.get(f"{base}/{endpoint}", params=params, timeout=15)
            if r.status_code == 200: return r.json()
            if r.status_code == 451: continue
        except Exception: continue
    return None

@retry(max_attempts=3, delay=5)
def get_binance_futures_symbols() -> set:
    data = _binance_get("exchangeInfo", fapi=True)
    if not data: return set()
    s = set(s["baseAsset"].upper() for s in data.get("symbols",[])
            if s.get("status")=="TRADING" and s.get("quoteAsset")=="USDT")
    log.info(f"Futures: {len(s)} symbols"); return s

@retry(max_attempts=3, delay=3)
def get_funding_rate(symbol: str):
    d = _binance_get("premiumIndex", {"symbol": f"{symbol}USDT"}, fapi=True)
    return float(d.get("lastFundingRate",0))*100 if d else None

@retry(max_attempts=2, delay=3)
def get_klines(symbol: str, interval: str, limit: int = 50) -> list:
    return _binance_get("klines", {"symbol":f"{symbol}USDT","interval":interval,"limit":limit}, fapi=True) or []

@retry(max_attempts=2, delay=3)
def get_binance_top_movers() -> list:
    # Use Futures API (not geo-blocked)
    data = _binance_get("ticker/24hr", fapi=True)
    if not data: return []
    usdt = [t for t in data if t["symbol"].endswith("USDT")
            and float(t.get("quoteVolume",0)) > MIN_VOLUME_USD
            and not any(x in t["symbol"] for x in ["BUSD","USDC","DAI","TUSD","FDUSD"])]
    return sorted(usdt, key=lambda x: float(x.get("priceChangePercent",0)), reverse=True)

@retry(max_attempts=2, delay=3)
def get_order_book(symbol: str, limit: int = 20) -> dict:
    return _binance_get("depth", {"symbol":f"{symbol}USDT","limit":limit}, fapi=True) or {}

@retry(max_attempts=2, delay=3)
def get_agg_trades(symbol: str, limit: int = 500) -> list:
    """Get recent aggregated trades for whale detection"""
    return _binance_get("aggTrades", {"symbol":f"{symbol}USDT","limit":limit}, fapi=True) or []


# ═══════════════════════════════════════════════════════════
# NEW v6: ATR CALCULATION
# ═══════════════════════════════════════════════════════════

def calculate_atr(klines: list, period: int = ATR_PERIOD) -> float:
    """Average True Range from klines"""
    if not klines or len(klines) < period + 1:
        return 0.0
    trs = []
    for i in range(1, len(klines)):
        high  = float(klines[i][2])
        low   = float(klines[i][3])
        prev_close = float(klines[i-1][4])
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        trs.append(tr)
    return sum(trs[-period:]) / period


def get_atr_levels(symbol: str, interval: str = "4h") -> dict:
    """
    Calculate ATR and suggest SL/TP for SHORT position.
    Returns dict with atr, sl_price, tp_price, rr_ratio
    """
    klines = get_klines(symbol, interval, limit=ATR_PERIOD + 5)
    if not klines:
        return {}

    atr          = calculate_atr(klines)
    current      = float(klines[-1][4])
    atr_pct      = (atr / current * 100) if current > 0 else 0

    # For SHORT: SL above entry, TP below entry
    sl_price     = current + (atr * ATR_SL_MULTIPLIER)
    tp_price     = current - (atr * ATR_TP_MULTIPLIER)
    tp1_price    = current - (atr * 1.5)   # conservative TP1
    rr_ratio     = ATR_TP_MULTIPLIER / ATR_SL_MULTIPLIER

    return {
        "atr":       atr,
        "atr_pct":   atr_pct,
        "current":   current,
        "sl":        sl_price,
        "tp":        tp_price,
        "tp1":       tp1_price,
        "rr":        rr_ratio,
        "interval":  interval
    }


def format_atr_report(symbol: str) -> str:
    levels = get_atr_levels(symbol, "4h")
    if not levels:
        return f"❌ Tidak bisa fetch klines untuk {symbol}"

    atr = levels["atr"]; cur = levels["current"]
    return f"""📐 <b>ATR SL/TP — {symbol}/USDT (4h)</b>

💰 Harga sekarang: <b>${cur:,.8g}</b>
📏 ATR(14): <b>${atr:,.8g}</b> ({levels['atr_pct']:.2f}% dari harga)

<b>Untuk SHORT entry di ${cur:,.8g}:</b>
🛑 Stop Loss: <b>${levels['sl']:,.8g}</b> (+{ATR_SL_MULTIPLIER}x ATR)
🎯 TP1 (conservative): <b>${levels['tp1']:,.8g}</b> (-1.5x ATR)
🎯 TP2 (full target): <b>${levels['tp']:,.8g}</b> (-{ATR_TP_MULTIPLIER}x ATR)
📊 Risk/Reward: <b>1:{levels['rr']:.1f}</b>

💡 Budget $5 x3 = $15 total
   Entry $5 → SL cost max ≈ ${5 * ATR_SL_MULTIPLIER * levels['atr_pct']/100:.2f}"""


# ═══════════════════════════════════════════════════════════
# NEW v6: RSI BEARISH DIVERGENCE
# ═══════════════════════════════════════════════════════════

def calculate_rsi_series(closes: list, period: int = 14) -> list:
    """Calculate RSI for each candle, returns list of RSI values"""
    if len(closes) < period + 1:
        return [50.0] * len(closes)
    rsi_values = [None] * period
    gains = losses = 0.0
    for i in range(1, period + 1):
        diff = closes[i] - closes[i-1]
        if diff > 0: gains += diff
        else: losses -= diff
    avg_gain = gains / period
    avg_loss = losses / period
    for i in range(period, len(closes)):
        if i > period:
            diff = closes[i] - closes[i-1]
            g = diff if diff > 0 else 0
            l = -diff if diff < 0 else 0
            avg_gain = (avg_gain * (period-1) + g) / period
            avg_loss = (avg_loss * (period-1) + l) / period
        rs  = avg_gain / avg_loss if avg_loss != 0 else 100
        rsi = 100 - (100 / (1 + rs))
        rsi_values.append(round(rsi, 2))
    return rsi_values


def find_swing_highs(values: list, min_gap: int = DIV_MIN_SWING) -> list:
    """Find local swing highs — returns list of (index, value)"""
    swings = []
    for i in range(min_gap, len(values) - min_gap):
        if values[i] is None: continue
        window = [v for v in values[i-min_gap:i+min_gap+1] if v is not None]
        if not window: continue
        if values[i] == max(window):
            swings.append((i, values[i]))
    return swings


def detect_bearish_divergence(klines: list) -> dict:
    """
    Bearish Divergence: Price makes Higher High, RSI makes Lower High
    Strong short signal — means momentum is weakening despite price rising
    """
    if not klines or len(klines) < DIV_LOOKBACK + 5:
        return {"divergence": False, "strength": "none"}

    closes = [float(k[4]) for k in klines[-DIV_LOOKBACK:]]
    highs  = [float(k[2]) for k in klines[-DIV_LOOKBACK:]]
    rsi_series = calculate_rsi_series(closes)

    # Find price swing highs
    price_swings = find_swing_highs(highs)
    rsi_swings   = find_swing_highs(rsi_series)

    if len(price_swings) < 2 or len(rsi_swings) < 2:
        return {"divergence": False, "strength": "none"}

    # Check last two swing highs
    p1_idx, p1_val = price_swings[-2]
    p2_idx, p2_val = price_swings[-1]
    r1_idx, r1_val = rsi_swings[-2]
    r2_idx, r2_val = rsi_swings[-1]

    # Bearish divergence: price HH but RSI LH
    price_hh  = p2_val > p1_val    # price made Higher High
    rsi_lh    = r2_val < r1_val    # RSI made Lower High

    if price_hh and rsi_lh:
        price_diff = ((p2_val - p1_val) / p1_val * 100)
        rsi_diff   = r1_val - r2_val  # how much RSI diverged
        strength   = "strong" if rsi_diff > 10 and price_diff > 5 else "moderate" if rsi_diff > 5 else "weak"
        log.info(f"Bearish divergence detected: price +{price_diff:.1f}%, RSI -{rsi_diff:.1f}")
        return {
            "divergence":  True,
            "strength":    strength,
            "price_diff":  price_diff,
            "rsi_diff":    rsi_diff,
            "rsi_current": rsi_series[-1] if rsi_series else 50
        }

    return {"divergence": False, "strength": "none",
            "rsi_current": rsi_series[-1] if rsi_series else 50}


def multi_timeframe_analysis(symbol: str) -> dict:
    """MTF with RSI divergence detection"""
    results = {}
    for tf in MTF_TIMEFRAMES:
        klines = get_klines(symbol, tf, limit=60)
        time.sleep(0.3)
        if not klines or len(klines) < 20:
            results[tf] = {"trend":"unknown","rsi":50,"momentum":0,"divergence":{}}
            continue

        closes  = [float(k[4]) for k in klines]
        highs   = [float(k[2]) for k in klines]
        volumes = [float(k[5]) for k in klines]

        ma20      = sum(closes[-20:]) / 20
        current   = closes[-1]
        trend     = "bullish" if current > ma20 else "bearish"

        rsi_series = calculate_rsi_series(closes)
        rsi        = rsi_series[-1] if rsi_series and rsi_series[-1] is not None else 50
        momentum   = ((closes[-1] - closes[-4]) / closes[-4] * 100) if len(closes) >= 4 and closes[-4] != 0 else 0

        avg_vol  = sum(volumes[-10:-1]) / 9 if len(volumes) >= 10 else 1
        vol_r    = volumes[-1] / avg_vol if avg_vol > 0 else 1

        # Divergence check on this timeframe
        divergence = detect_bearish_divergence(klines)

        results[tf] = {
            "trend":      trend,
            "rsi":        round(rsi, 1),
            "momentum":   round(momentum, 2),
            "vol_ratio":  round(vol_r, 2),
            "divergence": divergence
        }

    bearish_count   = sum(1 for tf in MTF_TIMEFRAMES if results[tf]["trend"] == "bearish")
    bullish_count   = sum(1 for tf in MTF_TIMEFRAMES if results[tf]["trend"] == "bullish")
    overbought      = sum(1 for tf in MTF_TIMEFRAMES if results[tf]["rsi"] > 70)
    div_count       = sum(1 for tf in MTF_TIMEFRAMES if results[tf]["divergence"].get("divergence"))
    strong_div      = sum(1 for tf in MTF_TIMEFRAMES if results[tf]["divergence"].get("strength") == "strong")

    short_confirm = bearish_count + overbought + div_count * 2  # divergence worth 2x
    pump_confirm  = bullish_count

    return {
        "timeframes":    results,
        "bearish_count": bearish_count,
        "bullish_count": bullish_count,
        "overbought":    overbought,
        "div_count":     div_count,
        "strong_div":    strong_div,
        "short_confirm": min(short_confirm, 9),  # cap at 9
        "pump_confirm":  pump_confirm
    }


def format_mtf_summary(mtf: dict) -> str:
    lines = []
    for tf, d in mtf["timeframes"].items():
        icon   = "🟢" if d["trend"] == "bullish" else "🔴"
        rsi_w  = "🔥OB" if d["rsi"] > 70 else "🧊OS" if d["rsi"] < 30 else ""
        div    = d.get("divergence", {})
        div_str = f" | ⚡DIV {div.get('strength','').upper()}" if div.get("divergence") else ""
        lines.append(f"  {icon} <b>{tf}</b>: RSI {d['rsi']} {rsi_w} | Mom {d['momentum']:+.1f}%{div_str}")
    sc = mtf['short_confirm']
    confirm_str = f"Short confirm: <b>{sc}/9</b> {'🔥' if sc >= 6 else '⚠️' if sc >= 3 else ''}"
    if mtf["div_count"] > 0:
        confirm_str += f" | Divergence: <b>{mtf['div_count']} TF</b> {'⚡STRONG' if mtf['strong_div'] > 0 else ''}"
    return "\n".join(lines) + f"\n{confirm_str}"


# ═══════════════════════════════════════════════════════════
# NEW v6: WHALE DETECTOR
# ═══════════════════════════════════════════════════════════

def detect_whale_activity(symbol: str) -> dict:
    """
    Analyze recent aggTrades for large whale transactions.
    Whale sell pressure = strong reversal confirmation.
    """
    trades = get_agg_trades(symbol)
    if not trades:
        return {"whale_detected": False}

    now_ms    = int(time.time() * 1000)
    window_ms = WHALE_WINDOW_S * 1000

    # Filter recent trades
    recent    = [t for t in trades if now_ms - int(t.get("T", 0)) <= window_ms]
    if not recent:
        recent = trades[-100:]  # fallback to last 100

    whale_buys = whale_sells = 0.0
    total_vol  = 0.0

    for t in recent:
        qty   = float(t.get("q", 0))
        price = float(t.get("p", 0))
        val   = qty * price
        total_vol += val
        is_sell = t.get("m", False)  # m=True means buyer is maker = sell
        if val >= WHALE_TRADE_USD:
            if is_sell:
                whale_sells += val
            else:
                whale_buys += val

    total_whale = whale_buys + whale_sells
    sell_ratio  = whale_sells / total_whale if total_whale > 0 else 0
    bearish     = sell_ratio >= WHALE_SELL_RATIO and total_whale >= WHALE_TRADE_USD

    log.info(f"Whale {symbol}: buy=${whale_buys:,.0f} sell=${whale_sells:,.0f} ratio={sell_ratio:.2f}")

    return {
        "whale_detected": total_whale >= WHALE_TRADE_USD,
        "bearish":        bearish,
        "whale_buys":     whale_buys,
        "whale_sells":    whale_sells,
        "sell_ratio":     sell_ratio,
        "total_vol":      total_vol,
        "trade_count":    len(recent)
    }


def format_whale_report(symbol: str) -> str:
    w = detect_whale_activity(symbol)
    if not w.get("whale_detected"):
        return f"🐋 <b>{symbol}</b>: Tidak ada aktivitas whale signifikan dalam 5 menit terakhir."

    sell_pct = w['sell_ratio'] * 100
    verdict  = "🔴 BEARISH — Whale sedang DUMP!" if w['bearish'] else "🟢 BULLISH — Whale sedang ACCUMULATE"
    return f"""🐋 <b>Whale Activity — {symbol}/USDT</b>

💚 Whale Buys: <b>${w['whale_buys']:,.0f}</b>
🔴 Whale Sells: <b>${w['whale_sells']:,.0f}</b>
📊 Sell ratio: <b>{sell_pct:.0f}%</b>
🔄 Total trades: <b>{w['trade_count']}</b>

{verdict}
{'⚠️ Konfirmasi kuat untuk SHORT!' if w['bearish'] else '⚠️ Hati-hati short, whale masih beli'}"""


# ═══════════════════════════════════════════════════════════
# ORDER BOOK LIQUIDITY
# ═══════════════════════════════════════════════════════════

def analyze_liquidity(symbol: str) -> dict:
    ob = get_order_book(symbol)
    if not ob or not ob.get("bids") or not ob.get("asks"):
        return {"liquid": False, "spread_pct": None, "bid_depth": 0, "ask_depth": 0}
    bids = [(float(p), float(q)) for p, q in ob["bids"][:10]]
    asks = [(float(p), float(q)) for p, q in ob["asks"][:10]]
    best_bid   = bids[0][0] if bids else 0
    best_ask   = asks[0][0] if asks else 0
    spread_pct = ((best_ask - best_bid) / best_bid * 100) if best_bid > 0 else 999
    bid_depth  = sum(p*q for p,q in bids)
    ask_depth  = sum(p*q for p,q in asks)
    liquid     = spread_pct <= MAX_SPREAD_PCT and bid_depth >= MIN_BID_DEPTH_USDT
    return {"liquid": liquid, "spread_pct": spread_pct, "bid_depth": bid_depth, "ask_depth": ask_depth}


# ═══════════════════════════════════════════════════════════
# COINGECKO
# ═══════════════════════════════════════════════════════════

@retry(max_attempts=3, delay=10, exceptions=(requests.RequestException,))
def get_coingecko_markets_page(page: int) -> list:
    r = requests.get(f"{COINGECKO_BASE}/coins/markets", params={
        "vs_currency":"usd","order":"percent_change_7d_desc",
        "per_page":100,"page":page,"sparkline":"false",
        "price_change_percentage":"24h,7d"
    }, timeout=30)
    if r.status_code == 429: time.sleep(60); raise requests.RequestException("Rate limited")
    r.raise_for_status(); return r.json()

def get_top_movers_cg() -> list:
    coins = []
    for page in range(1, 4):
        data = get_coingecko_markets_page(page)
        if not data: break
        coins.extend(data); time.sleep(2)
    return coins

@retry(max_attempts=3, delay=10, exceptions=(requests.RequestException,))
def get_coingecko_coin_detail(coin_id: str) -> dict:
    if coin_id in _cg_cache: return _cg_cache[coin_id]
    r = requests.get(f"{COINGECKO_BASE}/coins/{coin_id}", params={
        "localization":"false","tickers":"false","market_data":"true","community_data":"false"
    }, timeout=20)
    if r.status_code == 429: time.sleep(30); raise requests.RequestException("Rate limited")
    r.raise_for_status(); _cg_cache[coin_id] = r.json(); return _cg_cache[coin_id]

def get_accurate_mcap_and_supply(coin_id: str):
    try:
        d = get_coingecko_coin_detail(coin_id); md = d.get("market_data",{})
        mcap  = md.get("market_cap",{}).get("usd") or 0
        circ  = md.get("circulating_supply") or 0
        max_s = md.get("max_supply") or md.get("total_supply") or 0
        return mcap, (circ/max_s*100 if max_s > 0 else None)
    except: return 0, None

@retry(max_attempts=3, delay=5, exceptions=(requests.RequestException,))
def get_price_change_5d(coin_id: str):
    r = requests.get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params={
        "vs_currency":"usd","days":6,"interval":"daily"
    }, timeout=20)
    if r.status_code == 429: time.sleep(30); raise requests.RequestException("Rate limited")
    r.raise_for_status()
    prices = r.json().get("prices",[])
    if len(prices) < 2: return None
    p0,p1 = prices[0][1],prices[-1][1]
    return ((p1-p0)/p0*100) if p0 != 0 else None


# ═══════════════════════════════════════════════════════════
# SUPABASE
# ═══════════════════════════════════════════════════════════

def already_alerted(symbol: str, signal_type: str, cooldown_h: float = None) -> bool:
    if cooldown_h is None: cooldown_h = ALERT_COOLDOWN_H
    try:
        res = supabase.table("alerts_log").select("created_at") \
            .eq("symbol",symbol).eq("signal_type",signal_type) \
            .order("created_at",desc=True).limit(1).execute()
        if res.data:
            last = datetime.fromisoformat(res.data[0]["created_at"].replace("Z","+00:00"))
            return (datetime.now(timezone.utc)-last).total_seconds()/3600 < cooldown_h
    except Exception as e: log.error(f"Supabase: {e}")
    return False

def log_alert(symbol: str, signal_type: str, data: dict):
    try:
        supabase.table("alerts_log").insert({
            "symbol":symbol,"signal_type":signal_type,
            "gain_5d":data.get("gain_5d"),"supply_ratio":data.get("supply_ratio"),
            "funding_rate":data.get("funding_rate"),"price":data.get("price"),
            "created_at":datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e: log.error(f"Log alert: {e}")


# ═══════════════════════════════════════════════════════════
# INTERACTIVE COMMANDS
# ═══════════════════════════════════════════════════════════

def scan_single_coin(symbol: str) -> str:
    try:
        fut      = get_binance_futures_symbols() or set()
        on_fut   = symbol in fut
        funding  = get_funding_rate(symbol) if on_fut else None
        mtf      = multi_timeframe_analysis(symbol)
        liq      = analyze_liquidity(symbol) if on_fut else {}
        whale    = detect_whale_activity(symbol) if on_fut else {}
        atr_lvl  = get_atr_levels(symbol) if on_fut else {}
        ticker   = _binance_get("ticker/24hr", {"symbol":f"{symbol}USDT"})
        price    = float(ticker.get("lastPrice",0)) if ticker else 0
        gain_24h = float(ticker.get("priceChangePercent",0)) if ticker else 0
        high_24h = float(ticker.get("highPrice",0)) if ticker else 0
        chart    = get_chart_url(symbol)

        liq_line   = f"✅ spread {liq['spread_pct']:.2f}%, bid ${liq['bid_depth']:,.0f}" if liq.get("liquid") else f"⚠️ Low liq" if liq.get("spread_pct") else "N/A"
        fund_line  = f"{funding:+.4f}%" if funding is not None else "N/A"
        whale_line = f"🐋 {'🔴DUMP' if whale.get('bearish') else '🟢ACC'} (sell {whale['sell_ratio']*100:.0f}%)" if whale.get("whale_detected") else "🐋 No whale activity"
        atr_line   = f"📐 SL ${atr_lvl['sl']:,.6g} | TP ${atr_lvl['tp']:,.6g} (1:{atr_lvl['rr']:.1f})" if atr_lvl else ""

        return f"""🔍 <b>Scan: {symbol}/USDT</b>

💰 <b>${price:,.8g}</b> | {gain_24h:+.2f}% (24h)
🏔 High: ${high_24h:,.8g}
💸 Funding: {fund_line}
💧 Liquidity: {liq_line}
{whale_line}
{atr_line}

<b>Multi-Timeframe:</b>
{format_mtf_summary(mtf)}

{'✅ Binance Futures' if on_fut else '❌ Tidak di Futures'}
📉 <a href="{chart}">Chart TradingView</a>"""
    except Exception as e:
        return f"❌ Error: {e}"


def check_short_viability(symbol: str) -> str:
    try:
        fut = get_binance_futures_symbols() or set()
        if symbol not in fut:
            return f"❌ {symbol} tidak ada di Binance Futures."

        funding  = get_funding_rate(symbol)
        liq      = analyze_liquidity(symbol)
        mtf      = multi_timeframe_analysis(symbol)
        whale    = detect_whale_activity(symbol)
        atr_lvl  = get_atr_levels(symbol)
        ticker   = _binance_get("ticker/24hr", {"symbol":f"{symbol}USDT"})
        price    = float(ticker.get("lastPrice",0)) if ticker else 0
        gain_24h = float(ticker.get("priceChangePercent",0)) if ticker else 0
        high_24h = float(ticker.get("highPrice",0)) if ticker else 0
        drop_pct = ((high_24h-price)/high_24h*100) if high_24h > 0 else 0

        score = 0; reasons = []

        if gain_24h >= 30:
            score += 1; reasons.append(f"✅ Pump hari ini: +{gain_24h:.1f}%")
        if drop_pct >= 5:
            score += 1; reasons.append(f"✅ Drop dari high: -{drop_pct:.1f}% (reversal)")
        if funding and funding > 0.05:
            score += 1; reasons.append(f"✅ Funding +{funding:.4f}% (longs paying)")
        elif funding and funding < LOW_FUNDING_RATE:
            reasons.append(f"⚠️ Funding {funding:.4f}% — squeeze risk!")
        if liq["liquid"]:
            score += 1; reasons.append(f"✅ Liquid (spread {liq['spread_pct']:.2f}%)")
        else:
            reasons.append(f"⚠️ Low liquidity")
        if mtf["short_confirm"] >= 4:
            score += 1; reasons.append(f"✅ MTF bearish confirm ({mtf['short_confirm']}/9)")
        if mtf["div_count"] > 0:
            score += 1; reasons.append(f"✅ RSI Bearish Divergence ({mtf['div_count']} TF{'⚡' if mtf['strong_div'] else ''})")
        if whale.get("bearish"):
            score += 1; reasons.append(f"✅ Whale DUMPING (sell {whale['sell_ratio']*100:.0f}%)")

        verdict = "🟢 LAYAK SHORT" if score >= 4 else "🟡 TUNGGU" if score >= 2 else "🔴 SKIP"
        atr_line = f"\n📐 SL: ${atr_lvl['sl']:,.6g} | TP: ${atr_lvl['tp']:,.6g}" if atr_lvl else ""
        chart = get_chart_url(symbol)

        return f"""⚠️ <b>Short Check: {symbol}/USDT</b>

💰 ${price:,.8g} | +{gain_24h:.1f}% | -{drop_pct:.1f}% dari high

<b>Checklist:</b>
{chr(10).join(reasons)}

<b>Score: {score}/7 → {verdict}</b>{atr_line}
{'🎯 Akumulasi $5 x3' if score >= 4 else '⏳ Tunggu lebih banyak konfirmasi'}
📉 <a href="{chart}">Chart</a>"""
    except Exception as e:
        return f"❌ Error: {e}"


def get_top_gainers_summary() -> str:
    try:
        fut = get_binance_futures_symbols() or set()
        top = [t for t in get_binance_top_movers() if t["symbol"].replace("USDT","") in fut][:5]
        if not top: return "❌ Tidak ada data."
        lines = [f"📈 <b>Top 5 — {datetime.now(timezone.utc).strftime('%H:%M')} UTC</b>\n"]
        for i, t in enumerate(top, 1):
            sym = t["symbol"].replace("USDT","")
            g   = float(t.get("priceChangePercent",0))
            p   = float(t.get("lastPrice",0))
            v   = float(t.get("quoteVolume",0))
            lines.append(f"{i}. <a href='{get_chart_url(sym)}'><b>{sym}</b></a> {g:+.1f}% | ${p:,.6g} | Vol ${v/1e6:.1f}M")
        lines.append("\n💡 /short &lt;SYMBOL&gt; untuk cek kelayakan")
        return "\n".join(lines)
    except Exception as e: return f"❌ Error: {e}"


# ═══════════════════════════════════════════════════════════
# ALERT FORMATTERS
# ═══════════════════════════════════════════════════════════

def format_pump_5d(data: dict) -> tuple:
    gain=data["gain_5d"]; supply=data.get("supply_ratio"); funding=data.get("funding_rate")
    price=data["price"]; mcap=data.get("market_cap",0); symbol=data["symbol"]
    liq=data.get("liquidity",{}); mtf=data.get("mtf",{}); atr=data.get("atr",{})
    chart=get_chart_url(symbol)

    supply_line  = f"📦 Supply: <b>{supply:.1f}%</b> {'⚠️ LOW' if supply<LOW_SUPPLY_RATIO else '✅'}" if supply else "📦 Supply: N/A"
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b>" if funding is not None else "💸 Funding: N/A"
    liq_line     = f"💧 {'✅ Liquid' if liq.get('liquid') else '⚠️ Low liq'}"
    mtf_line     = f"📊 MTF bullish: {mtf.get('bullish_count',0)}/3" if mtf else ""
    atr_line     = f"📐 SL ${atr['sl']:,.6g} | TP ${atr['tp']:,.6g}" if atr else ""

    score = sum([gain>=PUMP_GAIN_5D, bool(supply and supply<LOW_SUPPLY_RATIO),
                 bool(funding and funding>0.05), bool(liq.get("liquid")),
                 bool(mtf and mtf.get("bullish_count",0)>=2)])
    strength = "🔥🔥🔥" if score>=4 else "🔥🔥" if score>=2 else "🔥"
    return f"""{strength} <b>PUMP (5D) — {data['name']} ({symbol})</b>

💰 <b>${price:,.8g}</b> | MCap {_mcap_str(mcap)}
📈 Gain 5D: <b>+{gain:.1f}%</b>
{supply_line}
{funding_line}
{liq_line}
{mtf_line}
{atr_line}

⚡ Score: {score}/5
📉 <a href="{chart}">Chart</a>""", score


def format_short_5d(data: dict) -> tuple:
    gain=data["gain_5d"]; supply=data.get("supply_ratio"); funding=data.get("funding_rate")
    price=data["price"]; mcap=data.get("market_cap",0); symbol=data["symbol"]
    liq=data.get("liquidity",{}); mtf=data.get("mtf",{}); atr=data.get("atr",{})
    whale=data.get("whale",{}); chart=get_chart_url(symbol)

    supply_line  = f"📦 Supply: <b>{supply:.1f}%</b> {'🚨 VERY LOW' if supply and supply<25 else '⚠️ LOW'}" if supply else "📦 N/A"
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b> {'🩸 Squeeze risk!' if funding and funding<LOW_FUNDING_RATE else '✅'}" if funding is not None else "💸 N/A"
    liq_line     = f"💧 {'✅ Liquid' if liq.get('liquid') else '⚠️ Low liq'}"
    div_count    = mtf.get("div_count",0) if mtf else 0
    mtf_line     = f"📊 MTF short: {mtf.get('short_confirm',0)}/9 | Divergence: {div_count} TF {'⚡' if mtf.get('strong_div') else ''}" if mtf else ""
    whale_line   = f"🐋 {'🔴 WHALE DUMPING!' if whale.get('bearish') else '🟡 whale activity'}" if whale.get("whale_detected") else ""
    atr_line     = f"📐 SL ${atr['sl']:,.6g} | TP ${atr['tp']:,.6g} (1:{atr['rr']:.1f})" if atr else ""

    score = sum([gain>=SHORT_GAIN_5D, bool(supply and supply<LOW_SUPPLY_RATIO),
                 bool(funding and funding<LOW_FUNDING_RATE), bool(liq.get("liquid")),
                 bool(mtf and mtf.get("short_confirm",0)>=4),
                 bool(div_count>0), bool(whale.get("bearish"))])
    danger = "⚠️⚠️⚠️" if score>=5 else "⚠️⚠️" if score>=3 else "⚠️"
    return f"""{danger} <b>SHORT (5D) — {data['name']} ({symbol})</b>

💰 <b>${price:,.8g}</b> | MCap {_mcap_str(mcap)}
📈 Pump 5D: <b>+{gain:.1f}%</b>
{supply_line}
{funding_line}
{liq_line}
{mtf_line}
{whale_line}
{atr_line}
✅ Binance Futures

⚠️ Score: {score}/7
{'⛔ TUNGGU — squeeze risk!' if funding and funding<LOW_FUNDING_RATE else '🎯 $5 x3 bertahap'}
📉 <a href="{chart}">Chart</a>""", score


# ═══════════════════════════════════════════════════════════
# MODE 1 — 5-DAY SCAN
# ═══════════════════════════════════════════════════════════

def run_5d_scan():
    log.info("=== MODE 1: 5D scan v6 ===")
    handle_telegram_commands()
    send_telegram("🔍 <b>Scanner v6 ULTIMATE (5D)...</b>")

    futures_symbols = get_binance_futures_symbols() or set()
    coins = get_top_movers_cg()
    pump_found = short_found = filtered = 0

    for coin in coins:
        coin_id=coin.get("id",""); name=coin.get("name",""); symbol=coin.get("symbol","").upper()
        price=coin.get("current_price") or 0; volume=coin.get("total_volume") or 0
        mcap=coin.get("market_cap") or 0; gain_7d=coin.get("price_change_percentage_7d_in_currency") or 0
        on_fut=symbol in futures_symbols

        if volume < MIN_VOLUME_USD: continue
        if mcap < MIN_MARKET_CAP: filtered += 1; continue
        if any(x in symbol for x in ["USD","DAI","USDC","BUSD","TUSD","FDUSD"]): continue
        if gain_7d < PUMP_GAIN_5D: continue

        log.info(f"Checking {symbol}: +{gain_7d:.1f}% (7d)")
        accurate_mcap, supply_ratio = get_accurate_mcap_and_supply(coin_id)
        if accurate_mcap > 0: mcap = accurate_mcap
        time.sleep(1)

        gain_5d = get_price_change_5d(coin_id) or gain_7d
        time.sleep(1.5)
        if gain_5d < PUMP_GAIN_5D: continue

        funding  = get_funding_rate(symbol) if on_fut else None
        liq      = analyze_liquidity(symbol) if on_fut else {}
        mtf      = multi_timeframe_analysis(symbol) if on_fut else {}
        whale    = detect_whale_activity(symbol) if on_fut else {}
        atr_lvl  = get_atr_levels(symbol) if on_fut else {}

        data = {"id":coin_id,"name":name,"symbol":symbol,"gain_5d":gain_5d,
                "supply_ratio":supply_ratio,"funding_rate":funding,"price":price,
                "market_cap":mcap,"on_futures":on_fut,"liquidity":liq,
                "mtf":mtf,"whale":whale,"atr":atr_lvl}

        cooldown = get_adaptive_cooldown(gain_5d, "PUMP")
        msg, score = format_pump_5d(data)
        if should_send_alert(score) and not already_alerted(symbol, "PUMP", cooldown):
            send_telegram(msg); log_alert(symbol,"PUMP",data); pump_found += 1; time.sleep(1)

        if gain_5d >= SHORT_GAIN_5D and on_fut and mcap >= MIN_SHORT_MCAP:
            msg, score = format_short_5d(data)
            cooldown = get_adaptive_cooldown(gain_5d, "SHORT")
            if score >= 1 and should_send_alert(score) and not already_alerted(symbol,"SHORT",cooldown):
                send_telegram(msg); log_alert(symbol,"SHORT",data); short_found += 1; time.sleep(1)

    quiet = " [QUIET]" if is_quiet_hours() else ""
    send_telegram(f"""📊 <b>5D Done — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC</b>{quiet}
🔥 Pump: <b>{pump_found}</b> | ⚠️ Short: <b>{short_found}</b>
🔍 Scanned: <b>{len(coins)}</b> | Filtered: <b>{filtered}</b>
💡 /scan /short /top /whale /atr""")


# ═══════════════════════════════════════════════════════════
# MODE 2 — INTRADAY
# ═══════════════════════════════════════════════════════════

def run_intraday_scan():
    log.info("=== MODE 2: Intraday v6 ===")
    handle_telegram_commands()

    futures_symbols = get_binance_futures_symbols() or set()
    tickers = get_binance_top_movers()
    if not tickers: return

    pump_now = reversal = 0
    for ticker in tickers[:50]:
        symbol   = ticker["symbol"].replace("USDT","")
        price    = float(ticker.get("lastPrice",0))
        gain_24h = float(ticker.get("priceChangePercent",0))
        high_24h = float(ticker.get("highPrice",0))

        if symbol not in futures_symbols: continue
        if gain_24h < INTRADAY_GAIN_24H: continue

        klines   = get_klines(symbol, "1d", limit=8)
        vols     = [float(k[5]) for k in klines] if klines else []
        avg_vol  = sum(vols[:-1])/len(vols[:-1]) if len(vols)>1 else 1
        vol_mult = vols[-1]/avg_vol if (vols and avg_vol>0) else None

        funding  = get_funding_rate(symbol)
        liq      = analyze_liquidity(symbol)
        mtf      = multi_timeframe_analysis(symbol)
        whale    = detect_whale_activity(symbol)
        atr_lvl  = get_atr_levels(symbol, "1h")
        time.sleep(0.5)

        # PUMP NOW
        if vol_mult and vol_mult >= VOLUME_SPIKE_MULT:
            score = sum([gain_24h>=100, vol_mult>=VOLUME_SPIKE_MULT*2,
                         bool(liq.get("liquid")), mtf.get("bullish_count",0)>=2])
            if should_send_alert(score) and not already_alerted(symbol,"PUMP_NOW",get_adaptive_cooldown(gain_24h,"PUMP_NOW")):
                chart = get_chart_url(symbol)
                atr_line = f"📐 SL ${atr_lvl['sl']:,.6g} | TP ${atr_lvl['tp']:,.6g}" if atr_lvl else ""
                whale_line = f"🐋 {'🟢 Whale ACC' if not whale.get('bearish') else '🔴 Whale DUMP'}" if whale.get("whale_detected") else ""
                send_telegram(f"""⚡ <b>PUMP NOW — {symbol}/USDT</b>

💰 <b>${price:,.8g}</b> | +{gain_24h:.1f}% (24h)
📊 Volume: <b>{vol_mult:.1f}x</b> 🚨
💧 {'✅ Liquid' if liq.get('liquid') else '⚠️ Low liq'}
{whale_line}
{atr_line}
📉 High: ${high_24h:,.8g}

⚡ Score {score}/4 — tunggu reversal dulu
📉 <a href="{chart}">Chart</a>""")
                log_alert(symbol,"PUMP_NOW",{"price":price,"gain_5d":gain_24h}); pump_now+=1; time.sleep(1)

        # REVERSAL
        if high_24h > 0:
            drop = (high_24h-price)/high_24h*100
            if drop >= REVERSAL_DROP_PCT:
                div_count = mtf.get("div_count",0)
                score = sum([drop>=15, bool(funding and funding>0),
                             bool(liq.get("liquid")), mtf.get("short_confirm",0)>=4,
                             bool(div_count>0), bool(whale.get("bearish"))])
                if should_send_alert(score) and not already_alerted(symbol,"REVERSAL",get_adaptive_cooldown(gain_24h,"REVERSAL")):
                    chart = get_chart_url(symbol)
                    atr_line  = f"📐 SL ${atr_lvl['sl']:,.6g} | TP ${atr_lvl['tp']:,.6g} (1:{atr_lvl['rr']:.1f})" if atr_lvl else ""
                    whale_line = f"🐋 🔴 WHALE DUMPING! ({whale['sell_ratio']*100:.0f}% sell)" if whale.get("bearish") else ""
                    div_line   = f"⚡ RSI Divergence: {div_count} TF {'STRONG' if mtf.get('strong_div') else ''}" if div_count else ""
                    send_telegram(f"""🔻 <b>REVERSAL — {symbol}/USDT</b>

💰 <b>${price:,.8g}</b> | +{gain_24h:.1f}% | -{drop:.1f}% dari high
💸 Funding: {f'{funding:+.4f}%' if funding else 'N/A'}
{whale_line}
{div_line}
{atr_line}

⚠️ Score: {score}/6
🎯 $5 x3 bertahap
📉 <a href="{chart}">Chart</a>""")
                    log_alert(symbol,"REVERSAL",{"price":price,"gain_5d":gain_24h}); reversal+=1; time.sleep(1)

    if pump_now>0 or reversal>0:
        send_telegram(f"""⚡ <b>Intraday — {datetime.now(timezone.utc).strftime('%H:%M')} UTC</b>
🚀 Pump now: <b>{pump_now}</b> | 🔻 Reversal: <b>{reversal}</b>
💡 /whale /atr /short untuk detail""")


# ═══════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "5d"
    log.info(f"v6 ULTIMATE — mode={mode}")
    if mode == "intraday":   run_intraday_scan()
    elif mode == "commands": handle_telegram_commands()
    else:                    run_5d_scan()
