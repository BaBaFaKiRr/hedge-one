const DEFAULT_WS_URL = 'wss://indicatorstreaming-production.up.railway.app/ws';
const DEFAULT_HTTP_URL = 'https://indicatorstreaming-production.up.railway.app';

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
