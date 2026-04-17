import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { LayoutDashboard, Key, LogOut, Menu, X, MessageSquare, Zap, Briefcase, BarChart3, CandlestickChart } from 'lucide-react';
// @ts-ignore - Vite handles image imports
import appLogo from './app_logo.png';

type BasePage = 'home' | 'mykeys' | 'telegram' | 'strategies' | 'portfolio' | 'positions' | 'tradebook';
type ExtendedPage = BasePage | 'strategy-detail' | 'trade-detail';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: ExtendedPage;
  onNavigate: (page: ExtendedPage) => void;
}

export function DashboardLayout({ children, currentPage, onNavigate }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
      // On mobile, sidebar should be closed by default
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { id: 'home' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'strategies' as const, label: 'Strategies', icon: Zap },
    { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase },
    { id: 'positions' as const, label: 'Positions', icon: CandlestickChart },
    { id: 'tradebook' as const, label: 'Tradebook', icon: BarChart3 },
    { id: 'mykeys' as const, label: 'My Brokers', icon: Key },
    { id: 'telegram' as const, label: 'Telegram', icon: MessageSquare },
  ];

  const handleNavigate = (page: BasePage) => {
    onNavigate(page);
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Map strategy-detail to strategies for active state
  const activePageForMenu =
    currentPage === 'strategy-detail'
      ? 'strategies'
      : currentPage === 'trade-detail'
        ? 'tradebook'
        : currentPage;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <img 
                src={appLogo} 
                alt="HedgeOne Logo" 
                style={{ height: '2rem', width: 'auto' }}
                className="object-contain"
              />
              <h2 className="text-slate-900">HedgeOne Strategy Manager</h2>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-slate-200 text-slate-700">
                    {user?.name.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p>{user?.name}</p>
                  <p className="text-slate-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Mobile Overlay */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {isSidebarOpen && (
          <aside
            className={`${
              isMobile
                ? 'fixed left-0 top-16 bottom-0 z-50 w-64 shadow-xl'
                : 'w-64'
            } bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] transition-transform duration-300`}
          >
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePageForMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main Content — flex column so pages (e.g. Positions) can use flex-1 / min-h-0 for split layouts */}
        <main className={`flex min-h-0 flex-1 flex-col p-6 ${isMobile ? 'w-full' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
