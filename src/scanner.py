"""
Crypto Signal Scanner v2
- Filter minimum market cap $10M
- Only alert coins available on Binance Futures (shortable)
- Pump & Short signals via Telegram
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

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
BINANCE_FAPI   = "https://fapi.binance.com/fapi/v1"

# ─── THRESHOLDS ──────────────────────────────────────────
PUMP_GAIN_5D      = 300
SHORT_GAIN_5D     = 500
LOW_SUPPLY_RATIO  = 30
LOW_FUNDING_RATE  = -0.05
ALERT_COOLDOWN_H  = 12
MIN_VOLUME_USD    = 1_000_000
MIN_MARKET_CAP    = 10_000_000   # minimum $10M market cap
MIN_SHORT_MCAP    = 50_000_000   # minimum $50M untuk short (lebih liquid)

# ─── SUPABASE CLIENT ─────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ═══════════════════════════════════════════════════════════
# BINANCE FUTURES — get all shortable symbols
# ═══════════════════════════════════════════════════════════

def get_binance_futures_symbols():
    """Get all symbols available on Binance Futures (these can be shorted)"""
    try:
        r = requests.get(f"{BINANCE_FAPI}/exchangeInfo", timeout=20)
        if r.status_code == 200:
            symbols = set()
            for s in r.json().get("symbols", []):
                if s.get("status") == "TRADING" and s.get("quoteAsset") == "USDT":
                    # strip USDT → e.g. BTCUSDT → BTC
                    base = s["baseAsset"].upper()
                    symbols.add(base)
            print(f"Binance Futures: {len(symbols)} shortable symbols loaded")
            return symbols
    except Exception as e:
        print(f"Error fetching Binance Futures symbols: {e}")
    return set()


# ═══════════════════════════════════════════════════════════
# COINGECKO DATA FETCHERS
# ═══════════════════════════════════════════════════════════

def get_top_movers():
    """Get coins sorted by 7d gain from CoinGecko (top 300)"""
    coins = []
    for page in range(1, 4):
        try:
            r = requests.get(f"{COINGECKO_BASE}/coins/markets", params={
                "vs_currency":             "usd",
                "order":                   "percent_change_7d_desc",
                "per_page":                100,
                "page":                    page,
                "sparkline":               "false",
                "price_change_percentage": "24h,7d",
            }, timeout=30)
            if r.status_code == 429:
                print("Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            if r.status_code != 200:
                break
            data = r.json()
            if not data:
                break
            coins.extend(data)
            time.sleep(2)
        except Exception as e:
            print(f"Error page {page}: {e}")
            break
    return coins


def get_price_change_5d(coin_id):
    """Get precise 5-day price change"""
    try:
        r = requests.get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params={
            "vs_currency": "usd", "days": 6, "interval": "daily"
        }, timeout=20)
        if r.status_code == 429:
            time.sleep(30)
            return None
        if r.status_code != 200:
            return None
        prices = r.json().get("prices", [])
        if len(prices) < 2:
            return None
        p0 = prices[0][1]
        p1 = prices[-1][1]
        if p0 == 0:
            return None
        return ((p1 - p0) / p0) * 100
    except Exception:
        return None


def get_funding_rate(symbol):
    """Get current funding rate from Binance Futures"""
    try:
        r = requests.get(f"{BINANCE_FAPI}/premiumIndex",
                         params={"symbol": f"{symbol}USDT"}, timeout=10)
        if r.status_code == 200:
            return float(r.json().get("lastFundingRate", 0)) * 100
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════════════════
# SUPABASE HELPERS
# ═══════════════════════════════════════════════════════════

def already_alerted(symbol, signal_type):
    try:
        result = supabase.table("alerts_log").select("created_at") \
            .eq("symbol", symbol).eq("signal_type", signal_type) \
            .order("created_at", desc=True).limit(1).execute()
        if result.data:
            last_str  = result.data[0]["created_at"]
            last_time = datetime.fromisoformat(last_str.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
            return hours_ago < ALERT_COOLDOWN_H
    except Exception:
        pass
    return False


def log_alert(symbol, signal_type, data: dict):
    try:
        supabase.table("alerts_log").insert({
            "symbol":       symbol,
            "signal_type":  signal_type,
            "gain_5d":      data.get("gain_5d"),
            "supply_ratio": data.get("supply_ratio"),
            "funding_rate": data.get("funding_rate"),
            "price":        data.get("price"),
            "created_at":   datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        print(f"[SUPABASE] {e}")


# ═══════════════════════════════════════════════════════════
# TELEGRAM
# ═══════════════════════════════════════════════════════════

def send_telegram(text):
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
            timeout=15
        )
    except Exception as e:
        print(f"Telegram error: {e}")


def format_pump_alert(data):
    gain     = data["gain_5d"]
    supply   = data.get("supply_ratio")
    funding  = data.get("funding_rate")
    price    = data["price"]
    mcap     = data.get("market_cap", 0)
    on_fut   = data.get("on_futures", False)

    supply_line  = f"📦 Supply beredar: <b>{supply:.1f}%</b> dari max {'⚠️ LOW' if supply < LOW_SUPPLY_RATIO else '✅ Normal'}" if supply else "📦 Supply: N/A"
    funding_line = f"💸 Funding Rate: <b>{funding:+.4f}%</b>" if funding is not None else "💸 Funding Rate: N/A"
    mcap_str     = f"${mcap/1_000_000:.1f}M" if mcap < 1_000_000_000 else f"${mcap/1_000_000_000:.2f}B"
    futures_tag  = "✅ Ada di Binance Futures (bisa short)" if on_fut else "❌ Tidak ada di Futures"

    score = sum([
        gain >= PUMP_GAIN_5D,
        bool(supply and supply < LOW_SUPPLY_RATIO),
        bool(funding is not None and funding > 0.05)
    ])
    strength = "🔥🔥🔥" if score >= 3 else "🔥🔥" if score == 2 else "🔥"

    return f"""{strength} <b>PUMP SIGNAL — {data['name']} ({data['symbol']})</b>

