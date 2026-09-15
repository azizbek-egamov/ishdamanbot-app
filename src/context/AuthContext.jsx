import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';

const AuthContext = createContext(null);

/**
 * Check if a saved JWT token is still valid (not expired).
 * Returns false if expired or invalid - so we request a fresh token.
 */
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds - compare with current time
    return payload.exp && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const { initData, startParam, isAvailable, haptic } = useTelegram();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  // needsWidgetAuth: true bo'lsa LoginPage ko'rsatiladi (browser, token yo'q)
  const [needsWidgetAuth, setNeedsWidgetAuth] = useState(false);
  const wsRef = useRef(null);

  // Fetch initial online presence and platform statistics
  const fetchOnlineStats = async () => {
    try {
      const res = await api.get('/real-time/online-stats/');
      if (res.data) {
        if (res.data.online_count !== undefined) {
          setOnlineCount(Math.max(0, Number(res.data.online_count) || 0));
        }
        if (res.data.total_users !== undefined) {
          setTotalUsers(Number(res.data.total_users) || 0);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchOnlineStats();
    const interval = setInterval(fetchOnlineStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Authenticate user on mount
  useEffect(() => {
    async function authenticate() {
      setLoading(true);

      // Saqlangan tokenni tekshirish
      const savedToken = localStorage.getItem('th_access_token');
      if (savedToken && !isTokenValid(savedToken)) {
        console.log('[Auth] Saved token expired - clearing...');
        localStorage.removeItem('th_access_token');
      }

      try {
        // ====================================================
        // 1. TELEGRAM MINI APP MODE (Bot orqali ochilgan)
        //    initData mavjud => hozirgi logika o'zgarmaydi
        // ====================================================
        if (initData) {
          let response;
          response = await api.post('/users/auth/telegram/', {
            init_data: initData,
            ref_code: startParam || ''
          });

          const data = response.data;
          if (data.user) {
            setUser(data.user);
            if (data.user.is_banned || data.is_banned) {
              setIsBanned(true);
              setBanInfo({
                reason: data.user.ban_reason || data.ban_reason || '',
                banned_at: data.user.banned_at || data.banned_at || ''
              });
            } else {
              setIsBanned(false);
              setBanInfo(null);
            }
            if (data.tokens?.access) {
              localStorage.setItem('th_access_token', data.tokens.access);
              connectWebSocket(data.tokens.access, data.user.id);
            }
          }
          setLoading(false);
          return;
        }

        // ====================================================
        // 2. BRAUZER + TOKEN BOR (avval saytdan kirgan)
        //    Token hali amal qilmoqda => profilni yangilash
        // ====================================================
        const validToken = localStorage.getItem('th_access_token');
        if (validToken && isTokenValid(validToken)) {
          console.log('[Auth] Valid token found - loading profile...');
          try {
            const res = await api.get('/users/profile/');
            const userData = res.data;
            setUser(userData);
            if (userData.is_banned) {
              setIsBanned(true);
              setBanInfo({
                reason: userData.ban_reason || '',
                banned_at: userData.banned_at || ''
              });
            } else {
              setIsBanned(false);
              setBanInfo(null);
            }
            connectWebSocket(validToken, userData.id);
          } catch (err) {
            if (err?.response?.status === 401) {
              localStorage.removeItem('th_access_token');
              setNeedsWidgetAuth(true);
            }
          }
          setLoading(false);
          return;
        }

        // ====================================================
        // 3. BRAUZER + TOKEN YO'Q (yangi foydalanuvchi)
        //    LoginPage ko'rsatiladi, Widget orqali kiradi
        // ====================================================
        console.log('[Auth] Browser mode, no valid token - showing LoginPage...');
        setNeedsWidgetAuth(true);
        connectWebSocket(null, null);

      } catch (err) {
        console.error('Authentication error:', err?.response?.status, err?.message);
        if (err?.response?.status === 401) {
          localStorage.removeItem('th_access_token');
        }
        // Xato bo'lsa ham agar Mini App emas va token yo'q bo'lsa - login ko'rsat
        if (!initData && !localStorage.getItem('th_access_token')) {
          setNeedsWidgetAuth(true);
          connectWebSocket(null, null);
        }
      } finally {
        setLoading(false);
      }
    }

    authenticate();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [initData]);

  /**
   * handleWidgetAuth — LoginPage dan chaqiriladi.
   * Widget orqali muvaffaqiyatli login bo'lganda user va token oladi.
   */
  const handleWidgetAuth = (userData, tokens) => {
    setNeedsWidgetAuth(false);
    setUser(userData);
    if (userData.is_banned) {
      setIsBanned(true);
      setBanInfo({
        reason: userData.ban_reason || '',
        banned_at: userData.banned_at || ''
      });
    } else {
      setIsBanned(false);
      setBanInfo(null);
    }
    if (tokens?.access && userData?.id) {
      connectWebSocket(tokens.access, userData.id);
    }
    fetchOnlineStats();
  };

  /**
   * logout — Faqat sayt (browser) uchun.
   * Token tozalanadi, user state nollashtiriladi, LoginPage ko'rsatiladi.
   */
  const logout = () => {
    localStorage.removeItem('th_access_token');
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    setUser(null);
    setIsBanned(false);
    setBanInfo(null);
    setNeedsWidgetAuth(true);
    connectWebSocket(null, null);
  };

  const getGuestSessionId = () => {
    try {
      let sid = sessionStorage.getItem('th_guest_sid');
      if (!sid) {
        sid = Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('th_guest_sid', sid);
      }
      return sid;
    } catch {
      return 'guest_' + Math.floor(Math.random() * 10000);
    }
  };

  // WebSocket Connection for Real-Time events
  const connectWebSocket = (token, userId) => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const queryParams = new URLSearchParams();
    if (token) queryParams.set('token', token);
    if (userId) queryParams.set('user_id', userId);
    if (!token && !userId) {
      queryParams.set('session_id', getGuestSessionId());
    }

    let wsUrl;
    if (isLocal) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}/ws/user/?${queryParams.toString()}`;
    } else if (import.meta.env.VITE_WS_URL) {
      const base = import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
      wsUrl = `${base}/ws/user/?${queryParams.toString()}`;
    } else if (import.meta.env.VITE_BACKEND_URL) {
      const base = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws').replace(/\/+$/, '');
      wsUrl = `${base}/ws/user/?${queryParams.toString()}`;
    } else {
      wsUrl = `wss://core.ishdaman.uz/ws/user/?${queryParams.toString()}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('⚡ Real-time WebSocket connected to:', wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('⚡ WebSocket Event received:', data);

        if (data.event === 'BALANCE_UPDATED') {
          // Do not update balance or show premature toast during spin wheel animation
          if (data.tx_type !== 'spin_bonus') {
            setUser((prev) => prev ? { ...prev, balance: data.balance } : prev);
            haptic.impact('medium');
            showToast(`Balans yangilandi: ${data.diff > 0 ? '+' : ''}${formatUZS(data.diff)} UZS`);
          }
        }

        if (data.event === 'REFERRAL_JOINED') {
          showToast(data.message || "Yangi referal qo'shildi! +500 UZS", 'success');
          haptic.notification('success');
          refreshProfile();
        }

        if (data.event === 'TASK_STATUS_CHANGED') {
          if (data.status === 'approved') {
            showToast(`Vazifa tasdiqlandi! +${formatUZS(data.reward_amount)} UZS`, 'success');
            haptic.notification('success');
          } else if (data.status === 'rejected') {
            showToast(`Vazifa rad etildi: ${data.comment || 'Talabga mos kelmadi'}`, 'error');
            haptic.notification('error');
          }
        }

        // Real-time BAN event
        if (data.event === 'USER_BLOCKED') {
          setIsBanned(true);
          setBanInfo({
            reason: data.reason || "Xavfsizlik qoidalarini buzganlik sababli",
            banned_at: data.banned_at || ""
          });
          setUser((prev) => prev ? { ...prev, is_banned: true, ban_reason: data.reason } : prev);
          haptic.notification('error');
          showToast("Akkauntingiz bloklandi!", "error");
        }

        // Real-time Online Presence stats
        if (data.event === 'ONLINE_STATS_UPDATE' || data.online_count !== undefined) {
          if (data.online_count !== undefined) {
            setOnlineCount(Math.max(0, Number(data.online_count) || 0));
          }
        }

        // Real-time UNBAN event
        if (data.event === 'USER_UNBLOCKED') {
          setIsBanned(false);
          setBanInfo(null);
          setUser((prev) => prev ? { ...prev, is_banned: false, ban_reason: '' } : prev);
          haptic.notification('success');
          showToast("Akkauntingiz blokdan chiqarildi!", "success");
          refreshProfile();
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected. Will try reconnecting in 5s...');
      setTimeout(() => {
        const curToken = localStorage.getItem('th_access_token');
        if (curToken && user) {
          connectWebSocket(curToken, user.id);
        } else {
          connectWebSocket(null, null);
        }
      }, 5000);
    };

    wsRef.current = ws;
  };

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/users/profile/');
      setUser(res.data);
      if (res.data.is_banned) {
        setIsBanned(true);
        setBanInfo({
          reason: res.data.ban_reason || '',
          banned_at: res.data.banned_at || ''
        });
      } else {
        setIsBanned(false);
        setBanInfo(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateBalanceLocal = (newBalance) => {
    setUser((prev) => prev ? { ...prev, balance: newBalance } : prev);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      onlineCount,
      totalUsers,
      refreshProfile,
      updateBalanceLocal,
      showToast,
      isBanned,
      banInfo,
      needsWidgetAuth,
      handleWidgetAuth,
      logout,
    }}>
      {children}

      {/* Global Real-time Cyber Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-[30000] flex justify-center pointer-events-none transition-all duration-300 animate-slide-up">
          <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl border ${
            toastMessage.type === 'error'
              ? 'bg-error-container/90 text-white border-error shadow-[0_0_20px_rgba(255,81,101,0.5)]'
              : toastMessage.type === 'success'
              ? 'bg-[#003822]/90 text-secondary-container border-secondary-container shadow-[0_0_20px_rgba(1,229,153,0.5)]'
              : 'bg-surface-container-high/90 text-white border-primary-container shadow-[0_0_20px_rgba(255,81,101,0.4)]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Banned Overlay Screen (100% Real-time & Preserves User Info) */}
      {isBanned && (
        <div className="fixed inset-0 z-[20000] bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 pt-14 sm:pt-6 text-center animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 border border-error/30 flex flex-col items-center gap-4 shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto overscroll-contain animate-modal-pop">
            {/* User Avatar with Lock Badge */}
            <div className="relative">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120'}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-error/50 shadow-[0_0_25px_rgba(255,81,101,0.5)] grayscale"
              />
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-error flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </div>
            </div>

            {/* User Identity */}
            <div className="flex flex-col items-center gap-0.5">
              <h2 className="font-headline font-bold text-white text-lg">
                {user?.full_name || (user?.telegram_id ? `Trader #${user.telegram_id}` : 'Foydalanuvchi')}
              </h2>
              <span className="text-xs text-on-surface-variant font-mono">
                @{user?.username || (user?.telegram_id ? `id_${user.telegram_id}` : 'trader')}
              </span>
              <span className="text-[10px] text-error font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-error/15 border border-error/30 mt-1">
                Akkaunt Cheklangan (Banned)
              </span>
            </div>

            {/* Ban Reason & Time Info Box */}
            <div className="w-full bg-surface-container rounded-xl p-3.5 border border-white/5 flex flex-col gap-2 text-left">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-on-surface-variant font-medium">Bloklash sababi:</span>
                  <span className="text-xs text-white font-medium">
                    {banInfo?.reason || user?.ban_reason || "Qoidalarni buzganlik sababli cheklov o'rnatildi"}
                  </span>
                </div>
              </div>

              {(banInfo?.banned_at || user?.banned_at) && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-on-surface-variant font-mono">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Vaqti: {banInfo?.banned_at || user?.banned_at}</span>
                </div>
              )}
            </div>

            {/* Real-time WebSocket Status */}
            <div className="flex items-center gap-2 text-[11px] text-secondary font-mono bg-secondary-container/15 px-3 py-1.5 rounded-full border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Real-vaqtda ulangan (avtomatik ochiladi)</span>
            </div>

            {/* Support Link */}
            <a
              href="https://t.me/IshdamanUzBot"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl bg-surface-container-high border border-white/10 hover:border-white/20 text-white font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>Qo'llab-quvvatlash xizmati</span>
            </a>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
