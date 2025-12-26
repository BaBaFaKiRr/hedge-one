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
import { Zap, Rocket, X, Info } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as Dialog from '@radix-ui/react-dialog';
import './global.css';

type Nullable<T> = T | null;

interface StrategyRow {
  id: string;
  name: string;
  image_uri: string;
  description: Nullable<string>;
  requires_telegram: boolean | null;
  default_qty: number | null;
  active: boolean | null;
  segment: Nullable<{ segment: string }>;
}

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

interface StrategiesPageProps {
  onNavigate?: (page: 'home' | 'mykeys' | 'telegram' | 'strategies' | 'portfolio') => void;
  onViewStrategyDetails?: (strategyId: string) => void;
}

export function StrategiesPage({ onNavigate, onViewStrategyDetails }: StrategiesPageProps) {
  const { accessToken, user } = useAuth();
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [telegrams, setTelegrams] = useState<TelegramRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyRow | null>(null);
  const [form, setForm] = useState<DeployForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = useMemo(() => {
    return createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        global: accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined,
      }
    );
  }, [accessToken]);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    fetchStrategies();
    fetchBrokersAndTelegrams();
  }, [supabase, user?.id]);

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('strategy_catalog')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setStrategies(data || []);
    } catch {
      toast.error('Failed to load strategies');
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

  const handleDeploy = (strategy: StrategyRow) => {
    setSelectedStrategy(strategy);
    setForm({
      broker_id: null,
      telegram_chat_id: null,
      qty: strategy.default_qty ?? 1,
      dry_run: false,
    });
    setDialogOpen(true);
  };

  const updateForm = <K extends keyof DeployForm>(field: K, value: DeployForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const deployStrategy = async () => {
    if (!form || !selectedStrategy || !user?.id) return;
    if (!form.broker_id) {
      toast.error('Please select a broker');
      return;
    }

    // Check if strategy requires telegram
    if (selectedStrategy.requires_telegram && !form.telegram_chat_id) {
      toast.error('This strategy requires a Telegram chat');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        strategy_id: selectedStrategy.id,
        broker_id: form.broker_id,
        telegram_chat_id: form.telegram_chat_id || null,
        qty: form.qty || null,
        dry_run: form.dry_run,
        active: true,
      };

      const { error } = await supabase.from('user_strategies').insert([payload]);

      if (error) throw error;

      toast.success('Strategy deployed successfully!');
      setDialogOpen(false);
      setForm(null);
      onNavigate?.('portfolio');
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

  if (isLoading) {
    return <div className="text-center py-20 text-slate-500">Loading strategies…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-1">Strategies</h1>
        <p className="text-slate-600">Browse and deploy available trading strategies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Strategy Catalogue
          </CardTitle>
          <CardDescription>
            Select a strategy and click Deploy to get started
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className="flex flex-col border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">
                    {strategy.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 flex-1">
                  {/* CONTENT */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-700 line-clamp-3 sm:line-clamp-4">
                      {strategy.description || 'No description available'}
                    </p>

                    <div className="grid grid-cols-2 text-sm text-slate-700">
                      <span>Min Qty: {strategy.default_qty ?? 1}</span>
                      <span className="text-right">
                        Segment: {strategy.segment?.segment || '—'}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="grid gap-2 mt-auto grid-cols-2 sm:grid-cols-1 pt-3">
                    <Button
                      variant="outline"
                      onClick={() => onViewStrategyDetails?.(strategy.id)}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Details
                    </Button>

                    <Button onClick={() => handleDeploy(strategy)}>
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

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
              Configure deployment settings for "{selectedStrategy?.name}". Broker is required.
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
                  Telegram {selectedStrategy?.requires_telegram && <span className="text-red-500">*</span>}
                  {selectedStrategy?.requires_telegram && (
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
                {selectedStrategy?.requires_telegram && telegrams.length === 0 && (
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
                disabled={isSaving || !form?.broker_id || (selectedStrategy?.requires_telegram && !form?.telegram_chat_id)}
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
