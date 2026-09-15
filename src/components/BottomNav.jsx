import React from 'react';
import { useTelegram } from '../hooks/useTelegram';

export default function BottomNav({ activeTab, onChangeTab, hasActiveContest = false }) {
  const { haptic } = useTelegram();

  const tabs = [
    { id: 'earn',    label: 'Vazifalar', icon: 'task_alt' },
    { id: 'spin',    label: 'Spin',      icon: 'casino' },
    { id: 'shop',    label: "Do'kon",    icon: 'shopping_bag' },
    { id: 'trade',   label: 'Trade',     icon: 'candlestick_chart' },
    { id: 'contest', label: 'Konkurs',   icon: 'military_tech', badge: hasActiveContest },
    { id: 'refer',   label: 'Referal',   icon: 'group_add' },
    { id: 'profile', label: 'Profil',    icon: 'account_circle' },
  ];

  const handleSelect = (tabId) => {
    haptic.selection();
    onChangeTab(tabId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        paddingLeft: '12px',
        paddingRight: '12px',
        pointerEvents: 'none',
      }}
    >
      {/* Pill nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: '480px',
          height: '60px',
          borderRadius: '9999px',
          background: 'rgba(14, 15, 21, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(255,81,101,0.08)',
          pointerEvents: 'all',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              aria-label={tab.label}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                gap: '3px',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                transition: 'transform 0.13s ease',
              }}
              onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.85)'; }}
              onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {/* Top active indicator */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '28px',
                    height: '3px',
                    borderRadius: '0 0 4px 4px',
                    background: 'linear-gradient(90deg, #ff3d56, #ff7a89)',
                    boxShadow: '0 0 8px 2px rgba(255,61,86,0.55)',
                  }}
                />
              )}

              {/* Icon */}
              <span
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '9px',
                  color: isActive ? '#ff5165' : 'rgba(255,255,255,0.32)',
                  background: isActive ? 'rgba(255,81,101,0.13)' : 'transparent',
                  boxShadow: isActive ? '0 0 14px rgba(255,81,101,0.28)' : 'none',
                  transition: 'color 0.18s, background 0.18s',
                  fontSize: '20px',
                  lineHeight: 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', lineHeight: 1 }}>
                  {tab.icon}
                </span>
                {tab.badge && !isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#05d59e',
                      boxShadow: '0 0 6px #05d59e',
                    }}
                  />
                )}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ff7a89' : 'rgba(255,255,255,0.30)',
                  lineHeight: 1,
                  letterSpacing: '0.01em',
                  transition: 'color 0.18s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
