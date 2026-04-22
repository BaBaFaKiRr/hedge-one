import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseTradeRow } from '../types/trades';
import { createTradingViewDatafeed } from '../utils/tradingViewDatafeed';

/** Matches `hedge-one/public/charting_library/charting_library/` (nested package folder). */
const TRADINGVIEW_SCRIPT = '/charting_library/charting_library/charting_library.js';
const TRADINGVIEW_LIBRARY_PATH = '/charting_library/charting_library/';
const tradingViewWindow = window as Window & { TradingView?: { widget: new (options: Record<string, unknown>) => unknown } };

interface TradingViewPositionChartProps {
  chartSymbol: string;
  trade: BaseTradeRow;
}

function loadTradingViewLibrary(): Promise<void> {
  if (tradingViewWindow.TradingView?.widget) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-tradingview-library="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('TradingView library failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = TRADINGVIEW_SCRIPT;
    script.async = true;
    script.dataset.tradingviewLibrary = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TradingView library failed to load'));
    document.body.appendChild(script);
  });
}

/** Narrow typing for the bits we use; full API is `IChartWidgetApi`. */
type TvChartApi = {
  createShape: (...args: any[]) => Promise<unknown>;
  dataReady: (cb?: () => void) => boolean;
  executeActionById: (id: 'timeScaleReset' | 'chartReset') => void;
  getPanes: () => { getMainSourcePriceScale: () => { setAutoScale: (v: boolean) => void } | null }[];
  onDataLoaded: () => { subscribe: (ctx: null, cb: () => void, singleshot?: boolean) => void };
};

type TvWidget = {
  remove(): void;
  onChartReady(callback: () => void): void;
  activeChart(): TvChartApi;
};

export function TradingViewPositionChart({ chartSymbol, trade }: TradingViewPositionChartProps) {
  const containerId = `tv-pos-${trade.id}`;
  const [loadError, setLoadError] = useState<string | null>(null);
  const datafeed = useMemo(() => createTradingViewDatafeed(), []);
  const widgetRef = useRef<TvWidget | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastHeightRef = useRef<number>(0);
  const lastWidthRef = useRef<number>(0);

  useEffect(() => {
    let disposed = false;

    setLoadError(null);

    loadTradingViewLibrary()
      .then(() => {
        if (disposed || !tradingViewWindow.TradingView?.widget) return;

        try {
          const containerEl = document.getElementById(containerId);
          if (!containerEl) return;

          const createWidget = (height: number, width: number) => {
            widgetRef.current?.remove();
            const widget = new tradingViewWindow.TradingView!.widget({
              fullscreen: false,
              /** Charting Library expects `container` (id string or HTMLElement), not `container_id`. */
              container: containerId,
              datafeed,
              interval: '5',
              library_path: TRADINGVIEW_LIBRARY_PATH,
              locale: 'en',
              symbol: chartSymbol,
              theme: 'light',
              timezone: 'Asia/Kolkata',
              width,
              height,
              disabled_features: ['use_localstorage_for_settings'],
              enabled_features: ['study_templates'],
            }) as TvWidget;
            widgetRef.current = widget;
            lastHeightRef.current = height;
            lastWidthRef.current = width;

            widget.onChartReady(() => {
              if (disposed) return;
              const chart = widget.activeChart();
              if (!chart) return;

              /** Broker-style: fit candles to the viewport (time + auto price scale). */
              const fitChartToData = () => {
                if (disposed) return;
                requestAnimationFrame(() => {
                  if (disposed) return;
                  try {
                    chart.executeActionById('timeScaleReset');
                  } catch {
                    /* ignore */
                  }
                  try {
                    const mainScale = chart.getPanes?.()?.[0]?.getMainSourcePriceScale?.();
                    mainScale?.setAutoScale(true);
                  } catch {
                    /* ignore */
                  }
                });
              };

              if (chart.dataReady()) {
                fitChartToData();
              } else {
                chart.dataReady(fitChartToData);
              }
              chart.onDataLoaded().subscribe(null, fitChartToData);

              const entryTime = Math.floor(new Date(trade.entry_at).getTime() / 1000);
              if (trade.entry_price != null) {
                void chart
                  .createShape(
                    { time: entryTime, price: trade.entry_price },
                    {
                      shape: 'text',
                      lock: true,
                      disableSelection: true,
                      disableSave: true,
                      disableUndo: true,
                      text: `Entry ${trade.entry_side}`,
                      overrides: { color: '#22c55e' },
                    }
                  )
                  .catch(() => {});
              }

              if (trade.exit_at && trade.exit_price != null) {
                void chart
                  .createShape(
                    { time: Math.floor(new Date(trade.exit_at).getTime() / 1000), price: trade.exit_price },
                    {
                      shape: 'text',
                      lock: true,
                      disableSelection: true,
                      disableSave: true,
                      disableUndo: true,
                      text: 'Exit',
                      overrides: { color: '#ef4444' },
                    }
                  )
                  .catch(() => {});
              }
            });
          };

          createWidget(containerEl.clientHeight || 500, containerEl.clientWidth || 900);

          let resizeTimer: ReturnType<typeof setTimeout> | null = null;
          const observer = new ResizeObserver(() => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
              if (disposed) return;
              const nextWidth = containerEl.clientWidth || 900;
              const nextHeight = containerEl.clientHeight || 500;
              if (
                Math.abs(nextHeight - lastHeightRef.current) < 8 &&
                Math.abs(nextWidth - lastWidthRef.current) < 8
              ) {
                return;
              }
              createWidget(nextHeight, nextWidth);
            }, 120);
          });
          observer.observe(containerEl);

          if (disposed) {
            observer.disconnect();
            if (resizeTimer) clearTimeout(resizeTimer);
          }

          cleanupRef.current = () => {
            observer.disconnect();
            if (resizeTimer) clearTimeout(resizeTimer);
          };
        } catch (error) {
          if (!disposed) {
            setLoadError(error instanceof Error ? error.message : 'TradingView chart failed to initialize');
          }
        }
      })
      .catch((error) => {
        if (!disposed) {
          setLoadError(error instanceof Error ? error.message : 'TradingView chart failed to load');
        }
      });

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, [
    chartSymbol,
    containerId,
    datafeed,
    trade.id,
    trade.entry_at,
    trade.entry_price,
    trade.entry_side,
    trade.exit_at,
    trade.exit_price,
  ]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="h-full w-full min-w-0">
      <div
        id={containerId}
        className="h-full w-full min-w-0 rounded-lg border border-slate-200 bg-white"
      />
    </div>
  );
}
