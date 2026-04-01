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
import { Briefcase, Edit3, Trash2, X, RefreshCw, BarChart3, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, Rocket } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as Dialog from "@radix-ui/react-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import './global.css';

type Nullable<T> = T | null;

interface UserStrategyRow {
  id: string;
  user_id: string;
  strategy_id: string;
  broker_id: Nullable<string>;
  telegram_chat_id: Nullable<string>;
  qty: Nullable<number>;
  dry_run: boolean | null;
  active: boolean | null;
  config_version: Nullable<number>;
  task_arn: Nullable<string>;
  last_task_status: Nullable<string>;
  last_seen: Nullable<string>;
  created_at?: string;
  updated_at?: string;
  error?: Nullable<string>;
}

interface StrategyCatalogRow {
  id: string;
  name: string;
}

interface BrokerRow {
  id: string;
  name: string;
  session_status?: Nullable<string>;
  session_last_error?: Nullable<string>;
  session_last_verified_at?: Nullable<string>;
  session_expires_at?: Nullable<string>;
}

interface TelegramRow {
  id: string;
  label: Nullable<string>;
}

interface UserStrategyDisplay extends UserStrategyRow {
  strategy_name?: string;
  broker_name?: Nullable<string>;
  telegram_label?: Nullable<string>;
  broker_session_status?: Nullable<string>;
  broker_session_last_error?: Nullable<string>;
}

interface EditForm {
  broker_id: Nullable<string>;
  telegram_chat_id: Nullable<string>;
  qty: Nullable<number>;
  dry_run: boolean;
}

interface StrategyTrade {
  id: number;
  user: string | null;
  stock_option: string | null;
  position: string | null;
  price: number | null;
  date_time: string | null;
  strategy: string | null;
  qty: number | null;
}

