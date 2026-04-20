"""
Crypto Signal Scanner v3
Mode 1: 5-day pump/short scanner (every 6h)
Mode 2: Real-time intraday pump detector (every 30min via separate workflow)
"""

import os
import sys
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
BINANCE_BASE   = "https://api.binance.com/api/v3"
BINANCE_FAPI   = "https://fapi.binance.com/fapi/v1"

# ─── THRESHOLDS MODE 1 (5-day scanner) ───────────────────
PUMP_GAIN_5D      = 300
SHORT_GAIN_5D     = 500
LOW_SUPPLY_RATIO  = 30
LOW_FUNDING_RATE  = -0.05
MIN_MARKET_CAP    = 10_000_000
MIN_SHORT_MCAP    = 50_000_000
MIN_VOLUME_USD    = 1_000_000
ALERT_COOLDOWN_H  = 12

# ─── THRESHOLDS MODE 2 (real-time intraday) ──────────────
INTRADAY_GAIN_1H    = 20     # % gain in 1 hour = pump happening now
INTRADAY_GAIN_24H   = 50     # % gain in 24h = significant move
VOLUME_SPIKE_MULT   = 5      # volume 5x above 7-day average = spike
REVERSAL_DROP_PCT   = 8      # % drop from 24h high = possible reversal starting
MIN_MCAP_INTRADAY   = 20_000_000  # min $20M mcap for intraday alerts
INTRADAY_COOLDOWN_H = 2      # shorter cooldown for real-time alerts

# ─── SUPABASE ─────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ═══════════════════════════════════════════════════════════
# SHARED HELPERS
# ═══════════════════════════════════════════════════════════

def get_binance_futures_symbols():
    try:
        r = requests.get(f"{BINANCE_FAPI}/exchangeInfo", timeout=20)
        if r.status_code == 200:
            return set(
                s["baseAsset"].upper()
                for s in r.json().get("symbols", [])
                if s.get("status") == "TRADING" and s.get("quoteAsset") == "USDT"
            )
    except Exception as e:
        print(f"Futures symbols error: {e}")
    return set()


def get_funding_rate(symbol):
    try:
        r = requests.get(f"{BINANCE_FAPI}/premiumIndex",
                         params={"symbol": f"{symbol}USDT"}, timeout=10)
        if r.status_code == 200:
            return float(r.json().get("lastFundingRate", 0)) * 100
    except Exception:
        pass
    return None


def already_alerted(symbol, signal_type, cooldown_h=None):
    if cooldown_h is None:
        cooldown_h = ALERT_COOLDOWN_H
    try:
        result = supabase.table("alerts_log").select("created_at") \
            .eq("symbol", symbol).eq("signal_type", signal_type) \
            .order("created_at", desc=True).limit(1).execute()
        if result.data:
            last_str  = result.data[0]["created_at"]
            last_time = datetime.fromisoformat(last_str.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
            return hours_ago < cooldown_h
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


def send_telegram(text):
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
            timeout=15
        )
    except Exception as e:
        print(f"Telegram error: {e}")


# ═══════════════════════════════════════════════════════════
# MODE 1 — 5-DAY SCANNER
# ═══════════════════════════════════════════════════════════

def get_top_movers_cg():
    coins = []
    for page in range(1, 4):
        try:
            r = requests.get(f"{COINGECKO_BASE}/coins/markets", params={
                "vs_currency": "usd", "order": "percent_change_7d_desc",
                "per_page": 100, "page": page, "sparkline": "false",
                "price_change_percentage": "24h,7d",
            }, timeout=30)
            if r.status_code == 429:
                time.sleep(60); continue
            if r.status_code != 200: break
            data = r.json()
            if not data: break
            coins.extend(data)
            time.sleep(2)
        except Exception as e:
            print(f"CG page {page} error: {e}"); break
    return coins


def get_price_change_5d(coin_id):
    try:
        r = requests.get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params={
            "vs_currency": "usd", "days": 6, "interval": "daily"
        }, timeout=20)
        if r.status_code == 429:
            time.sleep(30); return None
        if r.status_code != 200: return None
        prices = r.json().get("prices", [])
        if len(prices) < 2: return None
        p0 = prices[0][1]; p1 = prices[-1][1]
        return ((p1 - p0) / p0) * 100 if p0 != 0 else None
    except Exception:
        return None