💰 Harga: <b>${price:,.8g}</b>
📈 Gain 5 hari: <b>+{gain:.1f}%</b>
💎 Market Cap: <b>{mcap_str}</b>
{supply_line}
{funding_line}
📊 Futures: {futures_tag}

⚡ Signal score: {score}/3
🔗 <a href="https://www.coingecko.com/en/coins/{data['id']}">CoinGecko</a>

Reply <b>/detail {data['symbol']}</b> untuk analisis lengkap."""


def format_short_alert(data):
    gain    = data["gain_5d"]
    supply  = data.get("supply_ratio")
    funding = data.get("funding_rate")
    price   = data["price"]
    mcap    = data.get("market_cap", 0)

    supply_line  = f"📦 Supply beredar: <b>{supply:.1f}%</b> {'🚨 VERY LOW' if supply and supply < 25 else '⚠️ LOW'}" if supply else "📦 Supply: N/A"
    funding_line = f"💸 Funding Rate: <b>{funding:+.4f}%</b> {'🩸 Squeeze risk masih ada!' if funding and funding < LOW_FUNDING_RATE else '✅ Aman untuk short'}" if funding is not None else "💸 Funding Rate: N/A"
    mcap_str     = f"${mcap/1_000_000:.1f}M" if mcap < 1_000_000_000 else f"${mcap/1_000_000_000:.2f}B"

    score = sum([
        gain >= SHORT_GAIN_5D,
        bool(supply and supply < LOW_SUPPLY_RATIO),
        bool(funding is not None and funding < LOW_FUNDING_RATE)
    ])
    danger = "⚠️⚠️⚠️" if score >= 3 else "⚠️⚠️" if score == 2 else "⚠️"

    return f"""{danger} <b>SHORT WATCH — {data['name']} ({data['symbol']})</b>

💰 Harga: <b>${price:,.8g}</b>
📈 Pump 5 hari: <b>+{gain:.1f}%</b>
💎 Market Cap: <b>{mcap_str}</b>
{supply_line}
{funding_line}
✅ <b>Tersedia di Binance Futures</b>

⚠️ Signal score: {score}/3
{'⛔ TUNGGU — funding rate negatif, squeeze risk tinggi!' if funding and funding < LOW_FUNDING_RATE else '🎯 Bisa pertimbangkan short dengan hati-hati'}
🔗 <a href="https://www.coingecko.com/en/coins/{data['id']}">CoinGecko</a>

