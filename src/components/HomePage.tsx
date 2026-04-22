import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, Activity, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { formatInr } from '../utils/currency';
import { useLiveTradePrices } from '../hooks/useLiveTradePrices';
import { getLiveTradeSnapshot, strategySupportsLivePnl } from '../utils/liveTradeMapping';
import type { BaseTradeRow } from '../types/trades';
import { TradingViewSymbolChart } from './TradingViewSymbolChart';

interface Trade extends BaseTradeRow {}

interface PythonLog {
  id: number;
  created_at: string;
  user: string | null;
  content: string | null;
}

export function HomePage() {
  const { user, accessToken } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [logs, setLogs] = useState<PythonLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 10;

  const supabase = useMemo(() => {
    return createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
      }
    );
  }, [accessToken]);

  const fetchTrades = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingTrades(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(
          'id, stock_option, strategy, entry_at, entry_price, entry_side, exit_at, realized_pnl, qty'
        )
        .eq('user_id', user.id)
        .order('entry_at', { ascending: false });

      if (error) throw error;

      setTrades((data ?? []) as Trade[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setIsLoadingTrades(false);
    }
  }, [supabase, user?.id]);

  const fetchLogs = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('python_logs')
        .select('*')
        .eq('user', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs((data ?? []) as PythonLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    fetchTrades();
    fetchLogs();
  }, [fetchTrades, fetchLogs]);

  // Pagination calculations for trades
  const totalPages = Math.ceil(trades.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const paginatedTrades = trades.slice(startIndex, endIndex);
  const { quotesByKey } = useLiveTradePrices(paginatedTrades);

  // Reset to page 1 when trades change
  useEffect(() => {
    setCurrentPage(1);
  }, [trades.length]);

  const { performance, winRate } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTrades = trades.filter((trade) => {
      if (!trade.entry_at) return false;
      const tradeDate = new Date(trade.entry_at);
      return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
    });

    const closed = currentMonthTrades.filter(
      (t) => t.realized_pnl != null && t.exit_at != null
    );

    if (closed.length === 0) {
      return { performance: { pnl: 0, returnPercent: 0 }, winRate: 0 };
    }

    const totalPnL = closed.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);
    const notional = closed.reduce((s, t) => {
      const q = t.qty ?? 1;
      const ep = t.entry_price ?? 0;
      return s + Math.abs(ep * q);
    }, 0);
    const returnPercent = notional > 0 ? (totalPnL / notional) * 100 : 0;
    const wins = closed.filter((t) => (t.realized_pnl ?? 0) > 0).length;
    const winRatePercent = (wins / closed.length) * 100;

    return {
      performance: { pnl: totalPnL, returnPercent },
      winRate: winRatePercent,
    };
  }, [trades]);

  const stats = [
    {
      title: 'Performance',
      value: performance.returnPercent >= 0 
        ? `+${performance.returnPercent.toFixed(2)}%` 
        : `${performance.returnPercent.toFixed(2)}%`,
      icon: BarChart3,
      description: `PnL: ${performance.pnl >= 0 ? '+' : ''}${formatInr(performance.pnl)} | This month's`,
      color: performance.returnPercent >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: performance.returnPercent >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: "This month's performance",
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  const recentLogs = useMemo(() => logs.slice(0, 8), [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's an overview of your trading activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-slate-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-slate-900 mb-1">{stat.value}</div>
                <p className="text-slate-500">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Nifty 50 Live Chart
            </CardTitle>
            <CardDescription>
              Streaming via custom websocket feed used by Positions charts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full min-h-0 md:h-[460px]">
              <TradingViewSymbolChart chartSymbol="NIFTY50" interval="5" />
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle>Latest Engine Logs</CardTitle>
              <CardDescription>Recent messages from python worker logs</CardDescription>
            </div>
            <Button onClick={fetchLogs} disabled={isLoadingLogs} size="sm" variant="secondary">
              {isLoadingLogs ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="text-sm text-slate-600">Loading logs...</div>
            ) : recentLogs.length === 0 ? (
              <div className="text-sm text-slate-500">No logs available.</div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-700">
                      {log.content?.trim() || 'No message'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Latest executions pulled from your trade history</CardDescription>
          </div>
          <Button onClick={fetchTrades} disabled={isLoadingTrades} variant="secondary">
            {isLoadingTrades ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingTrades ? (
            <div className="text-slate-600">Loading trades...</div>
          ) : trades.length === 0 ? (
            <div className="text-slate-500 text-sm">No trades recorded yet.</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {paginatedTrades.map((trade) => {
                  const live = getLiveTradeSnapshot(trade, quotesByKey);
                  const pnlValue = trade.realized_pnl ?? live.unrealizedPnl;
                  const supportsLivePnl = strategySupportsLivePnl(trade.strategy);
                  return (
                    <div key={trade.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{trade.stock_option ?? '—'}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{trade.entry_side ?? '—'}</span>
                      </div>
                      {!trade.exit_at && (
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-500">LTP:</span>
                          <span className="font-medium text-slate-900">
                            {supportsLivePnl && live.hasLivePrice ? formatInr(live.ltp) : '—'}
                          </span>
                        </div>
                      )}
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-500">P&amp;L:</span>
                        <span className="font-medium text-slate-900">
                          {pnlValue == null ? 'Open' : formatInr(pnlValue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-medium text-slate-900">
                          {trade.entry_at
                            ? new Date(trade.entry_at).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stock / Option</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>LTP</TableHead>
                      <TableHead>P&amp;L</TableHead>
                      <TableHead>Entry time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTrades.map((trade) => {
                      const live = getLiveTradeSnapshot(trade, quotesByKey);
                      const pnlValue = trade.realized_pnl ?? live.unrealizedPnl;
                      const supportsLivePnl = strategySupportsLivePnl(trade.strategy);
                      return (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.stock_option ?? '—'}</TableCell>
                          <TableCell className="capitalize">{trade.entry_side ?? '—'}</TableCell>
                          <TableCell>{trade.exit_at ? '—' : supportsLivePnl && live.hasLivePrice ? formatInr(live.ltp) : '—'}</TableCell>
                          <TableCell>
                            {pnlValue == null ? 'Open' : formatInr(pnlValue)}
                          </TableCell>
                          <TableCell>
                            {trade.entry_at
                              ? new Date(trade.entry_at).toLocaleString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {trades.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, trades.length)} of {trades.length} trades
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
