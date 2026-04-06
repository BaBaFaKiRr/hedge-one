import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { formatInr } from '../utils/currency';

export interface TradeDetailRow {
  id: number;
  user_id: string;
  stock_option: string | null;
  strategy: string;
  qty: number | null;
  entry_side: string;
  entry_price: number | null;
  entry_order_id: string | null;
  entry_at: string;
  exit_side: string | null;
  exit_price: number | null;
  exit_order_id: string | null;
  exit_at: string | null;
  exit_reason: string | null;
  realized_pnl: number | null;
  dry_run: boolean;
  broker_name: string | null;
  broker_platform: string | null;
}

const STRATEGY_LABELS: Record<string, string> = {
  'bank-nifty-ema': 'Bank Nifty EMA',
  'stock-15min-breakout': 'Stock 15min Breakout',
  'nifty-30min-breakout': 'NIFTY 30min Breakout',
  stock_ema_crossover: 'Stock EMA Crossover',
};

function labelStrategy(id: string | null): string {
  if (!id) return '—';
  return STRATEGY_LABELS[id] ?? id;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

interface TradeDetailPageProps {
  tradeId: number;
  onBack: () => void;
}

export function TradeDetailPage({ tradeId, onBack }: TradeDetailPageProps) {
  const { accessToken, user } = useAuth();
  const [trade, setTrade] = useState<TradeDetailRow | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    return createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!user?.id || !tradeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(
          'id,user_id,stock_option,strategy,qty,entry_side,entry_price,entry_order_id,entry_at,exit_side,exit_price,exit_order_id,exit_at,exit_reason,realized_pnl,dry_run,broker_name,broker_platform'
        )
        .eq('id', tradeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Trade not found');
        setTrade(null);
        return;
      }
      setTrade(data as TradeDetailRow);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load trade');
      setTrade(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, tradeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600">Please sign in.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-slate-900">Trade details</h1>
          <p className="text-slate-600 text-sm">#{tradeId}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-12">Loading…</div>
      ) : !trade ? (
        <div className="text-slate-500 text-sm">No data.</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span>{trade.stock_option ?? '—'}</span>
              {trade.dry_run && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Paper
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {labelStrategy(trade.strategy)}
              {trade.broker_name || trade.broker_platform
                ? ` · ${[trade.broker_name, trade.broker_platform].filter(Boolean).join(' · ')}`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-slate-800 mb-2">Entry</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-mono">{trade.entry_side}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Price</dt>
                  <dd>{formatInr(trade.entry_price)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Order ID</dt>
                  <dd className="font-mono break-all">{trade.entry_order_id ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Time</dt>
                  <dd>{formatWhen(trade.entry_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Qty</dt>
                  <dd>{trade.qty ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-slate-800 mb-2">Exit</h3>
              {!trade.exit_at ? (
                <p className="text-slate-500">Open — exit not recorded yet.</p>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-mono">{trade.exit_side ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Price</dt>
                    <dd>{formatInr(trade.exit_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Reason</dt>
                    <dd>{trade.exit_reason ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Order ID</dt>
                    <dd className="font-mono break-all">{trade.exit_order_id ?? '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Time</dt>
                    <dd>{formatWhen(trade.exit_at)}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">P&amp;L (realized)</span>
                <span
                  className={`text-lg font-semibold ${
                    trade.realized_pnl == null
                      ? 'text-slate-500'
                      : trade.realized_pnl >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {trade.realized_pnl == null ? '—' : formatInr(trade.realized_pnl)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
