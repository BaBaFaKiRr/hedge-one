const DEFAULT_WS_URL = 'wss://indicatorstreaming-production.up.railway.app/ws';
const DEFAULT_HTTP_URL = 'https://indicatorstreaming-production.up.railway.app';

/** SmartAPI / indicator_streaming tick prices are in paise; Supabase trades and UI use INR. */
export const PAISE_PER_INR = 100;

/**
 * Convert a raw websocket tick price (paise) to rupees for display and P&L.
 */
export function indicatorStreamPaiseToInr(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value / PAISE_PER_INR;
}

export function getIndicatorStreamWsUrl(): string {
  return import.meta.env.VITE_INDICATOR_STREAM_WS_URL || DEFAULT_WS_URL;
}

export function getIndicatorStreamHttpUrl(): string {
  const explicit = import.meta.env.VITE_INDICATOR_STREAM_HTTP_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const wsUrl = getIndicatorStreamWsUrl();
  if (wsUrl.startsWith('wss://')) {
    return wsUrl.replace(/^wss:\/\//, 'https://').replace(/\/ws$/, '');
  }
  if (wsUrl.startsWith('ws://')) {
    return wsUrl.replace(/^ws:\/\//, 'http://').replace(/\/ws$/, '');
  }
  return DEFAULT_HTTP_URL;
}