🎯 Budget: $5 x3 akumulasi — SS ke @lim023 sebelum entry!"""


# ═══════════════════════════════════════════════════════════
# MAIN SCANNER
# ═══════════════════════════════════════════════════════════

def run_scan():
    print(f"\n[{datetime.now()}] Memulai scan v2...")
    send_telegram("🔍 <b>Scanner v2 started...</b>\nFilter aktif: Min MCap $10M + Binance Futures only untuk SHORT\nTunggu ~5 menit...")

    # Load Binance Futures symbols first
    futures_symbols = get_binance_futures_symbols()

    coins    = get_top_movers()
    filtered = 0
    pump_found = short_found = 0

    print(f"Total coins fetched: {len(coins)}")

    for coin in coins:
        coin_id  = coin.get("id", "")
        name     = coin.get("name", "")
        symbol   = coin.get("symbol", "").upper()
        price    = coin.get("current_price") or 0
        volume   = coin.get("total_volume") or 0
        mcap     = coin.get("market_cap") or 0
        circ     = coin.get("circulating_supply")
        max_sup  = coin.get("max_supply") or coin.get("total_supply")
        gain_7d  = coin.get("price_change_percentage_7d_in_currency") or 0
        on_fut   = symbol in futures_symbols

        # ── FILTERS ──────────────────────────────────────
        if volume < MIN_VOLUME_USD:
            continue
        if mcap < MIN_MARKET_CAP:
            filtered += 1
            continue
        if any(x in symbol for x in ["USD", "DAI", "USDC", "BUSD", "TUSD", "FDUSD"]):
            continue
        if gain_7d < PUMP_GAIN_5D:
            continue

        print(f"  {symbol}: +{gain_7d:.1f}% (7d), MCap ${mcap/1e6:.1f}M, Futures: {on_fut}")

        # Get precise 5d gain
        gain_5d = get_price_change_5d(coin_id) or gain_7d
        time.sleep(1.5)

        if gain_5d < PUMP_GAIN_5D:
            continue

        # Supply ratio
        supply_ratio = ((circ / max_sup) * 100) if (circ and max_sup and max_sup > 0) else None

        # Funding rate (only if on futures)
        funding_rate = get_funding_rate(symbol) if on_fut else None

        data = {
            "id": coin_id, "name": name, "symbol": symbol,
            "gain_5d": gain_5d, "supply_ratio": supply_ratio,
            "funding_rate": funding_rate, "price": price,
            "market_cap": mcap, "on_futures": on_fut
        }

        # ── PUMP SIGNAL (semua coin yang lolos filter) ───
        if gain_5d >= PUMP_GAIN_5D and not already_alerted(symbol, "PUMP"):
            send_telegram(format_pump_alert(data))
            log_alert(symbol, "PUMP", data)
            pump_found += 1
            print(f"  → PUMP alert: {symbol}")
            time.sleep(1)

        # ── SHORT SIGNAL (hanya yang ada di Binance Futures + MCap cukup) ───
        if gain_5d >= SHORT_GAIN_5D and on_fut and mcap >= MIN_SHORT_MCAP:
            short_score = sum([
                bool(supply_ratio and supply_ratio < LOW_SUPPLY_RATIO),
                bool(funding_rate is not None and funding_rate < LOW_FUNDING_RATE),
                gain_5d >= 800
            ])
            if short_score >= 1 and not already_alerted(symbol, "SHORT"):
                send_telegram(format_short_alert(data))
                log_alert(symbol, "SHORT", data)
                short_found += 1
                print(f"  → SHORT alert: {symbol}")
                time.sleep(1)

    # Summary
    send_telegram(f"""📊 <b>Scan selesai v2 — {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC</b>

🔥 Pump signals: <b>{pump_found}</b>
⚠️ Short watches: <b>{short_found}</b>
🔍 Total scanned: <b>{len(coins)}</b>
🚫 Filtered (MCap terlalu kecil): <b>{filtered}</b>

{'Tidak ada signal saat ini. Market normal.' if pump_found == 0 and short_found == 0 else '✅ Cek alert di atas!'}""")

    print(f"Done. Pump: {pump_found}, Short: {short_found}, Filtered: {filtered}")


if __name__ == "__main__":
    run_scan()
