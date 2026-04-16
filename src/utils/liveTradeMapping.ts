import type { BaseTradeRow, LiveTradeQuote, LiveTradeSnapshot, LiveTradeSubscription } from '../types/trades';

const BANKNIFTY_OPTION_RE = /^BANKNIFTY\d{1,2}[A-Z]{3}\d+(CE|PE)$/i;
function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function strategySupportsLivePnl(strategyId: string | null | undefined): boolean {
  const strategy = normalizeText(strategyId);
  return strategy !== 'NIFTY-30MIN-BREAKOUT' && strategy !== 'STOCK_75MIN_FUT';
}

export function getLiveTradeSubscription(trade: BaseTradeRow): LiveTradeSubscription | null {
  if (trade.exit_at) return null;
  if (!strategySupportsLivePnl(trade.strategy)) return null;

  const strategy = normalizeText(trade.strategy);
  const stockOption = normalizeText(trade.stock_option);

  switch (strategy) {
    case 'STOCK-15MIN-BREAKOUT':
      return stockOption ? { symbol: stockOption, strategy: 'stock-15min' } : null;
    case 'STOCK_EMA_CROSSOVER':
      return stockOption ? { symbol: stockOption, strategy: 'ema_crossover' } : null;
    case 'NIFTY-30MIN-BREAKOUT':
      return null;
    case 'STOCK_75MIN_FUT':
      return null;
    case 'BANK-NIFTY-EMA':
      if (stockOption && BANKNIFTY_OPTION_RE.test(stockOption)) {
        return { symbol: stockOption, strategy: 'bank_nifty_crossover' };
      }
      return { symbol: 'BANKNIFTY', strategy: 'bank_nifty_crossover' };
    default:
      return stockOption ? { symbol: stockOption, strategy: trade.strategy } : null;
  }
}

export function getLiveTradeSubscriptionKey(subscription: LiveTradeSubscription): string {
  return `${subscription.strategy}::${subscription.symbol}`;
}

export function getLiveTradeQuoteKey(quote: Pick<LiveTradeQuote, 'symbol' | 'strategy'>): string {
  return `${quote.strategy}::${quote.symbol}`;
}

export function computeUnrealizedPnl(trade: BaseTradeRow, ltp: number | null): number | null {
  if (trade.exit_at || ltp == null || trade.entry_price == null) return null;
  const qty = trade.qty ?? 1;
  const side = normalizeText(trade.entry_side || 'BUY');
  if (side === 'SELL') {
    return (trade.entry_price - ltp) * qty;
  }
  return (ltp - trade.entry_price) * qty;
}

export function getLiveTradeSnapshot(
  trade: BaseTradeRow,
  quotesByKey: Record<string, LiveTradeQuote>
): LiveTradeSnapshot {
  const isOpen = !trade.exit_at;
  if (!isOpen) {
    return {
      quote: null,
      ltp: null,
      unrealizedPnl: null,
      hasLivePrice: false,
      isOpen,
    };
  }

  const subscription = getLiveTradeSubscription(trade);
  if (!subscription) {
    return {
      quote: null,
      ltp: null,
      unrealizedPnl: null,
      hasLivePrice: false,
      isOpen,
    };
  }

  const quote = quotesByKey[getLiveTradeSubscriptionKey(subscription)] ?? null;
  const ltp = quote?.price ?? null;

  return {
    quote,
    ltp,
    unrealizedPnl: computeUnrealizedPnl(trade, ltp),
    hasLivePrice: ltp != null,
    isOpen,
  };
}
