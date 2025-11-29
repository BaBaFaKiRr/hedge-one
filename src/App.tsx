import { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { MarketingLandingPage } from './components/MarketingLandingPage';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/DashboardLayout';
import { HomePage } from './components/HomePage';
import { MyKeysPage } from './components/MyKeysPage';
import { TelegramPage } from './components/TelegramPage';
import { StrategiesPage } from './components/StrategiesPage';
import { PortfolioPage } from './components/PortfolioPage';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'home' | 'mykeys' | 'telegram' | 'strategies' | 'portfolio'>('home');
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

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'mykeys':
        return <MyKeysPage />;
      case 'telegram':
        return <TelegramPage />;
      case 'strategies':
        return <StrategiesPage onNavigate={setCurrentPage} />;
      case 'portfolio':
        return <PortfolioPage />;
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
