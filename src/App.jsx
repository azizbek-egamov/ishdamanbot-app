import React, { useState, useEffect } from 'react';
import api from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import DesktopNavbar from './components/DesktopNavbar';
import BottomNav from './components/BottomNav';
import LandingPage from './pages/LandingPage';
import EarnPage from './pages/EarnPage';
import SpinPage from './pages/SpinPage';
import TradePage from './pages/TradePage';
import ContestPage from './pages/ContestPage';
import ReferPage from './pages/ReferPage';
import ProfilePage from './pages/ProfilePage';
import ShopPage from './pages/ShopPage';

function AppContent() {
  const { user, loading, needsWidgetAuth, handleWidgetAuth } = useAuth();
  const [currentTab, setCurrentTab] = useState('earn');
  const [hasActiveContest, setHasActiveContest] = useState(false);

  const checkActiveContest = async () => {
    try {
      const res = await api.get('/contests/active/');
      const active = Boolean(res.data?.is_active && res.data?.contest);
      setHasActiveContest(active);
    } catch {
      setHasActiveContest(false);
    }
  };

  useEffect(() => {
    checkActiveContest();
  }, [currentTab]);

  // Saytdan kirlaganda unauthenticated holat uchun LandingPage ko'rsatish
  if (needsWidgetAuth) {
    return <LandingPage onAuth={handleWidgetAuth} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-[#be0034] p-0.5 flex items-center justify-center shadow-neon-red animate-pulse">
          <span className="material-symbols-outlined text-white text-[30px]">hub</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-headline font-bold text-white text-lg tracking-wider uppercase">
            ISHDAMAN
          </span>
          <span className="font-mono text-xs text-primary-fixed-dim animate-pulse">
            Yuklanmoqda...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary-container selection:text-white">
      {/* Desktop Top Navigation Bar (>= 768px) */}
      <div className="hidden md:block">
        <DesktopNavbar
          currentTab={currentTab}
          onChangeTab={(tab) => setCurrentTab(tab)}
          hasActiveContest={hasActiveContest}
        />
      </div>

      {/* Mobile Fixed Header (< 768px, Telegram WebApp) */}
      <div className="md:hidden">
        <Header
          currentTab={currentTab}
          onNavigateProfile={() => setCurrentTab('profile')}
        />
      </div>

      {/* Main Pages: max-w-md on mobile, expands to max-w-7xl on PC */}
      <main className="w-full max-w-md md:max-w-7xl mx-auto pb-12 md:pb-20">
        {currentTab === 'earn' && (
          <EarnPage onNavigateSpin={() => setCurrentTab('spin')} />
        )}
        {currentTab === 'spin' && <SpinPage />}
        {currentTab === 'shop' && <ShopPage />}
        {currentTab === 'trade' && <TradePage />}
        {currentTab === 'contest' && (
          <ContestPage onRefreshContestState={checkActiveContest} />
        )}
        {currentTab === 'refer' && <ReferPage />}
        {currentTab === 'profile' && (
          <ProfilePage onNavigate={(tab) => setCurrentTab(tab)} />
        )}
      </main>

      {/* Floating Rounded Bottom Navigation (Mobile Only) */}
      <div className="md:hidden">
        <BottomNav
          activeTab={currentTab}
          onChangeTab={(tab) => setCurrentTab(tab)}
          hasActiveContest={hasActiveContest}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
