import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { MarketingLandingPage } from './components/MarketingLandingPage';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/DashboardLayout';
import { HomePage } from './components/HomePage';
import { MyKeysPage } from './components/MyKeysPage';
import { TelegramPage } from './components/TelegramPage';
import { StrategiesPage } from './components/StrategiesPage';
import { StrategyDetailPage } from './components/StrategyDetailPage';
import { PortfolioPage } from './components/PortfolioPage';
import { TradebookPage } from './components/TradebookPage';
import { TradeDetailPage } from './components/TradeDetailPage';
import { Toaster } from './components/ui/sonner';

type PageType =
  | 'home'
  | 'mykeys'
  | 'telegram'
  | 'strategies'
  | 'portfolio'
  | 'tradebook'
  | 'strategy-detail'
  | 'trade-detail';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#00FF5A]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showLogin) {
      return <LandingPage onBackToMarketing={() => setShowLogin(false)} />;
    }
    return <MarketingLandingPage onGetStarted={() => setShowLogin(true)} />;
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
