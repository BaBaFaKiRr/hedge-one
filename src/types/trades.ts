export interface BaseTradeRow {
  id: number;
  stock_option: string | null;
  strategy: string;
  qty: number | null;
  entry_side: string;
  entry_price: number | null;
  entry_at: string;
  exit_side?: string | null;
  exit_price?: number | null;
  exit_at: string | null;
  realized_pnl: number | null;
}

export interface LiveTradeSubscription {
  symbol: string;
  strategy: string;
}

export interface LiveTradeQuote extends LiveTradeSubscription {
  price: number;
  timestamp: string | null;
}

export interface LiveTradeSnapshot {
  quote: LiveTradeQuote | null;
  ltp: number | null;
  unrealizedPnl: number | null;
  hasLivePrice: boolean;
  isOpen: boolean;
}
