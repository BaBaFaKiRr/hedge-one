import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, Activity, BarChart3, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { formatInr } from '../utils/currency';

interface Trade {
  id: number;
  stock_option: string | null;
  entry_at: string;
  entry_price: number | null;
  entry_side: string;
  exit_at: string | null;
  realized_pnl: number | null;
  qty: number | null;
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
        .select(
          'id, stock_option, entry_at, entry_price, entry_side, exit_at, realized_pnl, qty'
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

  return (
    <>
      <style>{`
        /* Mobile-only styles - only apply below 768px */
        @media (max-width: 767px) {
          /* Make stats grid 2 columns on mobile */
          .mobile-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.75rem !important;
          }
          
          /* Make stat cards more compact on mobile */
          .mobile-stats-grid [data-slot="card"] {
            gap: 0.5rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-header"] {
            padding: 0.75rem 0.75rem 0.5rem 0.75rem !important;
            gap: 0.5rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-title"] {
            font-size: 0.75rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-content"] {
            padding: 0 0.75rem 0.75rem 0.75rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-content"] > div:first-child {
            font-size: 1.125rem !important;
            margin-bottom: 0.25rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-content"] > p {
            font-size: 0.75rem !important;
            line-height: 1.2 !important;
          }
          
          .mobile-stats-grid [data-slot="card-header"] .p-2 {
            padding: 0.375rem !important;
          }
          
          .mobile-stats-grid [data-slot="card-header"] .h-5 {
            height: 1rem !important;
            width: 1rem !important;
          }
          
          /* Hide desktop table on mobile */
          .desktop-trades-table {
            display: none !important;
          }
          
          /* Show mobile card view */
          .mobile-trades-cards {
            display: block;
          }
          
          .mobile-trade-card {
            border: 1px solid rgb(226, 232, 240);
            border-radius: 0.5rem;
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }
          
          .mobile-trade-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          
          .mobile-trade-stock {
            font-weight: 600;
            color: rgb(15, 23, 42);
            font-size: 0.875rem;
          }
          
          .mobile-trade-position {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            background-color: rgb(241, 245, 249);
            border-radius: 0.25rem;
            text-transform: capitalize;
            color: rgb(51, 65, 85);
          }
          
          .mobile-trade-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
          }
          
          .mobile-trade-label {
            color: rgb(71, 85, 105);
          }
          
          .mobile-trade-value {
            font-weight: 500;
            color: rgb(15, 23, 42);
          }
        }
        
        /* Desktop styles - hide mobile view, show table */
        @media (min-width: 768px) {
          .mobile-trades-cards {
            display: none !important;
          }
          
          .desktop-trades-table {
            display: block;
          }
        }
      `}</style>
      <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's an overview of your trading activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mobile-stats-grid">
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
            <>
              {/* Mobile Card View - Only visible on mobile */}
              <div className="mobile-trades-cards">
                {paginatedTrades.map((trade) => (
                  <div key={trade.id} className="mobile-trade-card">
                    <div className="mobile-trade-header">
                      <span className="mobile-trade-stock">{trade.stock_option ?? '—'}</span>
                      <span className="mobile-trade-position">{trade.entry_side ?? '—'}</span>
                    </div>
                    <div className="mobile-trade-row">
                      <span className="mobile-trade-label">P&amp;L:</span>
                      <span className="mobile-trade-value">
                        {trade.realized_pnl == null ? 'Open' : formatInr(trade.realized_pnl)}
                      </span>
                    </div>
                    <div className="mobile-trade-row">
                      <span className="mobile-trade-label">Date:</span>
                      <span className="mobile-trade-value">
                        {trade.entry_at
                          ? new Date(trade.entry_at).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View - Only visible on desktop */}
              <div className="desktop-trades-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stock / Option</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>P&amp;L</TableHead>
                      <TableHead>Entry time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.stock_option ?? '—'}</TableCell>
                        <TableCell className="capitalize">{trade.entry_side ?? '—'}</TableCell>
                        <TableCell>
                          {trade.realized_pnl == null ? 'Open' : formatInr(trade.realized_pnl)}
                        </TableCell>
                        <TableCell>
                          {trade.entry_at
                            ? new Date(trade.entry_at).toLocaleString()
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
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
    </>
  );
}
