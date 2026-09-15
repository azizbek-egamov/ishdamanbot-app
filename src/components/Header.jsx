import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';

export default function Header({ currentTab, onNavigateProfile }) {
  const { user, onlineCount } = useAuth();
  const { haptic } = useTelegram();

  const getTabSubtitle = () => {
    switch (currentTab) {
      case 'earn':    return 'Vazifalar';
      case 'spin':    return 'Daily Bonus';
      case 'trade':   return 'Hamkorlar';
      case 'contest': return 'Konkurs';
      case 'refer':   return 'Referal';
      case 'profile': return 'Kabinet';
      case 'shop':    return "Do'kon";
      default:        return 'Earn';
    }
  };

  const handleAvatarClick = () => {
    haptic.impact('light');
    if (onNavigateProfile) onNavigateProfile();
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(13, 14, 20, 0.90)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          height: '60px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff5165, #be0034)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(255,81,101,0.45)',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '20px' }}>hub</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'white',
                lineHeight: 1.1,
              }}
            >
              ISHDAMAN
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#01e599',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.85,
              }}
            >
              {getTabSubtitle()}
            </span>
          </div>
        </div>

        {/* Balance + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Live Balance */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(30,31,38,0.9)',
              border: '1px solid rgba(1,229,153,0.20)',
              boxShadow: '0 0 10px rgba(1,229,153,0.12)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#01e599',
                boxShadow: '0 0 6px #01e599',
                animation: 'pulse 2s infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 600,
                color: '#01e599',
                letterSpacing: '-0.02em',
              }}
            >
              {formatUZS(user?.balance)}
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', marginLeft: '3px' }}>UZS</span>
            </span>
          </div>

          {/* Avatar */}
          <button
            type="button"
            onClick={handleAvatarClick}
            style={{
              position: 'relative',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <img
              alt="Avatar"
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(255,81,101,0.40)',
                boxShadow: '0 0 8px rgba(255,81,101,0.25)',
                display: 'block',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#01e599',
                border: '1.5px solid #0d0e14',
              }}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
