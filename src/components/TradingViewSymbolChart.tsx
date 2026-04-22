import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createTradingViewDatafeed } from '../utils/tradingViewDatafeed';

/** Matches `hedge-one/public/charting_library/charting_library/` (nested package folder). */
const TRADINGVIEW_SCRIPT = '/charting_library/charting_library/charting_library.js';
const TRADINGVIEW_LIBRARY_PATH = '/charting_library/charting_library/';
const tradingViewWindow = window as Window & { TradingView?: { widget: new (options: Record<string, unknown>) => unknown } };

interface TradingViewSymbolChartProps {
  chartSymbol: string;
  interval?: string;
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

type TvWidget = {
  remove(): void;
};

export function TradingViewSymbolChart({ chartSymbol, interval = '5' }: TradingViewSymbolChartProps) {
  const containerId = `tv-symbol-${chartSymbol.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
  const [loadError, setLoadError] = useState<string | null>(null);
  const datafeed = useMemo(() => createTradingViewDatafeed(), []);
  const widgetRef = useRef<TvWidget | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    let disposed = false;
    setLoadError(null);

    loadTradingViewLibrary()
      .then(() => {
        if (disposed || !tradingViewWindow.TradingView?.widget) return;

        try {
          const containerEl = document.getElementById(containerId);
          if (!containerEl) return;

          const createWidget = (height: number) => {
            widgetRef.current?.remove();
            const widget = new tradingViewWindow.TradingView!.widget({
              fullscreen: false,
              container: containerId,
              datafeed,
              interval,
              library_path: TRADINGVIEW_LIBRARY_PATH,
              locale: 'en',
              symbol: chartSymbol,
              theme: 'light',
              timezone: 'Asia/Kolkata',
              width: '100%',
              height,
              disabled_features: ['use_localstorage_for_settings'],
              enabled_features: ['study_templates'],
            }) as TvWidget;
            widgetRef.current = widget;
            lastHeightRef.current = height;
          };

          createWidget(containerEl.clientHeight || 500);

          let resizeTimer: ReturnType<typeof setTimeout> | null = null;
          const observer = new ResizeObserver(() => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
              if (disposed) return;
              const nextHeight = containerEl.clientHeight || 500;
              if (Math.abs(nextHeight - lastHeightRef.current) < 8) return;
              createWidget(nextHeight);
            }, 120);
          });
          observer.observe(containerEl);

          if (disposed) {
            observer.disconnect();
            if (resizeTimer) clearTimeout(resizeTimer);
          }

          const prevCleanup = cleanupRef.current;
          cleanupRef.current = () => {
            observer.disconnect();
            if (resizeTimer) clearTimeout(resizeTimer);
            prevCleanup?.();
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
  }, [chartSymbol, containerId, datafeed, interval]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div id={containerId} className="h-full w-full rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
