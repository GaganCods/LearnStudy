const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

if (!code.includes('import { PomodoroSettingsPanel }')) {
  code = code.replace(
    'import { playPomodoroSound } from "../utils/pomodoroSounds";',
    'import { playPomodoroSound } from "../utils/pomodoroSounds";\\nimport { PomodoroSettingsPanel } from "./PomodoroSettingsPanel";'
  );
}

// Add 'settings' to the tabs array
code = code.replace(
  '{ id: "history", label: "History Log", icon: History }',
  '{ id: "history", label: "History Log", icon: History },\\n              { id: "settings", label: "Settings", icon: Settings }'
);

// Add the rendering for the settings tab right before history or right after stats
const statsTarget = '{activeSubTab === "stats" && (';
const settingsRender = `          {activeSubTab === "settings" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <PomodoroSettingsPanel />
            </div>
          )}

          `;

if (!code.includes('{activeSubTab === "settings" && (')) {
  code = code.replace(statsTarget, settingsRender + statsTarget);
}

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
