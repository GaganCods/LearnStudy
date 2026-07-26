const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" /> Pomodoro Timer Settings
                    </h3>
                    <div className="pt-2">
                      <PomodoroSettingsPanel />
                    </div>
                  </div>`;

code = code.replace(target, '');
code = code.replace('import { PomodoroSettingsPanel } from "./components/PomodoroSettingsPanel";\\n', '');
code = code.replace('import { PomodoroSettingsPanel } from "./components/PomodoroSettingsPanel";', '');

fs.writeFileSync('src/App.tsx', code);