export function PortfolioPage() {
  const { accessToken, user } = useAuth();
  const [strategies, setStrategies] = useState<UserStrategyDisplay[]>([]);
  const [strategiesInError, setStrategiesInError] = useState<UserStrategyDisplay[]>([]);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [telegrams, setTelegrams] = useState<TelegramRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingFromError, setIsEditingFromError] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRestartingStrategy, setIsRestartingStrategy] = useState<string | null>(null);
  const [isRedeploying, setIsRedeploying] = useState<string | null>(null);
  
  // Trades state
  const [expandedTradesId, setExpandedTradesId] = useState<string | null>(null);
  const [trades, setTrades] = useState<Record<string, StrategyTrade[]>>({});
  const [isLoadingTrades, setIsLoadingTrades] = useState<Record<string, boolean>>({});
  const [tradesCurrentPage, setTradesCurrentPage] = useState<Record<string, number>>({});
  const tradesPerPage = 15;

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
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`portfolio-user-brokers-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_brokers',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await fetchData();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  const fetchData = async () => {
    if (!user?.id) return;
    setIsFetching(true);
    try {
      // Fetch user strategies
      const { data: userStrategies, error: strategiesError } = await supabase
        .from('user_strategies')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (strategiesError) throw strategiesError;

      // Fetch strategies in error
      const { data: userStrategiesInError, error: strategiesInErrorError } = await supabase
        .from('user_strategies_in_error')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (strategiesInErrorError) {
        console.error('Error fetching strategies in error:', strategiesInErrorError);
        // Don't throw - this is optional data
      }

      // Fetch brokers
      const { data: brokersData, error: brokersError } = await supabase
        .from('user_brokers')
        .select('id, name, session_status, session_last_error, session_last_verified_at, session_expires_at')
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

      // Fetch strategy names for both active and error strategies
      const allStrategyIds = [
        ...(userStrategies || []).map(s => s.strategy_id),
        ...(userStrategiesInError || []).map(s => s.strategy_id)
      ];
      const uniqueStrategyIds = [...new Set(allStrategyIds)];
      
      const { data: strategiesData, error: strategiesCatalogError } = await supabase
        .from('strategy_catalog')
        .select('id, name')
        .in('id', uniqueStrategyIds);

      if (strategiesCatalogError) throw strategiesCatalogError;

      // Combine data
      const strategiesMap = new Map((strategiesData || []).map(s => [s.id, s.name]));
      const brokersMap = new Map((brokersData || []).map(b => [b.id, b.name]));
      const brokersMetaMap = new Map((brokersData || []).map(b => [b.id, b]));
      const telegramsMap = new Map((telegramsData || []).map(t => [t.id, t.label || 'Unnamed']));

      const enrichedStrategies: UserStrategyDisplay[] = (userStrategies || []).map(strategy => ({
        ...strategy,
        strategy_name: strategiesMap.get(strategy.strategy_id) || strategy.strategy_id,
        broker_name: strategy.broker_id ? brokersMap.get(strategy.broker_id) || null : null,
        telegram_label: strategy.telegram_chat_id ? telegramsMap.get(strategy.telegram_chat_id) || null : null,
        broker_session_status: strategy.broker_id ? brokersMetaMap.get(strategy.broker_id)?.session_status || null : null,
        broker_session_last_error: strategy.broker_id ? brokersMetaMap.get(strategy.broker_id)?.session_last_error || null : null,
      }));

      const enrichedStrategiesInError: UserStrategyDisplay[] = (userStrategiesInError || []).map(strategy => ({
        ...strategy,
        strategy_name: strategiesMap.get(strategy.strategy_id) || strategy.strategy_id,
        broker_name: strategy.broker_id ? brokersMap.get(strategy.broker_id) || null : null,
        telegram_label: strategy.telegram_chat_id ? telegramsMap.get(strategy.telegram_chat_id) || null : null,
        broker_session_status: strategy.broker_id ? brokersMetaMap.get(strategy.broker_id)?.session_status || null : null,
        broker_session_last_error: strategy.broker_id ? brokersMetaMap.get(strategy.broker_id)?.session_last_error || null : null,
      }));

      setStrategies(enrichedStrategies);
      setStrategiesInError(enrichedStrategiesInError);
      setBrokers(brokersData || []);
      setTelegrams(telegramsData || []);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  // Open dialog to edit strategy
  const openEditDialog = (strategy: UserStrategyDisplay, fromErrorTable: boolean = false) => {
    setEditingId(strategy.id);
    setIsEditingFromError(fromErrorTable);
    setForm({
      broker_id: strategy.broker_id,
      telegram_chat_id: strategy.telegram_chat_id,
      qty: strategy.qty ?? 1,
      dry_run: strategy.dry_run ?? true,
    });
    setDialogOpen(true);
  };

  const updateForm = <K extends keyof EditForm>(field: K, value: EditForm[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const saveStrategy = async () => {
    if (!form || !user?.id || !editingId) return;
    setIsSaving(true);
    try {
      const payload = {
        broker_id: form.broker_id || null,
        telegram_chat_id: form.telegram_chat_id || null,
        qty: form.qty || null,
        dry_run: form.dry_run,
        updated_at: new Date().toISOString(),
      };

      const tableName = isEditingFromError ? 'user_strategies_in_error' : 'user_strategies';
      const { error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Strategy updated successfully');
      setDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error(err?.message || 'Failed to update strategy');
    } finally {
      setIsSaving(false);
    }
  };

  const restartStrategy = async (strategy: UserStrategyDisplay) => {
    if (!user?.id) return;
    setIsRestartingStrategy(strategy.id);
    try {
      // Fetch task_arn from user_strategies table
      const { data, error } = await supabase
        .from('user_strategies')
        .select('task_arn')
        .eq('id', strategy.id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const taskArn = data?.task_arn;
      if (!taskArn) {
        throw new Error('Task ARN not found for this strategy');
      }

      // Send POST request with task_arn
      const requestBody = { taskArn: taskArn };
      console.log('Sending restart request:', requestBody);
      
      const taskRestartUrl = (import.meta as any).env?.VITE_TASK_RESTART_URL;
      if (!taskRestartUrl) {
        throw new Error('TASK_RESTART_URL environment variable is not set');
      }
      
      const response = await fetch(taskRestartUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`Restart failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));
      console.log('Restart successful:', result);
      toast.success(`Strategy "${strategy.strategy_name}" restart initiated`);
    } catch (error: any) {
      console.error('Restart failed - Full error:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        toast.error('Network error: Unable to connect to the server. Please check your connection.');
      } else {
        toast.error(error?.message || `Failed to restart strategy "${strategy.strategy_name}"`);
      }
    } finally {
      setIsRestartingStrategy(null);
    }
  };

  const stopTask = async (taskArn: string, strategyName: string) => {
    try {
      const requestBody = { taskArn: taskArn };
      console.log('Sending stop request:', requestBody);
      
      const response = await fetch("https://rhc3n54flhhz2j5x7bydcaobhy0lkqck.lambda-url.ap-southeast-2.on.aws/", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Stop response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`Stop failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));
      console.log('Stop successful:', result);
    } catch (error: any) {
      console.error('Stop failed - Full error:', error);
      // Don't throw here - we'll log but continue since supabase entry is already deleted
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
    }
  };

  const deleteStrategy = async (strategy: UserStrategyDisplay) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${strategy.strategy_name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(strategy.id);
    try {
      // First, fetch task_arn before deleting the entry
      const { data, error: fetchError } = await supabase
        .from('user_strategies')
        .select('task_arn')
        .eq('id', strategy.id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const taskArn = data?.task_arn;

      // Delete the entry from supabase
      const { error: deleteError } = await supabase
        .from('user_strategies')
        .delete()
        .eq('id', strategy.id)
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;

      // Stop the task if task_arn exists
      if (taskArn) {
        await stopTask(taskArn, strategy.strategy_name || 'Unknown');
      }

      toast.success('Strategy deleted successfully');
      await fetchData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err?.message || 'Failed to delete strategy');
    } finally {
      setIsDeleting(null);
    }
  };

  const deleteStrategyFromError = async (strategy: UserStrategyDisplay) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${strategy.strategy_name}" from error list? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(strategy.id);
    try {
      // Delete the entry from user_strategies_in_error table
      const { error: deleteError } = await supabase
        .from('user_strategies_in_error')
        .delete()
        .eq('id', strategy.id)
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;

      toast.success('Strategy deleted successfully');
      await fetchData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err?.message || 'Failed to delete strategy');
    } finally {
      setIsDeleting(null);
    }
  };

  const redeployStrategyFromError = async (strategy: UserStrategyDisplay) => {
    if (!user?.id) return;
    setIsRedeploying(strategy.id);
    try {
      // First, fetch the full strategy data from user_strategies_in_error
      const { data: errorStrategyData, error: fetchError } = await supabase
        .from('user_strategies_in_error')
        .select('*')
        .eq('id', strategy.id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!errorStrategyData) throw new Error('Strategy not found in error table');

      // Prepare payload for user_strategies table
      const payload = {
        user_id: errorStrategyData.user_id,
        strategy_id: errorStrategyData.strategy_id,
        broker_id: errorStrategyData.broker_id,
        telegram_chat_id: errorStrategyData.telegram_chat_id,
        qty: errorStrategyData.qty,
        dry_run: errorStrategyData.dry_run,
        active: errorStrategyData.active ?? true,
        config_version: errorStrategyData.config_version ?? 0,
        task_arn: errorStrategyData.task_arn,
        last_task_status: errorStrategyData.last_task_status,
        last_seen: errorStrategyData.last_seen,
        created_at: errorStrategyData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert into user_strategies table
      const { error: insertError } = await supabase
        .from('user_strategies')
        .insert([payload]);

      if (insertError) {
        // Check if it's a unique constraint violation (strategy already exists)
        if (insertError.code === '23505' || insertError.message?.includes('unique')) {
          throw new Error('This strategy is already deployed. Please check the Active Strategies section.');
        }
        throw insertError;
      }

      // Delete from user_strategies_in_error table
      const { error: deleteError } = await supabase
        .from('user_strategies_in_error')
        .delete()
        .eq('id', strategy.id)
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;

      toast.success(`Strategy "${strategy.strategy_name}" re-deployed successfully!`);
      await fetchData();
    } catch (err: any) {
      console.error('Re-deploy failed:', err);
      toast.error(err?.message || 'Failed to re-deploy strategy');
    } finally {
      setIsRedeploying(null);
    }
  };

  const fetchTrades = async (strategy: UserStrategyDisplay) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoadingTrades(prev => ({ ...prev, [strategy.id]: true }));
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('id, user, stock_option, position, price, date_time, strategy, qty')
        .eq('user', user.id)
        .eq('strategy', strategy.strategy_id)
        .order('date_time', { ascending: false })
        .limit(200);

      if (error) throw error;

      const tradeList = (data ?? []) as StrategyTrade[];
      setTrades(prev => ({ ...prev, [strategy.id]: tradeList }));
      setTradesCurrentPage(prev => ({ ...prev, [strategy.id]: 1 }));
    } catch (error: any) {
      console.error('Failed to fetch trades:', error);
      toast.error(error?.message || 'Failed to fetch trades');
      setTrades(prev => ({ ...prev, [strategy.id]: [] }));
    } finally {
      setIsLoadingTrades(prev => ({ ...prev, [strategy.id]: false }));
    }
  };

  const toggleTrades = async (strategy: UserStrategyDisplay) => {
    if (expandedTradesId === strategy.id) {
      setExpandedTradesId(null);
    } else {
      setExpandedTradesId(strategy.id);
      if (!trades[strategy.id]) {
        await fetchTrades(strategy);
      }
      setTradesCurrentPage(prev => ({ ...prev, [strategy.id]: 1 }));
    }
  };

  const setTradesPage = (strategyId: string, page: number) => {
    setTradesCurrentPage(prev => ({ ...prev, [strategyId]: page }));
  };

  const getPaginatedTrades = (strategyId: string) => {
    const strategyTrades = trades[strategyId] || [];
    const currentPage = tradesCurrentPage[strategyId] || 1;
    const startIndex = (currentPage - 1) * tradesPerPage;
    const endIndex = startIndex + tradesPerPage;
    return strategyTrades.slice(startIndex, endIndex);
  };

  const getTradesTotalPages = (strategyId: string) => {
    const strategyTrades = trades[strategyId] || [];
    return Math.ceil(strategyTrades.length / tradesPerPage);
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

  const renderBrokerSessionStatus = (strategy: UserStrategyDisplay) => {
    const status = (strategy.broker_session_status || 'inactive').toLowerCase();
    if (status === 'active') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
    }
    if (status === 'daily_login_required') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Daily Login Required</span>;
    }
    if (status === 'checking') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Checking...</span>;
    }
    if (status === 'error') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Error: Please re-deploy the strategy</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Inactive</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Mobile-only styles - only apply below 768px */
        @media (max-width: 767px) {
          /* Strategy card container */
          .portfolio-strategy-card {
            padding: 0.75rem !important;
            overflow-x: hidden !important;
          }
          
          /* Header section - stack vertically on mobile */
          .portfolio-strategy-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          
          .portfolio-strategy-title {
            font-size: 1.125rem !important;
            width: 100% !important;
            word-break: break-word !important;
          }
          
          /* Button container - wrap on mobile */
          .portfolio-strategy-actions {
            flex-wrap: wrap !important;
            width: 100% !important;
            gap: 0.5rem !important;
          }
          
          .portfolio-strategy-actions button {
            flex: 1 1 calc(50% - 0.25rem) !important;
            min-width: calc(50% - 0.25rem) !important;
            font-size: 0.75rem !important;
            padding: 0.375rem 0.5rem !important;
          }
          
          .portfolio-strategy-actions button svg {
            width: 0.875rem !important;
            height: 0.875rem !important;
            margin-right: 0.25rem !important;
          }
          
          /* Details section - 2 column grid on mobile */
          .portfolio-strategy-details {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }
          
          /* Make Status (5th item) span full width and start at column 1 */
          .portfolio-strategy-details > .portfolio-strategy-detail-item:nth-child(5) {
            grid-column: 1 / -1 !important;
          }
          
          .portfolio-strategy-detail-item {
            justify-content: flex-start !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
            width: 100% !important;
          }
          
          /* Error message - prevent overflow */
          .portfolio-error-message {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
          }
          
          /* Trades section adjustments */
          .portfolio-trades-container {
            font-size: 0.7rem !important;
          }
          
          .portfolio-trades-pagination {
            flex-direction: column !important;
            gap: 0.75rem !important;
            align-items: stretch !important;
          }
          
          .portfolio-trades-pagination > div:first-child {
            text-align: center !important;
          }
          
          .portfolio-trades-pagination > div:last-child {
            justify-content: center !important;
            flex-wrap: wrap !important;
          }
        }
      `}</style>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-1">Portfolio</h1>
          <p className="text-slate-600">Manage your deployed trading strategies</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Active Strategies
          </CardTitle>
          <CardDescription>
            View and manage your deployed strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strategies.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No active strategies deployed yet. Deploy a strategy from the Strategies page to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors portfolio-strategy-card"
                >
                  {/* First line: Strategy Name (bold) with Edit and Delete buttons right-aligned */}
                  <div className="flex items-center justify-between mb-3 portfolio-strategy-header">
                    <div className="text-xl font-bold text-slate-900 portfolio-strategy-title">
                      {strategy.strategy_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTrades(strategy)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {expandedTradesId === strategy.id ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            Hide Trades
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            Show Trades
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restartStrategy(strategy)}
                        disabled={isRestartingStrategy === strategy.id}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRestartingStrategy === strategy.id ? 'animate-spin' : ''}`} />
                        {isRestartingStrategy === strategy.id ? 'Restarting...' : 'Restart'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(strategy)}
                      >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteStrategy(strategy)}
                        disabled={isDeleting === strategy.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 
                        {isDeleting === strategy.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Second line: Broker, Telegram, qty, dry_run, status all inline */}
                  <div className="flex items-center gap-4 flex-wrap portfolio-strategy-details">
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Broker:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.broker_name || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Telegram:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.telegram_label || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Qty:</span>
                      <span className="text-sm text-slate-900 font-medium">{strategy.qty ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Dry Run:</span>
                      {strategy.dry_run ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Status:</span>
                      {(() => {
                        const status = strategy.last_task_status?.toUpperCase();
                        const isZerodha = strategy.broker_name?.toLowerCase() === 'zerodha';
                        const isDailyLoginPending = strategy.last_task_status?.toLowerCase() === 'daily_login_pending';

                        if (isZerodha && isDailyLoginPending) {
                          return (
                            <span className="inline-flex items-center text-sm font-medium text-red-600">
                              <span className="status-light stopped"></span>
                              Daily Login Pending
                            </span>
                          );
                        }
                        if (status === 'RUNNING') {
                          return (
                            <span className="inline-flex items-center text-sm text-slate-900 font-medium">
                              <span className="status-light running"></span>
                              Running
                            </span>
                          );
                        } else if (status === 'PENDING') {
                          return (
                            <span className="inline-flex items-center text-sm text-slate-900 font-medium">
                              <span className="status-light pending"></span>
                              Pending
                            </span>
                          );
                        } else if (status === 'STOPPED') {
                          return (
                            <span className="inline-flex items-center text-sm text-slate-900 font-medium">
                              <span className="status-light stopped"></span>
                              Stopped
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center text-sm text-slate-400 font-medium">
                              <span className="status-light stopped"></span>
                              {status || 'Unknown'}
                            </span>
                          );
                        }
                      })()}
                      <button
                          onClick={async () => await fetchData()}
                          disabled={isFetching}
                          className="ml-1 p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh status"
                          aria-label="Refresh status"
                        >
                          <RefreshCw 
                          className={`h-3 w-3 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} 
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Broker Session:</span>
                      {renderBrokerSessionStatus(strategy)}
                    </div>
                  </div>

                  {/* Trades section - expandable */}
                  {expandedTradesId === strategy.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Trades</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchTrades(strategy)}
                          disabled={isLoadingTrades[strategy.id]}
                          className="h-7"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingTrades[strategy.id] ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      {isLoadingTrades[strategy.id] ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          Loading trades...
                        </div>
                      ) : trades[strategy.id] && trades[strategy.id].length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Security</TableHead>
                                  <TableHead>Trade Type</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Date/Time</TableHead>
                                  <TableHead>Qty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getPaginatedTrades(strategy.id).map((trade) => (
                                  <TableRow key={trade.id}>
                                    <TableCell>{trade.stock_option ?? '—'}</TableCell>
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
                          {getTradesTotalPages(strategy.id) > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 portfolio-trades-pagination">
                              <div className="text-xs text-slate-600">
                                Showing {((tradesCurrentPage[strategy.id] || 1) - 1) * tradesPerPage + 1} to {Math.min((tradesCurrentPage[strategy.id] || 1) * tradesPerPage, trades[strategy.id].length)} of {trades[strategy.id].length} trades
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = tradesCurrentPage[strategy.id] || 1;
                                    setTradesPage(strategy.id, Math.max(1, currentPage - 1));
                                  }}
                                  disabled={(tradesCurrentPage[strategy.id] || 1) === 1}
                                  className="h-7 text-xs"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  Previous
                                </Button>
                                <div className="text-xs text-slate-600">
                                  Page {tradesCurrentPage[strategy.id] || 1} of {getTradesTotalPages(strategy.id)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = tradesCurrentPage[strategy.id] || 1;
                                    const totalPages = getTradesTotalPages(strategy.id);
                                    setTradesPage(strategy.id, Math.min(totalPages, currentPage + 1));
                                  }}
                                  disabled={(tradesCurrentPage[strategy.id] || 1) >= getTradesTotalPages(strategy.id)}
                                  className="h-7 text-xs"
                                >
                                  Next
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No trades found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategies in Error Section - Only show if there are entries */}
      {strategiesInError.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Strategies in Error
            </CardTitle>
            <CardDescription>
              Strategies that encountered errors and were moved to error state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategiesInError.map((strategy) => (
                <div
                  key={strategy.id}
                  className="border border-red-200 rounded-lg p-4 bg-red-50/50 hover:bg-red-50 transition-colors portfolio-strategy-card"
                >
                  {/* First line: Strategy Name (bold) with Show Trades, Edit, Re-deploy and Delete buttons right-aligned */}
                  <div className="flex items-center justify-between mb-3 portfolio-strategy-header">
                    <div className="text-xl font-bold text-slate-900 portfolio-strategy-title">
                      {strategy.strategy_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTrades(strategy)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {expandedTradesId === strategy.id ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            Hide Trades
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            Show Trades
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(strategy, true)}
                      >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => redeployStrategyFromError(strategy)}
                        disabled={isRedeploying === strategy.id || isDeleting === strategy.id}
                      >
                        <Rocket className={`mr-2 h-4 w-4 ${isRedeploying === strategy.id ? 'animate-pulse' : ''}`} />
                        {isRedeploying === strategy.id ? 'Re-deploying...' : 'Re-deploy'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteStrategyFromError(strategy)}
                        disabled={isDeleting === strategy.id || isRedeploying === strategy.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting === strategy.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Second line: Broker, Telegram, qty, dry_run all inline */}
                  <div className="flex items-center gap-4 flex-wrap portfolio-strategy-details">
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Broker:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.broker_name || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Telegram:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.telegram_label || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Qty:</span>
                      <span className="text-sm text-slate-900 font-medium">{strategy.qty ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Dry Run:</span>
                      {strategy.dry_run ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 portfolio-strategy-detail-item">
                      <span className="text-sm text-slate-600">Last Status:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {strategy.last_task_status || 'Error'}
                      </span>
                    </div>
                  </div>

                  {/* Error message display */}
                  {strategy.error && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-900 mb-1">Error Message</h4>
                            <p className="text-sm text-red-800 whitespace-pre-wrap break-words portfolio-error-message">
                              {strategy.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trades section - expandable */}
                  {expandedTradesId === strategy.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Trades</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchTrades(strategy)}
                          disabled={isLoadingTrades[strategy.id]}
                          className="h-7"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingTrades[strategy.id] ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      {isLoadingTrades[strategy.id] ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          Loading trades...
                        </div>
                      ) : trades[strategy.id] && trades[strategy.id].length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Security</TableHead>
                                  <TableHead>Trade Type</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Date/Time</TableHead>
                                  <TableHead>Qty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getPaginatedTrades(strategy.id).map((trade) => (
                                  <TableRow key={trade.id}>
                                    <TableCell>{trade.stock_option ?? '—'}</TableCell>
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
                          {getTradesTotalPages(strategy.id) > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                              <div className="text-xs text-slate-600">
                                Showing {((tradesCurrentPage[strategy.id] || 1) - 1) * tradesPerPage + 1} to {Math.min((tradesCurrentPage[strategy.id] || 1) * tradesPerPage, trades[strategy.id].length)} of {trades[strategy.id].length} trades
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = tradesCurrentPage[strategy.id] || 1;
                                    setTradesPage(strategy.id, Math.max(1, currentPage - 1));
                                  }}
                                  disabled={(tradesCurrentPage[strategy.id] || 1) === 1}
                                  className="h-7 text-xs"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  Previous
                                </Button>
                                <div className="text-xs text-slate-600">
                                  Page {tradesCurrentPage[strategy.id] || 1} of {getTradesTotalPages(strategy.id)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = tradesCurrentPage[strategy.id] || 1;
                                    const totalPages = getTradesTotalPages(strategy.id);
                                    setTradesPage(strategy.id, Math.min(totalPages, currentPage + 1));
                                  }}
                                  disabled={(tradesCurrentPage[strategy.id] || 1) >= getTradesTotalPages(strategy.id)}
                                  className="h-7 text-xs"
                                >
                                  Next
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No trades found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/** Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => {
        setDialogOpen(o);
        if (!o) {
          setEditingId(null);
          setIsEditingFromError(false);
          setForm(null);
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="DialogTitle text-xl font-semibold text-slate-900">
                Edit Strategy
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
              Update strategy configuration below and click Save.
            </Dialog.Description>

            <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
              <div className="flex flex-col">
                <label htmlFor="edit-broker" className="text-sm font-medium text-slate-700 mb-1.5">
                  Broker
                </label>
                <Select
                  value={form?.broker_id || '__none__'}
                  onValueChange={(value) => updateForm('broker_id', value === '__none__' ? null : value)}
                >
                  <SelectTrigger id="edit-broker" className="w-full">
                    <SelectValue placeholder="Select a broker" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]" style={{ zIndex: 11000 }}>
                    <SelectItem value="__none__">None</SelectItem>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="edit-telegram" className="text-sm font-medium text-slate-700 mb-1.5">
                  Telegram
                </label>
                <Select
                  value={form?.telegram_chat_id || '__none__'}
                  onValueChange={(value) => updateForm('telegram_chat_id', value === '__none__' ? null : value)}
                >
                  <SelectTrigger id="edit-telegram" className="w-full">
                    <SelectValue placeholder="Select a telegram chat" />
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
              </div>

              <div className="flex flex-col">
                <label htmlFor="edit-qty" className="text-sm font-medium text-slate-700 mb-1.5">
                  Quantity
                </label>
                <Input
                  id="edit-qty"
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
                <label htmlFor="edit-dry-run" className="text-sm font-medium text-slate-700">
                  Dry Run
                </label>
                <Switch
                  id="edit-dry-run"
                  checked={form?.dry_run ?? true}
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
                  await saveStrategy();
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    </>
  );
}

