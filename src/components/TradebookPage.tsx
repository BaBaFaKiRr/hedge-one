import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { BarChart3, RotateCcw } from 'lucide-react';
import { formatInr } from '../utils/currency';

export interface TradebookRow {
  id: number;
  stock_option: string | null;
  strategy: string;
  qty: number | null;
  entry_side: string;
  entry_price: number | null;
  entry_at: string;
  exit_side: string | null;
  exit_price: number | null;
  exit_at: string | null;
  realized_pnl: number | null;
  dry_run: boolean;
  broker_name: string | null;
  broker_platform: string | null;
}

const STRATEGY_OPTIONS: { value: string; label: string }[] = [
  { value: 'bank-nifty-ema', label: 'Bank Nifty EMA' },
  { value: 'stock-15min-breakout', label: 'Stock 15min Breakout' },
  { value: 'nifty-30min-breakout', label: 'NIFTY 30min Breakout' },
  { value: 'stock_ema_crossover', label: 'Stock EMA Crossover' },
];

function strategyLabel(id: string | null): string {
  if (!id) return '—';
  const opt = STRATEGY_OPTIONS.find((o) => o.value === id);
  return opt ? opt.label : id;
}

interface TradebookPageProps {
  onOpenTrade?: (tradeId: number) => void;
}

export function TradebookPage({ onOpenTrade }: TradebookPageProps) {
  const { user, accessToken } = useAuth();
  const [trades, setTrades] = useState<TradebookRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

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
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(
          'id, stock_option, strategy, qty, entry_side, entry_price, entry_at, exit_side, exit_price, exit_at, realized_pnl, dry_run, broker_name, broker_platform'
        )
        .eq('user_id', user.id)
        .order('entry_at', { ascending: false });

      if (error) throw error;

      setTrades((data ?? []) as TradebookRow[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to load trades');
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const monthOptions = useMemo(() => {
    const dates = trades
      .map((t) => t.entry_at)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d));

    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date();
    const options: { value: string; label: string }[] = [];

    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    while (current <= end) {
      const value = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const label = current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
      current.setMonth(current.getMonth() + 1);
    }

    options.reverse();
    return options;
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (strategyFilter !== 'all' && trade.strategy !== strategyFilter) return false;
      if (dateRangeFilter !== 'all' && trade.entry_at) {
        const tradeDate = new Date(trade.entry_at);
        const tradeMonth = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
        if (tradeMonth !== dateRangeFilter) return false;
      }
      return true;
    });
  }, [trades, strategyFilter, dateRangeFilter]);

  const formatEntryExitSummary = (t: TradebookRow): string => {
    const en = t.entry_side || '';
    const ex = t.exit_side ?? null;
    const ep = formatInr(t.entry_price);
    if (!ex) return `${en} ${ep} → …`;
    return `${en} ${ep} → ${ex} ${formatInr(t.exit_price)}`;
  };

  const resetFilters = () => {
    setStrategyFilter('all');
    setDateRangeFilter('all');
    toast.success('Filters reset');
  };

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Please sign in to view your tradebook.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-1">Tradebook</h1>
        <p className="text-slate-600">View and filter all your trades</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            All Trades
          </CardTitle>
          <CardDescription>
            Trades matched to your account. Click a row for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Strategy:</label>
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All strategies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All strategies</SelectItem>
                  {STRATEGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Date range:</label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading trades...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No trades found{strategyFilter !== 'all' || dateRangeFilter !== 'all' ? ' matching filters' : ''}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Sno</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Entry → Exit</TableHead>
                    <TableHead>P&amp;L</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade, index) => (
                    <TableRow
                      key={trade.id}
                      className={onOpenTrade ? 'cursor-pointer hover:bg-slate-50' : undefined}
                      onClick={() => onOpenTrade?.(trade.id)}
                      role={onOpenTrade ? 'button' : undefined}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{strategyLabel(trade.strategy)}</TableCell>
                      <TableCell>{trade.stock_option ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {[trade.broker_name, trade.broker_platform].filter(Boolean).join(' · ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{formatEntryExitSummary(trade)}</TableCell>
                      <TableCell
                        className={
                          trade.realized_pnl == null
                            ? 'text-slate-500'
                            : trade.realized_pnl >= 0
                              ? 'text-green-600 font-medium'
                              : 'text-red-600 font-medium'
                        }
                      >
                        {trade.realized_pnl == null ? 'Open' : formatInr(trade.realized_pnl)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {trade.entry_at
                          ? new Date(trade.entry_at).toLocaleString('en-IN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour12: false,
                            })
                          : '—'}
                        {trade.dry_run && (
                          <span className="ml-2 text-xs text-amber-700">(paper)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
