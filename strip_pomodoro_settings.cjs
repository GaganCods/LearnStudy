const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

// Remove import
code = code.replace('import { PomodoroSettingsPanel } from "./PomodoroSettingsPanel";', '');

// Remove Mobile settings toggle button
const settingsButton = `          {/* Mobile settings toggle */}
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="lg:hidden p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <Settings className="w-4 h-4" />
          </button>`;
code = code.replace(settingsButton, '');

// Adjust layout (lg:col-span-8 -> lg:col-span-12)
code = code.replace(/<div className="lg:col-span-8 space-y-6">/g, '<div className="lg:col-span-12 space-y-6 max-w-4xl mx-auto w-full">');

// Remove Desktop Side Panel Settings and Mobile Settings Bottom Sheet
const desktopPanelStr = `{/* Desktop Side Panel Settings */}`;
const endIdx = code.indexOf(desktopPanelStr);
if (endIdx !== -1) {
  // also need to preserve everything after the mobile sheet
  const smartSnoozeIdx = code.indexOf('{/* Smart Snooze Overlay */}');
  if (smartSnoozeIdx !== -1) {
    code = code.substring(0, endIdx) + code.substring(smartSnoozeIdx);
  }
}

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
