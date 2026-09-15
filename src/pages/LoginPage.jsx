import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

/**
 * LoginPage -- Sayt (browser) uchun Telegram Login Widget sahifasi.
 * Foydalanuvchi "Telegram orqali kirish" tugmasini bosadi,
 * Telegram da tasdiqlaydi, /api/users/auth/widget/ ga POST,
 * JWT token olinadi, onAuth(user, tokens) chaqiriladi.
 */
export default function LoginPage({ onAuth }) {
  const widgetContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const botUsername = (import.meta.env.VITE_BOT_USERNAME || "ishdamanbot").replace('@', '');
  const isDev = import.meta.env.DEV;

  const [hasRefCode, setHasRefCode] = useState(false);

  // URL dan referal kodni ushlab qolish
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref") || params.get("startapp");
    if (refParam) {
      localStorage.setItem("pending_ref_code", refParam);
      setHasRefCode(true);
    } else if (localStorage.getItem("pending_ref_code")) {
      setHasRefCode(true);
    }
  }, []);

  // Telegram Widget ni dinamik yuklash
  useEffect(() => {
    setMounted(true);

    // window ga global callback -- Widget chaqiradi
    window.onTelegramAuth = async (userData) => {
      setIsLoading(true);
      setError(null);
      try {
        const pendingRef = localStorage.getItem("pending_ref_code") || new URLSearchParams(window.location.search).get("ref") || "";
        const payload = {
          ...userData,
          ...(pendingRef ? { ref_code: pendingRef } : {})
        };

        const response = await api.post("/users/auth/widget/", payload);
        const data = response.data;

        if (pendingRef) {
          localStorage.removeItem("pending_ref_code");
        }

        if (data.tokens?.access) {
          localStorage.setItem("th_access_token", data.tokens.access);
        }
        if (data.is_banned) {
          setError("Akkauntingiz bloklangan. Qo\u2019llab-quvvatlash xizmatiga murojaat qiling.");
          setIsLoading(false);
          return;
        }
        if (data.user && onAuth) {
          onAuth(data.user, data.tokens);
        }
      } catch (err) {
        console.error("[LoginPage] Widget auth error:", err);
        const msg = err.response?.data?.error || "Xatolik yuz berdi. Qayta urinib ko\u2019ring.";
        setError(msg);
        setIsLoading(false);
      }
    };

    // Widget skriptini dinamik yuklash
    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = "";

      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;

      widgetContainerRef.current.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Fon neon gradientlari */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(255,81,101,0.8) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, rgba(1,229,153,0.6) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Kontent konteyner */}
      <div
        className={`relative z-10 w-full max-w-sm flex flex-col items-center gap-8 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >

        {/* Logo bloki */}
        <div className="flex flex-col items-center gap-4 animate-slide-up">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl neon-pulse-red"
            style={{ background: "linear-gradient(135deg, #ff5165 0%, #be0034 100%)" }}
          >
            <span className="material-symbols-outlined text-white text-[42px]">hub</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-headline font-black text-3xl tracking-widest uppercase text-white"
              style={{ textShadow: "0 0 30px rgba(255,81,101,0.5)" }}
            >
              ISHDAMAN
            </h1>
            <p className="text-on-surface-variant text-sm font-mono tracking-wider">
              Savdo platformasi
            </p>
          </div>
        </div>

        {/* Asosiy karta */}
        <div
          className="w-full glass-card rounded-3xl p-6 flex flex-col items-center gap-6 border border-white/10 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-white font-bold text-xl">Kirish</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-[260px]">
              Telegram akkauntingiz orqali xavfsiz va tez kiring
            </p>
          </div>

          {/* Do'sti tomonidan taklif qilinganlik belgisi */}
          {hasRefCode && (
            <div className="w-full py-2 px-3 rounded-xl bg-secondary-container/15 border border-secondary-container/30 flex items-center justify-center gap-2 text-secondary text-xs font-mono animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">redeem</span>
              <span>Do'stingiz taklifi faollashtirildi!</span>
            </div>
          )}

          {/* Telegram Widget joyi */}
          <div className="flex flex-col items-center gap-3 w-full">
            {isLoading ? (
              <div className="flex items-center gap-3 py-3">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-on-surface-variant text-sm font-mono">
                  Tekshirilmoqda...
                </span>
              </div>
            ) : (
              <div
                ref={widgetContainerRef}
                className="flex justify-center min-h-[50px] items-center"
              />
            )}

            {error && (
              <div className="w-full bg-error/10 border border-error/30 rounded-xl px-4 py-3 flex items-start gap-2.5 animate-slide-up">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <span className="text-error text-xs font-medium">{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-secondary text-[14px]">shield</span>
            <span>Parol talab qilinmaydi — Telegram orqali xavfsiz</span>
          </div>
        </div>

        {/* Xususiyatlar qatori */}
        <div
          className="w-full grid grid-cols-3 gap-3 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {[
            { icon: "account_balance_wallet", label: "Balans", color: "text-secondary" },
            { icon: "group", label: "Referallar", color: "text-primary" },
            { icon: "workspace_premium", label: "Mukofotlar", color: "text-yellow-400" },
          ].map(({ icon, label, color }) => (
            <div
              key={label}
              className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 border border-white/5"
            >
              <span className={`material-symbols-outlined ${color} text-[22px]`}>{icon}</span>
              <span className="text-[10px] text-on-surface-variant font-medium">{label}</span>
            </div>
          ))}
        </div>

        <p
          className="text-[10px] text-on-surface-variant/50 font-mono text-center animate-slide-up"
          style={{ animationDelay: "0.35s" }}
        >
          Kirish orqali siz platformaning{" "}
          <span className="text-on-surface-variant">foydalanish shartlariga</span>{" "}
          rozilik bildirasiz
        </p>
      </div>
    </div>
  );
}
