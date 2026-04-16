import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCcw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { formatInr } from '../utils/currency';
import { useLiveTradePrices } from '../hooks/useLiveTradePrices';
import { getLiveTradeSnapshot, strategySupportsLivePnl } from '../utils/liveTradeMapping';
import { TradingViewPositionChart } from './TradingViewPositionChart';
import type { BaseTradeRow } from '../types/trades';
import { getPositionChartSymbol } from '../utils/positionChartSymbols';

interface PositionTrade extends BaseTradeRow {}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PositionsPage() {
  const { user, accessToken } = useAuth();
  const [trades, setTrades] = useState<PositionTrade[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = useMemo(() => {
    return createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });
  }, [accessToken]);

  const fetchTrades = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { start, end } = getTodayRange();
      const { data, error } = await supabase
        .from('trades')
        .select(
          'id, stock_option, strategy, qty, entry_side, entry_price, entry_at, exit_side, exit_price, exit_at, realized_pnl'
        )
        .eq('user_id', user.id)
        .gte('entry_at', start.toISOString())
        .lt('entry_at', end.toISOString())
        .order('entry_at', { ascending: false });

      if (error) throw error;
      const nextTrades = (data ?? []) as PositionTrade[];
      setTrades(nextTrades);
      setSelectedTradeId((current) => {
        if (current && nextTrades.some((trade) => trade.id === current)) {
          return current;
        }
        return nextTrades[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to fetch today positions', error);
      toast.error('Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const { quotesByKey } = useLiveTradePrices(trades);
  const selectedTrade = useMemo(
    () => trades.find((trade) => trade.id === selectedTradeId) ?? null,
    [selectedTradeId, trades]
  );
  const selectedChartSymbol = selectedTrade ? getPositionChartSymbol(selectedTrade) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Positions</h1>
          <p className="text-sm text-slate-500">Today&apos;s open and closed trades with chart context.</p>
        </div>
        <Button variant="outline" onClick={fetchTrades} disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle>Today&apos;s Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_56px_96px] gap-3 px-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>Position</span>
              <span>Security</span>
              <span className="text-right">Qty</span>
              <span className="text-right">PnL</span>
            </div>

            {trades.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                {isLoading ? 'Loading today’s positions...' : 'No trades found for today.'}
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map((trade) => {
                  const live = getLiveTradeSnapshot(trade, quotesByKey);
                  const supportsLivePnl = strategySupportsLivePnl(trade.strategy);
                  const pnlValue = trade.realized_pnl ?? live.unrealizedPnl;
                  const isSelected = trade.id === selectedTradeId;

                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => setSelectedTradeId(trade.id)}
                      className={`grid w-full grid-cols-[88px_minmax(0,1fr)_56px_96px] gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate text-sm font-medium">{trade.entry_side || '—'}</div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{trade.stock_option ?? '—'}</div>
                        <div className={`truncate text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {trade.strategy}
                        </div>
                      </div>
                      <div className="text-right text-sm">{trade.qty ?? '—'}</div>
                      <div
                        className={`text-right text-sm font-medium ${
                          isSelected
                            ? 'text-white'
                            : pnlValue == null
                              ? 'text-slate-500'
                              : pnlValue >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                        }`}
                      >
                        {pnlValue != null
                          ? formatInr(pnlValue)
                          : !trade.exit_at
                            ? supportsLivePnl && live.hasLivePrice
                              ? formatInr(live.unrealizedPnl ?? 0)
                              : 'Open'
                            : '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle>Position Chart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedTrade ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                Select a position to load its chart.
              </div>
            ) : (
              <>
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Security</div>
                    <div className="mt-1 font-medium text-slate-900">{selectedTrade.stock_option ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Entry</div>
                    <div className="mt-1 font-medium text-slate-900">{formatWhen(selectedTrade.entry_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Exit</div>
                    <div className="mt-1 font-medium text-slate-900">{formatWhen(selectedTrade.exit_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Chart Symbol</div>
                    <div className="mt-1 font-medium text-slate-900">{selectedChartSymbol ?? 'Unsupported'}</div>
                  </div>
                </div>

                {selectedChartSymbol ? (
                  <TradingViewPositionChart chartSymbol={selectedChartSymbol} trade={selectedTrade} />
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Chart history is not available yet for this instrument naming pattern from the indicator stream.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
