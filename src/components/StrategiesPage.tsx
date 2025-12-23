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

    const { data: brokersData } = await supabase
      .from('user_brokers')
      .select('id, name')
      .eq('user_id', user.id);

    const { data: telegramsData } = await supabase
      .from('user_telegram_chats')
      .select('id, label')
      .eq('user_id', user.id);

    setBrokers(brokersData || []);
    setTelegrams(telegramsData || []);
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
    if (!form.broker_id) return toast.error('Select a broker');

    setIsSaving(true);
    try {
      await supabase.from('user_strategies').insert([
        {
          user_id: user.id,
          strategy_id: selectedStrategy.id,
          broker_id: form.broker_id,
          telegram_chat_id: form.telegram_chat_id,
          qty: form.qty,
          dry_run: form.dry_run,
          active: true,
        },
      ]);

      toast.success('Strategy deployed');
      setDialogOpen(false);
      onNavigate?.('portfolio');
    } catch {
      toast.error('Deploy failed');
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

      {/* Deploy Dialog (unchanged logic) */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Deploy Strategy
            </Dialog.Title>

            <div className="space-y-4">
              <Select
                value={form?.broker_id ?? ''}
                onValueChange={(v) => updateForm('broker_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={form?.qty ?? ''}
                onChange={(e) => updateForm('qty', Number(e.target.value))}
                placeholder="Quantity"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={deployStrategy} disabled={isSaving}>
                  Deploy
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
