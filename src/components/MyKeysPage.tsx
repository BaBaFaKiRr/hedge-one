import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Key, Edit3, Trash2, Plus, X, HelpCircle, ExternalLink, ChevronDown } from 'lucide-react';
import * as Dialog from "@radix-ui/react-dialog";
import './global.css';

type Nullable<T> = T | null;

interface BrokerRow {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  is_active?: boolean;
  session_status?: Nullable<string>;
  api_key?: string;
  api_secret?: Nullable<string>;
  auth_token?: Nullable<string>;
  client_id?: Nullable<string>;
  mpin?: Nullable<string>;
  totp?: Nullable<string>;
  notes?: Nullable<string>;
  mobile_number?: Nullable<string>;
  created_at?: string;
  updated_at?: string;
}

interface BrokerForm extends Omit<BrokerRow, 'id' | 'user_id' | 'created_at' | 'updated_at'> {}

// Platform configuration: defines required fields for each platform
const PLATFORM_CONFIG: Record<string, {
  required: string[];
  optional?: string[];
}> = {
  Angelone: {
    required: ['api_key', 'client_id', 'mpin', 'totp'],
  },
  Zerodha: {
    required: ['api_key', 'api_secret'],
  },
  Groww: {
    required: ['api_key', 'api_secret'],
  },
  KotakNeo: {
    required: ['api_key', 'client_id', 'mpin', 'totp', 'mobile_number'],
  },
};

// Helper function to check if a field should be shown for a platform
const shouldShowField = (platform: string | null, fieldName: string): boolean => {
  if (!platform) return false;
  const config = PLATFORM_CONFIG[platform];
  if (!config) return true; // Show all fields if platform not in config
  return config.required.includes(fieldName) || (config.optional?.includes(fieldName) ?? false);
};

// Helper function to check if a field is required for a platform
const isFieldRequired = (platform: string | null, fieldName: string): boolean => {
  if (!platform) return false;
  const config = PLATFORM_CONFIG[platform];
  if (!config) return false;
  return config.required.includes(fieldName);
};

// Map API platform (lowercase) to display value for Select
const PLATFORM_DISPLAY: Record<string, string> = {
  zerodha: 'Zerodha',
  angelone: 'Angelone',
  groww: 'Groww',
  kotakneo: 'KotakNeo',
};
const toDisplayPlatform = (p: string) => PLATFORM_DISPLAY[p?.toLowerCase()] || p;

const compactObject = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined && value !== '')
  ) as Partial<T>;

interface GuideStep {
  text: string;
  screenshots?: string[];
}

interface GuideSection {
  broker: string;
  steps: GuideStep[];
}

const kotakneo1 = new URL('./add_broker_images/kotakneo1.png', import.meta.url).href;
const kotakneo2 = new URL('./add_broker_images/kotakneo2.png', import.meta.url).href;
const kite1 = new URL('./add_broker_images/kite1.png', import.meta.url).href;
const kite2 = new URL('./add_broker_images/kite2.png', import.meta.url).href;
const kite3 = new URL('./add_broker_images/kite3.png', import.meta.url).href;
const kite4 = new URL('./add_broker_images/kite4.png', import.meta.url).href;
const kite5 = new URL('./add_broker_images/kite5.png', import.meta.url).href;
const angelone1 = new URL('./add_broker_images/angelone1.png', import.meta.url).href;