def format_pump_alert(data):
    gain = data["gain_5d"]; supply = data.get("supply_ratio")
    funding = data.get("funding_rate"); price = data["price"]
    mcap = data.get("market_cap", 0); on_fut = data.get("on_futures", False)
    supply_line  = f"📦 Supply: <b>{supply:.1f}%</b> dari max {'⚠️ LOW' if supply < LOW_SUPPLY_RATIO else '✅ Normal'}" if supply else "📦 Supply: N/A"
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b>" if funding is not None else "💸 Funding: N/A"
    mcap_str     = f"${mcap/1e6:.1f}M" if mcap < 1e9 else f"${mcap/1e9:.2f}B"
    futures_tag  = "✅ Bisa di-short di Binance Futures" if on_fut else "❌ Tidak ada di Futures"
    score = sum([gain >= PUMP_GAIN_5D, bool(supply and supply < LOW_SUPPLY_RATIO), bool(funding and funding > 0.05)])
    strength = "🔥🔥🔥" if score >= 3 else "🔥🔥" if score == 2 else "🔥"
    return f"""{strength} <b>PUMP SIGNAL (5D) — {data['name']} ({data['symbol']})</b>

💰 Harga: <b>${price:,.8g}</b>
📈 Gain 5 hari: <b>+{gain:.1f}%</b>
💎 Market Cap: <b>{mcap_str}</b>
{supply_line}
{funding_line}
📊 {futures_tag}

⚡ Signal score: {score}/3
🔗 <a href="https://www.coingecko.com/en/coins/{data['id']}">CoinGecko</a>"""


def format_short_5d_alert(data):
    gain = data["gain_5d"]; supply = data.get("supply_ratio")
    funding = data.get("funding_rate"); price = data["price"]
    mcap = data.get("market_cap", 0)
    supply_line  = f"📦 Supply: <b>{supply:.1f}%</b> {'🚨 VERY LOW' if supply and supply < 25 else '⚠️ LOW'}" if supply else "📦 Supply: N/A"
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b> {'🩸 Squeeze risk!' if funding and funding < LOW_FUNDING_RATE else '✅ Aman'}" if funding is not None else "💸 Funding: N/A"
    mcap_str     = f"${mcap/1e6:.1f}M" if mcap < 1e9 else f"${mcap/1e9:.2f}B"
    score = sum([gain >= SHORT_GAIN_5D, bool(supply and supply < LOW_SUPPLY_RATIO), bool(funding and funding < LOW_FUNDING_RATE)])
    danger = "⚠️⚠️⚠️" if score >= 3 else "⚠️⚠️" if score == 2 else "⚠️"
    return f"""{danger} <b>SHORT WATCH (5D) — {data['name']} ({data['symbol']})</b>

💰 Harga: <b>${price:,.8g}</b>
📈 Pump 5 hari: <b>+{gain:.1f}%</b>
💎 Market Cap: <b>{mcap_str}</b>
{supply_line}
{funding_line}
✅ <b>Tersedia di Binance Futures</b>

⚠️ Signal score: {score}/3
{'⛔ TUNGGU — squeeze risk tinggi!' if funding and funding < LOW_FUNDING_RATE else '🎯 Bisa akumulasi short $5 x3'}
🔗 <a href="https://www.coingecko.com/en/coins/{data['id']}">CoinGecko</a>"""


def run_5d_scan():
    print(f"\n[{datetime.now()}] MODE 1: 5-day scan...")
    send_telegram("🔍 <b>Scanner 5D started...</b> Scan 300 coins, tunggu ~5 menit.")

    futures_symbols = get_binance_futures_symbols()
    coins = get_top_movers_cg()
    pump_found = short_found = filtered = 0

    for coin in coins:
        coin_id = coin.get("id",""); name = coin.get("name","")
        symbol  = coin.get("symbol","").upper(); price = coin.get("current_price") or 0
        volume  = coin.get("total_volume") or 0; mcap = coin.get("market_cap") or 0
        circ    = coin.get("circulating_supply"); max_sup = coin.get("max_supply") or coin.get("total_supply")
        gain_7d = coin.get("price_change_percentage_7d_in_currency") or 0
        on_fut  = symbol in futures_symbols

        if volume < MIN_VOLUME_USD: continue
        if mcap < MIN_MARKET_CAP: filtered += 1; continue
        if any(x in symbol for x in ["USD","DAI","USDC","BUSD","TUSD","FDUSD"]): continue
        if gain_7d < PUMP_GAIN_5D: continue

        gain_5d = get_price_change_5d(coin_id) or gain_7d
        time.sleep(1.5)
        if gain_5d < PUMP_GAIN_5D: continue

        supply_ratio = ((circ/max_sup)*100) if (circ and max_sup and max_sup > 0) else None
        funding_rate = get_funding_rate(symbol) if on_fut else None

        data = {"id": coin_id, "name": name, "symbol": symbol,
                "gain_5d": gain_5d, "supply_ratio": supply_ratio,
                "funding_rate": funding_rate, "price": price,
                "market_cap": mcap, "on_futures": on_fut}

        if not already_alerted(symbol, "PUMP"):
            send_telegram(format_pump_alert(data))
            log_alert(symbol, "PUMP", data)
            pump_found += 1; time.sleep(1)

        if gain_5d >= SHORT_GAIN_5D and on_fut and mcap >= MIN_SHORT_MCAP:
            short_score = sum([
                bool(supply_ratio and supply_ratio < LOW_SUPPLY_RATIO),
                bool(funding_rate is not None and funding_rate < LOW_FUNDING_RATE),
                gain_5d >= 800
            ])
            if short_score >= 1 and not already_alerted(symbol, "SHORT"):
                send_telegram(format_short_5d_alert(data))
                log_alert(symbol, "SHORT", data)
                short_found += 1; time.sleep(1)

    send_telegram(f"""📊 <b>5D Scan selesai — {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC</b>

🔥 Pump signals: <b>{pump_found}</b>
⚠️ Short watches: <b>{short_found}</b>
🔍 Scanned: <b>{len(coins)}</b> | Filtered kecil: <b>{filtered}</b>

{'Tidak ada signal. Market normal.' if pump_found == 0 and short_found == 0 else '✅ Cek alert di atas!'}""")


