import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Layers, Package, DollarSign, AlertTriangle, FileText, Rocket, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as Dialog from "@radix-ui/react-dialog";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import './global.css';

interface StrategyDetails {
  id: string;
  name: string;
  segment: string;
  min_qty: number;
  avg_cost_lot: number;
  max_drawdown: number;
  description: string;
}

interface TradeRecord {
  id: string;
  security: string;
  entry_exit: string;
  price_lot: number;
  date_time: string;
  strat_id: string;
}

interface PerformanceDataPoint {
  date: string;
  pnl: number;
  cumulativePnl: number;
}

type Nullable<T> = T | null;

interface BrokerRow {
  id: string;
  name: string;
}

interface TelegramRow {
  id: string;
  label: Nullable<string>;
}

interface DeployForm {
  broker_id: string | null;
  telegram_chat_id: Nullable<string>;
  qty: Nullable<number>;
  dry_run: boolean;
}

interface StrategyCatalogRow {
  id: string;
  name: string;
  requires_telegram: boolean | null;
  default_qty: number | null;
}

interface StrategyDetailPageProps {
  strategyId: string;
  onBack: () => void;
  onNavigate?: (page: 'home' | 'mykeys' | 'telegram' | 'strategies' | 'portfolio') => void;
}

export function StrategyDetailPage({ strategyId, onBack, onNavigate }: StrategyDetailPageProps) {
  const { accessToken, user } = useAuth();
  const [details, setDetails] = useState<StrategyDetails | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Deploy state
  const [strategyCatalog, setStrategyCatalog] = useState<StrategyCatalogRow | null>(null);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [telegrams, setTelegrams] = useState<TelegramRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DeployForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = useMemo(() => {
    return createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
      }
    );
  }, [accessToken]);

  useEffect(() => {
    fetchStrategyData();
    if (user?.id) {
      fetchBrokersAndTelegrams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, strategyId, user?.id]);

  const fetchStrategyData = async () => {
    setIsLoading(true);
    try {
      // Fetch strategy details
      const { data: detailsData, error: detailsError } = await supabase
        .from('strategy_details')
        .select('*')
        .eq('id', strategyId)
        .single();

      if (detailsError) {
        console.error('Error fetching strategy details:', detailsError);
        toast.error('Failed to load strategy details');
      } else {
        setDetails(detailsData as StrategyDetails);
      }

      // Fetch strategy catalog data for deploy functionality
      const { data: catalogData, error: catalogError } = await supabase
        .from('strategy_catalog')
        .select('id, name, requires_telegram, default_qty')
        .eq('id', strategyId)
        .single();

      if (!catalogError && catalogData) {
        setStrategyCatalog(catalogData as StrategyCatalogRow);
      }

      // Fetch trade records for performance data
      const { data: tradesData, error: tradesError } = await supabase
        .from('strategy_desc_trades')
        .select('*')
        .eq('strat_id', strategyId)
        .order('date_time', { ascending: true });

      if (tradesError) {
        console.error('Error fetching trades:', tradesError);
      } else {
        setTrades((tradesData || []) as TradeRecord[]);
        processPerformanceData((tradesData || []) as TradeRecord[]);
      }
    } catch (error) {
      console.error('Error fetching strategy data:', error);
      toast.error('Failed to load strategy data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrokersAndTelegrams = async () => {
    if (!user?.id) return;
    try {
      // Fetch brokers
      const { data: brokersData, error: brokersError } = await supabase
        .from('user_brokers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (brokersError) throw brokersError;

      // Fetch telegrams
      const { data: telegramsData, error: telegramsError } = await supabase
        .from('user_telegram_chats')
        .select('id, label')
        .eq('user_id', user.id)
        .order('label', { ascending: true, nullsFirst: false });

      if (telegramsError) throw telegramsError;

      setBrokers(brokersData || []);
      setTelegrams(telegramsData || []);
    } catch (error) {
      console.error('Error fetching brokers/telegrams:', error);
    }
  };

  const handleDeploy = () => {
    if (!user?.id) {
      toast.error('No user detected');
      return;
    }
    setForm({
      broker_id: null,
      telegram_chat_id: null,
      qty: strategyCatalog?.default_qty ?? 1,
      dry_run: false,
    });
    setDialogOpen(true);
  };

  const updateForm = <K extends keyof DeployForm>(field: K, value: DeployForm[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const deployStrategy = async () => {
    if (!form || !user?.id) return;
    if (!form.broker_id) {
      toast.error('Please select a broker');
      return;
    }

    // Check if strategy requires telegram
    if (strategyCatalog?.requires_telegram && !form.telegram_chat_id) {
      toast.error('This strategy requires a Telegram chat');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        strategy_id: strategyId,
        broker_id: form.broker_id,
        telegram_chat_id: form.telegram_chat_id || null,
        qty: form.qty || null,
        dry_run: form.dry_run,
        active: true,
        config_version: 0,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_strategies')
        .insert([payload]);

      if (error) throw error;

      toast.success('Strategy deployed successfully!');
      setDialogOpen(false);
      setForm(null);

      // Navigate to portfolio page
      if (onNavigate) {
        onNavigate('portfolio');
      }
    } catch (err: any) {
      console.error('Deploy failed:', err);
      // Check if it's a unique constraint violation (strategy already deployed)
      if (err?.code === '23505' || err?.message?.includes('unique')) {
        toast.error('This strategy is already deployed. Please edit it from the Portfolio page.');
      } else {
        toast.error(err?.message || 'Failed to deploy strategy');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const processPerformanceData = (tradesData: TradeRecord[]) => {
    // Group trades by date and calculate daily P&L
    // Buy = entry = we spend money (negative)
    // Exit* (Exit Target, Exit Stoploss, Exit Cutoff) = we receive money (positive)
    const dailyPnL: { [key: string]: number } = {};

    tradesData.forEach(trade => {
      const date = new Date(trade.date_time).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const entryExitLower = trade.entry_exit?.toLowerCase() || '';
      let pnlContribution = 0;

      if (entryExitLower === 'buy') {
        // Buy = entry = we pay (subtract from P&L)
        pnlContribution = -trade.price_lot;
      } else if (entryExitLower.startsWith('exit')) {
        // Exit Target, Exit Stoploss, Exit Cutoff = we receive (add to P&L)
        pnlContribution = trade.price_lot;
      }

      dailyPnL[date] = (dailyPnL[date] || 0) + pnlContribution;
    });

    // Create cumulative performance data
    let cumulativePnl = 0;
    const performancePoints: PerformanceDataPoint[] = Object.entries(dailyPnL)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, pnl]) => {
        cumulativePnl += pnl;
        return {
          date,
          pnl: Number(pnl.toFixed(2)),
          cumulativePnl: Number(cumulativePnl.toFixed(2))
        };
      });

    setPerformanceData(performancePoints);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading strategy details...</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Strategies
        </Button>
        <div className="text-center py-12 text-slate-500">
          Strategy details not found.
        </div>
      </div>
    );
  }

  const totalPnL = performanceData.length > 0 
    ? performanceData[performanceData.length - 1].cumulativePnl 
    : 0;
  const isPositivePnL = totalPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 hover:bg-slate-100">
        <ArrowLeft className="h-4 w-4" />
        Back to Strategies
      </Button>

      {/* Strategy Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ fontSize: '1.5rem' }}>{details.name || 'Unnamed Strategy'}</h1>
          <Button
            onClick={handleDeploy}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Deploy
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Layers className="h-4 w-4 mr-2" />
            {details.segment || 'N/A'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isPositivePnL 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {isPositivePnL ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
            {formatCurrency(totalPnL)} Total P&L
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Min Quantity</p>
                <p className="text-2xl font-bold text-slate-900">{details.min_qty ?? 'N/A'}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Cost/Lot</p>
                <p className="text-2xl font-bold text-slate-900">{details.avg_cost_lot ? formatCurrency(details.avg_cost_lot) : 'N/A'}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600">{details.max_drawdown ? formatPercentage(details.max_drawdown) : 'N/A'}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Segment</p>
                <p className="text-2xl font-bold text-slate-900">{details.segment || 'N/A'}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Strategy Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
            {details.description || 'No description available for this strategy.'}
          </p>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Since Curation
          </CardTitle>
          <CardDescription>
            Cumulative P&L based on trade history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No performance data available yet.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositivePnL ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isPositivePnL ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                    labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cumulativePnl"
                    name="Cumulative P&L"
                    stroke={isPositivePnL ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPnl)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade History Table */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>
              Trade history showing entries and exits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Date & Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Security</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Price/Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(-10).reverse().map((trade, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(trade.date_time).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{trade.security || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          trade.entry_exit?.toLowerCase() === 'buy'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {trade.entry_exit || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {trade.price_lot ? formatCurrency(trade.price_lot) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {trades.length > 10 && (
              <p className="text-sm text-slate-500 mt-4 text-center">
                Showing last 10 of {trades.length} trades
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deploy Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => {
        setDialogOpen(o);
        if (!o) {
          setForm(null);
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="DialogTitle text-xl font-semibold text-slate-900">
                Deploy Strategy
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="IconButton rounded-full p-1 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="DialogDescription text-sm text-slate-600 mb-6">
              Configure deployment settings for "{details?.name || strategyCatalog?.name}". Broker is required.
            </Dialog.Description>

            <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
              <div className="flex flex-col">
                <label htmlFor="deploy-broker" className="text-sm font-medium text-slate-700 mb-1.5">
                  Broker <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form?.broker_id || '__none__'}
                  onValueChange={(value) => updateForm('broker_id', value === '__none__' ? null : value)}
                >
                  <SelectTrigger id="deploy-broker" className="w-full">
                    <SelectValue placeholder="Select a broker" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]" style={{ zIndex: 11000 }}>
                    <SelectItem value="__none__">Select a broker</SelectItem>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {brokers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No brokers available. Please create one in My Brokers first.</p>
                )}
              </div>

              <div className="flex flex-col">
                <label htmlFor="deploy-telegram" className="text-sm font-medium text-slate-700 mb-1.5">
                  Telegram {strategyCatalog?.requires_telegram && <span className="text-red-500">*</span>}
                  {strategyCatalog?.requires_telegram && (
                    <span className="text-xs text-blue-600 ml-2">(Required)</span>
                  )}
                </label>
                <Select
                  value={form?.telegram_chat_id || '__none__'}
                  onValueChange={(value) => updateForm('telegram_chat_id', value === '__none__' ? null : value)}
                >
                  <SelectTrigger id="deploy-telegram" className="w-full">
                    <SelectValue placeholder="Select a telegram chat (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]" style={{ zIndex: 11000 }}>
                    <SelectItem value="__none__">None</SelectItem>
                    {telegrams.map((telegram) => (
                      <SelectItem key={telegram.id} value={telegram.id}>
                        {telegram.label || 'Unnamed'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {strategyCatalog?.requires_telegram && telegrams.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">This strategy requires a Telegram chat. Please create one in Telegram page first.</p>
                )}
              </div>

              <div className="flex flex-col">
                <label htmlFor="deploy-qty" className="text-sm font-medium text-slate-700 mb-1.5">
                  Quantity
                </label>
                <Input
                  id="deploy-qty"
                  type="number"
                  value={form?.qty ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = value === '' ? null : Number(value);
                    updateForm('qty', parsed);
                  }}
                  placeholder="Enter quantity"
                  className="w-full"
                  min="1"
                />
              </div>

              <div className="flex items-center justify-between" style={{paddingBottom: '10px'}}>
                <label htmlFor="deploy-dry-run" className="text-sm font-medium text-slate-700">
                  Dry Run
                </label>
                <Switch
                  id="deploy-dry-run"
                  checked={form?.dry_run ?? false}
                  onCheckedChange={(checked) => updateForm('dry_run', checked)}
                  style={{ zIndex: 11000 }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200" style={{paddingTop: '10px'}}>
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={async () => {
                  await deployStrategy();
                }}
                disabled={isSaving || !form?.broker_id || (strategyCatalog?.requires_telegram && !form?.telegram_chat_id)}
              >
                <Rocket className="mr-2 h-4 w-4" />
                {isSaving ? 'Deploying...' : 'Deploy'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
