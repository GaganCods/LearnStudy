import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'menu-item' | 'badge';
  collapsed?: boolean;
  onActionClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
  collapsed = false,
  onActionClick,
}) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall, openInstallDialog } = usePWA();

  // Hide if already running inside installed standalone PWA
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleClick = async () => {
    onActionClick?.();
    if (isIOS) {
      openInstallDialog();
    } else {
      await triggerInstall();
    }
  };

  if (variant === 'menu-item') {
    if (collapsed) {
      return (
        <button
          onClick={handleClick}
          className={`w-[42px] h-[42px] mx-auto flex items-center justify-center rounded-[12px] bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200/70 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 transition cursor-pointer group ${className}`}
          title="Install LearnStudy App"
        >
          <Download className="w-[18px] h-[18px] shrink-0 group-hover:scale-110 transition-transform" />
        </button>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`w-full relative flex items-center justify-between px-4 h-[42px] rounded-[12px] text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/60 dark:border-blue-500/20 transition-all cursor-pointer group ${className}`}
        title="Install LearnStudy App"
      >
        <div className="flex items-center gap-3">
          <Download className="w-[18px] h-[18px] shrink-0 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Install LearnStudy App</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
          PWA
        </span>
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer shadow-xs ${className}`}
        title="Install LearnStudy App"
      >
        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer ${className}`}
    >
      {isIOS ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      <span>Install App</span>
    </button>
  );
};
