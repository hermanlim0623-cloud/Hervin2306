"""
Crypto Signal Scanner
Detects potential PUMP and SHORT opportunities
Sends alerts to Telegram
"""

import os
import time
import requests
from datetime import datetime, timezone
from supabase import create_client

# ─── CONFIG ──────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID   = os.environ["TELEGRAM_CHAT_ID"]
SUPABASE_URL       = os.environ["SUPABASE_URL"]
SUPABASE_KEY       = os.environ["SUPABASE_KEY"]

BINANCE_BASE   = "https://api.binance.com/api/v3"
BINANCE_FAPI   = "https://fapi.binance.com/fapi/v1"   # Futures

# ─── THRESHOLDS ──────────────────────────────────────────
PUMP_GAIN_5D        = 300    # % gain in 5 days → pump candidate
SHORT_GAIN_5D       = 500    # % gain in 5 days → short candidate (higher bar)
LOW_SUPPLY_RATIO    = 30     # circulating < 30% of max supply
HIGH_FUNDING_RATE   = 0.05   # % per 8h (positive = longs paying = overbought)
LOW_FUNDING_RATE    = -0.05  # % per 8h (negative = shorts paying = squeeze risk)
ALERT_COOLDOWN_H    = 12     # hours before same coin can alert again

# ─── SUPABASE CLIENT ─────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ═══════════════════════════════════════════════════════════
# BINANCE DATA FETCHERS
# ═══════════════════════════════════════════════════════════

def get_all_usdt_pairs():
    """Get all USDT spot pairs from Binance"""
    r = requests.get(f"{BINANCE_BASE}/ticker/24hr", timeout=30)
    r.raise_for_status()
    tickers = r.json()
    return [t for t in tickers if t["symbol"].endswith("USDT") and float(t["quoteVolume"]) > 500_000]


def get_klines_5d(symbol):
    """Get daily candles for last 6 days"""
    r = requests.get(f"{BINANCE_BASE}/klines", params={
        "symbol": symbol, "interval": "1d", "limit": 6
    }, timeout=15)
    if r.status_code != 200:
        return None
    return r.json()


def calc_gain_5d(klines):
    """Calculate % gain from 5 days ago close to current price"""
    if not klines or len(klines) < 6:
        return None
    price_5d_ago = float(klines[0][4])   # close of 5d ago candle
    price_now    = float(klines[-1][4])  # close of latest candle
    if price_5d_ago == 0:
        return None
    return ((price_now - price_5d_ago) / price_5d_ago) * 100


