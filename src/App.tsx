import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { MarketingLandingPage } from './components/MarketingLandingPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { LandingPage } from './components/LandingPage';
import type { ProductId } from './components/marketingProducts';
import { DashboardLayout } from './components/DashboardLayout';
import { HomePage } from './components/HomePage';
import { MyKeysPage } from './components/MyKeysPage';
import { TelegramPage } from './components/TelegramPage';
import { StrategiesPage } from './components/StrategiesPage';
import { StrategyDetailPage } from './components/StrategyDetailPage';
import { PortfolioPage } from './components/PortfolioPage';
import { TradebookPage } from './components/TradebookPage';
import { TradeDetailPage } from './components/TradeDetailPage';
import { PositionsPage } from './components/PositionsPage';
import { Toaster } from './components/ui/sonner';

type PageType =
  | 'home'
  | 'mykeys'
  | 'telegram'
  | 'strategies'
  | 'portfolio'
  | 'positions'
  | 'tradebook'
  | 'strategy-detail'
  | 'trade-detail';

type MarketingPath = '/' | '/algo-trader' | '/lejer' | '/login';

function normalizeMarketingPath(pathname: string): MarketingPath {
  if (pathname === '/algo-trader' || pathname === '/lejer' || pathname === '/login') {
    return pathname;
  }
  return '/';
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [loginReturnView, setLoginReturnView] = useState<'/' | '/algo-trader' | '/lejer'>('/');
  const [marketingPath, setMarketingPath] = useState<MarketingPath>(normalizeMarketingPath(window.location.pathname || '/'));

  useEffect(() => {
    const onPopState = () => {
      setMarketingPath(normalizeMarketingPath(window.location.pathname || '/'));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateMarketing = (path: MarketingPath) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setMarketingPath(path);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#00FF5A]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (marketingPath === '/login') {
      return (
        <LandingPage
          onBackToMarketing={() => {
            navigateMarketing(loginReturnView);
          }}
        />
      );
    }

    if (marketingPath === '/algo-trader' || marketingPath === '/lejer') {
      const productId: ProductId = marketingPath === '/algo-trader' ? 'algo-trader' : 'lejer';
      return (
        <ProductDetailPage
          productId={productId}
          onBack={() => navigateMarketing('/')}
          onLogin={() => {
            setLoginReturnView(marketingPath);
            navigateMarketing('/login');
          }}
        />
      );
    }

    return (
      <MarketingLandingPage
        onNavigateToProduct={(productId) => {
          navigateMarketing(productId === 'algo-trader' ? '/algo-trader' : '/lejer');
        }}
      />
    );
  }

  const handleNavigateToStrategyDetail = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setCurrentPage('strategy-detail');
  };

  const handleBackFromStrategyDetail = () => {
    setSelectedStrategyId(null);
    setCurrentPage('strategies');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'mykeys':
        return <MyKeysPage />;
      case 'telegram':
        return <TelegramPage />;
      case 'strategies':
        return (
          <StrategiesPage 
            onNavigate={(page) => setCurrentPage(page)} 
            onViewStrategyDetails={handleNavigateToStrategyDetail}
          />
        );
      case 'strategy-detail':
        return selectedStrategyId ? (
          <StrategyDetailPage 
            strategyId={selectedStrategyId} 
            onBack={handleBackFromStrategyDetail}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : (
          <StrategiesPage 
            onNavigate={(page) => setCurrentPage(page)}
            onViewStrategyDetails={handleNavigateToStrategyDetail}
          />
        );
      case 'portfolio':
        return <PortfolioPage />;
      case 'positions':
        return <PositionsPage />;
      case 'tradebook':
        return (
          <TradebookPage
            onOpenTrade={(id) => {
              setSelectedTradeId(id);
              setCurrentPage('trade-detail');
            }}
          />
        );
      case 'trade-detail':
        return selectedTradeId != null ? (
          <TradeDetailPage
            tradeId={selectedTradeId}
            onBack={() => {
              setSelectedTradeId(null);
              setCurrentPage('tradebook');
            }}
          />
        ) : (
          <TradebookPage />
        );
      default:
        return <HomePage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}