const BROKER_GUIDE_SECTIONS: GuideSection[] = [
  {
    broker: 'Kotak Neo',
    steps: [
      { text: 'Go to https://www.kotakneo.com/platform/kotak-neo-trade-api/' },
      { text: 'Click on Login on top right and log in to your Kotak Neo brokerage account.' },
      { text: 'Click on More on top right.' },
      { text: 'Click on Trade API.', screenshots: [kotakneo1] },
      { text: 'Click on Create API key.' },
      { text: 'Copy the Client token. This is your API Key.' },
      { text: 'Add 54.79.156.120 to Primary IP / IP whitelist.', screenshots: [kotakneo2] },
      { text: 'Now go to Profile -> Account details.' },
      { text: 'Locate your Unique Client Code. This is your Client ID.' },
      { text: 'Locate the 2FA Authenticator code you previously setup. This is your TOTP.' },
      { text: 'Go to My Brokers tab on HedgeOne and click Add Broker.' },
      { text: 'Fill in the credentials collected and press Save.' },
      { text: 'Kotak Neo requires frequent TOTP refresh (valid for ~30 sec). Use Update TOTP before deploying.' },
    ],
  },
  {
    broker: 'Zerodha',
    steps: [
      { text: 'Go to https://zerodha.com/products/api/' },
      { text: 'Press Get API Key.', screenshots: [kite1] },
      { text: 'Fill out the form using the email linked to your Zerodha broker account.', screenshots: [kite2] },
      { text: 'Add IP 54.79.156.120 to IP Whitelist.' },
      { text: 'Press Sign Up.' },
      { text: 'On My apps page, click Create new app.', screenshots: [kite3] },
      { text: 'Choose Personal in type.' },
      { text: 'Set any app name you want.' },
      { text: 'Enter your Zerodha Client ID (from Zerodha profile page).' },
      { text: 'Set Redirect URL: https://hedgeone.co.in/api/zerodha/callback' },
      { text: 'Click Create.', screenshots: [kite4] },
      { text: 'Open the newly created app from My Apps.' },
      { text: 'Copy API Key and API Secret.', screenshots: [kite5] },
      { text: 'Go to My Brokers tab on HedgeOne and click Add Broker.' },
      { text: 'Fill in the credentials collected and press Save.' },
      { text: 'Run Daily Login every morning. Zerodha session resets at midnight daily.' },
    ],
  },
  {
    broker: 'Angel One',
    steps: [
      { text: 'Go to https://smartapi.angelbroking.com/' },
      { text: 'Press Enable TOTP and sign in using your Client ID and MPIN.' },
      { text: 'Copy the TOTP code.' },
      { text: 'Press Login on top right.' },
      { text: 'Login to your Angel One account.' },
      { text: 'Press ADD APP, add 54.79.156.120 to Primary Static IP, and submit.' },
      { text: 'Copy your API Key and Secret Key.', screenshots: [angelone1] },
      { text: 'Go to My Brokers tab on HedgeOne and click Add Broker.' },
      { text: 'Fill in the credentials collected and press Save.' },
    ],
  },
];

const formatBrokerName = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'kotak neo' || normalized === 'kotakneo') return 'Kotak Neo';
  if (normalized === 'angelone') return 'Angel One';
  if (normalized === 'zerodha') return 'Zerodha';
  if (normalized === 'groww') return 'Groww';
  return name;
};

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? null;
};