# ═══════════════════════════════════════════════════════════
# MODE 2 — REAL-TIME INTRADAY (like Binance Top Movers)
# ═══════════════════════════════════════════════════════════

def get_binance_top_movers():
    """Get top gainers from Binance 24h ticker — same as Binance Top Movers tab"""
    try:
        # Use Binance US as fallback if global blocked
        for base_url in ["https://api.binance.us/api/v3", "https://api.binance.com/api/v3"]:
            try:
                r = requests.get(f"{base_url}/ticker/24hr", timeout=20)
                if r.status_code == 200:
                    tickers = r.json()
                    usdt = [t for t in tickers
                            if t["symbol"].endswith("USDT")
                            and float(t.get("quoteVolume", 0)) > MIN_VOLUME_USD
                            and not any(x in t["symbol"] for x in ["BUSD","USDC","DAI","TUSD","FDUSD"])]
                    return sorted(usdt, key=lambda x: float(x.get("priceChangePercent", 0)), reverse=True)
            except Exception:
                continue
    except Exception as e:
        print(f"Binance ticker error: {e}")
    return []


def get_binance_klines_avg_volume(symbol, days=7):
    """Get average daily volume for last 7 days to detect volume spike"""
    for base_url in ["https://api.binance.us/api/v3", "https://api.binance.com/api/v3"]:
        try:
            r = requests.get(f"{base_url}/klines", params={
                "symbol": symbol, "interval": "1d", "limit": days
            }, timeout=10)
            if r.status_code == 200:
                klines = r.json()
                if len(klines) < 2: return None
                # Average volume of previous days (exclude today)
                avg = sum(float(k[5]) for k in klines[:-1]) / (len(klines) - 1)
                today_vol = float(klines[-1][5])
                return today_vol, avg
        except Exception:
            continue
    return None, None


def format_intraday_pump_alert(data):
    gain_24h    = data["gain_24h"]
    price       = data["price"]
    symbol      = data["symbol"]
    volume_mult = data.get("volume_mult")
    funding     = data.get("funding_rate")
    mcap_str    = f"${data['mcap']/1e6:.1f}M" if data.get('mcap') and data['mcap'] < 1e9 else ""

    vol_line     = f"📊 Volume spike: <b>{volume_mult:.1f}x</b> dari rata-rata 7 hari 🚨" if volume_mult and volume_mult >= VOLUME_SPIKE_MULT else f"📊 Volume: <b>{volume_mult:.1f}x</b> normal" if volume_mult else "📊 Volume: N/A"
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b>" if funding is not None else "💸 Funding: N/A"
    mcap_line    = f"💎 MCap: <b>{mcap_str}</b>" if mcap_str else ""

    return f"""⚡ <b>PUMP NOW — {symbol}/USDT</b>

💰 Harga: <b>${price:,.8g}</b>
📈 Gain 24 jam: <b>+{gain_24h:.1f}%</b>
{vol_line}
{mcap_line}
{funding_line}
✅ <b>Ada di Binance Futures</b>

🎯 Ini sedang pump sekarang!
⚠️ Jangan langsung short — tunggu tanda reversal dulu
📉 Watch harga high 24h: <b>${data['high_24h']:,.8g}</b>
🔗 <a href="https://www.binance.com/en/futures/{symbol}USDT">Buka Binance Futures</a>"""


