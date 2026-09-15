import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';

// ─── Helper Functions for Wheel Rendering ───────────────────────────────────
function getLuminance(hex) {
  if (!hex) return 0;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function adjustBrightness(hex, percent) {
  if (!hex) return '#ff3b53';
  let num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

function formatRewardDisplay(reward) {
  const amount = Number(reward.amount || 0);
  if (amount > 0) {
    let formattedAmount = '';
    if (amount >= 1_000_000) {
      formattedAmount = `+${parseFloat((amount / 1_000_000).toFixed(1))}M`;
    } else if (amount >= 10_000) {
      formattedAmount = `+${parseFloat((amount / 1_000).toFixed(1))}K`;
    } else if (amount >= 1_000) {
      formattedAmount = `+${amount.toLocaleString('ru-RU')}`;
    } else {
      formattedAmount = `+${amount}`;
    }
    return {
      primary: formattedAmount,
      secondary: 'UZS',
    };
  }

  const label = (reward.label || 'Sovrin').trim();
  const words = label.split(/\s+/);
  if (words.length >= 2) {
    return {
      primary: words[0],
      secondary: words.slice(1).join(' '),
    };
  }
  return {
    primary: label,
    secondary: '',
  };
}

export default function SpinPage() {
  const { refreshProfile, showToast } = useAuth();
  const { haptic } = useTelegram();

  const [rewards, setRewards] = useState([]);
  const [canSpin, setCanSpin] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonReward, setWonReward] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef(null);
  const activeRewards = rewards.filter(r => r.is_active !== false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/spin/config/');
      setRewards(res.data.rewards);
      setCanSpin(res.data.can_spin);
      setRemainingSeconds(res.data.remaining_seconds);
      setHistory(res.data.last_spins || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    let interval = null;
    if (remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setCanSpin(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeRewards.length === 0) return;
    const ctx = canvas.getContext('2d');
    const size = 280;
    const dpr = window.devicePixelRatio || 2;

    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const count = activeRewards.length;
    const arc = (2 * Math.PI) / count;

    const outerRimRadius = size / 2 - 2;
    const rimWidth = 12;
    const wheelRadius = outerRimRadius - rimWidth;
    const hubRadius = Math.max(22, Math.floor(size * 0.12));

    // 1. Outer Casino Rim
    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius, 0, 2 * Math.PI);
    const rimGrad = ctx.createLinearGradient(0, 0, size, size);
    rimGrad.addColorStop(0, '#2e313d');
    rimGrad.addColorStop(0.5, '#181922');
    rimGrad.addColorStop(1, '#0c0d12');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.stroke();

    // 2. Marquee LED Lights
    const bulbCount = Math.max(16, count * 3);
    for (let j = 0; j < bulbCount; j++) {
      const bulbAngle = (j * 2 * Math.PI) / bulbCount;
      const bulbDist = outerRimRadius - rimWidth / 2;
      const bx = cx + bulbDist * Math.cos(bulbAngle);
      const by = cy + bulbDist * Math.sin(bulbAngle);

      ctx.beginPath();
      ctx.arc(bx, by, 2.2, 0, 2 * Math.PI);
      const isGold = j % 2 === 0;
      ctx.fillStyle = isGold ? '#ffd700' : '#ffffff';
      ctx.shadowColor = isGold ? '#ffd700' : '#ffffff';
      ctx.shadowBlur = 4;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. Sectors
    activeRewards.forEach((reward, i) => {
      const startAngle = i * arc - Math.PI / 2;
      const endAngle = startAngle + arc;
      const midAngle = startAngle + arc / 2;
      const baseColor = reward.color || '#ff3b53';

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wheelRadius, startAngle, endAngle);
      ctx.closePath();

      const sectorGrad = ctx.createRadialGradient(cx, cy, hubRadius, cx, cy, wheelRadius);
      sectorGrad.addColorStop(0, adjustBrightness(baseColor, -25));
      sectorGrad.addColorStop(0.85, baseColor);
      sectorGrad.addColorStop(1, adjustBrightness(baseColor, 15));
      ctx.fillStyle = sectorGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Sector Text (Adaptive & ALWAYS Upright)
      const { primary, secondary } = formatRewardDisplay(reward);
      const lum = getLuminance(baseColor);
      const isLightBg = lum > 170;
      const primaryColor = isLightBg ? '#0d0e15' : '#ffffff';
      const secondaryColor = isLightBg ? '#2d3748' : 'rgba(255, 255, 255, 0.85)';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);

      const textRadius = (hubRadius + wheelRadius) / 2 + 3;
      ctx.translate(textRadius, 0);

      // Auto-flip for sectors on the left half so text is never upside-down
      const cosAngle = Math.cos(midAngle);
      if (cosAngle < 0) {
        ctx.rotate(Math.PI);
      }

      const maxAvailableWidth = (wheelRadius - hubRadius) * 0.76;
      let primaryFontSize = Math.min(15, Math.max(10, Math.floor(180 / Math.max(count, 4))));
      ctx.font = `bold ${primaryFontSize}px Inter, sans-serif`;

      while (ctx.measureText(primary).width > maxAvailableWidth && primaryFontSize > 9) {
        primaryFontSize -= 1;
        ctx.font = `bold ${primaryFontSize}px Inter, sans-serif`;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = isLightBg ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 3;

      if (secondary) {
        const subFontSize = Math.max(8, Math.floor(primaryFontSize * 0.72));
        ctx.fillText(primary, 0, -primaryFontSize * 0.42);

        ctx.font = `600 ${subFontSize}px Inter, sans-serif`;
        ctx.fillStyle = secondaryColor;
        ctx.fillText(secondary, 0, primaryFontSize * 0.65);
      } else {
        ctx.fillText(primary, 0, 0);
      }

      ctx.restore();
    });

    // 5. Center Hub
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 3, 0, 2 * Math.PI);
    const goldRing = ctx.createLinearGradient(cx - hubRadius, cy - hubRadius, cx + hubRadius, cy + hubRadius);
    goldRing.addColorStop(0, '#fef08a');
    goldRing.addColorStop(0.5, '#eab308');
    goldRing.addColorStop(1, '#a16207');
    ctx.fillStyle = goldRing;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius - 1, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, hubRadius);
    hubGrad.addColorStop(0, '#2b2e3b');
    hubGrad.addColorStop(0.7, '#14161f');
    hubGrad.addColorStop(1, '#090a0d');
    ctx.fillStyle = hubGrad;
    ctx.fill();

    ctx.font = `bold ${Math.floor(hubRadius * 0.85)}px Inter, sans-serif`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.fillText('★', cx, cy);
    ctx.shadowBlur = 0;

    ctx.restore();
  }, [activeRewards]);

  const formatCooldown = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleSpin = async () => {
    if (!canSpin || isSpinning || activeRewards.length === 0) return;

    try {
      setIsSpinning(true);
      haptic.impact('heavy');

      const res = await api.post('/spin/play/');
      const { winning_index, reward, remaining_seconds } = res.data;

      const sectorAngle = 360 / activeRewards.length;
      const currentTurns = Math.ceil(rotationDegrees / 360);
      const additionalTurns = 5;
      const targetDegree = (currentTurns + additionalTurns) * 360 + (360 - winning_index * sectorAngle - sectorAngle / 2);

      setRotationDegrees(targetDegree);

      setTimeout(() => {
        setIsSpinning(false);
        setWonReward(reward);
        setCanSpin(false);
        setRemainingSeconds(remaining_seconds);
        refreshProfile();

        // Fire neon confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff3b53', '#ffd700', '#05d59e', '#00b4d8', '#8b5cf6'],
        });

        haptic.notification('success');
      }, 4200);

    } catch (err) {
      setIsSpinning(false);
      const errMsg = err.response?.data?.error || 'Xatolik yuz berdi';
      showToast(errMsg, 'error');
      haptic.notification('error');
    }
  };

  return (
    <>
    <div className="flex flex-col items-center gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe max-w-sm md:max-w-xl mx-auto">
      {/* Title */}
      <div className="text-center flex flex-col gap-1">
        <span className="font-mono text-[11px] text-secondary tracking-widest uppercase font-semibold">
          KUNDALIK BONUS // REAL-TIME WHEEL
        </span>
        <h1 className="font-headline text-2xl font-bold text-white uppercase">
          Omad <span className="text-primary-container neon-glow-red">Ruletkasi</span>
        </h1>
        <p className="text-xs text-on-surface-variant">
          Har 24 soatda bir marta g'ildirakni aylantirib, kafolatlangan sovg'alarga ega bo'ling!
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative flex items-center justify-center my-2" style={{ width: 280, height: 280 }}>
        {/* Glow behind wheel */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-container/30 to-secondary-container/30 blur-2xl pointer-events-none" />

        {/* Rotating Wheel Disc */}
        <div
          className="rounded-full flex items-center justify-center will-change-transform"
          style={{
            transform: `rotate(${rotationDegrees}deg)`,
            transitionDuration: isSpinning ? '4.2s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.2, 1)',
          }}
        >
          <canvas
            ref={canvasRef}
            className="rounded-full shadow-[0_0_35px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* Stationary Top Pointer Needle */}
        <div className="absolute -top-1.5 z-30 pointer-events-none flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[22px] border-t-[#ff3b53]" />
          <div className="w-2 h-2 rounded-full bg-[#ffd700] -mt-5 shadow-sm" />
        </div>
      </div>

      {/* Action Button or Countdown */}
      <div className="w-full flex flex-col items-center gap-3">
        {canSpin ? (
          <button
            type="button"
            disabled={isSpinning}
            onClick={handleSpin}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-container via-[#ff5165] to-secondary-container text-white font-headline font-bold text-base uppercase tracking-wider shadow-[0_4px_25px_rgba(255,81,101,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">casino</span>
            <span>{isSpinning ? 'Aylanmoqda...' : 'Ruletkani Aylantirish'}</span>
          </button>
        ) : (
          <div className="w-full py-3.5 px-4 rounded-xl bg-surface-container-high border border-white/10 flex flex-col items-center justify-center gap-1 shadow-inner">
            <span className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">
              Keyingi bepul imkoniyatgacha:
            </span>
            <span className="font-mono text-xl font-bold text-secondary tracking-widest neon-glow-green">
              {formatCooldown(remainingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Spin History */}
      {history.length > 0 && (
        <div className="w-full glass-card rounded-xl p-4 border border-white/5 flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-white uppercase tracking-wide font-headline">
            So'nggi yutuqlaringiz
          </span>
          <div className="flex flex-col gap-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                <span className="text-on-surface-variant">{h.reward_label}</span>
                <span className="font-mono font-bold text-secondary">
                  +{formatUZS(h.reward_amount)} UZS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>

    {/* ============================================================
        YUTUQ MODALI (Root Level - Responsive Modal)
        ============================================================ */}
    {wonReward && (
      <div
        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 pt-14 sm:pt-4 animate-fade-in"
        onClick={() => setWonReward(null)}
      >
        <div
          className="w-full max-w-sm glass-card rounded-3xl p-6 border border-primary-container/40 flex flex-col items-center text-center gap-4 shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto overscroll-contain animate-modal-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary-container shadow-neon-red shrink-0">
            <span className="material-symbols-outlined text-[36px]">emoji_events</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-mono uppercase tracking-widest font-bold">
              TABRIKLAYMIZ!
            </span>
            <h2 className="font-headline text-2xl font-bold text-white">
              {wonReward.label}
            </h2>
            {wonReward.amount > 0 ? (
              <p className="text-xs text-on-surface-variant">
                Mukofot hisobingizga muvaffaqiyatli qo'shildi!
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Keyingi safar albatta omad kulib boqadi!
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setWonReward(null)}
            className="w-full py-3 rounded-xl bg-primary-container text-white font-bold text-sm shadow-neon-red active:scale-95 transition-transform shrink-0"
          >
            Ajoyib!
          </button>
        </div>
      </div>
    )}
    </>
  );
}
