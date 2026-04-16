import type { BaseTradeRow } from '../types/trades';

const TRAILING_EQUITY_SUFFIX_RE = /-EQ$/i;
const FUTURE_SUFFIX_RE = /(?:\d{1,2}[A-Z]{3}\d{2,4})FUT$/i;
const NIFTY_OPTION_RE = /^NIFTY\d{1,2}[A-Z]{3}\d+(CE|PE)$/i;

const EXACT_ALIASES: Record<string, string> = {
  ICICIBANK: 'ICICI',
};

function normalizeSymbol(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function getPositionChartSymbol(trade: BaseTradeRow): string | null {
  const raw = normalizeSymbol(trade.stock_option);
  if (!raw) return null;

  const deSuffixed = raw.replace(TRAILING_EQUITY_SUFFIX_RE, '');
  if (EXACT_ALIASES[deSuffixed]) {
    return EXACT_ALIASES[deSuffixed];
  }
  if (NIFTY_OPTION_RE.test(deSuffixed)) {
    return null;
  }
  if (FUTURE_SUFFIX_RE.test(deSuffixed)) {
    return null;
  }
  return deSuffixed;
}

export function isChartableTrade(trade: BaseTradeRow): boolean {
  return getPositionChartSymbol(trade) != null;
}
