import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseTradeRow, LiveTradeQuote } from '../types/trades';
import { getIndicatorStreamWsUrl, indicatorStreamPaiseToInr } from '../utils/indicatorStream';
import {
  getLiveTradeQuoteKey,
  getLiveTradeSubscription,
  getLiveTradeSubscriptionKey,
} from '../utils/liveTradeMapping';

function buildSubscriptions(trades: BaseTradeRow[]) {
  const unique = new Map<string, { symbol: string; strategy: string }>();
  trades.forEach((trade) => {
    const subscription = getLiveTradeSubscription(trade);
    if (!subscription) return;
    unique.set(getLiveTradeSubscriptionKey(subscription), subscription);
  });
  return Array.from(unique.values());
}

function inferStrategyFromTick(
  data: Record<string, unknown>,
  symbolStrategies: string[]
): string | null {
  if (symbolStrategies.length === 1) {
    return symbolStrategies[0];
  }
  if (typeof data.symbol === 'string' && /^BANKNIFTY\d{1,2}[A-Z]{3}\d+(CE|PE)$/i.test(data.symbol)) {
    return symbolStrategies.find((s) => s === 'bank_nifty_crossover') ?? null;
  }
  if (data.gapdown !== undefined) {
    return symbolStrategies.find((s) => s === 'stock_fut_breakout') ?? null;
  }
  if (data.trend !== undefined || data.breached !== undefined) {
    return symbolStrategies.find((s) => s === 'stock-15min') ?? null;
  }
  if (data.ema9 !== undefined || data.rsi14 !== undefined) {
    return symbolStrategies.find((s) => s === 'ema_crossover') ?? null;
  }
  if (typeof data.symbol === 'string' && data.symbol.toUpperCase() === 'NIFTY50') {
    return symbolStrategies.find((s) => s === 'nifty_30min_breakout') ?? null;
  }
  if (typeof data.symbol === 'string' && data.symbol.toUpperCase() === 'BANKNIFTY') {
    return symbolStrategies.find((s) => s === 'bank_nifty_crossover') ?? null;
  }
  return symbolStrategies[0] ?? null;
}

export function useLiveTradePrices(trades: BaseTradeRow[]) {
  const subscriptions = useMemo(() => buildSubscriptions(trades), [trades]);
  const [quotesByKey, setQuotesByKey] = useState<Record<string, LiveTradeQuote>>({});
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>(
    subscriptions.length ? 'connecting' : 'idle'
  );
  const wsRef = useRef<WebSocket | null>(null);

  const subscriptionPayload = useMemo(
    () => JSON.stringify({ action: 'subscribe', subscriptions }),
    [subscriptions]
  );
  const strategiesBySymbol = useMemo(() => {
    const out: Record<string, string[]> = {};
    subscriptions.forEach((subscription) => {
      out[subscription.symbol] = out[subscription.symbol] || [];
      out[subscription.symbol].push(subscription.strategy);
    });
    return out;
  }, [subscriptions]);

  useEffect(() => {
    if (!subscriptions.length) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setQuotesByKey({});
      setConnectionState('idle');
      return;
    }

    setConnectionState('connecting');
    const ws = new WebSocket(getIndicatorStreamWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('open');
      ws.send(subscriptionPayload);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.status === 'subscribed' || data?.status === 'pong' || data?.status === 'error') {
          return;
        }
        if (!data?.symbol) {
          return;
        }
        const rawPrice = data.ltp ?? data.price;
        const priceInr = indicatorStreamPaiseToInr(rawPrice);
        if (priceInr == null) {
          return;
        }
        const symbol = String(data.symbol);
        const inferredStrategy = inferStrategyFromTick(data, strategiesBySymbol[symbol] || []);
        if (!inferredStrategy) return;
        const quote: LiveTradeQuote = {
          symbol,
          strategy: inferredStrategy,
          price: priceInr,
          timestamp: typeof data.timestamp === 'string' ? data.timestamp : null,
        };
        setQuotesByKey((prev) => ({
          ...prev,
          [getLiveTradeQuoteKey(quote)]: quote,
        }));
      } catch (error) {
        console.error('Failed to parse live trade tick', error);
      }
    };

    ws.onerror = () => {
      setConnectionState('error');
    };

    ws.onclose = () => {
      setConnectionState('closed');
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [strategiesBySymbol, subscriptionPayload, subscriptions]);

  return {
    quotesByKey,
    connectionState,
    subscriptions,
  };
}
