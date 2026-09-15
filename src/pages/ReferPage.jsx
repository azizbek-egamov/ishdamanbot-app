import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';

export default function ReferPage() {
  const { user, showToast } = useAuth();
  const { haptic, openTelegramLink } = useTelegram();

  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Muhitni aniqlash (Telegram Mini App yoki Oddiy brauzer)
  const isTelegramWebApp = Boolean(window.Telegram?.WebApp?.initData);
  const [activeLinkTab, setActiveLinkTab] = useState(isTelegramWebApp ? 'telegram' : 'website');

  useEffect(() => {
    async function fetchReferrals() {
      try {
        setLoading(true);
        const res = await api.get('/users/referrals/');
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
  }, []);

  const botUsername = (data?.bot_username || import.meta.env.VITE_BOT_USERNAME || 'ishdamanbot').replace('@', '');
  const botAppShortName = data?.bot_app_short_name || import.meta.env.VITE_BOT_APP_SHORT_NAME || '';
  const refCode = user?.referral_code || '';

  // 1. Telegram Mini App havolasi
  const directWebAppLink = botAppShortName
    ? `https://t.me/${botUsername}/${botAppShortName}?startapp=${refCode}`
    : `https://t.me/${botUsername}?startapp=${refCode}`;
  const telegramInviteLink = data?.telegram_invite_link || directWebAppLink;

  // 2. Veb-sayt to'g'ridan-to'g'ri havolasi (Hozirgi domen asosida dinamik)
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ishdaman.uz';
  const websiteInviteLink = `${siteOrigin}/?ref=${refCode}`;

  // Faol havola
  const currentLink = activeLinkTab === 'telegram' ? telegramInviteLink : websiteInviteLink;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLink);
    setCopied(true);
    haptic.notification('success');
    showToast(
      activeLinkTab === 'telegram'
        ? 'Telegram referal havola nusxalandi!'
        : 'Sayt referal havola nusxalandi!',
      'success'
    );
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    haptic.impact('medium');
    if (activeLinkTab === 'telegram') {
      const shareText = encodeURIComponent(
        "🚀 ISHDAMAN platformasiga qo'shiling! Har kuni pul ishlang, omad ruletkasini aylantiring va 5 000 000 UZS lik konkursda qatnashing!\n\n" + telegramInviteLink
      );
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(telegramInviteLink)}&text=${shareText}`;
      openTelegramLink(telegramUrl);
    } else {
      // Veb-sayt havolasi uchun
      if (navigator.share) {
        navigator.share({
          title: 'ISHDAMAN platformasi',
          text: "🚀 ISHDAMAN ga kiring va real pul ishlang! Mening havolam:",
          url: websiteInviteLink,
        }).catch(() => {});
      } else {
        const shareText = encodeURIComponent(
          "🚀 ISHDAMAN platformasiga qo'shiling! Brauzer orqali kiring va daromad qiling!\n\n" + websiteInviteLink
        );
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(websiteInviteLink)}&text=${shareText}`;
        openTelegramLink(telegramUrl);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe max-w-4xl mx-auto">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 md:p-8 border border-primary-container/20 shadow-2xl flex flex-col gap-3">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">
            group_add
          </span>
          <span className="font-mono text-[11px] text-secondary tracking-widest uppercase font-semibold">
            REFERAL DASTURI // 2 TA KANAL
          </span>
        </div>

        <h1 className="font-headline text-2xl font-bold text-white uppercase leading-snug">
          Do'stlaringizni taklif qiling, <span className="text-primary-container neon-glow-red">+{formatUZS(data?.referral_reward || 500)} UZS</span> oling!
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Telegram Mini App yoki Veb-sayt havolangiz orqali taklif qiling. Har bir qo'shilgan do'stingiz uchun hisobingizga real pul tushadi!
        </p>

        {/* Havola turi tanlash tablari */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-xl border border-white/10 mt-1">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveLinkTab('telegram');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeLinkTab === 'telegram'
                ? 'bg-primary-container text-white shadow-neon-red font-bold'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Telegram Havola</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setActiveLinkTab('website');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeLinkTab === 'website'
                ? 'bg-secondary-container text-surface-container-lowest shadow-neon-green font-bold'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">language</span>
            <span>Sayt Havola</span>
          </button>
        </div>

        {/* Havola izohi */}
        <span className="text-[10px] text-on-surface-variant font-mono">
          {activeLinkTab === 'telegram'
            ? "📱 Telegram ichida ochiladi — Telegram do'stlaringiz va kanallarga yuborish uchun qulay."
            : "🌐 Oddiy brauzerda ochiladi — Instagram, TikTok, YouTube yoki kompyuter foydalanuvchilari uchun."}
        </span>

        {/* Invite link box */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-xl border border-white/10">
            <input
              type="text"
              readOnly
              value={currentLink}
              className="bg-transparent text-xs text-on-surface w-full font-mono outline-none px-2 select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Nusxalandi' : 'Nusxa'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
              activeLinkTab === 'telegram'
                ? 'bg-primary-container text-white shadow-neon-red'
                : 'bg-secondary-container text-surface-container-lowest shadow-neon-green'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {activeLinkTab === 'telegram' ? 'send' : 'share'}
            </span>
            <span>
              {activeLinkTab === 'telegram' ? 'Telegramda Ulashish' : 'Havolani Ulashish'}
            </span>
          </button>
        </div>
      </section>

      {/* Statistika Kartochkalari */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Jami referallar */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col gap-1 border border-white/5">
          <span className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">
            Jami Do'stlar
          </span>
          <span className="font-headline text-xl font-black text-white">
            {data?.total_count || 0} nafar
          </span>
        </div>

        {/* Jami daromad */}
        <div className="glass-card rounded-xl p-3.5 flex flex-col gap-1 border border-white/5">
          <span className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">
            Referal Daromad
          </span>
          <span className="font-mono text-xl font-black text-secondary neon-glow-green">
            +{formatUZS((data?.total_count || 0) * (data?.referral_reward || 500))} UZS
          </span>
        </div>

        {/* Telegram orqali */}
        <div className="glass-card rounded-xl p-3 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">send</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-mono">Telegram</span>
              <span className="font-mono text-xs font-bold text-white">
                {data?.telegram_count ?? 0} nafar
              </span>
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant font-mono">
            +{formatUZS((data?.telegram_count ?? 0) * (data?.referral_reward || 500))}
          </span>
        </div>

        {/* Sayt orqali */}
        <div className="glass-card rounded-xl p-3 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">language</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-mono">Veb-sayt</span>
              <span className="font-mono text-xs font-bold text-white">
                {data?.website_count ?? 0} nafar
              </span>
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant font-mono">
            +{formatUZS((data?.website_count ?? 0) * (data?.referral_reward || 500))}
          </span>
        </div>
      </section>

      {/* Referrals List */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline font-bold text-white text-sm">Taklif qilingan do'stlar</span>
          <span className="font-mono text-[11px] text-on-surface-variant">
            {data?.referrals?.length || 0} ta ko'rsatilmoqda
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-on-surface-variant">
            <span className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : !data?.referrals || data.referrals.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-xs text-on-surface-variant">
            Siz hali hech kimni taklif qilmadingiz. Havolani do'stlaringizga ulashing va pul ishlang!
          </div>
        ) : (
          data.referrals.map((ref) => {
            const isFromWebsite = ref.registration_source === 'website';
            return (
              <div
                key={ref.id}
                className="glass-card rounded-xl p-3 flex items-center justify-between gap-3 border border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={ref.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                    alt={ref.full_name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-headline text-xs font-semibold text-white truncate leading-tight">
                        {ref.full_name}
                      </span>
                      {/* Manba nishoni */}
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 ${
                        isFromWebsite
                          ? 'bg-secondary-container/15 text-secondary border border-secondary-container/30'
                          : 'bg-primary-container/15 text-primary-fixed-dim border border-primary-container/30'
                      }`}>
                        <span className="material-symbols-outlined text-[10px]">
                          {isFromWebsite ? 'language' : 'send'}
                        </span>
                        {isFromWebsite ? 'Sayt' : 'Bot'}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant truncate">
                      @{ref.username || `user_${ref.id}`}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-secondary shrink-0">
                  +{formatUZS(data?.referral_reward || 500)} UZS
                </span>
              </div>
            );
          })
        )}
      </section>

    </div>
  );
}
