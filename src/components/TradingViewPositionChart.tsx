import { useEffect, useMemo, useState } from 'react';
import type { BaseTradeRow } from '../types/trades';
import { createTradingViewDatafeed } from '../utils/tradingViewDatafeed';

/** Matches `hedge-one/public/charting_library/charting_library/` (nested package folder). */
const TRADINGVIEW_SCRIPT = '/charting_library/charting_library/charting_library.js';
const TRADINGVIEW_LIBRARY_PATH = '/charting_library/charting_library/';

interface TradingViewPositionChartProps {
  chartSymbol: string;
  trade: BaseTradeRow;
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

export function TradingViewPositionChart({ chartSymbol, trade }: TradingViewPositionChartProps) {
  const containerId = `tv-pos-${trade.id}`;
  const [loadError, setLoadError] = useState<string | null>(null);
  const datafeed = useMemo(() => createTradingViewDatafeed(), []);

  useEffect(() => {
    let disposed = false;
    let widget: { remove(): void; onChartReady(callback: () => void): void; activeChart(): { createShape: (...args: any[]) => Promise<unknown> } } | null = null;

    setLoadError(null);

    loadTradingViewLibrary()
      .then(() => {
        if (disposed || !window.TradingView?.widget) return;

        widget = new window.TradingView.widget({
          autosize: true,
          container_id: containerId,
          datafeed,
          interval: '5',
          library_path: TRADINGVIEW_LIBRARY_PATH,
          locale: 'en',
          symbol: chartSymbol,
          theme: 'Dark',
          timezone: 'Asia/Kolkata',
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: ['study_templates'],
        });

        widget.onChartReady(() => {
          const chart = widget?.activeChart();
          if (!chart) return;

          const entryTime = Math.floor(new Date(trade.entry_at).getTime() / 1000);
          if (trade.entry_price != null) {
            chart.createShape(
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
            );
          }

          if (trade.exit_at && trade.exit_price != null) {
            chart.createShape(
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
            );
          }
        });
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'TradingView chart failed to load');
      });

    return () => {
      disposed = true;
      widget?.remove();
    };
  }, [chartSymbol, containerId, datafeed, trade]);

  if (loadError) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div
      id={containerId}
      className="h-full min-h-[520px] w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200"
    />
  );
}