def format_reversal_alert(data):
    gain_24h    = data["gain_24h"]
    price       = data["price"]
    symbol      = data["symbol"]
    high_24h    = data["high_24h"]
    drop_from_high = ((high_24h - price) / high_24h) * 100
    funding     = data.get("funding_rate")
    funding_line = f"💸 Funding: <b>{funding:+.4f}%</b> {'✅ Bagus untuk short' if funding and funding > 0 else '⚠️ Hati-hati' if funding and funding < LOW_FUNDING_RATE else ''}" if funding is not None else "💸 Funding: N/A"

    return f"""🔻 <b>REVERSAL SIGNAL — {symbol}/USDT</b>

💰 Harga sekarang: <b>${price:,.8g}</b>
📈 Gain 24 jam: <b>+{gain_24h:.1f}%</b>
📉 Drop dari high: <b>-{drop_from_high:.1f}%</b> (High: ${high_24h:,.8g})
{funding_line}
✅ <b>Ada di Binance Futures</b>

🎯 <b>Ini sinyal reversal — pertimbangkan short!</b>
💡 Strategi: akumulasi $5 x3 secara bertahap
⚠️ Set stop loss di atas high: ${high_24h:,.8g}
🔗 <a href="https://www.binance.com/en/futures/{symbol}USDT">Buka Binance Futures</a>"""


def run_intraday_scan():
    print(f"\n[{datetime.now()}] MODE 2: Intraday real-time scan...")

    futures_symbols = get_binance_futures_symbols()
    tickers = get_binance_top_movers()

    if not tickers:
        print("No tickers from Binance, skipping intraday scan")
        return

    pump_now = reversal = 0
    print(f"Top movers: {len(tickers)} pairs")

    # Only check top 50 gainers
    for ticker in tickers[:50]:
        symbol      = ticker["symbol"].replace("USDT", "")
        price       = float(ticker.get("lastPrice", 0))
        gain_24h    = float(ticker.get("priceChangePercent", 0))
        high_24h    = float(ticker.get("highPrice", 0))
        volume_usdt = float(ticker.get("quoteVolume", 0))
        mcap        = 0  # not available from ticker

        # Only process futures symbols
        if symbol not in futures_symbols:
            continue
        if gain_24h < INTRADAY_GAIN_24H:
            continue

        print(f"  {symbol}: +{gain_24h:.1f}% (24h)")

        # Volume spike check
        today_vol, avg_vol = get_binance_klines_avg_volume(f"{symbol}USDT")
        volume_mult = (today_vol / avg_vol) if (today_vol and avg_vol and avg_vol > 0) else None
        time.sleep(0.3)

        # Funding rate
        funding_rate = get_funding_rate(symbol)

        data = {
            "symbol": symbol, "price": price, "gain_24h": gain_24h,
            "high_24h": high_24h, "volume_mult": volume_mult,
            "funding_rate": funding_rate, "mcap": mcap
        }

        # ── PUMP NOW alert (coin sedang pump hari ini) ───
        if gain_24h >= INTRADAY_GAIN_24H and volume_mult and volume_mult >= VOLUME_SPIKE_MULT:
            if not already_alerted(symbol, "PUMP_NOW", INTRADAY_COOLDOWN_H):
                send_telegram(format_intraday_pump_alert(data))
                log_alert(symbol, "PUMP_NOW", data)
                pump_now += 1
                print(f"  → PUMP NOW alert: {symbol}")
                time.sleep(1)

        # ── REVERSAL alert (sudah pump, sekarang mulai turun) ───
        if high_24h > 0:
            drop_from_high = ((high_24h - price) / high_24h) * 100
            if drop_from_high >= REVERSAL_DROP_PCT and gain_24h >= INTRADAY_GAIN_24H:
                if not already_alerted(symbol, "REVERSAL", INTRADAY_COOLDOWN_H):
                    send_telegram(format_reversal_alert(data))
                    log_alert(symbol, "REVERSAL", data)
                    reversal += 1
                    print(f"  → REVERSAL alert: {symbol}")
                    time.sleep(1)

    if pump_now > 0 or reversal > 0:
        send_telegram(f"""⚡ <b>Intraday scan selesai — {datetime.now().strftime('%H:%M')} UTC</b>
🚀 Pump now: <b>{pump_now}</b>
🔻 Reversal signals: <b>{reversal}</b>""")
    else:
        print("  No intraday signals this run")


# ═══════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "5d"
    if mode == "intraday":
        run_intraday_scan()
    else:
        run_5d_scan()
