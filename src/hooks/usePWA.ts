import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'learnstudy_pwa_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed < DISMISS_COOLDOWN_MS;
  });
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  // Service worker update registration
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Periodically check for updates (every hour)
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA registration warning:', error);
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    // Listen for display-mode changes
    const displayModeMedia = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    displayModeMedia.addEventListener('change', handleDisplayModeChange);

    // Detect iOS devices
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: any }).MSStream;
    setIsIOS(isIOSDevice);

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Auto-trigger prompt popup after short delay if not dismissed and not installed
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const isCoolingDown = dismissed && (Date.now() - parseInt(dismissed, 10) < DISMISS_COOLDOWN_MS);

      if (!isCoolingDown) {
        // Show after 3.5 seconds of user engaging with the app
        const timer = setTimeout(() => {
          setShowInstallModal(true);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallModal(false);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      displayModeMedia.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // If iOS, open the modal with iOS instructions
      if (isIOS && !isInstalled) {
        setShowInstallModal(true);
      }
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowInstallModal(false);
        return true;
      } else {
        // User clicked cancel in native browser prompt
        dismissPrompt();
        return false;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  }, [deferredPrompt, isIOS, isInstalled]);

  const dismissPrompt = useCallback(() => {
    setShowInstallModal(false);
    setIsPromptDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  const openInstallDialog = useCallback(() => {
    setShowInstallModal(true);
  }, []);

  return {
    isInstallable: !!deferredPrompt || (isIOS && !isInstalled),
    hasNativePrompt: !!deferredPrompt,
    isInstalled,
    isIOS,
    showInstallModal,
    isPromptDismissed,
    triggerInstall,
    dismissPrompt,
    openInstallDialog,
    setShowInstallModal,
    needRefresh,
    updateServiceWorker: () => updateServiceWorker(true),
    dismissUpdate: () => setNeedRefresh(false),
  };
}
