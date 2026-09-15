import { useEffect } from 'react';

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

  const isAvailable = Boolean(tg && tg.initData);

  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#0f1016');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#0f1016');
        if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
      } catch (e) {
        console.warn('[Telegram WebApp] Init warning:', e);
      }
    }
  }, [tg]);

  const expand = () => {
    if (tg?.expand) tg.expand();
  };

  const close = () => {
    if (tg?.close) tg.close();
  };

  const haptic = {
    impact: (style = 'medium') => {
      // style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
      if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred(style);
      }
    },
    notification: (type = 'success') => {
      // type: 'error' | 'success' | 'warning'
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred(type);
      }
    },
    selection: () => {
      if (tg?.HapticFeedback?.selectionChanged) {
        tg.HapticFeedback.selectionChanged();
      }
    },
  };

  const openLink = (url) => {
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const openTelegramLink = (url) => {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Extract startapp parameter from Telegram WebApp SDK, query params, or URL hash
  const getStartParam = () => {
    if (tg?.initDataUnsafe?.start_param) {
      return tg.initDataUnsafe.start_param;
    }
    if (typeof window !== 'undefined') {
      // 1. Check search params: ?tgWebAppStartParam=ref_... or ?startapp=ref_...
      const searchParams = new URLSearchParams(window.location.search);
      const fromSearch = searchParams.get('tgWebAppStartParam') || searchParams.get('startapp') || searchParams.get('start_param') || searchParams.get('ref');
      if (fromSearch) return fromSearch;

      // 2. Check hash params (Telegram Desktop sometimes puts params in #tgWebAppData=...&tgWebAppStartParam=...)
      if (window.location.hash) {
        const hashQuery = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashQuery);
        const fromHash = hashParams.get('tgWebAppStartParam') || hashParams.get('startapp') || hashParams.get('start_param');
        if (fromHash) return fromHash;
      }
    }
    return '';
  };

  const startParam = getStartParam();

  return {
    tg,
    isAvailable,
    initData: tg?.initData || '',
    user: tg?.initDataUnsafe?.user || null,
    startParam,
    expand,
    close,
    haptic,
    openLink,
    openTelegramLink,
  };
}
