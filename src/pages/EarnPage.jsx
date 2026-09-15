import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';
import LiveOnlineTicker from '../components/LiveOnlineTicker';

export default function EarnPage({ onNavigateSpin }) {
  const { user, refreshProfile, showToast, onlineCount, totalUsers } = useAuth();
  const { haptic, openLink } = useTelegram();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  // Modal states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [proofText, setProofText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'all', label: 'Barchasi' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'broker', label: 'Broker & Prop' },
    { id: 'deposit', label: 'Depozit' },
  ];

  const fetchTasks = async (cat = activeCategory) => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/?category=${cat}`);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(activeCategory);
  }, [activeCategory]);

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      haptic.notification('success');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleOpenTask = (task) => {
    haptic.impact('light');
    setSelectedTask(task);
    setProofText('');
    setScreenshotUrl('');
    setIsTimerRunning(false);
    setTimerSeconds(task.timer_seconds || 15);
  };

  const handleStartTimerTask = () => {
    if (selectedTask?.url) {
      openLink(selectedTask.url);
    }
    setIsTimerRunning(true);
    haptic.impact('medium');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/tasks/upload-screenshot/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setScreenshotUrl(res.data.url);
      showToast('Skrinshot yuklandi!', 'success');
      haptic.impact('light');
    } catch (err) {
      showToast('Rasmni yuklashda xatolik yuz berdi', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      const payload = {
        proof_data: proofText,
        screenshot_url: screenshotUrl,
      };
      const res = await api.post(`/tasks/${selectedTask.id}/submit/`, payload);
      haptic.notification('success');
      showToast(res.data.message, 'success');
      setSelectedTask(null);
      fetchTasks(activeCategory);
      refreshProfile();
    } catch (err) {
      const errDetail = err.response?.data?.error || 'Xatolik yuz berdi';
      showToast(errDetail, 'error');
      haptic.notification('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe">
      {/* Hero Banner Zone */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 md:p-8 flex flex-col gap-4 border border-white/5 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
          <span className="font-mono text-[11px] text-secondary tracking-widest uppercase font-semibold">
            TIZIM ONLAYN // PROP REWARDS v2.4
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-xl">
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-white tracking-tight uppercase leading-snug">
              Vazifalarni bajaring, <span className="text-primary-container neon-glow-red">mukofot oling</span>
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              Real treyding va prop-imkoniyatlar olamiga qo'shiling. Vazifalarni bajaring, daromadingizni oshiring!
            </p>
          </div>

          {/* Key Metrics Strip with Accurate Real-Time Stats */}
          <div className="grid grid-cols-3 gap-3 bg-surface-container-lowest/70 rounded-xl p-3 md:p-4 border border-white/5 shadow-inner shrink-0">
            <div className="flex flex-col items-center text-center px-2">
              <span className="font-headline text-sm md:text-base text-white font-bold tracking-tight">
                {totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : '310+'}
              </span>
              <span className="text-[10px] text-on-surface-variant tracking-tight">Faol a'zo</span>
            </div>
            <div className="flex flex-col items-center text-center border-x border-white/10 px-2">
              <LiveOnlineTicker baseCount={onlineCount} size="md" />
              <span className="text-[10px] text-secondary/90 font-mono tracking-tight">Jonli Onlayn</span>
            </div>
            <div className="flex flex-col items-center text-center px-2">
              <span className="font-headline text-sm md:text-base text-tertiary font-bold tracking-tight">24/7</span>
              <span className="text-[10px] text-on-surface-variant tracking-tight">Faol Vazifalar</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Left side Tasks (8 cols on lg), Right side Widgets (4 cols on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Content: Categories & Tasks */}
        <div className="lg:col-span-8 flex flex-col gap-6 order-2 lg:order-1">
          {/* Filter Pills Carousel */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">Kategoriyalar</span>
              <span className="font-mono text-[11px] text-primary-fixed-dim">{tasks.length} ta vazifa</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setActiveCategory(cat.id);
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary-container text-white shadow-neon-red font-semibold'
                        : 'bg-surface-container text-on-surface-variant hover:text-white border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tasks List: 1 col on mobile, 2 cols on tablet/desktop */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-sm bg-primary-container shadow-[0_0_6px_#ff5165]"></span>
              <h2 className="font-headline font-bold text-white text-base tracking-tight">Ommabop vazifalar</h2>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                <span className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs">Vazifalar yuklanmoqda...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant text-xs">
                Hozircha ushbu toifada yangi vazifalar mavjud emas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tasks.map((task) => {
                  const isApproved = task.user_status === 'approved';
                  const isPending = task.user_status === 'pending';

                  return (
                    <div
                      key={task.id}
                      className="glass-card card-interactive rounded-xl p-4 flex flex-col justify-between gap-3 border border-white/5 hover:border-primary-container/40 transition-all shadow-md"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container border border-white/10 shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-[24px]">
                            {task.icon_name || 'task_alt'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline font-semibold text-white text-sm truncate leading-tight">
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5 leading-relaxed">
                            {task.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-secondary">
                            +{formatUZS(task.reward_amount)} UZS
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase">
                            {task.category}
                          </span>
                        </div>

                        <div>
                          {isApproved ? (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary-container/20 text-secondary-container border border-secondary-container/30 text-xs font-semibold">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              <span>Bajarildi</span>
                            </div>
                          ) : isPending ? (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                              <span>Kutilmoqda</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenTask(task)}
                              className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-[#be0034] text-white font-semibold text-xs shadow-neon-red active:scale-95 transition-all cursor-pointer"
                            >
                              Bajarish
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar on Desktop (or Highlight Banner on Mobile) */}
        <div className="lg:col-span-4 flex flex-col gap-4 order-1 lg:order-2">
          {/* Daily Bonus Card */}
          <section
            onClick={() => {
              haptic.impact('medium');
              if (onNavigateSpin) onNavigateSpin();
            }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container p-4 md:p-5 border border-primary-container/25 shadow-xl flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-container shadow-[0_0_15px_rgba(255,81,101,0.35)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">casino</span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-secondary-container text-on-secondary font-bold text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(1,229,153,0.3)]">
                <span>Aylantirish</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>

            <div className="flex flex-col">
              <span className="font-headline font-bold text-white text-base leading-tight">
                Bugungi Kunlik Bonus
              </span>
              <span className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Har 24 soatda bepul omad ruletkasi! 500,000 UZS gacha yutib olish imkoniyati.
              </span>
            </div>
          </section>

          {/* Desktop-only: Trading Tip & Security Assurance */}
          <div className="hidden lg:flex flex-col gap-4 p-5 rounded-2xl bg-surface-container/50 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-mono text-secondary uppercase font-semibold">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Xavfsiz va Kafolatlangan</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Barcha topshiriqlar avtomatik tekshiruvdan o'tkaziladi. Balansingizdagi mablag'ni Humo va Uzcard kartalariga bir zumda yechib olishingiz mumkin.
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Minimal yechish:</span>
              <span className="text-white font-bold">10,000 UZS</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ============================================================
        VAZIFANI BAJARISH MODAL (Root Level - Responsive Bottom Sheet)
        ============================================================ */}
    {selectedTask && (
      <div
        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 pt-14 sm:pt-4 animate-fade-in"
        onClick={() => setSelectedTask(null)}
      >
        <div
          className="w-full max-w-lg bg-surface-container rounded-t-3xl sm:rounded-2xl border border-white/10 flex flex-col shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobil uchun pastga surish indikatori */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20"></div>
          </div>

          {/* Modal Header — Doim ko'rinadi (shrink-0) */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">
                {selectedTask.icon_name || 'task'}
              </span>
              <span className="font-headline font-bold text-white text-base">
                Vazifani Bajarish
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTask(null)}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 flex flex-col gap-4">
            {/* Task Info */}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-headline font-semibold text-white text-base">
                {selectedTask.title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {selectedTask.description}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-secondary-container/15 text-secondary-container border border-secondary-container/30 text-xs font-bold font-mono">
                  Mukofot: +{formatUZS(selectedTask.reward_amount)} UZS
                </span>
              </div>
            </div>

            {/* Verification specific flow */}
            {selectedTask.verification_type === 'auto_api' && (
              <div className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-xl border border-white/5">
                <p className="text-xs text-white">
                  1. Quyidagi havola orqali kanalga obuna bo'ling.<br/>
                  2. Qaytib kelib <b>"A'zolikni tekshirish"</b> tugmasini bosing.
                </p>
                {selectedTask.url && (
                  <button
                    type="button"
                    onClick={() => {
                      haptic.impact('medium');
                      openLink(selectedTask.url);
                    }}
                    className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Kanalga o'tish</span>
                  </button>
                )}
              </div>
            )}

            {selectedTask.verification_type === 'timer' && (
              <div className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-xl border border-white/5 text-center">
                <p className="text-xs text-on-surface-variant">
                  Havolaga o'ting va taymer tugaguncha sahifada bo'ling.
                </p>
                <div className="text-3xl font-mono font-bold text-tertiary my-1">
                  {timerSeconds > 0 ? `${timerSeconds}s` : 'Tayyor!'}
                </div>
                {!isTimerRunning && timerSeconds > 0 && (
                  <button
                    type="button"
                    onClick={handleStartTimerTask}
                    className="py-2.5 rounded-xl bg-tertiary text-on-tertiary font-bold text-xs flex items-center justify-center gap-1.5 shadow-neon-blue"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Havolaga o'tish va Taymerni boshlash</span>
                  </button>
                )}
              </div>
            )}

            {selectedTask.verification_type === 'manual_id' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-on-surface-variant">Broker yoki Foydalanuvchi ID:</label>
                <input
                  type="text"
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Masalan: 10492842"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-white text-sm focus:outline-none focus:border-primary-container"
                />
                {selectedTask.url && (
                  <button
                    type="button"
                    onClick={() => openLink(selectedTask.url)}
                    className="text-xs text-primary underline text-left mt-1"
                  >
                    Ro'yxatdan o'tish sahifasiga o'tish
                  </button>
                )}
              </div>
            )}

            {selectedTask.verification_type === 'manual_screenshot' && (
              <div className="flex flex-col gap-3">
                <label className="text-xs text-on-surface-variant">Tasdiqlovchi skrinshot yuklang:</label>
                {screenshotUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-secondary-container/40">
                    <img src={screenshotUrl} alt="Proof preview" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshotUrl('')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs"
                    >
                      O'chirish
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-primary-container/40">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-1">
                      cloud_upload
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {uploadingImage ? 'Yuklanmoqda...' : 'Rasm tanlash uchun bosing'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer Submit Action */}
          <div className="flex-shrink-0 p-4 border-t border-white/5 bg-surface-container/95 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-4">
            <button
              type="button"
              disabled={
                submitting ||
                (selectedTask.verification_type === 'timer' && timerSeconds > 0) ||
                (selectedTask.verification_type === 'manual_screenshot' && !screenshotUrl) ||
                (selectedTask.verification_type === 'manual_id' && !proofText.trim())
              }
              onClick={handleSubmitTask}
              className="w-full py-3.5 rounded-xl bg-primary-container text-white font-bold text-sm shadow-neon-red disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>
                  {selectedTask.verification_type === 'auto_api'
                    ? "A'zolikni tekshirish"
                    : 'Tasdiqqa yuborish'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
