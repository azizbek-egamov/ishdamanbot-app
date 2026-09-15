import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import AmountInput from '../components/AmountInput';
import { formatUZS } from '../utils/formatters';

function getTypeName(type) {
  switch (type) {
    case 'task_reward':
      return 'Vazifa mukofoti';
    case 'referral_reward':
      return 'Referal taklif bonusi';
    case 'spin_bonus':
      return 'Omad ruletkasi yutug\'i';
    case 'contest_prize':
      return 'Konkurs sovrini';
    case 'withdrawal':
      return 'Pul yechish (Chiqim)';
    case 'admin_deposit':
      return 'Admin to\'ldirishi / Bonus';
    case 'penalty':
      return 'Jarima / Ayirish';
    default:
      return 'Mablag\' operatsiyasi';
  }
}

export default function ProfilePage() {
  const { user, refreshProfile, showToast, logout } = useAuth();
  const { haptic } = useTelegram();

  // Sayt (browser) muhitida ekanligini aniqlash
  // Mini App da initData mavjud bo'ladi => logout kerak emas
  const isTelegramWebApp = Boolean(window.Telegram?.WebApp?.initData);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState(10000);

  // Selected transaction detail modal state
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoadingTx(true);
      const [txRes, setRes] = await Promise.all([
        api.get('/wallet/transactions/'),
        api.get('/users/settings/'),
      ]);
      setTransactions(txRes.data);
      if (setRes.data?.min_withdrawal) {
        setMinWithdrawal(Number(setRes.data.min_withdrawal));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await api.patch('/users/profile/', { full_name: newName });
      setIsEditingName(false);
      refreshProfile();
      haptic.notification('success');
      showToast('Ismingiz yangilandi!', 'success');
    } catch (e) {
      showToast('Ismni o\'zgartirishda xato yuz berdi', 'error');
    }
  };

  const formatCardNumber = (val) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length !== 16) {
      showToast('Karta raqami 16 ta raqamdan iborat bo\'lishi shart', 'error');
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum < minWithdrawal) {
      showToast(`Minimal pul yechish summasi: ${formatUZS(minWithdrawal)} UZS`, 'error');
      return;
    }

    if (amountNum > Number(user.balance)) {
      showToast('Balansingizda yetarli mablag\' yo\'q', 'error');
      return;
    }

    try {
      setWithdrawing(true);
      haptic.impact('heavy');
      await api.post('/wallet/withdraw/', {
        card_number: cleanCard,
        card_holder_name: cardHolder,
        amount: amountNum,
      });

      haptic.notification('success');
      showToast('Pul yechish arizasi qabul qilindi!', 'success');
      setShowWithdrawModal(false);
      setCardNumber('');
      setWithdrawAmount('');
      refreshProfile();
      fetchTransactions();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Xatolik yuz berdi';
      showToast(errMsg, 'error');
      haptic.notification('error');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-safe max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <section className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120'}
                alt="Profile"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-primary-container/40 shadow-neon-red"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-secondary-container border-2 border-surface"></span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline font-bold text-white text-base truncate">
                  {user?.full_name}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNewName(user?.full_name || '');
                    setIsEditingName(true);
                  }}
                  className="text-on-surface-variant hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </div>
              <span className="text-xs text-on-surface-variant font-mono">
                @{user?.username || `id_${user?.telegram_id}`}
              </span>
              <span className="text-[10px] text-secondary font-mono mt-0.5">
                ID: {user?.telegram_id}
              </span>
            </div>
          </div>

          {/* Logout tugmasi — faqat brauzer (sayt) muhitida */}
          {!isTelegramWebApp && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 border border-error/25 hover:bg-error/20 hover:border-error/50 text-error text-[11px] font-semibold font-mono uppercase tracking-wider transition-all active:scale-95"
              title="Chiqish"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              Chiqish
            </button>
          )}
        </div>

      </section>

      {/* Edit name inline modal — section ichida */}
      {isEditingName && (
        <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Yangi ismingiz"
            className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-white/10 text-white text-xs w-full outline-none focus:border-primary-container"
          />
          <button
            type="button"
            onClick={handleUpdateName}
            className="px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold shadow-neon-red shrink-0"
          >
            Saqlash
          </button>
          <button
            type="button"
            onClick={() => setIsEditingName(false)}
            className="px-2 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs shrink-0"
          >
            Bekor
          </button>
        </div>
      )}

      {/* Main Wallet Balance Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
            Umumiy Mablag'
          </span>
          <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse shadow-[0_0_8px_#01e599]"></span>
        </div>

        <div className="flex flex-col">
          <span className="font-mono text-3xl font-bold text-white tracking-tight">
            {formatUZS(user?.balance)}{' '}
            <span className="text-secondary text-lg font-headline">UZS</span>
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1">
            Yechib olish uchun mavjud balans
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            haptic.impact('medium');
            setShowWithdrawModal(true);
          }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-[#ff5165] text-white font-headline font-bold text-sm uppercase tracking-wider shadow-neon-red flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">payments</span>
          <span>Pul Yechish (Uzcard / Humo)</span>
        </button>
      </section>

      {/* Transactions History */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline font-bold text-white text-sm">Tranzaksiyalar Tarixi</span>
          <span className="font-mono text-[11px] text-on-surface-variant">So'nggi 20 ta</span>
        </div>

        {loadingTx ? (
          <div className="py-8 flex justify-center text-on-surface-variant">
            <span className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center text-xs text-on-surface-variant">
            Hozircha tranzaksiyalar mavjud emas
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => {
              const isPositive = Number(tx.amount) > 0;
              const isWithdrawal = tx.type === 'withdrawal';
              const wrStatus = tx.withdrawal_details?.status;

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    haptic.impact('light');
                    setSelectedTx(tx);
                  }}
                  className="glass-card card-interactive rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-white/20 transition-all active:scale-[0.985]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPositive
                        ? 'bg-secondary-container/20 text-secondary shadow-neon-green'
                        : 'bg-error-container/20 text-error shadow-neon-red'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {isPositive ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline text-xs font-semibold text-white truncate">
                        {tx.description || tx.type_display || getTypeName(tx.type)}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {new Date(tx.created_at).toLocaleString('ru-RU')}
                        </span>
                        {isWithdrawal && wrStatus && (
                          <span className={`px-1.5 py-0.2 text-[9px] rounded font-mono font-bold uppercase ${
                            wrStatus === 'approved'
                              ? 'bg-secondary/15 text-secondary'
                              : wrStatus === 'pending'
                              ? 'bg-amber-400/15 text-amber-300'
                              : 'bg-error/15 text-error'
                          }`}>
                            {wrStatus === 'approved' ? "To'landi" : wrStatus === 'pending' ? "Kutilmoqda" : "Rad etildi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-mono text-sm font-bold ${
                      isPositive ? 'text-secondary' : 'text-error'
                    }`}>
                      {isPositive ? '+' : ''}{formatUZS(tx.amount)} UZS
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>

    {/* ============================================================
        PUL YECHISH MODAL (Root Level - Responsive Bottom Sheet)
        ============================================================ */}
    {showWithdrawModal && (
      <div
        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 pt-14 sm:pt-4 animate-fade-in"
        onClick={() => setShowWithdrawModal(false)}
      >
        <div
          className="w-full max-w-md bg-surface-container rounded-t-3xl sm:rounded-2xl border border-white/10 flex flex-col shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-hidden animate-slide-up"
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
                account_balance_wallet
              </span>
              <h3 className="font-headline font-bold text-white text-base">
                Pul Yechish
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowWithdrawModal(false)}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Form / Scrollable Body */}
          <form onSubmit={handleWithdrawSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 flex flex-col gap-3.5">
            {/* Card Number Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-mono">
                Karta raqami (Uzcard / Humo):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="8600 0000 0000 0000"
                  className="w-full px-3.5 py-3 rounded-xl bg-surface-container-lowest border border-white/10 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-primary-container"
                />
                <span className="material-symbols-outlined text-on-surface-variant absolute right-3 top-3 text-[20px]">
                  credit_card
                </span>
              </div>
            </div>

            {/* Card Holder (Optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-mono">
                Karta egasi (Ism Familiya):
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Masalan: ALI VALIYEV"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-white text-sm focus:outline-none focus:border-primary-container uppercase"
              />
            </div>

            {/* Amount Input */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-on-surface-variant font-mono">
                  Yechish summasi (UZS):
                </label>
                <span className="text-[10px] text-secondary font-mono">
                  Mavjud: {formatUZS(user?.balance)} UZS
                </span>
              </div>
              <AmountInput
                value={withdrawAmount}
                onChange={(val) => setWithdrawAmount(val)}
                placeholder={`Min. ${formatUZS(minWithdrawal)}`}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-primary-container"
              />
              <span className="text-[10px] text-on-surface-variant mt-0.5">
                * Minimal pul yechish miqdori {formatUZS(minWithdrawal)} UZS.
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['10000', '50000', '100000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWithdrawAmount(parseInt(amt, 10))}
                  className="py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-mono font-semibold border border-white/5 active:scale-95 transition-all"
                >
                  {formatUZS(amt)}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <div className="pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] sm:pb-2">
              <button
                type="submit"
                disabled={withdrawing}
                className="w-full py-3.5 rounded-xl bg-primary-container text-white font-bold text-sm uppercase tracking-wider shadow-neon-red flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {withdrawing ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>So'rovni Yuborish</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ============================================================
        TRANZAKSIYA TAFSILOTLARI MODAL (Root Level - Responsive Bottom Sheet)
        ============================================================ */}
    {selectedTx && (
      <div
        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 pt-14 sm:pt-4 animate-fade-in"
        onClick={() => setSelectedTx(null)}
      >
        <div
          className="w-full max-w-md bg-surface-container rounded-t-3xl sm:rounded-2xl border border-white/10 flex flex-col shadow-2xl max-h-[82vh] max-h-[82dvh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobil uchun pastga surish indikatori */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20"></div>
          </div>

          {/* Modal Header — Doim ko'rinadi (shrink-0) */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                Number(selectedTx.amount) > 0
                  ? 'bg-secondary-container/20 text-secondary shadow-neon-green'
                  : 'bg-error-container/20 text-error shadow-neon-red'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {Number(selectedTx.amount) > 0 ? 'account_balance_wallet' : 'payments'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-white text-sm">
                  Operatsiya Tafsiloti
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Tranzaksiya #{selectedTx.id}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptic.impact('light');
                setSelectedTx(null);
              }}
              className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 flex flex-col gap-4">
            {/* Amount Banner & Status */}
            <div className="flex flex-col items-center justify-center py-4 px-3 bg-surface-container-lowest rounded-2xl border border-white/5 gap-1.5 text-center">
              <span className="text-[11px] font-mono uppercase text-on-surface-variant tracking-wider">
                O'tkazma Summasi
              </span>
              <span className={`font-mono text-2xl sm:text-3xl font-black ${
                Number(selectedTx.amount) > 0 ? 'text-secondary neon-glow-green' : 'text-error neon-glow-red'
              }`}>
                {Number(selectedTx.amount) > 0 ? '+' : ''}{formatUZS(selectedTx.amount)} UZS
              </span>

              {/* Status Badge */}
              {selectedTx.type === 'withdrawal' && selectedTx.withdrawal_details ? (
                <div className={`mt-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                  selectedTx.withdrawal_details.status === 'approved'
                    ? 'bg-secondary/15 text-secondary border border-secondary/30'
                    : selectedTx.withdrawal_details.status === 'pending'
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-500/30'
                    : 'bg-error/15 text-error border border-error/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    selectedTx.withdrawal_details.status === 'approved'
                      ? 'bg-secondary'
                      : selectedTx.withdrawal_details.status === 'pending'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-error'
                  }`}></span>
                  <span>
                    {selectedTx.withdrawal_details.status === 'approved'
                      ? "To'landi (Muvaffaqiyatli)"
                      : selectedTx.withdrawal_details.status === 'pending'
                      ? "Ko'rib chiqilmoqda (Kutilmoqda)"
                      : "Rad etildi (Balansga qaytarildi)"}
                  </span>
                </div>
              ) : (
                <div className="mt-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  <span>Muvaffaqiyatli Bajarildi</span>
                </div>
              )}
            </div>

            {/* Details List */}
            <div className="flex flex-col gap-2.5 bg-surface-container-lowest/80 p-4 rounded-2xl border border-white/5 text-xs">
              {/* Type */}
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">category</span>
                  Operatsiya turi:
                </span>
                <span className="font-headline font-semibold text-white">
                  {getTypeName(selectedTx.type)}
                </span>
              </div>

              {/* Description / Cause */}
              {selectedTx.description && (
                <div className="flex items-start justify-between py-1 border-b border-white/5 gap-2">
                  <span className="text-on-surface-variant flex items-center gap-1.5 shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                    Tafsilot:
                  </span>
                  <span className="font-mono text-white text-right break-words max-w-[200px]">
                    {selectedTx.description}
                  </span>
                </div>
              )}

              {/* If Withdrawal: Card, Holder & Admin Note */}
              {selectedTx.type === 'withdrawal' && selectedTx.withdrawal_details && (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">credit_card</span>
                      Karta raqami:
                    </span>
                    <span className="font-mono font-bold text-white tracking-wider">
                      {selectedTx.withdrawal_details.card_number}
                    </span>
                  </div>

                  {selectedTx.withdrawal_details.card_holder_name && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
                        Karta egasi:
                      </span>
                      <span className="font-headline font-medium text-white uppercase">
                        {selectedTx.withdrawal_details.card_holder_name}
                      </span>
                    </div>
                  )}

                  {selectedTx.withdrawal_details.admin_note && (
                    <div className="flex items-start justify-between py-1 border-b border-white/5 gap-2">
                      <span className="text-on-surface-variant flex items-center gap-1.5 shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-amber-400">comment</span>
                        Admin izohi:
                      </span>
                      <span className="font-sans text-xs text-amber-300 text-right">
                        {selectedTx.withdrawal_details.admin_note}
                      </span>
                    </div>
                  )}

                  {selectedTx.withdrawal_details.processed_at && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary">done_all</span>
                        Ko'rib chiqilgan:
                      </span>
                      <span className="font-mono text-secondary">
                        {new Date(selectedTx.withdrawal_details.processed_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Date & Time */}
              <div className="flex items-center justify-between py-1">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">schedule</span>
                  Yaratilgan vaqt:
                </span>
                <span className="font-mono text-white">
                  {new Date(selectedTx.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Close Button Footer */}
          <div className="flex-shrink-0 p-4 border-t border-white/5 bg-surface-container/95 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-4">
            <button
              type="button"
              onClick={() => {
                haptic.impact('light');
                setSelectedTx(null);
              }}
              className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-white font-headline text-xs uppercase tracking-wider font-bold transition-all active:scale-[0.98]"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ============================================================
        LOGOUT TASDIQLASH DIALOG
        MUHIM: Bu div barcha section lardan TASHQARIDA joylashgan.
        Sabab: glass-card da backdrop-filter ishlatiladi va u yangi
        CSS stacking context yaratadi. fixed positioned element
        stacking context ichida qolsa, inset-0 to'liq ekranni
        qoplamaydi. Shu muammoni hal qilish uchun dialog root ga
        ko'chirildi.
        ============================================================ */}
    {showLogoutConfirm && (
      <div
        className="animate-fade-in"
        onClick={() => setShowLogoutConfirm(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 56px)',
        }}
      >
        <div
          className="animate-modal-pop"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '320px',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: 'rgba(24,25,32,0.97)',
            border: '1px solid rgba(255,81,101,0.35)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,81,101,0.15)',
          }}
        >
          {/* Icon va matn */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(255,81,101,0.12)', border: '1px solid rgba(255,81,101,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#ff5165', fontSize: '28px' }}>logout</span>
            </div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: 0 }}>
              Chiqishni tasdiqlang
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
              Akkauntdan chiqasizmi? Qayta kirish uchun
              Telegram orqali avtorizatsiya qilishingiz kerak bo&apos;ladi.
            </p>
          </div>

          {/* Tugmalar */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Bekor
            </button>
            <button
              type="button"
              onClick={() => {
                haptic.notification('warning');
                setShowLogoutConfirm(false);
                logout();
              }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: '12px',
                background: '#ff5165', border: 'none',
                color: 'white', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(255,81,101,0.4)',
              }}
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
