// ═══════════════════════════════════════════════════════════════════
// config.js — Hervin Scanner v9.2
// Constants, thresholds, shared state
// ═══════════════════════════════════════════════════════════════════

const FAPI = 'https://fapi.binance.com/fapi/v1';
const SAPI = 'https://fapi.binance.com/fapi/v2';

const THRESHOLDS = {
  VOLUME_SPIKE:2.0, VOLUME_MODERATE:1.4,
  RSI_OVERSOLD:45, RSI_OVERBOUGHT:65,
  PRICE_FLAT_MIN:-15, PRICE_FLAT_MAX:25,
  FUNDING_NEG:-0.01, FUNDING_POS:0.05,
  FUNDING_EXTREME_NEG:-0.05,
  BID_DEPTH_STRONG:150000, BID_DEPTH_OK:50000,
  MIN_PRICE:0.001, MAX_PRICE:100000,
  PUMP_GAIN_MIN:30, PUMP_GAIN_MAX:300,
  SHORT_DROP_MIN:5, PARABOLIC_ACC:0.02,
};

const CancelToken = { cancelled:false, cancel(){this.cancelled=true;}, reset(){this.cancelled=false;} };
const CONCURRENCY = 3;

// Shared scan results
const results = { accum:[], pump:[], short:[], top:[] };
let scanning = false;
