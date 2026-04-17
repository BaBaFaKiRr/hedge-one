import { getIndicatorStreamHttpUrl, getIndicatorStreamWsUrl, indicatorStreamPaiseToInr } from './indicatorStream';

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Subscriber = {
  resolution: string;
  symbol: string;
  ws: WebSocket | null;
  lastBar: Bar | null;
  onRealtimeCallback: (bar: Bar) => void;
};

const configPromise = fetch(`${getIndicatorStreamHttpUrl()}/tv/config`).then((res) => res.json());
const symbolInfoCache = new Map<string, Promise<Record<string, unknown>>>();
const subscribers = new Map<string, Subscriber>();

function normalizeResolution(resolution: string): string {
  return (resolution || '1').toUpperCase();
}

function resolutionToMinutes(resolution: string): number {
  const normalized = normalizeResolution(resolution);
  if (normalized === 'D') return 1440;
  return Number.parseInt(normalized, 10) || 1;
}

function bucketStartMs(timestampMs: number, resolution: string): number {
  const bucketSizeMs = resolutionToMinutes(resolution) * 60 * 1000;
  return Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs;
}

function normalizeRealtimePrice(raw: unknown): number | null {
  return indicatorStreamPaiseToInr(raw);
}

async function fetchSymbolInfo(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!symbolInfoCache.has(normalized)) {
    symbolInfoCache.set(
      normalized,
      fetch(`${getIndicatorStreamHttpUrl()}/tv/symbols?symbol=${encodeURIComponent(normalized)}`).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to resolve symbol ${normalized}`);
        }
        return res.json();
      })
    );
  }
  return symbolInfoCache.get(normalized)!;
}

export function createTradingViewDatafeed() {
  return {
    onReady(callback: (config: Record<string, unknown>) => void) {
      configPromise.then(callback).catch(() => callback({ supported_resolutions: ['1', '5', '15', '30', '60', 'D'] }));
    },

    searchSymbols(
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResultReadyCallback: (result: Array<Record<string, unknown>>) => void
    ) {
      fetch(
        `${getIndicatorStreamHttpUrl()}/tv/search?query=${encodeURIComponent(userInput || '')}&limit=20`
      )
        .then((res) => res.json())
        .then(onResultReadyCallback)
        .catch(() => onResultReadyCallback([]));
    },

    resolveSymbol(
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: Record<string, unknown>) => void,
      onResolveErrorCallback: (reason: string) => void
    ) {
      fetchSymbolInfo(symbolName)
        .then(onSymbolResolvedCallback)
        .catch(() => onResolveErrorCallback('Symbol not found'));
    },

    getBars(
      symbolInfo: { ticker?: string; name?: string },
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest: boolean },
      onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
      onErrorCallback: (error: string) => void
    ) {
      const symbol = (symbolInfo.ticker || symbolInfo.name || '').toUpperCase();
      const params = new URLSearchParams({
        symbol,
        resolution: normalizeResolution(resolution),
        from: String(periodParams.from),
        to: String(periodParams.to),
      });

      fetch(`${getIndicatorStreamHttpUrl()}/tv/history?${params.toString()}`)
        .then((res) => res.json())
        .then((payload) => {
          if (payload.s !== 'ok' || !Array.isArray(payload.t) || payload.t.length === 0) {
            onHistoryCallback([], { noData: true });
            return;
          }
          const bars = payload.t.map((time: number, index: number) => ({
            time: Number(time) * 1000,
            open: Number(payload.o[index]),
            high: Number(payload.h[index]),
            low: Number(payload.l[index]),
            close: Number(payload.c[index]),
          }));
          onHistoryCallback(bars, { noData: false });
        })
        .catch((error) => onErrorCallback(error instanceof Error ? error.message : 'History request failed'));
    },

    subscribeBars(
      symbolInfo: { ticker?: string; name?: string },
      resolution: string,
      onRealtimeCallback: (bar: Bar) => void,
      subscriberUID: string,
      onResetCacheNeededCallback: () => void
    ) {
      const symbol = (symbolInfo.ticker || symbolInfo.name || '').toUpperCase();
      const ws = new WebSocket(getIndicatorStreamWsUrl());
      const subscriber: Subscriber = {
        resolution: normalizeResolution(resolution),
        symbol,
        ws,
        lastBar: null,
        onRealtimeCallback,
      };
      subscribers.set(subscriberUID, subscriber);

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'subscribe', subscriptions: [{ symbol, strategy: 'chart' }] }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.status) return;
          if (String(payload?.symbol || '').toUpperCase() !== symbol) return;

          const realtimePrice = normalizeRealtimePrice(payload.ltp ?? payload.price);
          if (realtimePrice == null) return;

          const timestamp = typeof payload.timestamp === 'string' ? Date.parse(payload.timestamp) : Date.now();
          const nextBucketStart = bucketStartMs(timestamp, subscriber.resolution);

          if (!subscriber.lastBar || subscriber.lastBar.time !== nextBucketStart) {
            subscriber.lastBar = {
              time: nextBucketStart,
              open: realtimePrice,
              high: realtimePrice,
              low: realtimePrice,
              close: realtimePrice,
            };
          } else {
            subscriber.lastBar = {
              ...subscriber.lastBar,
              high: Math.max(subscriber.lastBar.high, realtimePrice),
              low: Math.min(subscriber.lastBar.low, realtimePrice),
              close: realtimePrice,
            };
          }
          subscriber.onRealtimeCallback(subscriber.lastBar);
        } catch (_error) {
          onResetCacheNeededCallback();
        }
      };

      ws.onerror = () => onResetCacheNeededCallback();
      ws.onclose = () => subscribers.delete(subscriberUID);
    },

    unsubscribeBars(subscriberUID: string) {
      const subscriber = subscribers.get(subscriberUID);
      subscriber?.ws?.close();
      subscribers.delete(subscriberUID);
    },
  };
}
