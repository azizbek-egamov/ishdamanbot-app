import React from 'react';
import { useAuth } from '../context/AuthContext';
import { formatUZS } from '../utils/formatters';

export default function DesktopNavbar({ currentTab, onChangeTab, hasActiveContest }) {
  const { user, onlineCount, logout } = useAuth();

  const navItems = [
    { id: 'earn', label: 'Vazifalar', icon: 'task_alt' },
    { id: 'spin', label: 'Spin Wheel', icon: 'casino' },
    { id: 'shop', label: "Do'kon", icon: 'shopping_bag' },
    { id: 'trade', label: 'Hamkorlar', icon: 'candlestick_chart' },
    { id: 'contest', label: 'Konkurs', icon: 'military_tech', badge: hasActiveContest },
    { id: 'refer', label: 'Referal', icon: 'group_add' },
    { id: 'profile', label: 'Profil', icon: 'account_circle' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0e14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-18 flex items-center justify-between gap-3 lg:gap-6 flex-nowrap">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={() => onChangeTab('earn')}
          className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5165] to-[#be0034] p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(255,81,101,0.35)] group-hover:scale-105 transition-transform duration-200 shrink-0">
            <span className="material-symbols-outlined text-white text-[22px]">hub</span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="font-headline font-bold text-white text-base lg:text-lg tracking-wider uppercase group-hover:text-primary-fixed transition-colors whitespace-nowrap">
                ISHDAMAN
              </span>
              <span className="px-1.5 py-0.2 rounded bg-primary-container/20 border border-primary-container/40 text-[#ff5165] font-mono text-[9px] lg:text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">
                PORTAL
              </span>
            </div>
            <span className="font-mono text-[10px] lg:text-[11px] text-on-surface-variant flex items-center gap-1.5 whitespace-nowrap">
              <span>Mini-Task & Trading</span>
            </span>
          </div>
        </button>

        {/* Navigation Tabs (Strictly Single Line, whitespace-nowrap, never wraps) */}
        <nav className="flex items-center gap-1 bg-surface-container/60 p-1.5 rounded-2xl border border-white/[0.06] shadow-inner shrink-0 flex-nowrap">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`relative px-3 lg:px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 lg:gap-2 cursor-pointer shrink-0 whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-container to-[#be0034] text-white shadow-[0_4px_12px_rgba(255,81,101,0.35)]'
                    : 'text-on-surface-variant hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] shrink-0 ${
                    isActive ? 'text-white' : 'text-on-surface-variant'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap leading-none">{item.label}</span>

                {item.badge && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01e599] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#01e599]"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Online Stats, Balance & User Pill (Strictly Single Line) */}
        <div className="flex items-center gap-2.5 lg:gap-3.5 shrink-0 flex-nowrap">
          {/* Live Online Ticker */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container border border-white/[0.06] text-xs font-mono shrink-0 whitespace-nowrap">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01e599] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#01e599]"></span>
            </span>
            <span className="text-secondary font-semibold">{onlineCount}</span>
            <span className="text-on-surface-variant">onlayn</span>
          </div>

          {/* Balance Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl bg-gradient-to-r from-secondary-container/20 to-secondary-container/5 border border-secondary-container/30 shadow-[0_0_15px_rgba(1,229,153,0.15)] shrink-0 whitespace-nowrap">
            <span className="material-symbols-outlined text-[#01e599] text-[18px] lg:text-[20px] shrink-0">
              account_balance_wallet
            </span>
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-[9px] lg:text-[10px] text-on-surface-variant font-mono uppercase tracking-wider leading-none whitespace-nowrap">
                Balans
              </span>
              <span className="text-xs lg:text-sm font-headline font-bold text-[#01e599] tracking-tight leading-snug whitespace-nowrap">
                {formatUZS(user?.balance || 0)}
              </span>
            </div>
          </div>

          {/* User Profile Capsule */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className="flex items-center gap-2 p-1.5 pr-2.5 lg:pr-3 rounded-xl bg-surface-container border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group shrink-0 whitespace-nowrap"
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg overflow-hidden border border-white/10 bg-surface-container-highest flex items-center justify-center shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-[18px] lg:text-[20px]">
                  person
                </span>
              )}
            </div>
            <div className="flex flex-col text-left whitespace-nowrap">
              <span className="text-xs font-bold text-white group-hover:text-primary-fixed transition-colors truncate max-w-[90px] lg:max-w-[120px] whitespace-nowrap">
                {user?.full_name || 'Foydalanuvchi'}
              </span>
              <span className="text-[9px] lg:text-[10px] font-mono text-on-surface-variant truncate max-w-[90px] lg:max-w-[120px] whitespace-nowrap">
                @{user?.username || (user?.telegram_id ? `id_${user.telegram_id}` : 'trader')}
              </span>
            </div>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            title="Chiqish"
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-surface-container border border-white/[0.08] hover:bg-error/15 hover:border-error/30 hover:text-error text-on-surface-variant transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[17px] lg:text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
