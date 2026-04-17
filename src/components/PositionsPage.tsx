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

interface GroupedTrades {
  strategy: string;
  trades: PositionTrade[];
}

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

function formatStrategyLabel(value: string | null | undefined) {
  const normalized = (value ?? '').trim();
  if (!normalized) return 'Unknown Strategy';

  const labels: Record<string, string> = {
    STOCK_EMA_CROSSOVER: 'Stock EMA Crossover',
    'STOCK-15MIN-BREAKOUT': 'Stock 15 min Breakout',
    'NIFTY-30MIN-BREAKOUT': 'Nifty 30 min Breakout',
    'BANK-NIFTY-EMA': 'Bank Nifty EMA',
    STOCK_75MIN_FUT: 'Stock 75 min Fut',
  };

  return labels[normalized.toUpperCase()] ?? normalized;
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
  const groupedTrades = useMemo<GroupedTrades[]>(() => {
    const groups = new Map<string, PositionTrade[]>();
    trades.forEach((trade) => {
      const key = trade.strategy || 'Unknown Strategy';
      const list = groups.get(key) ?? [];
      list.push(trade);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).map(([strategy, grouped]) => ({
      strategy,
      trades: grouped,
    }));
  }, [trades]);

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

      <div className="flex min-h-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-4">
        <Card className="flex min-h-[min(640px,calc(100vh-13rem))] w-full shrink-0 flex-col overflow-hidden sm:h-[calc(100vh-13rem)] sm:w-[380px] sm:min-w-[380px]">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle>Today&apos;s Positions</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-0">
            {trades.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                {isLoading ? 'Loading today’s positions...' : 'No trades found for today.'}
              </div>
            ) : (
              <div className="space-y-5 p-3">
                {groupedTrades.map((group) => (
                  <div key={group.strategy} className="space-y-2">
                    <div className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {formatStrategyLabel(group.strategy)}
                    </div>
                    <div className="space-y-1">
                      {group.trades.map((trade) => {
                        const live = getLiveTradeSnapshot(trade, quotesByKey);
                        const supportsLivePnl = strategySupportsLivePnl(trade.strategy);
                        const pnlValue = trade.realized_pnl ?? live.unrealizedPnl;
                        const isSelected = trade.id === selectedTradeId;
                        const isClosed = Boolean(trade.exit_at);
                        const chartAvailable = Boolean(getPositionChartSymbol(trade));
                        const ltpValue = isClosed ? trade.exit_price : live.ltp;

                        return (
                          <button
                            key={trade.id}
                            type="button"
                            onClick={() => setSelectedTradeId(trade.id)}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : isClosed
                                  ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={`text-xs font-medium uppercase tracking-wide ${isSelected ? 'text-slate-300' : isClosed ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {isClosed ? 'Closed' : 'Open'} {trade.entry_side || '—'}
                                </div>
                                <div className="mt-1 truncate text-sm font-semibold">
                                  {trade.stock_option ?? '—'}
                                </div>
                                <div className={`mt-1 text-xs ${isSelected ? 'text-slate-300' : isClosed ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Qty {trade.qty ?? '—'}
                                  {!chartAvailable ? ' · Chart not available' : ''}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className={`text-xs ${isSelected ? 'text-slate-300' : isClosed ? 'text-slate-400' : 'text-slate-500'}`}>
                                  LTP
                                </div>
                                <div className="text-sm font-medium">
                                  {ltpValue != null ? formatInr(ltpValue) : '—'}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className={`text-xs ${isSelected ? 'text-slate-300' : isClosed ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatWhen(trade.entry_at)}
                              </div>
                              <div
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? 'text-white'
                                    : pnlValue == null
                                      ? isClosed
                                        ? 'text-slate-400'
                                        : 'text-slate-500'
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
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[min(640px,calc(100vh-13rem))] min-w-0 flex-1 flex-col sm:h-[calc(100vh-13rem)]">
          <CardHeader>
            <CardTitle>Position Chart</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4">
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
                    <div className="mt-1 font-medium text-slate-900">{selectedChartSymbol ?? 'Chart not available'}</div>
                  </div>
                </div>

                {selectedChartSymbol ? (
                  <div className="lg:min-h-0 lg:flex-1">
                    <TradingViewPositionChart chartSymbol={selectedChartSymbol} trade={selectedTrade} />
                  </div>
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 lg:min-h-0 lg:flex-1">
                    Chart not available for this security. This mainly applies to NIFTY options in `nifty_30min_breakout` and stock futures in `stock_75min_fut`.
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
