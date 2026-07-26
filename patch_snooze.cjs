const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

// Add destructuring
code = code.replace(
  '    exportHistory,\n    activeVideoInfo\n  } = usePomodoro();',
  '    exportHistory,\n    activeVideoInfo,\n    isAlarmRinging,\n    stopAlarm,\n    snoozeAlarm\n  } = usePomodoro();'
);

// Add modal UI to render block (before last closing div)
const snoozeModal = `
      {/* Smart Snooze Overlay */}
      {isAlarmRinging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 animate-pulse" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Bell className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50">Session Complete!</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2">
                Time for your next step.
              </p>
              
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={() => stopAlarm()} 
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition text-sm"
                >
                  Start Next Session
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => snoozeAlarm(1)} 
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition text-sm"
                  >
                    Snooze 1 min
                  </button>
                  <button 
                    onClick={() => { stopAlarm(); skipSession(); }} 
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition text-sm"
                  >
                    Skip 
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(
  '    </div>\n  );\n}',
  snoozeModal + '\n    </div>\n  );\n}'
);

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
