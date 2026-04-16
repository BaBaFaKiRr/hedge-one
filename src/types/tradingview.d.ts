declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => {
        onChartReady(callback: () => void): void;
        activeChart(): {
          createShape(
            point: { time: number; price: number },
            options: Record<string, unknown>
          ): Promise<unknown>;
        };
        remove(): void;
      };
    };
  }
}

export {};