export function MyKeysPage() {
  const { user } = useAuth();
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
  
  // TOTP Update Dialog state
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [currentBrokerForTotp, setCurrentBrokerForTotp] = useState<BrokerRow | null>(null);
  const [newTotp, setNewTotp] = useState('');
  const [isUpdatingTotp, setIsUpdatingTotp] = useState(false);
  const guideSections = useMemo(() => BROKER_GUIDE_SECTIONS, []);
  const [selectedGuideBroker, setSelectedGuideBroker] = useState<string>(guideSections[0]?.broker || '');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const activeGuideSection = guideSections.find((section) => section.broker === selectedGuideBroker);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const brokerApiBaseUrl = useMemo(
    () => (((import.meta as any).env?.VITE_NODE_BACKEND_URL as string) || 'http://localhost:3000').replace(/\/$/, ''),
    []
  );

  const brokerApiFetch = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${brokerApiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    const text = await res.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
    }

    if (!res.ok) {
      const apiMessage = body?.error || body?.message || body?.detail;
      const fallback = typeof body === 'object' ? JSON.stringify(body) : text || '';
      const message = apiMessage
        ? `${apiMessage} (HTTP ${res.status})`
        : fallback
          ? `Request failed (HTTP ${res.status}): ${fallback.slice(0, 200)}`
          : `Request failed (HTTP ${res.status})`;
      throw new Error(message);
    }

    return body;
  };

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
  }, [user?.id]);

  const fetchBrokers = async () => {
    if (!user?.id) return;
    setIsFetching(true);
    try {
      const data = await brokerApiFetch(`/brokers/${user.id}`);
      const rows = Array.isArray(data) ? data : [];
      setBrokers(rows as BrokerRow[]);
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
      mobile_number: null,
    });
    setDialogOpen(true);
  };

  // Open dialog to edit existing broker
  const openEditDialog = async (broker: BrokerRow) => {
    try {
      const credentials = await brokerApiFetch(`/brokers/${broker.id}/credentials`);
      setEditingId(broker.id);
      setForm({
        name: broker.name,
        platform: toDisplayPlatform(broker.platform || ''),
        api_key: credentials?.api_key || '',
        api_secret: credentials?.api_secret || null,
        auth_token: credentials?.auth_token || null,
        client_id: credentials?.client_id || null,
        mpin: credentials?.mpin || null,
        totp: credentials?.totp || null,
        notes: credentials?.notes ?? broker.notes ?? null,
        mobile_number: credentials?.mobile_number ?? broker.mobile_number ?? null,
      });
      setDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load broker credentials:', err);
      toast.error(err?.message || 'Failed to load broker credentials');
    }
  };

  const updateForm = <K extends keyof BrokerForm>(field: K, value: BrokerForm[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const saveBroker = async () => {
    if (!form || !user?.id) return;
    
    // Validate name and platform
    if (!form.name || !form.platform) {
      toast.error('Name and Platform are required');
      return;
    }

    // Validate required fields based on platform
    const config = PLATFORM_CONFIG[form.platform];
    if (config) {
      const missingFields: string[] = [];
      for (const field of config.required) {
        const value = form[field as keyof BrokerForm];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missingFields.push(field);
        }
      }
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
    }
    setIsSaving(true);
    try {
      const credentials = compactObject({
        api_key: form.api_key,
        api_secret: form.api_secret,
        auth_token: form.auth_token,
        client_id: form.client_id,
        mpin: form.mpin,
        totp: form.totp,
        mobile_number: form.mobile_number || null,
      });

      if (editingId === null) {
        await brokerApiFetch('/brokers', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            name: form.name.trim(),
            platform: form.platform.toLowerCase(),
            credentials,
          }),
        });
        toast.success('Broker added successfully');
      } else {
        await brokerApiFetch('/brokers/update', {
          method: 'POST',
          body: JSON.stringify({
            broker_id: editingId,
            credentials,
          }),
        });
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
    const startLogin = async () => {
      try {
        const credentials = await brokerApiFetch(`/brokers/${broker.id}/credentials`);
        if (!credentials?.api_key) {
          throw new Error('API key not found for this broker');
        }

        document.cookie =
          `zerodha_broker_id=${broker.id}; ` +
          `path=/; ` +
          `max-age=300; ` +
          `SameSite=None; ` +
          `Secure`;

        const loginUrl =
          `https://kite.zerodha.com/connect/login` +
          `?api_key=${credentials.api_key}`;

        window.location.href = loginUrl;
      } catch (err: any) {
        console.error('Failed to start Zerodha login:', err);
        toast.error(err?.message || 'Failed to start Zerodha login');
      }
    };

    startLogin();
  };

  const openTotpUpdateDialog = (broker: BrokerRow) => {
    setCurrentBrokerForTotp(broker);
    setNewTotp(broker.totp || '');
    setTotpDialogOpen(true);
  };

  const updateTotp = async () => {
    if (!currentBrokerForTotp || !user?.id) return;
    if (!newTotp || newTotp.trim() === '') {
      toast.error('Please enter a TOTP');
      return;
    }

    setIsUpdatingTotp(true);
    try {
      await brokerApiFetch('/brokers/update', {
        method: 'POST',
        body: JSON.stringify({
          broker_id: currentBrokerForTotp.id,
          credentials: { totp: newTotp.trim() },
        }),
      });

      toast.success('TOTP updated successfully');
      setTotpDialogOpen(false);
      setCurrentBrokerForTotp(null);
      setNewTotp('');
      await fetchBrokers();
    } catch (err: any) {
      console.error('TOTP update failed:', err);
      toast.error(err?.message || 'Failed to update TOTP');
    } finally {
      setIsUpdatingTotp(false);
    }
  };

  const deleteBroker = async (broker: BrokerRow) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${broker.name}" (${broker.platform})? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(broker.id);
    try {
      await brokerApiFetch(`/brokers/${broker.id}`, { method: 'DELETE' });
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
                      <span className="font-medium">Platform:</span> {toDisplayPlatform(broker.platform || '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {broker.platform?.toLowerCase() === 'zerodha' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDailyLoginDialog(broker)}
                      >
                        Daily Login
                      </Button>
                    )}
                    {broker.platform?.toLowerCase() === 'kotakneo' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTotpUpdateDialog(broker)}
                      >
                        Update TOTP
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

      <Card>
        <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full text-left flex items-start justify-between gap-4 hover:opacity-90 transition-opacity"
              >
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    How to get broker credentials?
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Follow broker-specific steps to collect API credentials for HedgeOne.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 mt-0.5 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {guideSections.map((section) => (
                  <Button
                    key={section.broker}
                    variant={selectedGuideBroker === section.broker ? 'default' : 'outline'}
                    onClick={() => setSelectedGuideBroker(section.broker)}
                  >
                    {formatBrokerName(section.broker)}
                  </Button>
                ))}
              </div>

              {activeGuideSection ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    {formatBrokerName(selectedGuideBroker)}
                  </h2>
                  <ol className="space-y-3">
                    {activeGuideSection.steps.map((step, index) => {
                      const url = extractUrl(step.text);
                      return (
                        <li key={`${selectedGuideBroker}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-6 text-slate-800">
                                {step.text}
                              </p>
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                                >
                                  Open link
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          {step.screenshots && step.screenshots.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 gap-3">
                              {step.screenshots.map((imageSrc, imageIndex) => (
                                <button
                                  key={`${selectedGuideBroker}-${index}-image-${imageIndex}`}
                                  type="button"
                                  className="group inline-flex w-fit flex-col items-start gap-1 text-left"
                                  onClick={() =>
                                    setLightboxImage({
                                      src: imageSrc,
                                      alt: `${formatBrokerName(selectedGuideBroker)} guide step ${index + 1}`,
                                    })
                                  }
                                >
                                  <img
                                    src={imageSrc}
                                    alt={`${formatBrokerName(selectedGuideBroker)} guide step ${index + 1}`}
                                    className="h-[5.4rem] w-auto max-w-full rounded-md border border-slate-200 bg-white object-contain shadow-sm transition-transform group-hover:scale-[1.01]"
                                    loading="lazy"
                                  />
                                  <span className="text-xs text-slate-500 group-hover:text-slate-700">
                                    Click to zoom
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <div className="text-slate-500">No broker guide is available yet.</div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
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
                ? 'Select a platform first, then fill in the required fields for that platform.' 
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
                    onValueChange={(value) => {
                      // Update platform first
                      updateForm('platform', value);
                      
                      // If platform changed, clear fields that are not relevant to the new platform
                      if (form?.platform && form.platform !== value) {
                        const newConfig = PLATFORM_CONFIG[value];
                        const fieldsToKeep = new Set([
                          'name',
                          'platform',
                          'notes',
                          'api_key',
                          ...(newConfig?.required || []),
                          ...(newConfig?.optional || []),
                        ]);
                        
                        // Clear fields that are not needed for the new platform
                        const fieldsToClear: (keyof BrokerForm)[] = [
                          'api_secret',
                          'auth_token',
                          'client_id',
                          'mpin',
                          'totp',
                          'mobile_number',
                        ] as (keyof BrokerForm)[];
                        
                        fieldsToClear.forEach((field) => {
                          if (!fieldsToKeep.has(field)) {
                            updateForm(field, null);
                          }
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="broker-platform" className="w-full">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent className="z-[10001]" style={{ zIndex: 11000 }}>
                      <SelectItem value="Angelone">Angelone</SelectItem>
                      <SelectItem value="Zerodha">Zerodha</SelectItem>
                      <SelectItem value="Groww">Groww</SelectItem>
                      <SelectItem value="KotakNeo">KotakNeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show message if no platform selected */}
                {!form?.platform && (
                  <div className="flex flex-col md:col-span-2">
                    <p className="text-sm text-slate-500 italic">
                      Please select a platform to see the required fields.
                    </p>
                  </div>
                )}

                {/* API Key - Shown when platform is selected, always required */}
                {form?.platform && shouldShowField(form.platform, 'api_key') && (
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
                )}

                {/* API Secret - Shown for Zerodha and Groww */}
                {shouldShowField(form?.platform || null, 'api_secret') && (
                  <div className="flex flex-col">
                    <label htmlFor="broker-api-secret" className="text-sm font-medium text-slate-700 mb-1.5">
                      API Secret {isFieldRequired(form?.platform || null, 'api_secret') && <span className="text-red-500">*</span>}
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
                )}

                {/* Client ID - Shown for Angelone and KotakNeo */}
                {shouldShowField(form?.platform || null, 'client_id') && (
                  <div className="flex flex-col">
                    <label htmlFor="broker-client-id" className="text-sm font-medium text-slate-700 mb-1.5">
                      Client ID {isFieldRequired(form?.platform || null, 'client_id') && <span className="text-red-500">*</span>}
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
                )}

                {/* MPIN - Shown for Angelone and KotakNeo */}
                {shouldShowField(form?.platform || null, 'mpin') && (
                  <div className="flex flex-col">
                    <label htmlFor="broker-mpin" className="text-sm font-medium text-slate-700 mb-1.5">
                      MPIN {isFieldRequired(form?.platform || null, 'mpin') && <span className="text-red-500">*</span>}
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
                )}

                {/* TOTP - Shown for Angelone and KotakNeo */}
                {shouldShowField(form?.platform || null, 'totp') && (
                  <div className="flex flex-col">
                    <label htmlFor="broker-totp" className="text-sm font-medium text-slate-700 mb-1.5">
                      TOTP {isFieldRequired(form?.platform || null, 'totp') && <span className="text-red-500">*</span>}
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
                )}

                {/* Mobile Number - Shown for KotakNeo */}
                {shouldShowField(form?.platform || null, 'mobile_number') && (
                  <div className="flex flex-col">
                    <label htmlFor="broker-mobile-number" className="text-sm font-medium text-slate-700 mb-1.5">
                      Mobile Number {isFieldRequired(form?.platform || null, 'mobile_number') && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-slate-900">
                      <div className="px-3 py-2 bg-slate-100 border-r border-slate-300 text-slate-700 font-medium">
                        +91
                      </div>
                      <Input
                        id="broker-mobile-number"
                        type="tel"
                        value={form?.mobile_number 
                          ? (form.mobile_number.startsWith('+91') 
                              ? form.mobile_number.slice(3) 
                              : form.mobile_number.replace(/^\+91/, ''))
                          : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow digits, max 10 characters
                          const cleanedValue = value.replace(/\D/g, '').slice(0, 10);
                          // Always prepend +91 when saving
                          updateForm('mobile_number', cleanedValue ? `+91${cleanedValue}` : null);
                        }}
                        placeholder="XXXXXXXXXX"
                        className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={10}
                      />
                    </div>
                  </div>
                )}

                {/* Auth Token - Optional field, shown when platform is selected but not in required list */}
                {form?.platform && !shouldShowField(form.platform, 'api_secret') && !shouldShowField(form.platform, 'client_id') && (
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
                )}

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

      {/* TOTP Update Dialog */}
      <Dialog.Root open={totpDialogOpen} onOpenChange={(o) => {
        setTotpDialogOpen(o);
        if (!o) {
          setCurrentBrokerForTotp(null);
          setNewTotp('');
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="DialogTitle text-xl font-semibold text-slate-900">
                Update TOTP
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
              Update TOTP for "{currentBrokerForTotp?.name}" ({currentBrokerForTotp?.platform}).
            </Dialog.Description>

            <div className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="totp-input" className="text-sm font-medium text-slate-700 mb-1.5">
                  New TOTP <span className="text-red-500">*</span>
                </label>
                <Input
                  id="totp-input"
                  type="password"
                  value={newTotp}
                  onChange={(e) => setNewTotp(e.target.value)}
                  placeholder="Enter new TOTP"
                  className="w-full"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTotpDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={async () => {
                  await updateTotp();
                }}
                disabled={isUpdatingTotp || !newTotp.trim()}
              >
                {isUpdatingTotp ? 'Updating...' : 'Update TOTP'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-2 top-2 rounded-full p-1.5 text-slate-200 hover:bg-white/10"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="mx-auto max-h-[85vh] w-auto max-w-full rounded-md object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
