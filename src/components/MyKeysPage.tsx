import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
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
import { Key, Edit3, Trash2, Plus, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as Dialog from "@radix-ui/react-dialog";
import './global.css';

type Nullable<T> = T | null;

interface BrokerRow {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  api_key: string;
  api_secret: Nullable<string>;
  auth_token: Nullable<string>;
  client_id: Nullable<string>;
  mpin: Nullable<string>;
  totp: Nullable<string>;
  notes: Nullable<string>;
  created_at?: string;
  updated_at?: string;
}

interface BrokerForm extends Omit<BrokerRow, 'id' | 'user_id' | 'created_at' | 'updated_at'> {}

export function MyKeysPage() {
  const { accessToken, user } = useAuth();
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null => adding new
  const [form, setForm] = useState<BrokerForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
    fetchBrokers();
    
    // Check for Zerodha callback redirect
    const urlParams = new URLSearchParams(window.location.search);
    const zerodhaStatus = urlParams.get('zerodha');
    if (zerodhaStatus === 'success') {
      toast.success('Zerodha login successful! Auth token saved.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh brokers to show updated auth_token
      fetchBrokers();
    } else if (zerodhaStatus === 'failed') {
      toast.error('Zerodha login failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  const fetchBrokers = async () => {
    if (!user?.id) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('user_brokers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      setBrokers((data || []) as BrokerRow[]);
    } catch (error) {
      console.error('Error fetching brokers:', error);
      toast.error('Failed to load brokers');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  // Open dialog to add new broker
  const openAddDialog = () => {
    if (!user?.id) {
      toast.error('No user detected');
      return;
    }
    setEditingId(null);
    setForm({
      name: '',
      platform: '',
      api_key: '',
      api_secret: null,
      auth_token: null,
      client_id: null,
      mpin: null,
      totp: null,
      notes: null,
    });
    setDialogOpen(true);
  };

  // Open dialog to edit existing broker
  const openEditDialog = (broker: BrokerRow) => {
    setEditingId(broker.id);
    setForm({
      name: broker.name,
      platform: broker.platform,
      api_key: broker.api_key,
      api_secret: broker.api_secret,
      auth_token: broker.auth_token,
      client_id: broker.client_id,
      mpin: broker.mpin,
      totp: broker.totp,
      notes: broker.notes,
    });
    setDialogOpen(true);
  };

  const updateForm = <K extends keyof BrokerForm>(field: K, value: BrokerForm[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const saveBroker = async () => {
    if (!form || !user?.id) return;
    if (!form.name || !form.platform || !form.api_key) {
      toast.error('Name, Platform, and API Key are required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: form.name,
        platform: form.platform,
        api_key: form.api_key,
        api_secret: form.api_secret,
        auth_token: form.auth_token,
        client_id: form.client_id,
        mpin: form.mpin,
        totp: form.totp,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      };

      if (editingId === null) {
        // Insert new broker
        const { error } = await supabase.from('user_brokers').insert([payload]);
        if (error) throw error;
        toast.success('Broker added successfully');
      } else {
        // Update existing broker
        const { error } = await supabase
          .from('user_brokers')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Broker updated successfully');
      }
      setDialogOpen(false);
      await fetchBrokers();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error(err?.message || 'Failed to save broker');
    } finally {
      setIsSaving(false);
    }
  };

  const openDailyLoginDialog = (broker: BrokerRow) => {
    // Construct Zerodha login URL with callback redirect
    // The callback URL should match your Vercel deployment URL
    const callbackUrl = 'https://hedgeone.co.in/api/zerodha/callback';
    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${broker.api_key}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(broker.id)}`;
    
    // Open Zerodha login URL in new tab
    window.open(loginUrl, '_blank');
  };

  const deleteBroker = async (broker: BrokerRow) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${broker.name}" (${broker.platform})? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(broker.id);
    try {
      const { error } = await supabase
        .from('user_brokers')
        .delete()
        .eq('id', broker.id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Broker deleted successfully');
      await fetchBrokers();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err?.message || 'Failed to delete broker');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading brokers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-1">My Brokers</h1>
          <p className="text-slate-600">View, add, edit, and delete brokers (API key sets)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddDialog} variant="default">
            <Plus className="mr-2 h-4 w-4" /> Add Broker
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Brokers
          </CardTitle>
          <CardDescription>
            Manage your broker accounts and API credentials. Click Edit to view or modify all fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No brokers yet. Click "Add Broker" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {brokers.map((broker) => (
                <div
                  key={broker.id}
                  className="flex items-center justify-between border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors" 
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{broker.name}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Platform:</span> {broker.platform}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {broker.platform === 'Zerodha' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDailyLoginDialog(broker)}
                      >
                        Daily Login
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(broker)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteBroker(broker)}
                      disabled={isDeleting === broker.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> 
                      {isDeleting === broker.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-amber-900">
            Zerodha requires users to login to their accounts daily. If you are using Zerodha as your broker,<br /> 
            click the "Daily Login" button to be redirected to Zerodha's login page. After logging in,<br />
            you will be automatically redirected back and your authentication token will be saved.
          </p>
        </CardContent>
      </Card>

      {/** Dialog - reused for Add and Edit */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => {
        setDialogOpen(o);
        if (!o) {
          // reset editing state when dialog closes
          setEditingId(null);
          setForm(null);
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="DialogTitle text-xl font-semibold text-slate-900">
                {editingId === null ? 'Add Broker' : 'Edit Broker'}
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
              {editingId === null 
                ? 'Enter broker details below. Name, Platform, and API Key are required.' 
                : 'Edit broker details and click Save to update.'}
            </Dialog.Description>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label htmlFor="broker-name" className="text-sm font-medium text-slate-700 mb-1.5">
                    Broker Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="broker-name"
                    value={form?.name ?? ''}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. My Zerodha Account"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-platform" className="text-sm font-medium text-slate-700 mb-1.5">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form?.platform || ''}
                    onValueChange={(value) => updateForm('platform', value)}
                  >
                    <SelectTrigger id="broker-platform" className="w-full">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent className="z-[10001]" style={{ zIndex: 11000 }}>
                      <SelectItem value="Angelone">Angelone</SelectItem>
                      <SelectItem value="Zerodha">Zerodha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label htmlFor="broker-api-key" className="text-sm font-medium text-slate-700 mb-1.5">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="broker-api-key"
                    value={form?.api_key ?? ''}
                    onChange={(e) => updateForm('api_key', e.target.value)}
                    placeholder="Enter API Key"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-api-secret" className="text-sm font-medium text-slate-700 mb-1.5">
                    API Secret
                  </label>
                  <Input
                    id="broker-api-secret"
                    type="password"
                    value={form?.api_secret ?? ''}
                    onChange={(e) => updateForm('api_secret', e.target.value || null)}
                    placeholder="Enter API Secret"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-auth-token" className="text-sm font-medium text-slate-700 mb-1.5">
                    Auth Token
                  </label>
                  <Input
                    id="broker-auth-token"
                    type="password"
                    value={form?.auth_token ?? ''}
                    onChange={(e) => updateForm('auth_token', e.target.value || null)}
                    placeholder="Enter Auth Token"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-client-id" className="text-sm font-medium text-slate-700 mb-1.5">
                    Client ID
                  </label>
                  <Input
                    id="broker-client-id"
                    type="password"
                    value={form?.client_id ?? ''}
                    onChange={(e) => updateForm('client_id', e.target.value || null)}
                    placeholder="Enter Client ID"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-mpin" className="text-sm font-medium text-slate-700 mb-1.5">
                    MPIN
                  </label>
                  <Input
                    id="broker-mpin"
                    type="password"
                    value={form?.mpin ?? ''}
                    onChange={(e) => updateForm('mpin', e.target.value || null)}
                    placeholder="Enter MPIN"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="broker-totp" className="text-sm font-medium text-slate-700 mb-1.5">
                    TOTP
                  </label>
                  <Input
                    id="broker-totp"
                    type="password"
                    value={form?.totp ?? ''}
                    onChange={(e) => updateForm('totp', e.target.value || null)}
                    placeholder="Enter TOTP"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label htmlFor="broker-notes" className="text-sm font-medium text-slate-700 mb-1.5">
                    Notes
                  </label>
                  <Textarea
                    id="broker-notes"
                    value={form?.notes ?? ''}
                    onChange={(e) => updateForm('notes', e.target.value || null)}
                    placeholder="Additional notes or information..."
                    className="w-full min-h-20"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
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
                  await saveBroker();
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
