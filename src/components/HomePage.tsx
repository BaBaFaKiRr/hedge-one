import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, Activity, BarChart3, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface Trade {
  id: number;
  user: string | null;
  stock_option: string | null;
  position: string | null;
  price: number | null;
  date_time: string | null;
}

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
        .select('*')
        .eq('user', user.id)
        .order('date_time', { ascending: false });

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

  // Reset to page 1 when trades change
  useEffect(() => {
    setCurrentPage(1);
  }, [trades.length]);

  // Calculate Performance and Win Rate from trades
  const { performance, winRate } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter trades for current month
    const currentMonthTrades = trades.filter((trade) => {
      if (!trade.date_time) return false;
      const tradeDate = new Date(trade.date_time);
      return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
    });

    if (currentMonthTrades.length === 0) {
      return { performance: { pnl: 0, returnPercent: 0 }, winRate: 0 };
    }

    // Group trades by stock_option and match Entry/Buy with Exit/Sell/CUTOFF
    const tradePairs: Array<{ buy: Trade; sell: Trade | null }> = [];
    const stockGroups = new Map<string, Trade[]>();

    // Group trades by stock_option
    currentMonthTrades.forEach((trade) => {
      if (!trade.stock_option) return;
      const key = trade.stock_option;
      if (!stockGroups.has(key)) {
        stockGroups.set(key, []);
      }
      stockGroups.get(key)!.push(trade);
    });

    // Match Buy/Entry with Sell/Exit/CUTOFF for each stock
    stockGroups.forEach((stockTrades) => {
      // Sort by date_time
      stockTrades.sort((a, b) => {
        if (!a.date_time || !b.date_time) return 0;
        return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
      });

      let buyTrade: Trade | null = null;
      stockTrades.forEach((trade) => {
        const position = (trade.position || '').toLowerCase();
        const isEntry = position === 'entry' || position === 'buy';
        const isExit = position === 'exit' || position === 'sell' || position === 'cutoff';

        if (isEntry && !buyTrade) {
          buyTrade = trade;
        } else if (isExit && buyTrade) {
          tradePairs.push({ buy: buyTrade, sell: trade });
          buyTrade = null;
        }
      });
    });

    // Calculate total PnL and return percentage
    let totalPnL = 0;
    let totalBuyValue = 0;
    let winningTrades = 0;
    let totalTrades = 0;

    tradePairs.forEach(({ buy, sell }) => {
      if (!buy.price || !sell?.price) return;

      const buyPrice = buy.price;
      const sellPrice = sell.price;
      const pnl = sellPrice - buyPrice;
      const buyValue = buyPrice;

      totalPnL += pnl;
      totalBuyValue += buyValue;
      totalTrades++;

      if (pnl > 0) {
        winningTrades++;
      }
    });

    const returnPercent = totalBuyValue > 0 ? (totalPnL / totalBuyValue) * 100 : 0;
    const winRatePercent = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      performance: {
        pnl: totalPnL,
        returnPercent,
      },
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
      description: `PnL: ${performance.pnl >= 0 ? '+' : ''}$${performance.pnl.toFixed(2)}`,
      color: performance.returnPercent >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: performance.returnPercent >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'This month',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's an overview of your trading activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock / Option</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Date / Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.stock_option ?? '—'}</TableCell>
                    <TableCell className="capitalize">{trade.position ?? '—'}</TableCell>
                    <TableCell>
                      {trade.price !== null && trade.price !== undefined
                        ? `$${trade.price.toFixed(2)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {trade.date_time
                        ? new Date(trade.date_time).toLocaleString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
