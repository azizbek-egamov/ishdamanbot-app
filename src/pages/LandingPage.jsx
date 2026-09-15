import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatUZS } from '../utils/formatters';
import AuthModal from '../components/AuthModal';

// ─── Helper Functions for Casino Wheel Rendering (Identical to SpinPage) ──────
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
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
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

// ─── Isolated Memoized Countdown Box (Prevents Whole Page Re-renders) ─────────
const ContestCountdownBox = React.memo(function ContestCountdownBox() {
  const [countdown, setCountdown] = useState({ days: 2, hours: 14, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 bg-[#12141c]/90 border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg">
      <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] text-[#ff5165]">timer</span>
        <span>Konkurs yakunlanishiga qoldi:</span>
      </span>
      <div className="flex items-center gap-2 font-mono text-lg sm:text-2xl font-black text-white">
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-white/10 text-center min-w-[48px]">
          <span className="text-amber-400">{String(countdown.days).padStart(2, '0')}</span>
          <span className="text-[9px] text-on-surface-variant block font-normal">KUN</span>
        </div>
        <span>:</span>
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-white/10 text-center min-w-[48px]">
          <span className="text-white">{String(countdown.hours).padStart(2, '0')}</span>
          <span className="text-[9px] text-on-surface-variant block font-normal">SOAT</span>
        </div>
        <span>:</span>
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-white/10 text-center min-w-[48px]">
          <span className="text-white">{String(countdown.minutes).padStart(2, '0')}</span>
          <span className="text-[9px] text-on-surface-variant block font-normal">DAQ</span>
        </div>
        <span>:</span>
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-white/10 text-center min-w-[48px]">
          <span className="text-[#01e599]">{String(countdown.seconds).padStart(2, '0')}</span>
          <span className="text-[9px] text-on-surface-variant block font-normal">SON</span>
        </div>
      </div>
    </div>
  );
});

export default function LandingPage({ onAuth }) {
  const { onlineCount, totalUsers } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [contestData, setContestData] = useState(null);

  // High-tech Cyber Initial Splash Loading Screen with Silky Reveal
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(24);
  const [loadingStatus, setLoadingStatus] = useState("Kiber-Treyding tarmog'i ulanmoqda...");

  // Casino Wheel States (Identical to SpinPage)
  const canvasRef = useRef(null);
  const [wheelRewards, setWheelRewards] = useState([
    { id: 1, label: '50 UZS', amount: 50, color: '#ff5165' },
    { id: 2, label: '100 UZS', amount: 100, color: '#01e599' },
    { id: 3, label: '500 UZS', amount: 500, color: '#47d6ff' },
    { id: 4, label: '1,000 UZS', amount: 1000, color: '#ffdada' },
    { id: 5, label: '2,500 UZS', amount: 2500, color: '#ffb3b5' },
    { id: 6, label: 'Omad Kelmadi', amount: 0, color: '#33343c' },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [wonReward, setWonReward] = useState(null);

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'IshdamanUzBot';

  // Stable callback for closing auth modal to avoid re-renders
  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Recent Live Payouts stream
  const recentPayouts = [
    { id: 1, name: 'Sanjarbek T.', method: 'Humo', amount: 350000, time: '1 daqiqa oldin' },
    { id: 2, name: 'Jasur K.', method: 'Uzcard', amount: 120000, time: '2 daqiqa oldin' },
    { id: 3, name: 'Malika K.', method: 'Humo', amount: 50000, time: '4 daqiqa oldin' },
    { id: 4, name: 'Dalerjon M.', method: 'Uzcard', amount: 890000, time: '6 daqiqa oldin' },
    { id: 5, name: 'Bobur Mirzo', method: 'Humo', amount: 240000, time: '9 daqiqa oldin' },
    { id: 6, name: 'Shahzod A.', method: 'Uzcard', amount: 95000, time: '12 daqiqa oldin' },
  ];

  // Splash Screen progress sequence
  useEffect(() => {
    const t1 = setTimeout(() => {
      setLoadingProgress(58);
      setLoadingStatus('Telegram Bot API va xavfsiz shifrlash faollashdi...');
    }, 220);

    const t2 = setTimeout(() => {
      setLoadingProgress(88);
      setLoadingStatus("Jonli to'lovlar & vazifalar sinxronlandi...");
    }, 520);

    const t3 = setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStatus('ISHDAMAN PORTAL TAYYOR!');
    }, 800);

    const t4 = setTimeout(() => {
      // Trigger smooth fade-out and page entrance animation
      setSplashFading(true);
      setIsInitialLoading(false);
    }, 1050);

    const t5 = setTimeout(() => {
      // Remove splash from DOM completely
      setSplashMounted(false);
    }, 1750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  // ─── Navbar Sections & Silky Smooth Animated Scroll Engine ───────────────────
  const navSections = [
    { id: 'vazifalar', label: 'Vazifalar' },
    { id: 'bonus', label: 'Daily Bonus', isHot: true },
    { id: 'konkurs', label: 'Konkurs', isContest: true },
    { id: 'tolovlar', label: "Jonli To'lovlar" },
    { id: 'reyting', label: 'Reyting' },
    { id: 'mobil-app', label: 'Mobil Ilova' },
    { id: 'qoidalar', label: 'Qanday ishlaydi?' },
  ];

  const [activeNavSection, setActiveNavSection] = useState('vazifalar');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollAnimRef = useRef(null);

  // Silky Animated Scroll with Custom Velvet Easing Curve (easeInOutCubic)
  const smoothScrollToY = useCallback((targetY, onComplete) => {
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    const startY = window.pageYOffset;
    const diff = targetY - startY;
    if (Math.abs(diff) < 4) {
      if (onComplete) onComplete();
      return;
    }

    const distance = Math.abs(diff);
    // Dynamic duration based on travel distance: min 620ms, max 1100ms
    const duration = Math.min(1100, Math.max(620, Math.round(Math.sqrt(distance) * 19)));
    let startTime = null;

    // Luxurious easeInOutCubic curve: gentle acceleration, swift flight, velvet deceleration
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo(0, Math.round(startY + diff * eased));

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(animateScroll);
      } else {
        window.scrollTo(0, targetY);
        scrollAnimRef.current = null;
        if (onComplete) onComplete();
      }
    };

    scrollAnimRef.current = requestAnimationFrame(animateScroll);
  }, []);

  // Section click handler with accurate navbar offset and arrival highlight pulse
  const handleSectionClick = useCallback(
    (e, sectionId) => {
      if (e && e.preventDefault) e.preventDefault();

      const targetEl = document.getElementById(sectionId);
      if (!targetEl) return;

      setActiveNavSection(sectionId);

      const navEl = document.querySelector('nav');
      const navbarHeight = navEl ? navEl.offsetHeight : 100;
      const targetY = Math.max(0, targetEl.getBoundingClientRect().top + window.pageYOffset - (navbarHeight + 14));

      smoothScrollToY(targetY, () => {
        // Trigger arrival highlight glow on section
        targetEl.classList.remove('section-target-highlight');
        void targetEl.offsetWidth; // Force CSS reflow
        targetEl.classList.add('section-target-highlight');
        setTimeout(() => {
          targetEl.classList.remove('section-target-highlight');
        }, 1800);
      });
    },
    [smoothScrollToY]
  );

  // Logo / Back to top handler (silky glide to y: 0)
  const handleScrollToTop = useCallback(
    (e) => {
      if (e && e.preventDefault) e.preventDefault();
      smoothScrollToY(0);
    },
    [smoothScrollToY]
  );

  // Scroll listener for active section spy & back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset;
      setShowBackToTop(scrollY > 380);

      const sections = ['vazifalar', 'bonus', 'konkurs', 'tolovlar', 'reyting', 'mobil-app', 'qoidalar'];
      const navEl = document.querySelector('nav');
      const offset = (navEl ? navEl.offsetHeight : 100) + 80;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom > 60) {
            setActiveNavSection(sections[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, []);

  // Categories for filter
  const categories = [
    { id: 'all', label: 'Barchasi', icon: 'apps' },
    { id: 'telegram', label: 'Telegram', icon: 'send' },
    { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
    { id: 'broker', label: 'Trading & Prop', icon: 'candlestick_chart' },
    { id: 'deposit', label: 'Depozit', icon: 'payments' },
  ];

  // Default tasks fallback if API returns empty
  const defaultTasks = [
    {
      id: 101,
      title: 'Rasmiy Telegram kanalga obuna bo’lish',
      category: 'telegram',
      reward_amount: 5000,
      description: 'Kanalga obuna bo’ling va so’nggi yangiliklardan xabardor bo’ling.',
      completions_count: 3420,
    },
    {
      id: 102,
      title: 'YouTube videoni ko’rish va layk bosish',
      category: 'youtube',
      reward_amount: 8000,
      description: 'Trading strategiyasi haqidagi 3 daqiqalik videoni tomosha qiling.',
      completions_count: 2180,
    },
    {
      id: 103,
      title: 'Bybit birjasida ro’yxatdan o’tish',
      category: 'broker',
      reward_amount: 35000,
      description: 'Hamkorlik havolasi orqali hisob oching va bonus oling.',
      completions_count: 940,
    },
    {
      id: 104,
      title: 'Instagram sahifani kuzatish va komment qoldirish',
      category: 'instagram',
      reward_amount: 6000,
      description: 'So’nggi postga ijobiy fikr yozing va skrinshot yuboring.',
      completions_count: 1850,
    },
    {
      id: 105,
      title: 'OKX platformasida KYC verifikatsiyadan o’tish',
      category: 'broker',
      reward_amount: 50000,
      description: 'Birjada shaxsiy ma’lumotlarni tasdiqlang va darhol mukofot oling.',
      completions_count: 620,
    },
    {
      id: 106,
      title: 'Forex treyding bo’yicha mini-testni yechish',
      category: 'deposit',
      reward_amount: 12000,
      description: '5 ta savolga to’g’ri javob berib, trading bilimlaringizni sinang.',
      completions_count: 1410,
    },
  ];

  // Fetch live tasks, contest, and active wheel config
  useEffect(() => {
    const loadData = async () => {
      try {
        const tasksRes = await api.get('/tasks/?category=all');
        if (Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
          setTasks(tasksRes.data);
        } else {
          setTasks(defaultTasks);
        }
      } catch (e) {
        setTasks(defaultTasks);
      }

      try {
        const contestRes = await api.get('/contests/active/');
        if (contestRes.data?.is_active && contestRes.data?.contest) {
          setContestData(contestRes.data.contest);
        }
      } catch (e) {
        // ok
      }

      try {
        const spinRes = await api.get('/spin/config/');
        if (Array.isArray(spinRes.data?.rewards) && spinRes.data.rewards.length > 0) {
          setWheelRewards(spinRes.data.rewards);
        }
      } catch (e) {
        // ok
      }
    };

    loadData();
  }, []);

  // ─── Draw Casino Wheel on Canvas (Exact SpinPage Algorithm) ─────────────────
  const activeRewards = wheelRewards.filter((r) => r.is_active !== false);

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

  // Spin wheel handler (Authentic Spin Experience)
  const handleSpinWheel = () => {
    if (isSpinning || activeRewards.length === 0) return;
    setIsSpinning(true);

    // Pick a rewarding sector (e.g. index with amount >= 100 UZS)
    const winningIndex =
      activeRewards.findIndex((r) => Number(r.amount) >= 100) !== -1
        ? activeRewards.findIndex((r) => Number(r.amount) >= 100)
        : 0;

    const sectorAngle = 360 / activeRewards.length;
    const currentTurns = Math.ceil(rotationDegrees / 360);
    const additionalTurns = 5;
    const targetDegree =
      (currentTurns + additionalTurns) * 360 +
      (360 - winningIndex * sectorAngle - sectorAngle / 2);

    setRotationDegrees(targetDegree);

    setTimeout(() => {
      setIsSpinning(false);
      const chosen = activeRewards[winningIndex];
      setWonReward(chosen);
      setIsWinModalOpen(true);

      // Fire celebratory neon confetti
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ff3b53', '#ffd700', '#05d59e', '#00b4d8', '#8b5cf6'],
        });
      } catch (e) {
        // ok
      }
    }, 4200);
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Top 10 leaderboard
  const topTraders = [
    { rank: 1, name: 'Sanjarbek T.', username: 'sanjar_fx', earnings: 2450000, completed: 184, isTop: true },
    { rank: 2, name: 'Dalerjon M.', username: 'daler_invest', earnings: 1890000, completed: 142, isTop: true },
    { rank: 3, name: 'Bobur Mirzo', username: 'bobur_trader', earnings: 1420000, completed: 119, isTop: true },
    { rank: 4, name: 'Shahzod A.', username: 'shahzod_uz', earnings: 980000, completed: 86 },
    { rank: 5, name: 'Malika Karimova', username: 'malika_k', earnings: 850000, completed: 74 },
    { rank: 6, name: 'Javohir R.', username: 'javohir_77', earnings: 720000, completed: 63 },
    { rank: 7, name: 'Ulug’bek N.', username: 'ulugbek_pro', earnings: 640000, completed: 58 },
    { rank: 8, name: 'Madina Saidova', username: 'madina_s', earnings: 510000, completed: 47 },
    { rank: 9, name: 'Farrux D.', username: 'farrux_d', earnings: 450000, completed: 41 },
    { rank: 10, name: 'Otabek H.', username: 'otabek_h', earnings: 390000, completed: 35 },
  ];

  const partners = [
    { name: 'Binance', icon: 'currency_exchange', tag: 'Kripto №1' },
    { name: 'Bybit', icon: 'candlestick_chart', tag: 'VIP Hamkor' },
    { name: 'OKX', icon: 'account_balance', tag: 'Web3 & DEX' },
    { name: 'BingX', icon: 'trending_up', tag: 'Copy Trading' },
    { name: 'TradingView', icon: 'analytics', tag: 'Grafiklar' },
    { name: 'Exness', icon: 'show_chart', tag: 'Forex Broker' },
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-[#ff5165] selection:text-white font-sans antialiased overflow-x-hidden relative cyber-grid-bg">
      {/* =========================================================
          CYBER SPLASH INTRO ANIMATION (High-Tech Loading Screen)
          ========================================================= */}
      {splashMounted && (
        <div
          className={`fixed inset-0 z-[99999] bg-[#090a0f] flex flex-col items-center justify-center p-6 text-center transition-all duration-700 ease-out ${
            splashFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Ambient Cyber Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[520px] h-[380px] sm:h-[520px] bg-[#ff5165]/20 blur-[130px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#01e599]/20 blur-[100px] rounded-full pointer-events-none" />

          {/* Holographic Logo Hub */}
          <div className="relative mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#ff5165] via-[#be0034] to-[#01e599] p-0.5 flex items-center justify-center shadow-[0_0_50px_rgba(255,81,101,0.6)] animate-pulse-glow">
              <div className="w-full h-full bg-[#0d0e14] rounded-3xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[44px] sm:text-[50px] animate-spin-slow">
                  hub
                </span>
              </div>
            </div>
            {/* Spinning Radar Ring */}
            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#01e599]/40 animate-spin-slow pointer-events-none" />
            <div
              className="absolute -inset-8 rounded-full border border-dotted border-[#ff5165]/30 animate-spin-slow pointer-events-none"
              style={{ animationDirection: 'reverse', animationDuration: '35s' }}
            />
          </div>

          {/* Title & Cyber Terminal text */}
          <div className="flex flex-col items-center gap-1.5 mb-8 z-10 max-w-sm">
            <span className="font-headline font-black text-2xl sm:text-3xl tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-white">
              ISHDAMAN PORTAL
            </span>
            <span className="font-mono text-xs text-[#01e599] tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping" />
              <span>{loadingStatus}</span>
            </span>
          </div>

          {/* Animated Cyber Progress Bar */}
          <div className="w-full max-w-xs flex flex-col gap-2.5 z-10">
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/15 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff5165] via-amber-400 to-[#01e599] transition-all duration-300 shadow-[0_0_15px_rgba(1,229,153,0.9)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>SYSTEM INITIALIZING...</span>
              <span className="text-[#01e599] font-bold">{loadingProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          1. TOP NAVBAR (Guaranteed Responsive for Mobile & Desktop - Fixed at Viewport Top)
          ========================================================= */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-[#0d0e14]/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
            {/* Logo (Smooth Animated Glide to Top) */}
            <button
              type="button"
              onClick={handleScrollToTop}
              className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer text-left group"
              title="Bosh sahifaga qaytish"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#ff5165] to-[#be0034] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(255,81,101,0.4)] group-hover:shadow-[0_0_25px_rgba(255,81,101,0.7)] group-hover:scale-105 transition-all">
                <span className="material-symbols-outlined text-white text-[20px] sm:text-[22px]">hub</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline font-black text-white text-base sm:text-lg tracking-wider uppercase group-hover:text-primary-fixed transition-colors">
                    ISHDAMAN
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-primary-container/20 border border-primary-container/40 text-[#ff5165] font-mono text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">
                    PORTAL
                  </span>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] text-on-surface-variant hidden xs:inline">
                  Mini-Task & Trading
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links (Strictly Single Line, Animated Velvet Scroll) */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium text-on-surface-variant whitespace-nowrap shrink-0 flex-nowrap">
              {navSections.map((item) => {
                const isActive = activeNavSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => handleSectionClick(e, item.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-bold border border-white/20 shadow-[0_0_15px_rgba(255,81,101,0.25)]'
                        : 'text-on-surface-variant hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.isHot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    {item.isContest && <span className="w-2 h-2 rounded-full bg-[#01e599] animate-pulse" />}
                  </button>
                );
              })}
            </div>

            {/* Right Action: Online Ticker (PC/Desktop only) & Kirish Button */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Live Online Ticker (Visible on PC, hidden on mobile) */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container border border-white/[0.08] text-xs font-mono shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01e599] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#01e599]" />
                </span>
                <span className="text-[#01e599] font-bold">{onlineCount}</span>
                <span className="text-on-surface-variant">onlayn</span>
              </div>

              {/* Kirish Button */}
              <button
                type="button"
                onClick={handleOpenAuthModal}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-primary-container via-[#be0034] to-[#ff5165] text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(255,81,101,0.35)] hover:shadow-[0_0_30px_rgba(255,81,101,0.6)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[17px] sm:text-[18px]">login</span>
                <span className="hidden sm:inline">Kirish / Boshlash</span>
                <span className="sm:hidden">Kirish</span>
              </button>
            </div>
          </div>

          {/* Continuous Marquee Live Ticker */}
          <div className="w-full bg-[#0a0c12] border-t border-white/[0.05] overflow-hidden py-1.5">
            <div className="animate-marquee items-center text-xs font-mono tracking-wide text-on-surface-variant select-none">
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-amber-400">🔥</span> Sanjarbek T. —{' '}
                <strong className="text-[#01e599]">2,450,000 UZS</strong> yechib oldi (Humo)
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-[#ff5165]">⚡</span> Yangi vazifa: OKX KYC tasdiqlash (
                <strong className="text-[#01e599]">+50,000 UZS</strong>)
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-amber-400">🏆</span> Haftalik Konkurs yutuq jamg'armasi:{' '}
                <strong className="text-white">5,000,000 UZS</strong>!
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping inline-block" /> Hozir onlayn:{' '}
                <strong className="text-[#01e599]">{onlineCount} treyder</strong>
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-[#ff5165]">🎁</span> Omad G'ildiragida 100,000 UZS bonus yutildi!
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-[#01e599]">💎</span> Dalerjon M. —{' '}
                <strong className="text-[#01e599]">1,890,000 UZS</strong> bilan 2-o'rinda
              </span>
              <span className="text-white/20">•</span>
              {/* Repeat for continuous loop */}
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-amber-400">🔥</span> Sanjarbek T. —{' '}
                <strong className="text-[#01e599]">2,450,000 UZS</strong> yechib oldi (Humo)
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-[#ff5165]">⚡</span> Yangi vazifa: OKX KYC tasdiqlash (
                <strong className="text-[#01e599]">+50,000 UZS</strong>)
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="text-amber-400">🏆</span> Haftalik Konkurs yutuq jamg'armasi:{' '}
                <strong className="text-white">5,000,000 UZS</strong>!
              </span>
              <span className="text-white/20">•</span>
              <span className="mx-4 flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping inline-block" /> Hozir onlayn:{' '}
                <strong className="text-[#01e599]">{onlineCount} treyder</strong>
              </span>
            </div>
          </div>

          {/* Mobile Quick-Jump Section Navigation (Animated Scroll on Tap) */}
          <div className="lg:hidden w-full bg-[#090b10]/95 backdrop-blur-md border-t border-white/[0.06] px-2.5 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {navSections.map((item) => {
              const isActive = activeNavSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => handleSectionClick(e, item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-container/90 to-[#be0034]/90 text-white shadow-[0_0_12px_rgba(255,81,101,0.4)] border border-primary-container/40'
                      : 'bg-surface-container/60 text-on-surface-variant border border-white/[0.06] active:scale-95'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.isHot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {item.isContest && <span className="w-1.5 h-1.5 rounded-full bg-[#01e599]" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* =========================================================
            SCROLLABLE PAGE CONTENT (Reveals Silky Smooth after Splash)
            ========================================================= */}
        <main className={!isInitialLoading ? 'animate-page-reveal' : 'opacity-0'}>
          {/* =========================================================
              2. HERO SECTION (High-Impact Visuals for Mobile & Desktop)
              ========================================================= */}
        <section className="relative pt-28 pb-14 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28 overflow-hidden">
          {/* Animated Cyber Glowing Blobs */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-[#ff5165]/15 blur-[130px] rounded-full pointer-events-none animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-[#01e599]/15 blur-[130px] rounded-full pointer-events-none animate-pulse-glow" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 text-left order-1">
                {/* Animated Cyber Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container/80 border border-white/10 text-xs font-mono text-[#01e599] w-fit shadow-[0_0_15px_rgba(1,229,153,0.15)]">
                  <span className="material-symbols-outlined text-[16px] animate-spin-slow">autorenew</span>
                  <span>O‘zbekistondagi №1 Mini-Task & Trading Portali</span>
                </div>

                {/* Headline with Animated Gradient text */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-headline font-black tracking-tight leading-[1.12]">
                  Vazifa Bajar.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5165] via-amber-300 to-[#01e599] animate-gradient-flow">
                    Pul Top.
                  </span>{' '}
                  Yuting!
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base lg:text-lg text-on-surface-variant font-normal leading-relaxed max-w-2xl">
                  Ijtimoiy tarmoqlar, Telegram, YouTube va treyding vazifalarini bajaring. Har kuni bepul bonus
                  g‘ildiragini aylantiring va haftalik{' '}
                  <span className="text-white font-semibold">5,000,000 UZS</span> gacha yutuqli konkursda ishtirok eting!
                </p>

                {/* Hero Action CTAs */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenAuthModal}
                    className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-primary-container via-[#be0034] to-[#ff5165] text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(255,81,101,0.5)] hover:shadow-[0_0_45px_rgba(255,81,101,0.85)] active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer cyber-border-beam"
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">rocket_launch</span>
                    <span>Boshlash (1-klikda)</span>
                  </button>

                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-surface-container border border-white/10 hover:border-white/25 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#01e599] text-[18px] sm:text-[20px]">smart_toy</span>
                    <span>Telegram Botda Ochish</span>
                  </a>
                </div>

                {/* Mobile Trader Graphic: Placed directly in the hero flow so mobile users immediately see the visuals */}
                <div className="lg:hidden w-full pt-2">
                  <div className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden border border-white/[0.15] shadow-[0_0_50px_rgba(255,81,101,0.3)] group">
                    <img
                      src="/hero_trader.jpg"
                      alt="Ishdaman Cyber Trader"
                      className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e14] via-transparent to-transparent opacity-85" />

                    {/* Floating badge: Daily earnings */}
                    <div className="absolute top-3 left-3 p-2 rounded-2xl bg-[#0d0e14]/90 backdrop-blur-xl border border-[#01e599]/30 shadow-lg flex items-center gap-2 animate-float">
                      <div className="w-7 h-7 rounded-xl bg-[#01e599]/15 border border-[#01e599]/40 flex items-center justify-center text-[#01e599] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">attach_money</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-on-surface-variant uppercase tracking-wider block">
                          Kunlik daromad
                        </span>
                        <span className="text-[11px] font-headline font-bold text-[#01e599]">150,000+ UZS</span>
                      </div>
                    </div>

                    {/* Floating badge: Auto withdraw */}
                    <div className="absolute bottom-3 right-3 p-2 rounded-2xl bg-[#0d0e14]/90 backdrop-blur-xl border border-[#ff5165]/30 shadow-lg flex items-center gap-2 animate-float-reverse">
                      <div className="w-7 h-7 rounded-xl bg-[#ff5165]/15 border border-[#ff5165]/40 flex items-center justify-center text-[#ff5165] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-on-surface-variant uppercase tracking-wider block">
                          Avtomatik yechish
                        </span>
                        <span className="text-[11px] font-headline font-bold text-white">Humo & Uzcard</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4-Stat Ribbon with Real Accurate Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container/60 border border-white/[0.06] hover:border-white/20 transition-all cyber-shimmer-card">
                    <span className="text-xl sm:text-2xl font-headline font-bold text-white tracking-tight">
                      {totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : '313+'}
                    </span>
                    <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant mt-0.5">Faol Foydalanuvchilar</p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container/60 border border-white/[0.06] hover:border-[#01e599]/30 transition-all cyber-shimmer-card">
                    <span className="text-xl sm:text-2xl font-headline font-bold text-[#01e599] tracking-tight flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping" />
                      <span>{onlineCount}</span>
                    </span>
                    <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant mt-0.5">Hozir Onlayn</p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container/60 border border-white/[0.06] hover:border-[#ff5165]/30 transition-all cyber-shimmer-card">
                    <span className="text-xl sm:text-2xl font-headline font-bold text-[#ff5165] tracking-tight">
                      {tasks.length > 0 ? `${tasks.length}+` : '12+'}
                    </span>
                    <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant mt-0.5">Faol Vazifalar</p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container/60 border border-white/[0.06] hover:border-amber-400/30 transition-all cyber-shimmer-card">
                    <span className="text-xl sm:text-2xl font-headline font-bold text-amber-400 tracking-tight">24/7</span>
                    <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant mt-0.5">Avto Humo/Uzcard</p>
                  </div>
                </div>
              </div>

              {/* Right Visual Column (Desktop Presentation) */}
              <div className="hidden lg:flex lg:col-span-5 relative justify-center order-2">
                <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/[0.15] shadow-[0_0_60px_rgba(255,81,101,0.25)] group">
                  <img
                    src="/hero_trader.jpg"
                    alt="Cyber Trader"
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Cyber Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e14] via-transparent to-transparent opacity-85" />

                  {/* Floating Badge 1: Daily Earnings */}
                  <div className="absolute top-4 left-4 p-3 rounded-2xl bg-[#0d0e14]/90 backdrop-blur-xl border border-[#01e599]/30 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center gap-3 animate-float">
                    <div className="w-10 h-10 rounded-xl bg-[#01e599]/15 border border-[#01e599]/40 flex items-center justify-center text-[#01e599] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">attach_money</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                        Kunlik daromad
                      </span>
                      <span className="text-sm font-headline font-bold text-[#01e599]">150,000+ UZS</span>
                    </div>
                  </div>

                  {/* Floating Badge 2: Fast Withdraw */}
                  <div className="absolute bottom-4 right-4 p-3 rounded-2xl bg-[#0d0e14]/90 backdrop-blur-xl border border-[#ff5165]/30 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center gap-3 animate-float-reverse">
                    <div className="w-10 h-10 rounded-xl bg-[#ff5165]/15 border border-[#ff5165]/40 flex items-center justify-center text-[#ff5165] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">bolt</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                        Avtomatik yechish
                      </span>
                      <span className="text-sm font-headline font-bold text-white">Humo & Uzcard</span>
                    </div>
                  </div>

                  {/* Floating Badge 3: Live Radar */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[#0d0e14]/85 backdrop-blur-md border border-[#01e599]/30 text-[11px] font-mono text-[#01e599] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping" />
                    <span>{onlineCount} faol onlayn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. QUICK CATEGORY FILTER BAR
            ========================================================= */}
        <section className="py-4 bg-surface-container/30 border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                      active
                        ? 'bg-gradient-to-r from-primary-container to-[#be0034] text-white shadow-[0_4px_15px_rgba(255,81,101,0.35)]'
                        : 'bg-surface-container border border-white/[0.08] text-on-surface-variant hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            4. LIVE TASKS SHOWCASE
            ========================================================= */}
        <section id="vazifalar" className="py-14 lg:py-20 scroll-mt-28 transition-all duration-500 rounded-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Heading */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/15 border border-primary-container/30 text-[11px] font-mono text-[#ff5165] uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Haqiqiy Daromad</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight">
                  Mashhur Vazifalar
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                  Istagan vazifani tanlang, 1-klikda kiring va pulingizni hisobingizga qabul qiling.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAuthModal}
                className="text-xs font-mono font-bold text-[#ff5165] hover:text-white flex items-center gap-1 transition-colors cursor-pointer w-fit"
              >
                <span>Barcha vazifalarni ko'rish</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredTasks.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="group relative p-5 rounded-2xl bg-[#12141c]/90 border border-white/[0.08] hover:border-primary-container/50 transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(255,81,101,0.2)] flex flex-col justify-between cyber-shimmer-card"
                >
                  <div>
                    {/* Top card row: category & reward */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-container border border-white/[0.08] text-[10px] font-mono text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#01e599]" />
                        <span>{task.category || 'Vazifa'}</span>
                      </span>

                      <span className="px-3 py-1 rounded-lg bg-[#01e599]/15 border border-[#01e599]/30 text-[#01e599] font-headline font-bold text-xs tracking-tight shadow-[0_0_10px_rgba(1,229,153,0.2)]">
                        +{formatUZS(task.reward_amount || 0)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-headline font-bold text-white group-hover:text-primary-fixed transition-colors line-clamp-1 mb-1.5">
                      {task.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {task.description || 'Oddiy ko’rsatmalarni bajaring va mukofotni yutib oling.'}
                    </p>
                  </div>

                  {/* Bottom row: completions & CTA */}
                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px] text-[#01e599]">group</span>
                      <span>{task.completions_count || 320}+ bajarildi</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAuthModal}
                      className="px-4 py-2 rounded-xl bg-surface-container hover:bg-gradient-to-r hover:from-primary-container hover:to-[#be0034] text-white text-xs font-semibold tracking-wider uppercase transition-all duration-200 border border-white/10 hover:border-transparent flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>Bajarish</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            5. CASINO SPIN WHEEL SECTION (Exact Client-App Canvas Design)
            ========================================================= */}
        <section
          id="bonus"
          className="py-14 sm:py-20 bg-gradient-to-b from-[#090a0f] via-surface-container/20 to-[#090a0f] relative overflow-hidden scroll-mt-28 transition-all duration-500 rounded-3xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-[#131522] via-[#16121f] to-[#10121b] border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
              {/* Ambient amber flare */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/15 blur-[90px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#ff5165]/15 blur-[90px] rounded-full pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Information & Triggers */}
                <div className="lg:col-span-6 flex flex-col gap-4 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider w-fit">
                    <span className="material-symbols-outlined text-[16px] animate-spin-slow">casino</span>
                    <span>Kunlik Bepul Bonus</span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-headline font-black text-white tracking-tight">
                    Omad Ruletkasini Aylantiring!
                  </h3>

                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    Har 24 soatda tizimga kiring va g‘ildirakni 1 marta mutlaqo bepul aylantiring.
                    <strong className="text-white"> Kafolatlangan yutuqlarni</strong> to‘g‘ridan-to‘g‘ri balansingizga qabul
                    qilib oling!
                  </p>

                  {/* Prize pills preview */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {activeRewards.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-surface-container/80 border border-white/[0.08] text-[11px] font-mono font-semibold"
                        style={{ color: p.color || '#ff5165' }}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>

                  {/* Spin Action CTA */}
                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSpinWheel}
                      disabled={isSpinning}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-container via-[#ff5165] to-secondary-container text-white font-headline font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_25px_rgba(255,81,101,0.5)] hover:shadow-[0_4px_35px_rgba(255,81,101,0.8)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <span className={`material-symbols-outlined text-[20px] ${isSpinning ? 'animate-spin' : ''}`}>
                        casino
                      </span>
                      <span>{isSpinning ? 'Aylanmoqda...' : 'Ruletkani Aylantirish'}</span>
                    </button>

                    <span className="text-xs font-mono text-on-surface-variant">
                      ⚡ 100% kafolatlangan sovrinlar
                    </span>
                  </div>
                </div>

                {/* Right Column: Casino Canvas Wheel (Identical to SpinPage) */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
                  <div className="relative flex items-center justify-center my-2" style={{ width: 280, height: 280 }}>
                    {/* Glow behind wheel */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-container/30 to-secondary-container/30 blur-2xl pointer-events-none" />

                    {/* Rotating Wheel Disc with identical canvas */}
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
                        className="rounded-full shadow-[0_0_35px_rgba(0,0,0,0.6)] cursor-pointer"
                        onClick={handleSpinWheel}
                      />
                    </div>

                    {/* Stationary Top Pointer Needle (Identical to SpinPage) */}
                    <div className="absolute -top-1.5 z-30 pointer-events-none flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                      <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[22px] border-t-[#ff3b53]" />
                      <div className="w-2 h-2 rounded-full bg-[#ffd700] -mt-5 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. WEEKLY CONTEST (5,000,000 UZS) WITH LIVE COUNTDOWN
            ========================================================= */}
        <section id="konkurs" className="py-14 sm:py-20 scroll-mt-28 transition-all duration-500 rounded-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-[#1b111f] via-[#21111e] to-[#120f18] border border-primary-container/30 shadow-[0_0_50px_rgba(255,81,101,0.2)] relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#ff5165]/15 blur-[90px] rounded-full pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 border border-primary-container/40 text-[#ff5165] font-mono text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="material-symbols-outlined text-[16px] animate-bounce">military_tech</span>
                    <span>Haftalik Super Konkurs</span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-headline font-black text-white tracking-tight">
                    {contestData?.title || '5,000,000 UZS Yutuq Jamg‘armasi'}
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-xl">
                    Har haftaning yakshanba kuniga qadar eng ko‘p vazifa bajargan va eng ko‘p ball to‘plagan 10 nafar
                    treyder yirik pul mukofotlari bilan taqdirlanadi!
                  </p>
                </div>

                {/* Isolated Live Ticking Countdown Box (No page re-renders) */}
                <ContestCountdownBox />
              </div>

              {/* Podium Tiers for Top 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#141622]/90 border border-amber-500/40 text-center flex flex-col items-center gap-1 shadow-lg cyber-shimmer-card">
                  <span className="text-2xl">🥇</span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">1-O'rin</span>
                  <span className="text-lg sm:text-xl font-headline font-black text-white">2,500,000 UZS</span>
                  <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">Avto-to'lov kartaga</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141622]/90 border border-slate-300/30 text-center flex flex-col items-center gap-1 shadow-lg cyber-shimmer-card">
                  <span className="text-2xl">🥈</span>
                  <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">2-O'rin</span>
                  <span className="text-lg sm:text-xl font-headline font-black text-white">1,500,000 UZS</span>
                  <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">Avto-to'lov kartaga</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141622]/90 border border-amber-700/30 text-center flex flex-col items-center gap-1 shadow-lg cyber-shimmer-card">
                  <span className="text-2xl">🥉</span>
                  <span className="text-[11px] font-mono text-amber-600 font-bold uppercase tracking-wider">3-O'rin</span>
                  <span className="text-lg sm:text-xl font-headline font-black text-white">1,000,000 UZS</span>
                  <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">Avto-to'lov kartaga</span>
                </div>
              </div>

              <div className="pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleOpenAuthModal}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-[#be0034] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,81,101,0.35)] hover:shadow-[0_0_30px_rgba(255,81,101,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">trophy</span>
                  <span>Konkursda Qatnashish va Ball To'plash</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            7. JONLI TO'LOVLAR (LIVE RECENT PAYOUTS STREAM)
            ========================================================= */}
        <section id="tolovlar" className="py-14 sm:py-20 bg-surface-container/20 border-y border-white/[0.06] scroll-mt-28 transition-all duration-500 rounded-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#01e599]/15 border border-[#01e599]/30 text-[11px] font-mono text-[#01e599] uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Shaffof Tizim</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight">
                  So'nggi To'lovlar Oqimi
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                  Foydalanuvchilarimiz Humo va Uzcard orqali yechib olayotgan real pullar.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[#01e599]">
                <span className="w-2 h-2 rounded-full bg-[#01e599] animate-ping" />
                <span>Avto-yechish: 24/7 ishlamoqda</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentPayouts.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#12141c]/90 border border-white/[0.08] flex items-center justify-between gap-3 cyber-shimmer-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#01e599]/15 border border-[#01e599]/30 flex items-center justify-center text-[#01e599] shrink-0">
                      <span className="material-symbols-outlined text-[20px]">credit_card</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{item.name}</span>
                      <span className="text-[11px] font-mono text-on-surface-variant">
                        {item.method} • {item.time}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-headline font-bold text-[#01e599] block">
                      +{formatUZS(item.amount)}
                    </span>
                    <span className="text-[9px] font-mono text-on-surface-variant uppercase">Muvaffaqiyatli</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            8. TOP 10 REYTING (LEADERBOARD)
            ========================================================= */}
        <section id="reyting" className="py-14 sm:py-20 scroll-mt-28 transition-all duration-500 rounded-3xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/15 border border-secondary-container/30 text-[11px] font-mono text-[#01e599] uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[14px]">leaderboard</span>
                <span>Hafta Yetakchilari</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight">
                Top 10 Ishtirokchilar
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Eng faol va eng ko'p daromad topgan treyderlar reytingi.
              </p>
            </div>

            {/* Leaderboard Table / Cards */}
            <div className="bg-[#12141c]/90 rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
              <div className="divide-y divide-white/[0.06]">
                {topTraders.map((trader) => (
                  <div
                    key={trader.rank}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                      trader.rank === 1
                        ? 'bg-amber-500/[0.08]'
                        : trader.rank === 2
                        ? 'bg-slate-300/[0.05]'
                        : trader.rank === 3
                        ? 'bg-amber-700/[0.05]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-headline font-bold text-sm shrink-0 ${
                          trader.rank === 1
                            ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                            : trader.rank === 2
                            ? 'bg-slate-300 text-black'
                            : trader.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {trader.rank <= 3 ? (
                          <span className="material-symbols-outlined text-[18px]">
                            {trader.rank === 1 ? 'military_tech' : 'workspace_premium'}
                          </span>
                        ) : (
                          `#${trader.rank}`
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">{trader.name}</span>
                        <span className="text-[11px] font-mono text-on-surface-variant truncate">
                          @{trader.username} • {trader.completed} ta vazifa
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-base font-headline font-bold text-[#01e599] tracking-tight">
                        +{formatUZS(trader.earnings)}
                      </span>
                      <span className="text-[10px] font-mono text-on-surface-variant block">daromad</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-8">
              <button
                type="button"
                onClick={handleOpenAuthModal}
                className="px-6 py-3 rounded-xl bg-surface-container border border-white/10 hover:border-white/20 text-white font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                <span>Reytingda o'z o'rningizni ko'rish</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            9. MOBILE APP SHOWCASE
            ========================================================= */}
        <section
          id="mobil-app"
          className="py-14 sm:py-20 bg-gradient-to-b from-[#090a0f] via-surface-container/20 to-[#090a0f] scroll-mt-28 transition-all duration-500 rounded-3xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Image Mockup */}
              <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
                <div className="relative w-full max-w-xs sm:max-w-sm rounded-3xl overflow-hidden border border-white/[0.12] shadow-[0_0_50px_rgba(1,229,153,0.18)] group">
                  <img
                    src="/mobile_app_mockup.jpg"
                    alt="Telegram WebApp"
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Right Column: Information & Bot Launch */}
              <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6 order-1 lg:order-2 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 border border-primary-container/40 text-xs font-mono text-[#ff5165] w-fit">
                  <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                  <span>Telegram WebApp</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-headline font-extrabold text-white tracking-tight">
                  Endi to'g'ridan-to'g'ri Telegram ichida!
                </h2>

                <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                  Hech qanday og‘ir APK fayllar yoki ilovalar do‘konidan yuklab olish talab qilinmaydi.
                  Telegram ichidagi rasmiy botimiz orqali 1 soniyada platformaga kiring va qulay sensorli
                  interfeysdan bahramand bo‘ling.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-[#12141c] border border-white/[0.08] flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#01e599] text-[22px] mt-0.5">bolt</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Bir zumda yuklanadi</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Internet trafigini tejaydi va tez ishlaydi.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12141c] border border-white/[0.08] flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#ff5165] text-[22px] mt-0.5">
                      notifications_active
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Jonli bildirishnomalar</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Yangi vazifalar va to‘lovlar haqida bot xabar beradi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-primary-container to-[#be0034] text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(255,81,101,0.4)] hover:shadow-[0_0_35px_rgba(255,81,101,0.6)] active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">smart_toy</span>
                    <span>Telegram Botni Ishga Tushirish</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            10. HAMKORLAR / PARTNERS
            ========================================================= */}
        <section id="hamkorlar" className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-on-surface-variant block mb-6">
              Rasmiy Hamkorlar va Birjalar
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {partners.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-container/60 border border-white/[0.06] hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 group cyber-shimmer-card"
                >
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-white transition-colors text-[28px]">
                    {p.icon}
                  </span>
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className="text-[10px] font-mono text-secondary">{p.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            11. QANDAY ISHLAYDI? (3 OSON QADAM)
            ========================================================= */}
        <section id="qoidalar" className="py-14 sm:py-20 bg-surface-container/20 border-t border-white/[0.06] scroll-mt-28 transition-all duration-500 rounded-3xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight">
                Qanday boshlash mumkin?
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
                Hech qanday murakkab shartlar yo'q. Atigi 3 ta oddiy qadam kifoya.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="p-6 rounded-2xl bg-[#12141c] border border-white/[0.08] text-left relative cyber-shimmer-card">
                <span className="text-4xl font-headline font-black text-primary-container/30 absolute top-4 right-5">
                  01
                </span>
                <div className="w-12 h-12 rounded-xl bg-primary-container/15 text-[#ff5165] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[24px]">key</span>
                </div>
                <h3 className="text-base sm:text-lg font-headline font-bold text-white mb-1">Telegram bilan kiring</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Parol yoki uzun anketalar kerak emas. 1-klikda Telegram login orqali xavfsiz tizimga ulaning.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#12141c] border border-white/[0.08] text-left relative cyber-shimmer-card">
                <span className="text-4xl font-headline font-black text-[#01e599]/30 absolute top-4 right-5">
                  02
                </span>
                <div className="w-12 h-12 rounded-xl bg-[#01e599]/15 text-[#01e599] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[24px]">task</span>
                </div>
                <h3 className="text-base sm:text-lg font-headline font-bold text-white mb-1">Vazifalarni bajaring</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Obuna bo‘ling, videolarni ko‘ring, do‘stlarni taklif eting va har bir harakat uchun kafolatlangan pul
                  oling.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#12141c] border border-white/[0.08] text-left relative cyber-shimmer-card">
                <span className="text-4xl font-headline font-black text-amber-500/30 absolute top-4 right-5">
                  03
                </span>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[24px]">payments</span>
                </div>
                <h3 className="text-base sm:text-lg font-headline font-bold text-white mb-1">Pulingizni yeching</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Ishlangan barcha mablag‘larni Humo yoki Uzcard kartangizga 24/7 avtomatik ravishda yechib oling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            12. FOOTER
            ========================================================= */}
        <footer className="py-12 bg-[#07080b] border-t border-white/[0.08] text-on-surface-variant text-xs pb-24 sm:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5165] to-[#be0034] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">hub</span>
              </div>
              <span className="font-headline font-bold text-white tracking-wider uppercase">
                ISHDAMAN PORTAL
              </span>
            </div>

            <div className="flex items-center gap-6 font-medium">
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Telegram Bot
              </a>
              <a
                href="https://t.me/IshdamanUz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Rasmiy Kanal
              </a>
              <button
                type="button"
                onClick={handleOpenAuthModal}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Kirish
              </button>
            </div>

            <p className="font-mono text-[11px] text-on-surface-variant/70">
              © 2026 ISHDAMAN. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </footer>
        </main>

        {/* =========================================================
            13. MOBILE BOTTOM FLOATING CTA (Pinned at Viewport Bottom, z-[90])
            ========================================================= */}
        <div className="fixed bottom-4 inset-x-4 z-[90] sm:hidden flex justify-center pointer-events-none">
          <div className="w-full max-w-sm p-2.5 rounded-2xl bg-[#0d0e14]/95 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 pl-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01e599] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#01e599]" />
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {onlineCount} <span className="text-on-surface-variant font-normal">onlayn</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenAuthModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-[#be0034] text-white font-headline font-bold text-xs uppercase tracking-wider shadow-neon-red active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span>Boshlash</span>
            </button>
          </div>
        </div>

        {/* Floating Velvet Animated Back-To-Top Button */}
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Tepaga qaytish"
          title="Tepaga qaytish"
          className={`fixed bottom-20 sm:bottom-8 right-4 sm:right-7 z-[95] w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0d0e14]/90 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.85)] hover:shadow-[0_0_25px_rgba(255,81,101,0.6)] hover:border-[#ff5165]/50 active:scale-95 transition-all duration-300 group cursor-pointer ${
            showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px] text-white group-hover:text-[#ff5165] group-hover:-translate-y-0.5 transition-all duration-200">
            arrow_upward
          </span>
        </button>

      {/* =========================================================
          14. SPIN WHEEL CELEBRATION MODAL
          ========================================================= */}
      {isWinModalOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#12141f] border border-amber-500/40 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-[0_0_60px_rgba(245,158,11,0.3)] animate-modal-pop">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              🎉
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-amber-400 uppercase tracking-widest font-bold">
                Tabriklaymiz!
              </span>
              <h3 className="font-headline font-black text-2xl text-white">
                Siz {wonReward?.label || 'Sovg‘a'} Yutdingiz!
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Mukofotni balansingizga qabul qilib olish va vazifalarni boshlash uchun Telegram orqali kiring.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsWinModalOpen(false);
                handleOpenAuthModal();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container via-[#ff5165] to-secondary-container text-white font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(255,81,101,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              Mukofotni Balansga Olish (Kirish)
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          15. AUTH MODAL (Telegram Widget + Dev Mock)
          ========================================================= */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        onAuth={onAuth}
      />
    </div>
  );
}
