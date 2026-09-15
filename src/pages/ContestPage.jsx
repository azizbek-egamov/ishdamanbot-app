import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';

// Countdown helper for end date
const calculateTimeLeft = (endDate) => {
  if (!endDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isEnded: false };
};

export default function ContestPage({ onRefreshContestState }) {
  const { user, showToast } = useAuth();
  const { haptic, openTelegramLink } = useTelegram();

  const [contest, setContest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [myTicket, setMyTicket] = useState(null);
  const [winners, setWinners] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  // Pagination for all participants
  const [participants, setParticipants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const fetchContest = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contests/active/');
      setIsActive(res.data.is_active && !!res.data.contest);
      setContest(res.data.contest);
      setHasJoined(res.data.has_joined);
      setMyTicket(res.data.my_ticket);
      setTotalParticipants(res.data.total_participants || 0);
      setWinners(res.data.winners || res.data.contest?.winners || []);

      if (res.data.contest) {
        fetchParticipants(1);
      }
    } catch (e) {
      console.error(e);
      setIsActive(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (targetPage = 1) => {
    try {
      setLoadingParticipants(true);
      const res = await api.get(`/contests/participants/?page=${targetPage}&page_size=15`);
      if (res.data && res.data.results) {
        setParticipants(res.data.results);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.count || 0);
        setPage(res.data.current_page || targetPage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      const res = await api.post('/contests/join/');
      setHasJoined(true);
      setMyTicket(res.data.ticket_number);
      haptic.notification('success');
      showToast(res.data.message || "Siz konkurs ishtirokchisiga aylandingiz!", "success");
      fetchContest();
    } catch (err) {
      const msg = err.response?.data?.error || "Xatolik yuz berdi";
      showToast(msg, "error");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, []);

  useEffect(() => {
    if (!contest?.end_date) return;
    setTimeLeft(calculateTimeLeft(contest.end_date));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(contest.end_date));
    }, 1000);
    return () => clearInterval(interval);
  }, [contest?.end_date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 pt-20">
        <span className="w-10 h-10 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></span>
        <span className="font-mono text-xs text-on-surface-variant">Konkurs ma'lumotlari yuklanmoqda...</span>
      </div>
    );
  }

  // If no contest exists at all in the database
  if (!contest) {
    return (
      <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe max-w-md md:max-w-2xl mx-auto">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest p-6 md:p-10 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-4 animate-fade-in">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest border border-white/10 flex items-center justify-center text-primary shadow-neon-red">
            <span className="material-symbols-outlined text-3xl">casino</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-on-surface-variant tracking-widest uppercase font-semibold">
              KIBER-KONKURS // TANAFFUS
            </span>
            <h1 className="font-headline text-xl font-bold text-white uppercase">
              Konkurslar Hozircha <span className="text-primary-container">Nofaol</span>
            </h1>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Navbatdagi katta sovrinli konkurs tayyorgarlik bosqichida. Yangi konkurs e'lon qilinishi bilan jonli efirda tasodifiy g'oliblar aniqlanadi!
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.impact('light');
              fetchContest();
            }}
            className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/10 text-white font-headline text-xs uppercase tracking-wider font-bold transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Yangilashni tekshirish</span>
          </button>
        </section>
      </div>
    );
  }

  const isContestActive = isActive && contest.status === 'ACTIVE';
  const hasAnnouncedWinners = winners && winners.length > 0;

  return (
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe max-w-md md:max-w-4xl mx-auto animate-fade-in">
      {/* Contest Title & Prize Pool Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest p-5 border border-amber-500/20 shadow-2xl flex flex-col gap-3 text-center">
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-400/15 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-center gap-2">
          {isContestActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              <span className="font-mono text-[11px] text-secondary tracking-widest uppercase font-semibold">
                SOVRINLI KONKURS // JONLI RANDOMIZER
              </span>
            </>
          ) : contest.status === 'COMPLETED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-mono text-[11px] text-emerald-400 tracking-widest uppercase font-semibold">
                YAKUNLANGAN KONKURS // NATIJALAR
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="font-mono text-[11px] text-amber-400 tracking-widest uppercase font-semibold">
                KONKURS TO'XTATILGAN // NAVBATDAGI EFIR KUTILMOQDA
              </span>
            </>
          )}
        </div>

        <h1 className="font-headline text-2xl font-bold text-white uppercase tracking-tight">
          {contest.title}
        </h1>

        <div className="py-2 px-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex flex-col items-center">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
            Jami Sovrin Jamg'armasi:
          </span>
          <span className="font-headline text-2xl font-bold text-amber-300 neon-glow-green">
            {formatUZS(contest.prize_pool)} UZS
          </span>
        </div>

        {contest.description && (
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            {contest.description}
          </p>
        )}

        {/* Real-time Cyber Countdown Timer or Closed Banner */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest/90 border border-white/10 flex flex-col items-center gap-2.5 shadow-inner mt-1">
          {contest.status === 'COMPLETED' ? (
            <div className="flex flex-col items-center gap-1.5 py-1 text-center">
              <div className="flex items-center gap-1.5 text-xs font-headline uppercase tracking-wider text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-base text-emerald-400">task_alt</span>
                <span>Konkurs Muvaffaqiyatli Yakunlandi</span>
              </div>
              <p className="text-[11px] text-on-surface-variant max-w-xs leading-relaxed">
                G'oliblar jonli Randomizer barabani orqali aniqlandi va sovrin pullari g'oliblarning hisobiga o'tkazildi.
              </p>
            </div>
          ) : !isContestActive ? (
            <div className="flex flex-col items-center gap-1.5 py-1 text-center">
              <div className="flex items-center gap-1.5 text-xs font-headline uppercase tracking-wider text-amber-400 font-bold">
                <span className="material-symbols-outlined text-base text-amber-400">pause_circle</span>
                <span>Ishtirok Etish To'xtatilgan</span>
              </div>
              <p className="text-[11px] text-on-surface-variant max-w-xs leading-relaxed">
                Ushbu konkurs to'xtatilgan. Yangi o'yin boshlanishi bilan bu yerda e'lon beriladi!
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                <span className="material-symbols-outlined text-[16px] text-amber-400 animate-pulse">timer</span>
                <span>Jonli Randomizer O'tkazilishiga Qoldi:</span>
              </div>

              {timeLeft.isEnded ? (
                <div className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs">
                  Konkurs vaqti tugadi! G'oliblar jonli efirda aniqlanmoqda.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs font-mono">
                  <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-surface-container border border-white/5 shadow-sm">
                    <span className="text-xl font-bold text-white tracking-tight">{timeLeft.days}</span>
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Kun</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-surface-container border border-white/5 shadow-sm">
                    <span className="text-xl font-bold text-white tracking-tight">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Soat</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-surface-container border border-white/5 shadow-sm">
                    <span className="text-xl font-bold text-secondary tracking-tight neon-glow-green">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Daqiqa</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-surface-container border border-white/5 shadow-sm">
                    <span className="text-xl font-bold text-amber-400 tracking-tight">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Soniya</span>
                  </div>
                </div>
              )}

              {contest.end_date && (
                <span className="text-[10px] text-on-surface-variant font-mono">
                  Tugash sanasi: {new Date(contest.end_date).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </>
          )}
        </div>
      </section>

      {/* Sovrinlar Vitrinasi (Prizes Showcase) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-400 text-sm">emoji_events</span>
            Konkurs Sovrinlari
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            G'oliblar Randomizer orqali
          </span>
        </div>

        {contest.prizes_config && Array.isArray(contest.prizes_config) && contest.prizes_config.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {contest.prizes_config.map((pz, pIdx) => {
              const rankMedals = ['🥇', '🥈', '🥉', '🎖️', '🎁'];
              const medal = rankMedals[pIdx] || '🏆';

              const cardStyles = [
                'from-amber-500/20 via-surface-container to-surface-container-low border-amber-400/40 shadow-amber-500/5',
                'from-slate-400/15 via-surface-container to-surface-container-low border-slate-400/30',
                'from-amber-800/20 via-surface-container to-surface-container-low border-amber-700/30',
                'from-teal-500/15 via-surface-container to-surface-container-low border-teal-500/30',
                'from-purple-500/15 via-surface-container to-surface-container-low border-purple-500/30',
              ];
              const style = cardStyles[pIdx % cardStyles.length];

              const badgeBgs = [
                'bg-amber-400 text-black',
                'bg-slate-300 text-black',
                'bg-amber-700 text-white',
                'bg-teal-400 text-black',
                'bg-purple-400 text-black',
              ];
              const badgeBg = badgeBgs[pIdx % badgeBgs.length];

              return (
                <div
                  key={pIdx}
                  className={`p-3.5 rounded-2xl bg-gradient-to-b ${style} border flex flex-col items-center text-center gap-1.5 shadow-md relative overflow-hidden`}
                >
                  <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center font-bold text-sm shadow-md`}>
                    {medal}
                  </div>

                  <span className="font-headline font-bold text-[11px] text-white uppercase tracking-tight">
                    {pz.title || `${pz.rank || pIdx + 1}-O'rin`}
                  </span>

                  {pz.is_cash !== false ? (
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-bold text-amber-300 text-sm neon-glow-green">
                        {formatUZS(pz.cash_amount || pz.estimated_value || 0)} UZS
                      </span>
                      <span className="text-[9px] font-mono text-on-surface-variant">Naqd pul mukofoti</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-headline font-bold text-amber-300 text-sm text-center line-clamp-2">
                        {pz.item_name || "Moddiy Sovg'a"}
                      </span>
                      {Number(pz.estimated_value) > 0 && (
                        <span className="text-[9px] font-mono text-on-surface-variant">
                          Qiymati: ~{formatUZS(pz.estimated_value)} UZS
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {/* 1st Place */}
            <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-500/20 via-surface-container to-surface-container-low border border-amber-400/40 flex flex-col items-center text-center gap-1 shadow-lg shadow-amber-500/5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold text-sm shadow-md">
                🥇
              </div>
              <span className="font-headline font-bold text-[11px] text-amber-300 uppercase tracking-tight mt-1">
                1-O'rin
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {formatUZS(contest.first_prize)}
              </span>
              <span className="text-[9px] font-mono text-amber-400/80">UZS</span>
            </div>

            {/* 2nd Place */}
            <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-400/15 via-surface-container to-surface-container-low border border-slate-400/30 flex flex-col items-center text-center gap-1 shadow-md">
              <div className="w-9 h-9 rounded-xl bg-slate-300 text-black flex items-center justify-center font-bold text-sm shadow-md">
                🥈
              </div>
              <span className="font-headline font-bold text-[11px] text-slate-200 uppercase tracking-tight mt-1">
                2-O'rin
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {formatUZS(contest.second_prize)}
              </span>
              <span className="text-[9px] font-mono text-slate-400">UZS</span>
            </div>

            {/* 3rd Place */}
            <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-800/20 via-surface-container to-surface-container-low border border-amber-700/30 flex flex-col items-center text-center gap-1 shadow-md">
              <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
                🥉
              </div>
              <span className="font-headline font-bold text-[11px] text-amber-500 uppercase tracking-tight mt-1">
                3-O'rin
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {formatUZS(contest.third_prize)}
              </span>
              <span className="text-[9px] font-mono text-amber-600">UZS</span>
            </div>

            {/* 4th Place if configured */}
            {Number(contest.fourth_prize) > 0 && (
              <div className="col-span-3 p-3 rounded-xl bg-surface-container border border-teal-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold">
                    🎖️
                  </span>
                  <span className="text-xs font-headline font-semibold text-white">4-O'rin Sovrini:</span>
                </div>
                <span className="font-mono font-bold text-teal-400 text-xs">
                  {formatUZS(contest.fourth_prize)} UZS
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* G'oliblar Doskasi (Agar Admin Randomizer orqali g'oliblarni e'lon qilgan bo'lsa) */}
      {hasAnnouncedWinners && (
        <section className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-surface-container to-surface-container-low border border-amber-400/40 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg animate-bounce">
                celebration
              </span>
              <span className="font-headline font-bold text-xs uppercase text-amber-400 tracking-wider">
                G'oliblar E'lon Qilindi!
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
              Yakunlangan
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {winners.map((w) => {
              const isGift = w.is_cash === false || (w.prize_title && Number(w.prize_amount) === 0);
              return (
                <div
                  key={w.id || w.prize_rank}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-black font-bold text-xs flex items-center justify-center shrink-0">
                      {w.prize_rank}
                    </span>
                    <img
                      src={w.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                      alt={w.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-amber-400/40 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline font-bold text-white text-xs truncate">
                        {w.full_name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {w.ticket_number ? `${w.ticket_number} • ` : ''}@{w.username || 'user'}
                      </span>
                    </div>
                  </div>

                  {isGift ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs shrink-0 max-w-[150px] truncate" title={w.prize_title}>
                      🎁 {w.prize_title || "Sovg'a"}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-xs text-secondary shrink-0">
                      +{formatUZS(w.prize_amount)} UZS
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Ishtirokchilik Holati & Tugmalar */}
      <section className="flex flex-col gap-3">
        {hasJoined ? (
          /* Already Joined: Certified Ticket Card */
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-surface-container to-teal-500/15 border border-emerald-400/40 flex flex-col gap-2.5 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
                <span className="font-headline font-bold text-xs uppercase text-emerald-400 tracking-wider">
                  Siz Konkurs Ishtirokchisisiz!
                </span>
              </div>
              {myTicket && (
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 font-mono font-bold text-xs shadow-sm">
                  Chipta: {myTicket}
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Barcha shartlar qabul qilindi. Konkurs muddati tugagach, g'oliblar jonli efirda <b>adolatli Randomizer barabani</b> orqali tasodifiy tanlanadi!
            </p>
          </div>
        ) : (
          /* Not Joined: Rules + Channel link + Join Action */
          <div className="flex flex-col gap-3">
            {/* Contest Rules Section if provided */}
            {contest.rules && (
              <div className="p-4 rounded-2xl bg-surface-container-lowest/90 border border-white/5 flex flex-col gap-2.5 text-left">
                <span className="font-headline font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-sm">checklist</span>
                  Konkurs Shartlari va Qoidalari
                </span>
                <div className="flex flex-col gap-1.5 text-xs text-on-surface-variant font-sans leading-relaxed">
                  {contest.rules.split('\n').filter(Boolean).map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">check_circle</span>
                      <span>{line.replace(/^[0-9]+[.)]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsor/Channel link button if admin configured */}
            {contest.channel_link && (
              <button
                type="button"
                onClick={() => {
                  haptic.impact('light');
                  const link = contest.channel_link.trim();
                  const url = link.startsWith('http') ? link : `https://t.me/${link.replace('@', '')}`;
                  openTelegramLink(url);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-secondary/30 text-secondary text-xs font-bold font-headline flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">campaign</span>
                <span>Rasmiy Kanalga O'tish ({contest.channel_link})</span>
              </button>
            )}

            {/* Join Action Button or Locked Message */}
            {!isContestActive ? (
              <div className="w-full py-4 px-4 rounded-2xl bg-surface-container border border-white/10 text-on-surface-variant font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-inner">
                <span className="material-symbols-outlined text-base text-amber-400">lock</span>
                <span>
                  {contest.status === 'COMPLETED'
                    ? "Konkurs Yakunlangan — Qabul To'xtatilgan"
                    : "Konkurs To'xtatilgan — Qabul Bloklangan"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                disabled={joining}
                onClick={handleJoin}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.3)] flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                {joining ? (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">casino</span>
                    <span>{contest.cta_button_text || 'Shartlarni bajardim — Konkursda qatnashish'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Participants List (Chiptalar Ro'yxati) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-sm">group</span>
            Ishtirokchilar ({totalParticipants || totalCount} ta)
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            Chipta raqamlari
          </span>
        </div>

        {loadingParticipants ? (
          <div className="py-8 flex justify-center text-on-surface-variant">
            <span className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : participants.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-white/5 text-center text-xs text-on-surface-variant">
            Hozircha ishtirokchilar yo'q. Birinchi bo'lib qatnashing!
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {participants.map((p) => {
              const ticket = p.ticket_number || `#${String(p.id).padStart(4, '0')}`;
              const isMe = user && (p.user_id === user.id || p.id === user.id);

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                      : 'bg-surface-container-lowest border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                      alt={p.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline font-semibold text-white text-xs truncate max-w-[150px]">
                          {p.full_name}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-bold">
                            Siz
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-mono truncate">
                        {p.username ? `@${p.username}` : `ID: ${p.user_id}`}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-surface-container border border-white/10 text-amber-400 font-mono font-bold text-xs shrink-0">
                    {ticket}
                  </span>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 px-1 text-xs font-mono">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => fetchParticipants(page - 1)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/10 text-white disabled:opacity-40 transition-all"
                >
                  Oldingi
                </button>
                <span className="text-on-surface-variant">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => fetchParticipants(page + 1)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/10 text-white disabled:opacity-40 transition-all"
                >
                  Keyingi
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
