import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTelegram } from '../hooks/useTelegram';

export default function TradePage() {
  const { haptic, openLink } = useTelegram();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAds() {
      try {
        setLoading(true);
        const res = await api.get('/marketplace/');
        setAds(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAds();
  }, []);

  const handleAdClick = async (ad) => {
    haptic.impact('medium');
    try {
      api.post(`/marketplace/${ad.id}/click/`);
    } catch (e) {}
    openLink(ad.target_url);
  };

  return (
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe">
      {/* Header Info */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] text-tertiary tracking-widest uppercase font-semibold">
          BOZOR // PROP & BROKER HAMKORLIK
        </span>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-white uppercase">
          Treyding <span className="text-secondary neon-glow-green">Imkoniyatlari</span>
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant">
          Eng ishonchli brokerlar, prop firmalar va professional treyderlar signallari bir joyda.
        </p>
      </div>

      {/* Featured Market Cards */}
      {loading ? (
        <div className="py-12 flex justify-center text-on-surface-variant">
          <span className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : ads.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant text-xs">
          Hozirda yangi takliflar mavjud emas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="glass-card rounded-2xl overflow-hidden border border-white/10 flex flex-col transition-all hover:border-secondary-container/40 shadow-xl"
            >
              {/* Banner Image with Badges */}
              <div className="relative h-36 w-full overflow-hidden">
                <img
                  src={ad.banner_image}
                  alt={ad.partner_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/30 to-transparent"></div>

                {ad.badge_text && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary-container text-white text-[11px] font-bold shadow-neon-red font-headline uppercase">
                    {ad.badge_text}
                  </div>
                )}

                {ad.reward_note && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-surface-container-high/90 text-secondary border border-secondary/30 text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[14px]">card_giftcard</span>
                    <span>{ad.reward_note}</span>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-tertiary uppercase font-semibold">
                    {ad.partner_name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {ad.clicks_count} marta ko'rildi
                  </span>
                </div>

                <h3 className="font-headline font-bold text-white text-base leading-snug">
                  {ad.title}
                </h3>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {ad.description}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleAdClick(ad)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-surface-container-high to-surface-container-highest hover:border-secondary text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-[0.98]"
                  >
                    <span>Imkoniyatdan foydalanish</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      open_in_new
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
