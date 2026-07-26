const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

const presetLookup = `
  const builtinPresets = [
    { id: "25/5", label: "25 / 5 (Classic)" },
    { id: "50/10", label: "50 / 10" },
    { id: "60/15", label: "60 / 15" },
    { id: "90/20", label: "90 / 20" },
    { id: "custom", label: "Custom Mode" }
  ];
  const selectedPresetLabel = builtinPresets.find(p => p.id === settings.selectedPresetId)?.label 
      || settings.customPresets?.find(p => p.id === settings.selectedPresetId)?.name;
`;

// Insert after `const totalDurationSeconds = activeState.durationMs / 1000;`
code = code.replace(
  '  const totalDurationSeconds = activeState.durationMs / 1000;',
  presetLookup + '\n  const totalDurationSeconds = activeState.durationMs / 1000;'
);

// Replace "Start Next Session" with "Stop Alarm"
code = code.replace(
  `                <button \n                  onClick={() => stopAlarm()} \n                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition text-sm"\n                >\n                  Start Next Session\n                </button>`,
  `                <button \n                  onClick={() => stopAlarm()} \n                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition text-sm"\n                >\n                  Stop Alarm\n                </button>`
);

// Replace "Time for your next step." with preset label
code = code.replace(
  `              <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2">\n                Time for your next step.\n              </p>`,
  `              <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2">\n                {selectedPresetLabel ? \`Selected Preset: \${selectedPresetLabel}\` : 'Time for your next step.'}\n              </p>`
);

// Insert into the main UI timer as well
code = code.replace(
  `              <div className="flex items-center gap-4 mt-2">`,
  `              {selectedPresetLabel && (\n                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center justify-center gap-1.5 opacity-60">\n                  <Clock className="w-3.5 h-3.5" /> {selectedPresetLabel}\n                </div>\n              )}\n              <div className="flex items-center gap-4 mt-2">`
);

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
