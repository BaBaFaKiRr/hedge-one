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

interface Trade {
  id: number;
  user: string | null;
  stock_option: string | null;
  position: string | null;
  price: number | null;
  date_time: string | null;
  strategy: string | null;
  qty: number | null;
}

const STRATEGY_OPTIONS: { value: string; label: string }[] = [
  { value: 'bank-nifty-ema', label: 'Bank Nifty EMA' },
  { value: 'stock-15min-breakout', label: 'Stock 15min Breakout' },
  { value: 'nifty-30min-breakout', label: 'NIFTY 30min Breakout' },
  { value: 'stock_ema_crossover', label: 'Stock EMA Crossover' },
];

export function TradebookPage() {
  const { user, accessToken } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
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
        .select('id, user, stock_option, position, price, date_time, strategy, qty')
        .eq('user', user.id)
        .order('date_time', { ascending: false });

      if (error) throw error;

      setTrades((data ?? []) as Trade[]);
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

  // Generate month options from oldest trade to current month
  const monthOptions = useMemo(() => {
    const dates = trades
      .map((t) => t.date_time)
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

    // Sort newest first
    options.reverse();
    return options;
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (strategyFilter !== 'all' && trade.strategy !== strategyFilter) return false;
      if (dateRangeFilter !== 'all' && trade.date_time) {
        const tradeDate = new Date(trade.date_time);
        const tradeMonth = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
        if (tradeMonth !== dateRangeFilter) return false;
      }
      return true;
    });
  }, [trades, strategyFilter, dateRangeFilter]);

  const getStrategyLabel = (strategyId: string | null) => {
    if (!strategyId) return '—';
    const opt = STRATEGY_OPTIONS.find((o) => o.value === strategyId);
    return opt ? opt.label : strategyId;
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
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
            Trades matched to your account. Use filters to narrow down results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
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
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading trades...
            </div>
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
                    <TableHead>Security</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Trade Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade, index) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{trade.stock_option ?? '—'}</TableCell>
                      <TableCell>{getStrategyLabel(trade.strategy)}</TableCell>
                      <TableCell className="capitalize">{trade.position ?? '—'}</TableCell>
                      <TableCell>
                        {trade.price != null ? `$${trade.price.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>{formatDateTime(trade.date_time)}</TableCell>
                      <TableCell>{trade.qty ?? '—'}</TableCell>
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