def get_funding_rate(symbol):
    """Get current funding rate from Binance Futures"""
    try:
        r = requests.get(f"{BINANCE_FAPI}/premiumIndex", params={"symbol": symbol}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return float(data.get("lastFundingRate", 0)) * 100  # convert to %
    except Exception:
        pass
    return None


def get_coingecko_supply(symbol_binance):
    """Get circulating vs max supply from CoinGecko"""
    coin_id = symbol_binance.replace("USDT", "").lower()
    try:
        # Try search first
        r = requests.get(
            "https://api.coingecko.com/api/v3/search",
            params={"query": coin_id}, timeout=10
        )
        if r.status_code != 200:
            return None, None
        results = r.json().get("coins", [])
        if not results:
            return None, None

        cg_id = results[0]["id"]
        r2 = requests.get(
            f"https://api.coingecko.com/api/v3/coins/{cg_id}",
            params={"localization": "false", "tickers": "false",
                    "market_data": "true", "community_data": "false"},
            timeout=15
        )
        if r2.status_code != 200:
            return None, None

        data      = r2.json()
        market    = data.get("market_data", {})
        circ      = market.get("circulating_supply")
        max_sup   = market.get("max_supply") or market.get("total_supply")

        if circ and max_sup and max_sup > 0:
            ratio = (circ / max_sup) * 100
            return ratio, cg_id
    except Exception:
        pass
    return None, None


# ═══════════════════════════════════════════════════════════
# SUPABASE HELPERS
# ═══════════════════════════════════════════════════════════

def already_alerted(symbol, signal_type):
    """Check if we already sent this alert within cooldown window"""
    try:
        result = supabase.table("alerts_log").select("created_at") \
            .eq("symbol", symbol) \
            .eq("signal_type", signal_type) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if result.data:
            last_str  = result.data[0]["created_at"]
            last_time = datetime.fromisoformat(last_str.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
            return hours_ago < ALERT_COOLDOWN_H
    except Exception:
        pass
    return False


def log_alert(symbol, signal_type, data: dict):
    """Save alert to Supabase"""
    try:
        supabase.table("alerts_log").insert({
            "symbol":      symbol,
            "signal_type": signal_type,
            "gain_5d":     data.get("gain_5d"),
            "supply_ratio":data.get("supply_ratio"),
            "funding_rate":data.get("funding_rate"),
            "price":       data.get("price"),
            "created_at":  datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        print(f"[SUPABASE] Log error: {e}")


# ═══════════════════════════════════════════════════════════
# TELEGRAM
# ═══════════════════════════════════════════════════════════

def send_telegram(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(url, json={
        "chat_id":    TELEGRAM_CHAT_ID,
        "text":       text,
        "parse_mode": "HTML"
    }, timeout=15)


def format_pump_alert(symbol, data):
    gain    = data["gain_5d"]
    supply  = data.get("supply_ratio")
    funding = data.get("funding_rate")
    price   = data["price"]

    supply_line  = f"📦 Circulating Supply: <b>{supply:.1f}%</b> dari max supply {'⚠️ LOW' if supply and supply < LOW_SUPPLY_RATIO else ''}" if supply else "📦 Supply data: N/A"
    funding_line = f"💸 Funding Rate: <b>{funding:+.4f}%</b>" if funding is not None else "💸 Funding Rate: N/A"

    score = 0
    if gain >= PUMP_GAIN_5D: score += 1
    if supply and supply < LOW_SUPPLY_RATIO: score += 1
    if funding is not None and funding > HIGH_FUNDING_RATE: score += 1
    strength = "🔥🔥🔥" if score >= 3 else "🔥🔥" if score == 2 else "🔥"

    return f"""
{strength} <b>PUMP SIGNAL — {symbol}</b>

💰 Harga: <b>${price:.6f}</b>
📈 Gain 5 hari: <b>+{gain:.1f}%</b>
{supply_line}
{funding_line}

⚡ Signal score: {score}/3
📊 <a href="https://www.binance.com/en/trade/{symbol.replace('USDT','')}_USDT">Lihat di Binance</a>

Reply <b>/detail {symbol}</b> untuk analisis lengkap.
"""


def format_short_alert(symbol, data):
    gain    = data["gain_5d"]
    supply  = data.get("supply_ratio")
    funding = data.get("funding_rate")
    price   = data["price"]

    supply_line  = f"📦 Circulating Supply: <b>{supply:.1f}%</b> dari max supply {'🚨 VERY LOW' if supply and supply < 25 else '⚠️ LOW'}" if supply else "📦 Supply data: N/A"
    funding_line = f"💸 Funding Rate: <b>{funding:+.4f}%</b> {'🩸 Shorts paying = squeeze risk masih ada' if funding and funding < LOW_FUNDING_RATE else ''}" if funding is not None else "💸 Funding Rate: N/A"

    score = 0
    if gain >= SHORT_GAIN_5D: score += 1
    if supply and supply < LOW_SUPPLY_RATIO: score += 1
    if funding is not None and funding < LOW_FUNDING_RATE: score += 1
    danger = "⚠️⚠️⚠️" if score >= 3 else "⚠️⚠️" if score == 2 else "⚠️"

    return f"""
{danger} <b>SHORT WATCH — {symbol}</b>

💰 Harga: <b>${price:.6f}</b>
📈 Pump 5 hari: <b>+{gain:.1f}%</b>
{supply_line}
{funding_line}

⚠️ Signal score: {score}/3
⚠️ <b>Jangan short dulu jika funding rate masih sangat negatif!</b>
📊 <a href="https://www.binance.com/en/trade/{symbol.replace('USDT','')}_USDT">Lihat di Binance</a>

Reply <b>/detail {symbol}</b> untuk analisis lengkap.
🎯 Budget: $5 x3 akumulasi — tunggu konfirmasi dulu.
"""


# ═══════════════════════════════════════════════════════════
# MAIN SCANNER
# ═══════════════════════════════════════════════════════════

def run_scan():
    print(f"\n[{datetime.now()}] Memulai scan...")
    tickers = get_all_usdt_pairs()
    print(f"Total pairs: {len(tickers)}")

    pump_found  = 0
    short_found = 0

    for i, ticker in enumerate(tickers):
        symbol = ticker["symbol"]
        price  = float(ticker["lastPrice"])

        # Skip stablecoins & wrapped tokens
        if any(x in symbol for x in ["BUSD", "USDC", "DAI", "TUSD", "FDUSD", "WBTC", "WETH"]):
            continue

        try:
            klines = get_klines_5d(symbol)
            gain   = calc_gain_5d(klines)

            if gain is None or gain < PUMP_GAIN_5D:
                continue

            print(f"  [{i}] {symbol}: +{gain:.1f}% in 5d — checking details...")

            # Get additional data
            supply_ratio, cg_id = get_coingecko_supply(symbol)
            funding_rate         = get_funding_rate(symbol)

            data = {
                "gain_5d":      gain,
                "supply_ratio": supply_ratio,
                "funding_rate": funding_rate,
                "price":        price
            }

            # ── PUMP SIGNAL ─────────────────────────────────
            if gain >= PUMP_GAIN_5D:
                if not already_alerted(symbol, "PUMP"):
                    msg = format_pump_alert(symbol, data)
                    send_telegram(msg)
                    log_alert(symbol, "PUMP", data)
                    pump_found += 1
                    print(f"  → PUMP alert sent: {symbol}")

            # ── SHORT SIGNAL ─────────────────────────────────
            if gain >= SHORT_GAIN_5D:
                # More aggressive short signal: low supply + high gain
                short_score = 0
                if supply_ratio and supply_ratio < LOW_SUPPLY_RATIO: short_score += 1
                if funding_rate is not None and funding_rate < LOW_FUNDING_RATE: short_score += 1
                if gain >= 800: short_score += 1  # extreme pump = higher dump probability

                if short_score >= 1:  # at least 1 extra red flag
                    if not already_alerted(symbol, "SHORT"):
                        msg = format_short_alert(symbol, data)
                        send_telegram(msg)
                        log_alert(symbol, "SHORT", data)
                        short_found += 1
                        print(f"  → SHORT alert sent: {symbol}")

            time.sleep(0.5)  # rate limit courtesy

        except Exception as e:
            print(f"  Error on {symbol}: {e}")
            continue

    # Summary
    summary = f"""
📊 <b>Scan selesai — {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC</b>

🔥 Pump signals: <b>{pump_found}</b>
⚠️ Short watches: <b>{short_found}</b>
🔍 Total pairs scanned: <b>{len(tickers)}</b>
"""
    send_telegram(summary)
    print(f"\nDone. Pump: {pump_found}, Short: {short_found}")


if __name__ == "__main__":
    run_scan()
