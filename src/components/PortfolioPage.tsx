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
import { Briefcase, Edit3, Trash2, X, RefreshCw, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, Rocket } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as Dialog from "@radix-ui/react-dialog";
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
}

interface TelegramRow {
  id: string;
  label: Nullable<string>;
}

interface UserStrategyDisplay extends UserStrategyRow {
  strategy_name?: string;
  broker_name?: Nullable<string>;
  telegram_label?: Nullable<string>;
}

interface EditForm {
  broker_id: Nullable<string>;
  telegram_chat_id: Nullable<string>;
  qty: Nullable<number>;
  dry_run: boolean;
}

interface LogEvent {
  timestamp: number;
  ingestionTime: number;
  message: string;
}

interface LogsResponse {
  events: LogEvent[];
  nextForwardToken?: string;
  nextBackwardToken?: string;
  lastTimestamp?: number;
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
  
  // Logs state
  const [expandedLogsId, setExpandedLogsId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEvent[]>>({});
  const [isLoadingLogs, setIsLoadingLogs] = useState<Record<string, boolean>>({});
  const [logsCurrentPage, setLogsCurrentPage] = useState<Record<string, number>>({});
  const logsPerPage = 15;

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
      const telegramsMap = new Map((telegramsData || []).map(t => [t.id, t.label || 'Unnamed']));

      const enrichedStrategies: UserStrategyDisplay[] = (userStrategies || []).map(strategy => ({
        ...strategy,
        strategy_name: strategiesMap.get(strategy.strategy_id) || strategy.strategy_id,
        broker_name: strategy.broker_id ? brokersMap.get(strategy.broker_id) || null : null,
        telegram_label: strategy.telegram_chat_id ? telegramsMap.get(strategy.telegram_chat_id) || null : null,
      }));

      const enrichedStrategiesInError: UserStrategyDisplay[] = (userStrategiesInError || []).map(strategy => ({
        ...strategy,
        strategy_name: strategiesMap.get(strategy.strategy_id) || strategy.strategy_id,
        broker_name: strategy.broker_id ? brokersMap.get(strategy.broker_id) || null : null,
        telegram_label: strategy.telegram_chat_id ? telegramsMap.get(strategy.telegram_chat_id) || null : null,
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

  const fetchLogs = async (strategy: UserStrategyDisplay) => {
    if (!strategy.task_arn) {
      toast.error('Task ARN not found for this strategy');
      return;
    }

    // Extract task ID from task_arn (last part after the last '/')
    // Example: arn:aws:ecs:ap-southeast-2:382173471518:task/nifty-cluster/f766b898d2434e39868f1fbade9e10fa
    // Result: f766b898d2434e39868f1fbade9e10fa
    const taskId = strategy.task_arn.split('/').pop();
    if (!taskId) {
      toast.error('Invalid task ARN format');
      return;
    }

    setIsLoadingLogs(prev => ({ ...prev, [strategy.id]: true }));
    try {
      const params = new URLSearchParams({
        logGroup: '/ecs/nifty-strat',
        logStreamName: `ecs/nifty-strat-container/${taskId}`,
        startFromHead: 'false',
        limit: '200',
      });

      const response = await fetch(
        `https://56hbfxct5bej6jcm7phngpe7yq0mqzon.lambda-url.ap-southeast-2.on.aws/?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: LogsResponse = await response.json();
      setLogs(prev => ({ ...prev, [strategy.id]: data.events || [] }));
      // Reset to page 1 when logs are fetched
      setLogsCurrentPage(prev => ({ ...prev, [strategy.id]: 1 }));
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast.error(error?.message || 'Failed to fetch logs');
      setLogs(prev => ({ ...prev, [strategy.id]: [] }));
    } finally {
      setIsLoadingLogs(prev => ({ ...prev, [strategy.id]: false }));
    }
  };

  const toggleLogs = async (strategy: UserStrategyDisplay) => {
    if (expandedLogsId === strategy.id) {
      // Collapse
      setExpandedLogsId(null);
    } else {
      // Expand and fetch logs if not already loaded
      setExpandedLogsId(strategy.id);
      if (!logs[strategy.id]) {
        await fetchLogs(strategy);
      }
      // Reset to page 1 when expanding
      setLogsCurrentPage(prev => ({ ...prev, [strategy.id]: 1 }));
    }
  };

  const setLogsPage = (strategyId: string, page: number) => {
    setLogsCurrentPage(prev => ({ ...prev, [strategyId]: page }));
  };

  const getPaginatedLogs = (strategyId: string) => {
    const strategyLogs = logs[strategyId] || [];
    const currentPage = logsCurrentPage[strategyId] || 1;
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    return strategyLogs.slice(startIndex, endIndex);
  };

  const getLogsTotalPages = (strategyId: string) => {
    const strategyLogs = logs[strategyId] || [];
    return Math.ceil(strategyLogs.length / logsPerPage);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading portfolio...</div>
      </div>
    );
  }

  return (
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
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  {/* First line: Strategy Name (bold) with Edit and Delete buttons right-aligned */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xl font-bold text-slate-900">
                      {strategy.strategy_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleLogs(strategy)}
                        disabled={!strategy.task_arn}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {expandedLogsId === strategy.id ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            Hide Logs
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            View Logs
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Broker:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.broker_name || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Telegram:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.telegram_label || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Qty:</span>
                      <span className="text-sm text-slate-900 font-medium">{strategy.qty ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Status:</span>
                      {(() => {
                        const status = strategy.last_task_status?.toUpperCase();
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
                  </div>

                  {/* Logs section - expandable */}
                  {expandedLogsId === strategy.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Python Logs</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchLogs(strategy)}
                          disabled={isLoadingLogs[strategy.id]}
                          className="h-7"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingLogs[strategy.id] ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      {isLoadingLogs[strategy.id] ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          Loading logs...
                        </div>
                      ) : logs[strategy.id] && logs[strategy.id].length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-xs">
                            <div className="space-y-1">
                              {getPaginatedLogs(strategy.id).map((event, index) => {
                                const globalIndex = ((logsCurrentPage[strategy.id] || 1) - 1) * logsPerPage + index;
                                return (
                                  <div key={globalIndex} className="text-slate-700">
                                    <span className="text-slate-500 mr-2">
                                      [{formatTimestamp(event.timestamp)}]
                                    </span>
                                    <span className="text-slate-900">{event.message}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {getLogsTotalPages(strategy.id) > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                              <div className="text-xs text-slate-600">
                                Showing {((logsCurrentPage[strategy.id] || 1) - 1) * logsPerPage + 1} to {Math.min((logsCurrentPage[strategy.id] || 1) * logsPerPage, logs[strategy.id].length)} of {logs[strategy.id].length} log entries
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = logsCurrentPage[strategy.id] || 1;
                                    setLogsPage(strategy.id, Math.max(1, currentPage - 1));
                                  }}
                                  disabled={(logsCurrentPage[strategy.id] || 1) === 1}
                                  className="h-7 text-xs"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  Previous
                                </Button>
                                <div className="text-xs text-slate-600">
                                  Page {logsCurrentPage[strategy.id] || 1} of {getLogsTotalPages(strategy.id)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = logsCurrentPage[strategy.id] || 1;
                                    const totalPages = getLogsTotalPages(strategy.id);
                                    setLogsPage(strategy.id, Math.min(totalPages, currentPage + 1));
                                  }}
                                  disabled={(logsCurrentPage[strategy.id] || 1) >= getLogsTotalPages(strategy.id)}
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
                          No logs available
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
                  className="border border-red-200 rounded-lg p-4 bg-red-50/50 hover:bg-red-50 transition-colors"
                >
                  {/* First line: Strategy Name (bold) with View Logs, Edit, Re-deploy and Delete buttons right-aligned */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xl font-bold text-slate-900">
                      {strategy.strategy_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleLogs(strategy)}
                        disabled={!strategy.task_arn}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {expandedLogsId === strategy.id ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            Hide Logs
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            View Logs
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Broker:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.broker_name || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Telegram:</span>
                      <span className="text-sm text-slate-900 font-medium">
                        {strategy.telegram_label || <span className="text-slate-400">Not connected</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Qty:</span>
                      <span className="text-sm text-slate-900 font-medium">{strategy.qty ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
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
                            <p className="text-sm text-red-800 whitespace-pre-wrap break-words">
                              {strategy.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logs section - expandable */}
                  {expandedLogsId === strategy.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Python Logs</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchLogs(strategy)}
                          disabled={isLoadingLogs[strategy.id]}
                          className="h-7"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingLogs[strategy.id] ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      {isLoadingLogs[strategy.id] ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          Loading logs...
                        </div>
                      ) : logs[strategy.id] && logs[strategy.id].length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-xs">
                            <div className="space-y-1">
                              {getPaginatedLogs(strategy.id).map((event, index) => {
                                const globalIndex = ((logsCurrentPage[strategy.id] || 1) - 1) * logsPerPage + index;
                                return (
                                  <div key={globalIndex} className="text-slate-700">
                                    <span className="text-slate-500 mr-2">
                                      [{formatTimestamp(event.timestamp)}]
                                    </span>
                                    <span className="text-slate-900">{event.message}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {getLogsTotalPages(strategy.id) > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                              <div className="text-xs text-slate-600">
                                Showing {((logsCurrentPage[strategy.id] || 1) - 1) * logsPerPage + 1} to {Math.min((logsCurrentPage[strategy.id] || 1) * logsPerPage, logs[strategy.id].length)} of {logs[strategy.id].length} log entries
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = logsCurrentPage[strategy.id] || 1;
                                    setLogsPage(strategy.id, Math.max(1, currentPage - 1));
                                  }}
                                  disabled={(logsCurrentPage[strategy.id] || 1) === 1}
                                  className="h-7 text-xs"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  Previous
                                </Button>
                                <div className="text-xs text-slate-600">
                                  Page {logsCurrentPage[strategy.id] || 1} of {getLogsTotalPages(strategy.id)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentPage = logsCurrentPage[strategy.id] || 1;
                                    const totalPages = getLogsTotalPages(strategy.id);
                                    setLogsPage(strategy.id, Math.min(totalPages, currentPage + 1));
                                  }}
                                  disabled={(logsCurrentPage[strategy.id] || 1) >= getLogsTotalPages(strategy.id)}
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
                          No logs available
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
  );
}

