import { useEffect, useMemo, useRef, useState } from 'react';
import { createTradingViewDatafeed } from '../utils/tradingViewDatafeed';

/** Matches `hedge-one/public/charting_library/charting_library/` (nested package folder). */
const TRADINGVIEW_SCRIPT = '/charting_library/charting_library/charting_library.js';
const TRADINGVIEW_LIBRARY_PATH = '/charting_library/charting_library/';

interface TradingViewSymbolChartProps {
  chartSymbol: string;
  interval?: string;
}

function loadTradingViewLibrary(): Promise<void> {
  if (window.TradingView?.widget) {
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

  useEffect(() => {
    let disposed = false;
    setLoadError(null);

    loadTradingViewLibrary()
      .then(() => {
        if (disposed || !window.TradingView?.widget) return;

        try {
          const widget = new window.TradingView.widget({
            autosize: true,
            fullscreen: false,
            container: containerId,
            datafeed,
            interval,
            library_path: TRADINGVIEW_LIBRARY_PATH,
            locale: 'en',
            symbol: chartSymbol,
            theme: 'light',
            timezone: 'Asia/Kolkata',
            disabled_features: ['use_localstorage_for_settings'],
            enabled_features: ['study_templates'],
          }) as TvWidget;

          widgetRef.current = widget;
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
    <div className="flex h-full w-full min-h-0">
      <div id={containerId} className="h-full w-full min-h-0 rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
