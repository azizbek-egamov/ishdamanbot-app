import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * AuthModal:
 * High-conversion glassmorphic modal containing the Telegram Login Widget
 * and instant Dev-Mock authorization for seamless desktop/mobile web access.
 * Responsive design guaranteed to fit all mobile viewports without overflowing.
 */
export default function AuthModal({ isOpen, onClose, onAuth }) {
  const widgetContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const widgetLoadedRef = useRef(false);

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'IshdamanUzBot';
  const isDev = import.meta.env.DEV;
  const hasRefCode = Boolean(localStorage.getItem('pending_ref_code'));

  useEffect(() => {
    if (!isOpen) {
      widgetLoadedRef.current = false;
      return;
    }

    // Telegram global auth callback
    window.onTelegramAuth = async (userData) => {
      setIsLoading(true);
      setError(null);
      try {
        const pendingRef =
          localStorage.getItem('pending_ref_code') ||
          new URLSearchParams(window.location.search).get('ref') ||
          '';

        const payload = {
          ...userData,
          ...(pendingRef ? { ref_code: pendingRef } : {}),
        };

        const response = await api.post('/users/auth/widget/', payload);
        const data = response.data;

        if (pendingRef) {
          localStorage.removeItem('pending_ref_code');
        }

        if (data.tokens?.access) {
          localStorage.setItem('th_access_token', data.tokens.access);
        }
        if (data.is_banned) {
          setError('Akkauntingiz bloklangan. Qo’llab-quvvatlash xizmatiga murojaat qiling.');
          setIsLoading(false);
          return;
        }
        if (data.user && onAuthRef.current) {
          onAuthRef.current(data.user, data.tokens);
          onCloseRef.current?.();
        }
      } catch (err) {
        console.error('[AuthModal] Widget auth error:', err);
        const msg = err.response?.data?.error || 'Xatolik yuz berdi. Qayta urinib ko’ring.';
        setError(msg);
        setIsLoading(false);
      }
    };

    // Load widget script only once when modal opens
    if (widgetContainerRef.current && !widgetLoadedRef.current) {
      widgetContainerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      widgetContainerRef.current.appendChild(script);
      widgetLoadedRef.current = true;
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [isOpen, botUsername]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[calc(100vw-24px)] max-w-[390px] sm:max-w-md bg-[#10121a] border border-white/15 rounded-3xl p-4 sm:p-7 flex flex-col items-center gap-4 sm:gap-5 shadow-[0_0_60px_rgba(255,81,101,0.2)] animate-modal-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow meshes */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-[#01e599]/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors z-10 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center gap-2.5 text-center mt-1">
          <div
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-neon-red"
            style={{ background: 'linear-gradient(135deg, #ff5165 0%, #be0034 100%)' }}
          >
            <span className="material-symbols-outlined text-white text-[28px] sm:text-[30px]">hub</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h2 className="font-headline font-black text-xl sm:text-2xl tracking-wide uppercase text-white">
              ISHDAMAN ga Kirish
            </h2>
            <p className="text-on-surface-variant text-xs max-w-[270px] leading-relaxed">
              Parol talab qilinmaydi. Telegram akkauntingiz orqali 1 soniyada xavfsiz kiring.
            </p>
          </div>
        </div>

        {/* Referral Badge if present */}
        {hasRefCode && (
          <div className="w-full py-2 px-3 rounded-xl bg-secondary-container/15 border border-secondary-container/30 flex items-center justify-center gap-2 text-secondary text-xs font-mono animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">redeem</span>
            <span>Do'stingiz taklifi faollashtirildi!</span>
          </div>
        )}

        {/* Telegram Widget Slot (Guaranteed Responsive without Overflow) */}
        <div className="flex flex-col items-center gap-3 w-full py-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
              <span className="text-on-surface-variant text-xs font-mono">
                Telegram tasdiqlanmoqda...
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center items-center min-h-[52px] overflow-hidden py-1">
              <div
                ref={widgetContainerRef}
                className="flex justify-center items-center w-full max-w-full overflow-hidden [&>iframe]:!max-w-full [&>iframe]:!rounded-xl scale-[0.82] xs:scale-[0.88] sm:scale-100 origin-center transition-transform"
                style={{
                  transformOrigin: 'center center',
                }}
              />
            </div>
          )}

          {error && (
            <div className="w-full bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 flex items-start gap-2.5 animate-slide-up">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">
                error
              </span>
              <span className="text-error text-xs font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Security & Features Strip */}
        <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-[#01e599] text-[16px]">verified_user</span>
            <span>Rasmiy Bot orqali</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono justify-end">
            <span className="material-symbols-outlined text-amber-400 text-[16px]">lock</span>
            <span>100% Xavfsiz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
